import { test, expect } from '../../fixtures/test-fixtures';
import { Logger } from '../../utils/logger';
import { OrganizationHelper } from '../../utils/organization-helper';
import { SkuCategoriesPage } from '../../pages/SkuCategoriesPage';

/**
 * SKU Categories Management Test Suite
 *
 * SELF-CONTAINED TESTS:
 * - Ensures an active organization exists before running tests
 * - Scenario 1: Creates a SKU Category with a Supplier Group selected
 * - Scenario 2: Creates a SKU Category with individual Suppliers selected
 * - Both tests verify the entity in the UI table and database, then delete via SQL
 */
test.describe('SKU Categories Management', () => {
  test.beforeEach(async ({ authenticatedPage, page, database, dashboardPage, organizationPage }) => {
    void authenticatedPage;
    await OrganizationHelper.ensureActiveOrganization(page, database, dashboardPage, organizationPage);
  });

  // ---------------------------------------------------------------------------
  // Scenario 1: Create SKU Category with a Supplier Group
  // ---------------------------------------------------------------------------
  test('should create, verify and delete a SKU Category with a Supplier Group', async ({
    page,
    database,
    dashboardPage,
  }) => {
    Logger.testStart('Create, Verify and Delete SKU Category (Supplier Group)');

    const categoryName = `Test SKU Cat ${Date.now()}`;
    const skuCategoriesPage = new SkuCategoriesPage(page);

    // ===== STEP 1: Navigate to SKU Categories =====
    Logger.step(1, 'Navigate to SKU Categories page');
    await dashboardPage.expandSidebarGroup('SKUs');
    await skuCategoriesPage.navigateToSkuCategories();

    // ===== STEP 2: Open create dialog and fill details =====
    Logger.step(2, 'Open Create dialog and fill SKU Category name');
    await skuCategoriesPage.openCreateDialog();
    await skuCategoriesPage.fillDisplayName(categoryName);

    // ===== STEP 3: Select "If Rate Not Found Use" =====
    Logger.step(3, 'Select "If Rate Not Found Use" option');
    await skuCategoriesPage.selectIfRateNotFoundUse('Minimum');

    // ===== STEP 4: Select a Supplier Group =====
    Logger.step(4, 'Select a Supplier Group');
    // Get the first available supplier group from the hidden select options
    const supplierGroupOptions = await page
      .locator('select[name="supplierGroupId"] option:not([value="none"])')
      .all();

    if (supplierGroupOptions.length > 0) {
      const firstGroupName = await supplierGroupOptions[0].textContent();
      await skuCategoriesPage.selectSupplierGroup(firstGroupName?.trim() ?? '');
    } else {
      Logger.warning('No supplier groups available — leaving as None');
    }

    // ===== STEP 5: Submit =====
    Logger.step(5, 'Submit the Create dialog');
    await skuCategoriesPage.submitCreateDialog();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // ===== STEP 6: Verify in UI table =====
    Logger.step(6, 'Verify SKU Category is visible in the table');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await skuCategoriesPage.waitForTableToLoad();

    const found = await skuCategoriesPage.findRowByName(categoryName);
    expect(found).toBe(true);
    Logger.success(`SKU Category "${categoryName}" is visible in the table`);

    // ===== STEP 7: Verify in database =====
    Logger.step(7, 'Verify SKU Category exists in the database');
    const foundInDb = await database.query<{ display_name: string }>(
      `SELECT "displayName" as display_name FROM "skuCategory" WHERE "displayName" = $1 LIMIT 1`,
      [categoryName]
    );
    expect(foundInDb.length).toBe(1);
    expect(foundInDb[0].display_name).toBe(categoryName);
    Logger.success(`SKU Category "${categoryName}" confirmed in database`);

    // ===== STEP 8: Delete from database =====
    Logger.step(8, 'Delete SKU Category from the database');
    const skuCategory = await database.query<{ id: string }>(
      `SELECT id FROM "skuCategory" WHERE "displayName" = $1 LIMIT 1`,
      [categoryName]
    );
    expect(skuCategory.length).toBe(1);
    const skuCategoryId = skuCategory[0].id;

    // Delete junction table entries first
    await database.query(
      `DELETE FROM "skuCategory_vs_Suppliers" WHERE "skuCategoryId" = $1`,
      [skuCategoryId]
    );

    const deleted = await database.query<{ id: string }>(
      `DELETE FROM "skuCategory" WHERE id = $1 RETURNING id`,
      [skuCategoryId]
    );
    expect(deleted.length).toBe(1);
    Logger.success(`SKU Category "${categoryName}" deleted from database (id: ${deleted[0].id})`);

    Logger.testEnd('Create, Verify and Delete SKU Category (Supplier Group)', true);
  });

  // ---------------------------------------------------------------------------
  // Scenario 2: Create SKU Category with individual Suppliers
  // ---------------------------------------------------------------------------
  test('should create, verify and delete a SKU Category with Suppliers', async ({
    page,
    database,
    dashboardPage,
  }) => {
    Logger.testStart('Create, Verify and Delete SKU Category (Suppliers)');

    const categoryName = `Test SKU Cat ${Date.now()}`;
    const skuCategoriesPage = new SkuCategoriesPage(page);

    // ===== STEP 1: Navigate to SKU Categories =====
    Logger.step(1, 'Navigate to SKU Categories page');
    await dashboardPage.expandSidebarGroup('SKUs');
    await skuCategoriesPage.navigateToSkuCategories();

    // ===== STEP 2: Open create dialog and fill details =====
    Logger.step(2, 'Open Create dialog and fill SKU Category name');
    await skuCategoriesPage.openCreateDialog();
    await skuCategoriesPage.fillDisplayName(categoryName);

    // ===== STEP 3: Select "If Rate Not Found Use" =====
    Logger.step(3, 'Select "If Rate Not Found Use" option');
    await skuCategoriesPage.selectIfRateNotFoundUse('Maximum');

    // ===== STEP 4: Leave Supplier Group as None and select a supplier =====
    Logger.step(4, 'Select a Supplier from the Supplier Name list');
    // Supplier Group stays as "None" (default) — Supplier Name rows should be visible
    await skuCategoriesPage.selectSupplier('', 0);

    // ===== STEP 5: Submit =====
    Logger.step(5, 'Submit the Create dialog');
    await skuCategoriesPage.submitCreateDialog();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // ===== STEP 6: Verify in UI table =====
    Logger.step(6, 'Verify SKU Category is visible in the table');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await skuCategoriesPage.waitForTableToLoad();

    const found = await skuCategoriesPage.findRowByName(categoryName);
    expect(found).toBe(true);
    Logger.success(`SKU Category "${categoryName}" is visible in the table`);

    // ===== STEP 7: Verify in database =====
    Logger.step(7, 'Verify SKU Category exists in the database');
    const foundInDb = await database.query<{ display_name: string }>(
      `SELECT "displayName" as display_name FROM "skuCategory" WHERE "displayName" = $1 LIMIT 1`,
      [categoryName]
    );
    expect(foundInDb.length).toBe(1);
    expect(foundInDb[0].display_name).toBe(categoryName);
    Logger.success(`SKU Category "${categoryName}" confirmed in database`);

    // ===== STEP 8: Delete from database =====
    Logger.step(8, 'Delete SKU Category from the database');
    const skuCategory = await database.query<{ id: string }>(
      `SELECT id FROM "skuCategory" WHERE "displayName" = $1 LIMIT 1`,
      [categoryName]
    );
    expect(skuCategory.length).toBe(1);
    const skuCategoryId = skuCategory[0].id;

    // Delete junction table entries first
    await database.query(
      `DELETE FROM "skuCategory_vs_Suppliers" WHERE "skuCategoryId" = $1`,
      [skuCategoryId]
    );

    const deleted = await database.query<{ id: string }>(
      `DELETE FROM "skuCategory" WHERE id = $1 RETURNING id`,
      [skuCategoryId]
    );
    expect(deleted.length).toBe(1);
    Logger.success(`SKU Category "${categoryName}" deleted from database (id: ${deleted[0].id})`);

    Logger.testEnd('Create, Verify and Delete SKU Category (Suppliers)', true);
  });
});