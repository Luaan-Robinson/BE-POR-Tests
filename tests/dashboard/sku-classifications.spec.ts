import { test, expect } from '../../fixtures/test-fixtures';
import { Logger } from '../../utils/logger';
import { OrganizationHelper } from '../../utils/organization-helper';
import { SkuClassificationsPage } from '../../pages/SkuClassificationsPage';

/**
 * SKU Classifications Management Test Suite
 *
 * SELF-CONTAINED TESTS:
 * - Ensures an active organization exists before running tests
 * - Creates a unique SKU Classification
 * - Verifies it in the UI table (with pagination support)
 * - Verifies it in the database
 * - Deletes it via the UI (with confirmation dialog)
 * - Verifies it's gone from the table and database
 */
test.describe('SKU Classifications Management', () => {
  test.beforeEach(async ({ authenticatedPage, page, database, dashboardPage, organizationPage }) => {
    void authenticatedPage;
    await OrganizationHelper.ensureActiveOrganization(page, database, dashboardPage, organizationPage);
  });

  test('should create, verify and delete a SKU Classification', async ({
    page,
    database,
    dashboardPage,
  }) => {
    Logger.testStart('Create, Verify and Delete SKU Classification');

    const classificationName = `Test SKU Classification ${Date.now()}`;
    const skuClassificationsPage = new SkuClassificationsPage(page);

    // ===== STEP 1: Navigate to SKU Classifications page =====
    Logger.step(1, 'Navigate to SKU Classifications page');
    await dashboardPage.expandSidebarGroup('SKUs');
    await skuClassificationsPage.navigateToSkuClassifications();

    // ===== STEP 2: Open create dialog and fill classification name =====
    Logger.step(2, 'Open Create dialog and fill classification name');
    await skuClassificationsPage.createClassification(classificationName);

    // Wait for dialog to close and table to update
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // ===== STEP 3: Verify in table with pagination support =====
    Logger.step(3, 'Verify classification is visible in the table');

    // Refresh to ensure latest data
    Logger.info('Refreshing page to ensure latest data...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const found = await skuClassificationsPage.classificationExistsInTable(classificationName);
    expect(found).toBe(true);
    Logger.success(`SKU Classification "${classificationName}" is visible in the table`);

    // ===== STEP 4: Verify in database =====
    Logger.step(4, 'Verify classification exists in the database');
    const foundInDb = await database.query<{ display_name: string }>(
      `SELECT "displayName" as display_name FROM "skuClassification" WHERE "displayName" = $1 LIMIT 1`,
      [classificationName]
    );
    expect(foundInDb.length).toBe(1);
    expect(foundInDb[0].display_name).toBe(classificationName);
    Logger.success(`SKU Classification "${classificationName}" confirmed in database`);

    // ===== STEP 5: Delete from UI =====
    Logger.step(5, 'Delete classification from the UI');
    const deleted = await skuClassificationsPage.deleteClassification(classificationName);
    expect(deleted).toBe(true);
    Logger.success(`SKU Classification "${classificationName}" deleted from UI`);

    // ===== STEP 6: Verify deletion from database =====
    Logger.step(6, 'Verify classification is deleted from the database');
    const afterDelete = await database.query<{ display_name: string }>(
      `SELECT "displayName" as display_name FROM "skuClassification" WHERE "displayName" = $1 LIMIT 1`,
      [classificationName]
    );
    expect(afterDelete.length).toBe(0);
    Logger.success(`SKU Classification "${classificationName}" confirmed deleted from database`);

    Logger.testEnd('Create, Verify and Delete SKU Classification', true);
  });
});