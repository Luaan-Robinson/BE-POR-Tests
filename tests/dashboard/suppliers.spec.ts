import { test, expect } from '../../fixtures/test-fixtures';
import { Logger } from '../../utils/logger';

test.describe('Suppliers Management', () => {
  test.beforeEach(async ({ authenticatedPage, dashboardPage, organizationPage }) => {
    void authenticatedPage;

    Logger.info('Navigating to Organisation page to activate an organisation');
    await dashboardPage.navigateToOrganization();
    await dashboardPage.page.reload();
    await organizationPage.waitForTableToLoad();

    const rows = organizationPage.page.locator('table[data-slot="table"] tbody tr');
    if ((await rows.count()) === 0) {
      throw new Error('No organisations found — please create one before running supplier tests.');
    }

    const useButton = rows.first().locator('button:has-text("Use Organization")');
    if (await useButton.isVisible().catch(() => false)) {
      Logger.info('Activating the first organisation');
      await useButton.click();
      await organizationPage.page.waitForLoadState('networkidle');
    } else {
      Logger.info('First organisation is already active — continuing');
    }
  });

  test('should create, verify and delete a supplier', async ({ page, database }) => {
    Logger.testStart('Create, Verify and Delete Supplier');

    const supplierName = `Test Supplier ${Date.now()}`;
    const gpsLat = '4.23';
    const gpsLng = '5.32';

    // ===== STEP 1: Navigate to Suppliers page =====
    Logger.step(1, 'Navigate to Suppliers page');
    await page.locator('a[data-slot="sidebar-menu-button"][href="/suppliers"]').click();
    await page.waitForURL('**/suppliers');
    await page.waitForLoadState('domcontentloaded');

    // ===== STEP 2: Open create dialog and fill fields =====
    Logger.step(2, 'Open Create dialog and fill supplier details');
    await page
      .locator('div.flex.items-center.gap-2 > button')
      .filter({ hasText: 'Create' })
      .click();

    const displayNameInput = page.locator('input#displayName');
    await displayNameInput.waitFor({ state: 'visible' });
    await displayNameInput.fill(supplierName);
    await page.locator('input#gpsLatitude').fill(gpsLat);
    await page.locator('input#gpsLongitude').fill(gpsLng);

    // ===== STEP 3: Handle supplier groups dropdown =====
    Logger.step(3, 'Handle Supplier Groups dropdown');
    await page.locator('button[data-slot="popover-trigger"][name="supplierGroups"]').click();

    const selectableItems = page
      .locator('[cmdk-item]')
      .filter({ hasNotText: '(Select All)' })
      .filter({ hasNotText: 'Close' });
    const itemCount = await selectableItems.count().catch(() => 0);
    if (itemCount > 0) {
      Logger.info('Selecting first available supplier group');
      await selectableItems.first().click();
    } else {
      Logger.info('No supplier groups to select — closing dropdown');
    }

    const closeBtn = page.locator('[cmdk-item]').filter({ hasText: 'Close' });
    await closeBtn.waitFor({ state: 'visible', timeout: 5000 });
    await closeBtn.click();

    // ===== STEP 4: Submit =====
    Logger.step(4, 'Submit the Create dialog');
    const submitButton = page.locator('button[type="submit"]').filter({ hasText: 'Create' });
    await submitButton.waitFor({ state: 'visible' });
    await submitButton.click();

    // ===== STEP 5: Verify in table =====
    Logger.step(5, 'Verify supplier is visible in the table');
    const supplierRow = page
      .locator('table[data-slot="table"] tbody tr')
      .filter({ has: page.locator('td:nth-child(2) div.text-left', { hasText: supplierName }) });

    await expect(supplierRow).toBeVisible({ timeout: 15_000 });
    Logger.success(`Supplier "${supplierName}" is visible in the table`);

    // ===== STEP 6: Verify in database =====
    Logger.step(6, 'Verify supplier exists in the database');
    const found = await database.query<{ display_name: string }>(
      `SELECT display_name FROM suppliers WHERE display_name = $1 LIMIT 1`,
      [supplierName]
    );
    expect(found.length).toBe(1);
    expect(found[0].display_name).toBe(supplierName);
    Logger.success(`Supplier "${supplierName}" confirmed in database`);

    // ===== STEP 7: Delete from database =====
    Logger.step(7, 'Delete supplier from the database');
    const supplier = await database.query<{ id: string }>(
      `SELECT id FROM suppliers WHERE display_name = $1 LIMIT 1`,
      [supplierName]
    );
    expect(supplier.length).toBe(1);
    const supplierId = supplier[0].id;

    // Remove junction table rows first to satisfy foreign key constraint
    await database.query(`DELETE FROM suppliers_to_supplier_groups WHERE supplier_id = $1`, [
      supplierId,
    ]);

    const deleted = await database.query<{ id: string }>(
      `DELETE FROM suppliers WHERE id = $1 RETURNING id`,
      [supplierId]
    );
    expect(deleted.length).toBe(1);
    Logger.success(`Supplier "${supplierName}" deleted from database (id: ${deleted[0].id})`);

    Logger.testEnd('Create, Verify and Delete Supplier', true);
  });
});
