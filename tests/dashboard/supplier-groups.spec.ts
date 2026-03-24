import { test, expect } from '../../fixtures/test-fixtures';
import { Logger } from '../../utils/logger';
import { OrganizationHelper } from '../../utils/organization-helper';

/**
 * Supplier Groups Management Test Suite
 *
 * SELF-CONTAINED TESTS:
 * - Ensures an active organization exists before running tests
 * - Each test creates its own test supplier group
 * - Cleans up supplier group data after test
 */
test.describe('Supplier Groups Management', () => {
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

  test('should create, verify and delete a supplier group', async ({ page, database, dashboardPage }) => {
    Logger.testStart('Create, Verify and Delete Supplier Group');

    const groupName = `Test Supplier Group ${Date.now()}`;

    // ===== STEP 1: Navigate to Supplier Groups =====
    Logger.step(1, 'Navigate to Supplier Groups page');
    await dashboardPage.expandSidebarGroup('Suppliers');
    await page.locator('a[data-slot="sidebar-menu-sub-button"][href="/supplier-groups"]').click();
    await page.waitForURL('**/supplier-groups');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // ===== STEP 2: Open create dialog and fill name =====
    Logger.step(2, 'Open Create dialog and fill supplier group name');
    const createButton = page
      .locator('div.flex.items-center.gap-2 > button')
      .filter({ hasText: 'Create' });
    await createButton.waitFor({ state: 'visible', timeout: 10000 });
    await createButton.click();

    const displayNameInput = page.locator('input#displayName');
    await displayNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await displayNameInput.fill(groupName);
    Logger.info(`Filled supplier group name: ${groupName}`);

    // ===== STEP 3: Handle suppliers dropdown =====
    Logger.step(3, 'Handle suppliers dropdown');
    const dropdownTrigger = page.locator('button[data-slot="popover-trigger"][name="supplierIds"]');
    await dropdownTrigger.waitFor({ state: 'visible', timeout: 10000 });
    await dropdownTrigger.click();
    await page.waitForTimeout(500);

    const selectAll = page.locator('[cmdk-item]').filter({ hasText: '(Select All)' }).first();
    if (await selectAll.isVisible().catch(() => false)) {
      Logger.info('Selecting all available suppliers');
      await selectAll.click();
      await page.waitForTimeout(300);
    } else {
      Logger.info('No suppliers to select — skipping');
    }

    const closeBtn = page.locator('[cmdk-item]').filter({ hasText: 'Close' });
    await closeBtn.waitFor({ state: 'visible', timeout: 5000 });
    await closeBtn.click();
    await page.waitForTimeout(500);

    // ===== STEP 4: Submit =====
    Logger.step(4, 'Submit the create dialog');
    const submitButton = page.locator('button[type="submit"][data-slot="button"]');
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
    Logger.step(5, 'Verify supplier group is visible in the table');
    
    // Refresh to ensure latest data
    Logger.info('Refreshing page to ensure latest data...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Wait for table to be visible
    const table = page.locator('table[data-testid="data-grid"]');
    await table.waitFor({ state: 'visible', timeout: 10000 });
    
    // Search across all pages
    const found = await findRowByName(page, groupName);
    expect(found).toBe(true);
    Logger.success(`Supplier group "${groupName}" is visible in the table`);

    // ===== STEP 6: Verify in database =====
    Logger.step(6, 'Verify supplier group exists in the database');
    const foundInDb = await database.query<{ display_name: string }>(
      `SELECT display_name FROM supplier_groups WHERE display_name = $1 LIMIT 1`,
      [groupName]
    );
    expect(foundInDb.length).toBe(1);
    expect(foundInDb[0].display_name).toBe(groupName);
    Logger.success(`Supplier group "${groupName}" confirmed in database`);

    // ===== STEP 7: Delete from database =====
    Logger.step(7, 'Delete supplier group from the database');
    const supplierGroup = await database.query<{ id: string }>(
      `SELECT id FROM supplier_groups WHERE display_name = $1 LIMIT 1`,
      [groupName]
    );
    expect(supplierGroup.length).toBe(1);
    const supplierGroupId = supplierGroup[0].id;

    // Clean up junction table entries
    await database.query(
      `DELETE FROM suppliers_to_supplier_groups WHERE supplier_group_id = $1`,
      [supplierGroupId]
    );

    const deleted = await database.query<{ id: string }>(
      `DELETE FROM supplier_groups WHERE id = $1 RETURNING id`,
      [supplierGroupId]
    );
    expect(deleted.length).toBe(1);
    Logger.success(`Supplier group "${groupName}" deleted from database (id: ${deleted[0].id})`);

    Logger.testEnd('Create, Verify and Delete Supplier Group', true);
  });
});