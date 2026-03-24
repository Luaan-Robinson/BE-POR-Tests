import { test, expect } from '../../fixtures/test-fixtures';
import { Logger } from '../../utils/logger';
import { OrganizationHelper } from '../../utils/organization-helper';

/**
 * Suppliers Management Test Suite
 *
 * SELF-CONTAINED TESTS:
 * - Ensures an active organization exists before running tests
 * - Each test creates its own test supplier
 * - Cleans up supplier data after test
 */
test.describe('Suppliers Management', () => {
  test.beforeEach(async ({ authenticatedPage, page, database, dashboardPage, organizationPage }) => {
    void authenticatedPage;
    // Ensure an active organization exists before each test
    await OrganizationHelper.ensureActiveOrganization(page, database, dashboardPage, organizationPage);
  });

  /**
   * Helper function to find a row by name across paginated tables
   */
  async function findRowByName(page: any, name: string, maxPages: number = 10): Promise<boolean> {
    let pageNum = 1;
    
    while (pageNum <= maxPages) {
      Logger.info(`Searching for "${name}" on page ${pageNum}...`);
      
      const rows = page.locator('table[data-testid="data-grid"] tbody tr');
      const rowCount = await rows.count();
      
      for (let i = 0; i < rowCount; i++) {
        const row = rows.nth(i);
        const nameCell = row.locator('td:nth-child(2) div[title]');
        
        try {
          const cellText = await nameCell.getAttribute('title');
          if (cellText && cellText.trim() === name) {
            Logger.info(`Found "${name}" at row ${i + 1} on page ${pageNum}`);
            return true;
          }
        } catch (error) {
          continue;
        }
      }
      
      // Check for next page button
      const nextButton = page.locator('button').filter({ has: page.locator('span.sr-only:has-text("Go to next page")') });
      const hasNext = await nextButton.isVisible().catch(() => false);
      const isDisabled = await nextButton.isDisabled().catch(() => true);
      
      if (!hasNext || isDisabled) {
        Logger.info(`No more pages to search. Reached page ${pageNum}`);
        break;
      }
      
      Logger.info(`Moving to next page...`);
      await nextButton.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      pageNum++;
    }
    
    return false;
  }

  test('should create, verify and delete a supplier', async ({ page, database, dashboardPage }) => {
    Logger.testStart('Create, Verify and Delete Supplier');

    const supplierName = `Test Supplier ${Date.now()}`;
    const gpsLat = '4.23';
    const gpsLng = '5.32';

    // ===== STEP 1: Navigate to Suppliers page =====
    Logger.step(1, 'Navigate to Suppliers page');
    await dashboardPage.expandSidebarGroup('Suppliers');
    await page.locator('a[data-slot="sidebar-menu-sub-button"][href="/suppliers"]').click();
    await page.waitForURL('**/suppliers');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // ===== STEP 2: Open create dialog and fill fields =====
    Logger.step(2, 'Open Create dialog and fill supplier details');
    const createButton = page
      .locator('div.flex.items-center.gap-2 > button')
      .filter({ hasText: 'Create' });
    await createButton.waitFor({ state: 'visible', timeout: 10000 });
    await createButton.click();

    const displayNameInput = page.locator('input#displayName');
    await displayNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await displayNameInput.fill(supplierName);
    await page.locator('input#gpsLatitude').fill(gpsLat);
    await page.locator('input#gpsLongitude').fill(gpsLng);
    Logger.info(`Filled supplier details: name=${supplierName}, lat=${gpsLat}, lng=${gpsLng}`);

    // ===== STEP 3: Handle supplier groups dropdown =====
    Logger.step(3, 'Handle Supplier Groups dropdown');
    const dropdownTrigger = page.locator('button[data-slot="popover-trigger"][name="supplierGroups"]');
    await dropdownTrigger.waitFor({ state: 'visible', timeout: 10000 });
    await dropdownTrigger.click();
    await page.waitForTimeout(500);

    const selectableItems = page
      .locator('[cmdk-item]')
      .filter({ hasNotText: '(Select All)' })
      .filter({ hasNotText: 'Close' });
    const itemCount = await selectableItems.count().catch(() => 0);
    if (itemCount > 0) {
      Logger.info('Selecting first available supplier group');
      await selectableItems.first().click();
      await page.waitForTimeout(300);
    } else {
      Logger.info('No supplier groups to select — closing dropdown');
    }

    const closeBtn = page.locator('[cmdk-item]').filter({ hasText: 'Close' });
    await closeBtn.waitFor({ state: 'visible', timeout: 5000 });
    await closeBtn.click();
    await page.waitForTimeout(500);

    // ===== STEP 4: Submit =====
    Logger.step(4, 'Submit the Create dialog');
    const submitButton = page.locator('button[type="submit"]').filter({ hasText: 'Create' });
    await submitButton.waitFor({ state: 'visible', timeout: 10000 });
    await submitButton.click();

    // Wait for dialog to close and network to settle
    Logger.info('Waiting for dialog to close...');
    await displayNameInput.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
      Logger.warning('Dialog may still be open, continuing...');
    });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // ===== STEP 5: Verify in table with pagination support =====
    Logger.step(5, 'Verify supplier is visible in the table');
    
    // Refresh to ensure latest data
    Logger.info('Refreshing page to ensure latest data...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    const table = page.locator('table[data-testid="data-grid"]');
    await table.waitFor({ state: 'visible', timeout: 10000 });
    
    // Search across all pages
    const found = await findRowByName(page, supplierName);
    expect(found).toBe(true);
    Logger.success(`Supplier "${supplierName}" is visible in the table`);

    // ===== STEP 6: Verify in database =====
    Logger.step(6, 'Verify supplier exists in the database');
    const foundInDb = await database.query<{ display_name: string }>(
      `SELECT display_name FROM suppliers WHERE display_name = $1 LIMIT 1`,
      [supplierName]
    );
    expect(foundInDb.length).toBe(1);
    expect(foundInDb[0].display_name).toBe(supplierName);
    Logger.success(`Supplier "${supplierName}" confirmed in database`);

    // ===== STEP 7: Delete from database =====
    Logger.step(7, 'Delete supplier from the database');
    const supplier = await database.query<{ id: string }>(
      `SELECT id FROM suppliers WHERE display_name = $1 LIMIT 1`,
      [supplierName]
    );
    expect(supplier.length).toBe(1);
    const supplierId = supplier[0].id;

    await database.query(
      `DELETE FROM suppliers_to_supplier_groups WHERE supplier_id = $1`,
      [supplierId]
    );

    const deleted = await database.query<{ id: string }>(
      `DELETE FROM suppliers WHERE id = $1 RETURNING id`,
      [supplierId]
    );
    expect(deleted.length).toBe(1);
    Logger.success(`Supplier "${supplierName}" deleted from database (id: ${deleted[0].id})`);

    Logger.testEnd('Create, Verify and Delete Supplier', true);
  });
});