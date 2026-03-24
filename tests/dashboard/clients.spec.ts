import { test, expect } from '../../fixtures/test-fixtures';
import { Logger } from '../../utils/logger';
import { TestDataGenerator } from '../../utils/test-data-generator';
import { OrganizationHelper } from '../../utils/organization-helper';

/**
 * Clients Management Test Suite
 *
 * SELF-CONTAINED TESTS:
 * - Ensures an active organization exists before running tests
 * - Each test creates its own test client
 * - Cleans up client data after test
 */
test.describe('Clients Management', () => {
  // Store the created organization slug to clean it up if we create one
  let createdOrgSlug: string | null = null;

  test.beforeEach(async ({ authenticatedPage, page, database, dashboardPage, organizationPage }) => {
    void authenticatedPage;
    // Use the helper to ensure an active organization exists
    const activeOrgSlug = await OrganizationHelper.ensureActiveOrganization(
      page,
      database,
      dashboardPage,
      organizationPage
    );

    // If the helper created a new organization, store its slug for cleanup
    if (activeOrgSlug && activeOrgSlug.startsWith('test-org-')) {
      createdOrgSlug = activeOrgSlug;
    }
  });

  test.afterEach(async ({ database }) => {
    // Clean up any organization we created
    if (createdOrgSlug) {
      const org = await database.findOrganizationBySlug(createdOrgSlug);
      if (org) {
        // Delete all related data first
        await database.query(`DELETE FROM client WHERE organization_id = $1`, [org.id]);
        await database.query(`DELETE FROM suppliers WHERE organization_id = $1`, [org.id]);
        await database.query(`DELETE FROM supplier_groups WHERE organization_id = $1`, [org.id]);
        await database.deleteOrganizationBySlug(createdOrgSlug);
        Logger.info(`Cleaned up test organization: ${createdOrgSlug}`);
      }
      createdOrgSlug = null;
    }
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

  test('should create, verify and delete a client', async ({ page, database, dashboardPage }) => {
    Logger.testStart('Create, Verify and Delete Client');

    const clientName = `Test Client ${Date.now()}`;

    // ===== STEP 1: Navigate to Clients page =====
    Logger.step(1, 'Navigate to Clients page');
    await dashboardPage.expandSidebarGroup('Projects');
    await page.locator('a[data-slot="sidebar-menu-sub-button"][href="/clients"]').click();
    await page.waitForURL('**/clients');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // ===== STEP 2: Open create dialog and fill client name =====
    Logger.step(2, 'Open Create dialog and fill client name');
    const createButton = page
      .locator('div.flex.items-center.gap-2 > button')
      .filter({ hasText: 'Create' })
      .first();
    await createButton.waitFor({ state: 'visible', timeout: 10000 });
    await createButton.click();

    const displayNameInput = page.locator('input#displayName');
    await displayNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await displayNameInput.fill(clientName);
    await displayNameInput.press('Tab');
    Logger.info(`Filled client name: ${clientName}`);

    // ===== STEP 3: Submit =====
    Logger.step(3, 'Click the Create submit button in the dialog');
    const submitButton = page.locator('button[type="submit"][data-slot="button"]');
    await submitButton.waitFor({ state: 'visible', timeout: 5000 });
    await submitButton.click();

    // Wait for the dialog to close and the table to update
    Logger.info('Waiting for dialog to close...');
    await displayNameInput.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
      Logger.warning('Dialog may still be open, continuing...');
    });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // ===== STEP 4: Verify in table with pagination support =====
    Logger.step(4, 'Verify client is visible in the table');
    
    // Refresh to ensure latest data
    Logger.info('Refreshing page to ensure latest data...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Wait for the table to be visible and contain data
    const table = page.locator('table[data-testid="data-grid"]');
    await table.waitFor({ state: 'visible', timeout: 10000 });

    // Search across all pages
    const found = await findRowByName(page, clientName);
    expect(found).toBe(true);
    Logger.success(`Client "${clientName}" is visible in the table`);

    // ===== STEP 5: Verify in database =====
    Logger.step(5, 'Verify client exists in the database');
    const foundInDb = await database.query<{ display_name: string }>(
      `SELECT display_name FROM client WHERE display_name = $1 LIMIT 1`,
      [clientName]
    );
    expect(foundInDb.length).toBe(1);
    expect(foundInDb[0].display_name).toBe(clientName);
    Logger.success(`Client "${clientName}" confirmed in database`);

    // ===== STEP 6: Delete from database =====
    Logger.step(6, 'Delete client from the database');
    const deleted = await database.query<{ id: string }>(
      `DELETE FROM client WHERE display_name = $1 RETURNING id`,
      [clientName]
    );
    expect(deleted.length).toBe(1);
    Logger.success(`Client "${clientName}" deleted from database (id: ${deleted[0].id})`);

    Logger.testEnd('Create, Verify and Delete Client', true);
  });
});