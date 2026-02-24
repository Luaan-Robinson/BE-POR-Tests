import { test, expect } from '../../fixtures/test-fixtures';
import { Logger } from '../../utils/logger';

/**
 * Clients Management Test Suite
 */
test.describe('Clients Management', () => {
  /**
   * Setup: Sign in and activate the first available organisation.
   */
  test.beforeEach(async ({ authenticatedPage, dashboardPage, organizationPage }) => {
    void authenticatedPage;

    Logger.info('Navigating to Organisation page to activate an organisation');
    await dashboardPage.navigateToOrganization();
    await dashboardPage.page.reload(); // Ensure we have the latest data
    await organizationPage.page.reload();
    await organizationPage.waitForTableToLoad();
    const rows = organizationPage.page.locator('table[data-slot="table"] tbody tr');
    const rowCount = await rows.count();

    if (rowCount === 0) {
      throw new Error('No organisations found — please create one before running client tests.');
    }

    const firstRow = rows.first();
    const useButton = firstRow.locator('button:has-text("Use Organization")');
    const isUseButtonVisible = await useButton.isVisible().catch(() => false);

    if (isUseButtonVisible) {
      Logger.info('Activating the first organisation');
      await useButton.click();
      await organizationPage.page.waitForLoadState('networkidle');
    } else {
      Logger.info('First organisation is already active — continuing');
    }
  });

  // ---------------------------------------------------------------------------

  /**
   * Test: Create a client, verify it in the table and DB, then delete it from the DB.
   */
  test('should create, verify and delete a client', async ({ page, database }) => {
    Logger.testStart('Create, Verify and Delete Client');

    const clientName = `Test Client ${Date.now()}`;

    // ===== STEP 1: Navigate to Clients page via sidebar =====
    Logger.step(1, 'Navigate to Clients page');
    await page.locator('a[data-slot="sidebar-menu-button"][href="/clients"]').click();
    await page.waitForURL('**/clients');
    await page.waitForLoadState('domcontentloaded');

    // ===== STEP 2: Open create dialog and fill client name =====
    Logger.step(2, 'Open Create dialog and fill client name');
    const createButton = page
      .locator('div.flex.items-center.gap-2 > button')
      .filter({ hasText: 'Create' })
      .first();
    await createButton.click();

    const displayNameInput = page.locator('input#displayName');
    await displayNameInput.waitFor({ state: 'visible' });
    await displayNameInput.fill(clientName);

    // Exit the input field before clicking the submit button
    await displayNameInput.press('Tab');

    // ===== STEP 3: Submit the create dialog =====
    Logger.step(3, 'Click the Create submit button in the dialog');
    const submitButton = page.locator('button[type="submit"][data-slot="button"]');
    //await submitButton.waitFor({ state: 'visible' });
    await submitButton.click();

    // ===== STEP 4: Verify client appears in the table =====
    Logger.step(4, 'Verify client is visible in the table');
    const clientRow = page
      .locator('table[data-slot="table"] tbody tr')
      .filter({ has: page.locator('td:nth-child(2) div.text-left', { hasText: clientName }) });

    await expect(clientRow).toBeVisible({ timeout: 15_000 });
    Logger.success(`Client "${clientName}" is visible in the table`);

    // ===== STEP 5: Verify client exists in the database =====
    Logger.step(5, 'Verify client exists in the database');
    const found = await database.query<{ display_name: string }>(
      `SELECT display_name FROM client WHERE display_name = $1 LIMIT 1`,
      [clientName]
    );
    expect(found.length).toBe(1);
    expect(found[0].display_name).toBe(clientName);
    Logger.success(`Client "${clientName}" confirmed in database`);

    // ===== STEP 6: Delete the client from the database =====
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