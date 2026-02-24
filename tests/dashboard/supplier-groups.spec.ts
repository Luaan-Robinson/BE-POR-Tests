import { test, expect } from '../../fixtures/test-fixtures';
import { Logger } from '../../utils/logger';

test.describe('Supplier Groups Management', () => {
  test.beforeEach(async ({ authenticatedPage, dashboardPage, organizationPage }) => {
    void authenticatedPage;

    Logger.info('Navigating to Organisation page');
    await dashboardPage.navigateToOrganization();
    await dashboardPage.page.reload();
    await organizationPage.waitForTableToLoad();

    const rows = organizationPage.page.locator('table[data-slot="table"] tbody tr');
    if ((await rows.count()) === 0) {
      throw new Error('No organisations found — please create one before running these tests.');
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

  test('should create, verify and delete a supplier group', async ({ page, database }) => {
    Logger.testStart('Create, Verify and Delete Supplier Group');

    const groupName = `Test Supplier Group ${Date.now()}`;

    // ===== STEP 1: Navigate to Supplier Groups =====
    Logger.step(1, 'Navigate to Supplier Groups page');
    await page.locator('a[data-slot="sidebar-menu-button"][href="/supplier-groups"]').click();
    await page.waitForURL('**/supplier-groups');
    await page.waitForLoadState('domcontentloaded');

    // ===== STEP 2: Open create dialog and fill name =====
    Logger.step(2, 'Open Create dialog and fill supplier group name');
    await page
      .locator('div.flex.items-center.gap-2 > button')
      .filter({ hasText: 'Create' })
      .click();

    const displayNameInput = page.locator('input#displayName');
    await displayNameInput.waitFor({ state: 'visible' });
    await displayNameInput.fill(groupName);

    // ===== STEP 3: Open suppliers dropdown, select all if any, then close =====
    Logger.step(3, 'Handle suppliers dropdown');
    await page.locator('button[data-slot="popover-trigger"][name="supplierIds"]').click();

    const selectAll = page.locator('[cmdk-item]').filter({ hasText: '(Select All)' }).first();
    if (await selectAll.isVisible().catch(() => false)) {
      Logger.info('Selecting all available suppliers');
      await selectAll.click();
    } else {
      Logger.info('No suppliers to select — skipping');
    }

    const closeBtn = page.locator('[cmdk-item]').filter({ hasText: 'Close' });
    await closeBtn.waitFor({ state: 'visible', timeout: 5000 });
    await closeBtn.click();

    // ===== STEP 4: Submit =====
    Logger.step(4, 'Submit the create dialog');
    await displayNameInput.press('Tab');
    const submitButton = page.locator('button[type="submit"][data-slot="button"]');
    await submitButton.waitFor({ state: 'visible' });
    await submitButton.click();

    // ===== STEP 5: Verify in table =====
    Logger.step(5, 'Verify supplier group is visible in the table');
    const groupRow = page
      .locator('table[data-slot="table"] tbody tr')
      .filter({ has: page.locator('td:nth-child(2) div.text-left', { hasText: groupName }) });

    await expect(groupRow).toBeVisible({ timeout: 15_000 });
    Logger.success(`Supplier group "${groupName}" is visible in the table`);

    // ===== STEP 6: Verify in database =====
    Logger.step(6, 'Verify supplier group exists in the database');
    const found = await database.query<{ display_name: string }>(
      `SELECT display_name FROM supplier_groups WHERE display_name = $1 LIMIT 1`,
      [groupName]
    );
    expect(found.length).toBe(1);
    expect(found[0].display_name).toBe(groupName);
    Logger.success(`Supplier group "${groupName}" confirmed in database`);

    // ===== STEP 7: Delete from database =====
    Logger.step(7, 'Delete supplier group from the database');
    const deleted = await database.query<{ id: string }>(
      `DELETE FROM supplier_groups WHERE display_name = $1 RETURNING id`,
      [groupName]
    );
    expect(deleted.length).toBe(1);
    Logger.success(`Supplier group "${groupName}" deleted from database (id: ${deleted[0].id})`);

    Logger.testEnd('Create, Verify and Delete Supplier Group', true);
  });
});
