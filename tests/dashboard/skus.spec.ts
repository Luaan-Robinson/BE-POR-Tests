import { test, expect } from '../../fixtures/test-fixtures';
import { Logger } from '../../utils/logger';
import { OrganizationHelper } from '../../utils/organization-helper';
import { SkusPage } from '../../pages/SkusPage';

/**
 * SKU Management Test Suite
 *
 * SELF-CONTAINED TESTS:
 * - Ensures an active organization exists before running tests
 * - Scenario 1: Creates a SKU without weight conversion
 * - Scenario 2: Creates a SKU with weight conversion
 * - Both tests verify the entity in the UI table and database, then delete via SQL
 */
test.describe('SKU Management', () => {
  test.beforeEach(async ({ authenticatedPage, page, database, dashboardPage, organizationPage }) => {
    void authenticatedPage;
    await OrganizationHelper.ensureActiveOrganization(page, database, dashboardPage, organizationPage);
  });

  /**
   * Helper function to get the first available SKU Category from the database
   */
  async function getFirstSkuCategory(database: any): Promise<string> {
    const categories = await database.query<{ displayName: string }>(
      `SELECT "displayName" FROM "skuCategory" LIMIT 1`
    );
    if (categories.length === 0) {
      throw new Error('No SKU Categories found in database. Please create at least one SKU Category first.');
    }
    return categories[0].displayName;
  }

  /**
   * Helper function to get the first available SKU Classification from the database
   */
  async function getFirstSkuClassification(database: any): Promise<string> {
    const classifications = await database.query<{ displayName: string }>(
      `SELECT "displayName" FROM "skuClassification" LIMIT 1`
    );
    if (classifications.length === 0) {
      throw new Error('No SKU Classifications found in database. Please create at least one SKU Classification first.');
    }
    return classifications[0].displayName;
  }

  // ---------------------------------------------------------------------------
  // Scenario 1: Create SKU without weight conversion (Can Convert To Weight = No)
  // ---------------------------------------------------------------------------
  test('should create, verify and delete a SKU without weight conversion', async ({
    page,
    database,
    dashboardPage,
  }) => {
    Logger.testStart('Create, Verify and Delete SKU (No Weight Conversion)');

    const skuName = `Test SKU ${Date.now()}`;
    const skusPage = new SkusPage(page);

    // Get existing SKU Category and Classification
    const skuCategory = await getFirstSkuCategory(database);
    const skuClassification = await getFirstSkuClassification(database);
    Logger.info(`Using SKU Category: ${skuCategory}`);
    Logger.info(`Using SKU Classification: ${skuClassification}`);

    // ===== STEP 1: Navigate to SKUs page =====
    Logger.step(1, 'Navigate to SKUs page');
    await dashboardPage.expandSidebarGroup('SKUs');
    await skusPage.navigateToSkus();

    // ===== STEP 2: Open create dialog and fill SKU details =====
    Logger.step(2, 'Open Create dialog and fill SKU details (without weight conversion)');
    await skusPage.createSkuWithoutWeight(
      skuName,
      skuCategory,
      skuClassification,
      'm3'  // Use cubic metre as default unit
    );

    // Wait for dialog to close and table to update
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // ===== STEP 3: Verify in table with pagination support =====
    Logger.step(3, 'Verify SKU is visible in the table');

    // Refresh to ensure latest data
    Logger.info('Refreshing page to ensure latest data...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const found = await skusPage.skuExistsInTable(skuName);
    expect(found).toBe(true);
    Logger.success(`SKU "${skuName}" is visible in the table`);

    // ===== STEP 4: Verify in database =====
    Logger.step(4, 'Verify SKU exists in the database');
    const foundInDb = await database.query<{ displayName: string }>(
      `SELECT "displayName" FROM "sku" WHERE "displayName" = $1 LIMIT 1`,
      [skuName]
    );
    expect(foundInDb.length).toBe(1);
    expect(foundInDb[0].displayName).toBe(skuName);
    Logger.success(`SKU "${skuName}" confirmed in database`);

    // ===== STEP 5: Delete from database =====
    Logger.step(5, 'Delete SKU from the database');
    const skuRecord = await database.query<{ id: string }>(
      `SELECT id FROM "sku" WHERE "displayName" = $1 LIMIT 1`,
      [skuName]
    );
    expect(skuRecord.length).toBe(1);
    const skuId = skuRecord[0].id;

    // Delete related records first (SKU properties and rates)
    await database.query(
      `DELETE FROM "skuProperties" WHERE "skuId" = $1`,
      [skuId]
    );
    await database.query(
      `DELETE FROM "skuRate" WHERE "skuId" = $1`,
      [skuId]
    );

    const deleted = await database.query<{ id: string }>(
      `DELETE FROM "sku" WHERE id = $1 RETURNING id`,
      [skuId]
    );
    expect(deleted.length).toBe(1);
    Logger.success(`SKU "${skuName}" deleted from database (id: ${deleted[0].id})`);

    Logger.testEnd('Create, Verify and Delete SKU (No Weight Conversion)', true);
  });

  // ---------------------------------------------------------------------------
  // Scenario 2: Create SKU with weight conversion (Can Convert To Weight = Yes)
  // ---------------------------------------------------------------------------
  test('should create, verify and delete a SKU with weight conversion', async ({
    page,
    database,
    dashboardPage,
  }) => {
    Logger.testStart('Create, Verify and Delete SKU (With Weight Conversion)');

    const skuName = `Test SKU Weight ${Date.now()}`;
    const weightFactor = Number((Math.random() * 5 + 0.5).toFixed(2)); // Random between 0.5 and 5.5, rounded to 2 decimals
    const skusPage = new SkusPage(page);

    // Get existing SKU Category and Classification
    const skuCategory = await getFirstSkuCategory(database);
    const skuClassification = await getFirstSkuClassification(database);
    Logger.info(`Using SKU Category: ${skuCategory}`);
    Logger.info(`Using SKU Classification: ${skuClassification}`);
    Logger.info(`Using Weight Factor: ${weightFactor} kg`);

    // ===== STEP 1: Navigate to SKUs page =====
    Logger.step(1, 'Navigate to SKUs page');
    await dashboardPage.expandSidebarGroup('SKUs');
    await skusPage.navigateToSkus();

    // ===== STEP 2: Open create dialog and fill SKU details with weight conversion =====
    Logger.step(2, 'Open Create dialog and fill SKU details (with weight conversion)');
    await skusPage.createSkuWithWeight(
      skuName,
      skuCategory,
      skuClassification,
      'units',  // Use units as base unit for weight conversion
      weightFactor,
      'kg'      // Weight unit in kilograms
    );

    // Wait for dialog to close and table to update
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // ===== STEP 3: Verify in table with pagination support =====
    Logger.step(3, 'Verify SKU is visible in the table');

    // Refresh to ensure latest data
    Logger.info('Refreshing page to ensure latest data...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const found = await skusPage.skuExistsInTable(skuName);
    expect(found).toBe(true);
    Logger.success(`SKU "${skuName}" is visible in the table`);

    // ===== STEP 4: Verify in database =====
    Logger.step(4, 'Verify SKU exists in the database');
    const foundInDb = await database.query<{ displayName: string }>(
      `SELECT "displayName" FROM "sku" WHERE "displayName" = $1 LIMIT 1`,
      [skuName]
    );
    expect(foundInDb.length).toBe(1);
    expect(foundInDb[0].displayName).toBe(skuName);
    Logger.success(`SKU "${skuName}" confirmed in database`);

    // Also verify the weight conversion properties were saved
    Logger.step(4.1, 'Verify weight conversion properties in database');
    const skuRecord = await database.query<{ id: string }>(
      `SELECT id FROM "sku" WHERE "displayName" = $1 LIMIT 1`,
      [skuName]
    );
    const skuId = skuRecord[0].id;

    const weightProperties = await database.query<{ propertyType: string; value: string; unitId: string }>(
      `SELECT "propertyType", "value", "unitId" FROM "skuProperties" WHERE "skuId" = $1`,
      [skuId]
    );

    expect(weightProperties.length).toBeGreaterThan(0);
    const weightConversionProperty = weightProperties.find(p => p.propertyType === 'weightConversionFactor');
    expect(weightConversionProperty).toBeDefined();
    expect(parseFloat(weightConversionProperty!.value)).toBeCloseTo(weightFactor, 2);
    Logger.success(`Weight conversion factor "${weightFactor}" confirmed in database`);

    // ===== STEP 5: Delete from database =====
    Logger.step(5, 'Delete SKU from the database');

    // Delete related records first (SKU properties and rates)
    await database.query(
      `DELETE FROM "skuProperties" WHERE "skuId" = $1`,
      [skuId]
    );
    await database.query(
      `DELETE FROM "skuRate" WHERE "skuId" = $1`,
      [skuId]
    );

    const deleted = await database.query<{ id: string }>(
      `DELETE FROM "sku" WHERE id = $1 RETURNING id`,
      [skuId]
    );
    expect(deleted.length).toBe(1);
    Logger.success(`SKU "${skuName}" deleted from database (id: ${deleted[0].id})`);

    Logger.testEnd('Create, Verify and Delete SKU (With Weight Conversion)', true);
  });
});