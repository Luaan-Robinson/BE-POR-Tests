import { test, expect } from '../../fixtures/test-fixtures';
import { Logger } from '../../utils/logger';
import { OrganizationHelper } from '../../utils/organization-helper';
import { SkuMasterRatesPage } from '../../pages/SkuMasterRatesPage';

/**
 * SKU Master Rates Management Test Suite
 *
 * SELF-CONTAINED TESTS:
 * - Ensures an active organization exists before running tests
 * - Creates a SKU Master Rate by adding a supplier to a category
 * - Verifies the rate entry appears in the UI table (by finding any SKU with the selected supplier)
 * - Verifies the rate entry exists in the database (skuRate table)
 * - Deletes the rate entry directly from the database
 */
test.describe('SKU Master Rates Management', () => {
  test.beforeEach(async ({ authenticatedPage, page, database, dashboardPage, organizationPage }) => {
    void authenticatedPage;
    await OrganizationHelper.ensureActiveOrganization(page, database, dashboardPage, organizationPage);
  });

  test('should create, verify and delete a SKU Master Rate', async ({
    page,
    database,
    dashboardPage,
  }) => {
    Logger.testStart('Create, Verify and Delete SKU Master Rate');

    const skuMasterRatesPage = new SkuMasterRatesPage(page);

    // ===== STEP 1: Navigate to SKU Master Rates page =====
    Logger.step(1, 'Navigate to SKU Master Rates page');
    await dashboardPage.expandSidebarGroup('SKUs');
    await skuMasterRatesPage.navigateToSkuMasterRates();

    // ===== STEP 2: Open dialog and add supplier to category =====
    Logger.step(2, 'Open Add Supplier dialog and select random category and supplier');
    const { categoryName, supplierName } = await skuMasterRatesPage.addSupplierToCategory();

    // Wait for the table to update
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // ===== STEP 3: Query database to find the created rates =====
    Logger.step(3, 'Query database to find the created rate entries');
    
    // Get the category ID
    const categoryResult = await database.query<{ id: string }>(
      `SELECT id FROM "skuCategory" WHERE "displayName" = $1 LIMIT 1`,
      [categoryName]
    );
    
    if (categoryResult.length === 0) {
      throw new Error(`Category "${categoryName}" not found in database`);
    }
    const categoryId = categoryResult[0].id;
    
    // Get the supplier ID
    const supplierResult = await database.query<{ id: string }>(
      `SELECT id FROM "suppliers" WHERE "display_name" = $1 LIMIT 1`,
      [supplierName]
    );
    if (supplierResult.length === 0) {
      throw new Error(`Supplier "${supplierName}" not found in database`);
    }
    const supplierId = supplierResult[0].id;
    
    // Find all SKU rates created for this supplier in this category
    const ratesCreated = await database.query<{ skuId: string; skuName: string; rate: string }>(
      `SELECT sr."skuId", s."displayName" as "skuName", sr.rate 
       FROM "skuRate" sr
       JOIN "sku" s ON s.id = sr."skuId"
       WHERE sr."supplierId" = $1 
       AND s."skuCategoryId" = $2
       ORDER BY sr."rateLastUpdatedAt" DESC`,
      [supplierId, categoryId]
    );
    
    Logger.info(`Found ${ratesCreated.length} rate(s) created for category "${categoryName}" with supplier "${supplierName}"`);
    
    if (ratesCreated.length === 0) {
      throw new Error(`No rates found for category "${categoryName}" with supplier "${supplierName}"`);
    }
    
    // Get the first rate as an example to verify
    const exampleRate = ratesCreated[0];
    const exampleSkuName = exampleRate.skuName;
    const exampleRateValue = exampleRate.rate;
    const exampleSkuId = exampleRate.skuId;
    
    Logger.success(`Found rate: SKU "${exampleSkuName}", Rate: ${exampleRateValue}`);

    // ===== STEP 4: Verify in UI table by finding any rate with the supplier =====
    Logger.step(4, 'Verify at least one SKU rate entry appears in the table for the supplier');
    
    // Refresh to ensure latest data
    Logger.info('Refreshing page to ensure latest data...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await skuMasterRatesPage.waitForTableToLoad();

    // Check if ANY rate exists for this supplier (this will scroll to find it)
    const anyRateExists = await skuMasterRatesPage.anyRateExistsForSupplier(supplierName);
    expect(anyRateExists).toBe(true);
    Logger.success(`Rate entries for Supplier "${supplierName}" are visible in the table`);

    // Also verify that the specific rate we found in DB is visible (this will scroll to find it)
    const specificRateFound = await skuMasterRatesPage.rateExistsInTable(exampleSkuName, supplierName);
    expect(specificRateFound).toBe(true);
    Logger.success(`Rate entry for SKU "${exampleSkuName}" and Supplier "${supplierName}" is visible in the table`);

    // ===== STEP 5: Verify rate details in database =====
    Logger.step(5, 'Verify rate details in database for the example rate');
    
    const rateDetails = await database.query<{ 
      id: string; 
      rate: string; 
      previousRate: string | null;
      rateLastUpdatedAt: Date;
    }>(
      `SELECT id, rate, "previousRate", "rateLastUpdatedAt" 
       FROM "skuRate" 
       WHERE "skuId" = $1 AND "supplierId" = $2 
       LIMIT 1`,
      [exampleSkuId, supplierId]
    );
    
    expect(rateDetails.length).toBe(1);
    expect(rateDetails[0].rate).toBe(exampleRateValue);
    Logger.success(`Rate entry confirmed in database with value: ${rateDetails[0].rate}`);

    // ===== STEP 6: Delete ALL rates created for this supplier in this category =====
    Logger.step(6, 'Delete all rate entries for this supplier from the database');
    
    // Delete all rates for this supplier in this category
    for (const rate of ratesCreated) {
      const rateRecord = await database.query<{ id: string }>(
        `SELECT id FROM "skuRate" WHERE "skuId" = $1 AND "supplierId" = $2 LIMIT 1`,
        [rate.skuId, supplierId]
      );
      
      if (rateRecord.length > 0) {
        const deleted = await database.query<{ id: string }>(
          `DELETE FROM "skuRate" WHERE id = $1 RETURNING id`,
          [rateRecord[0].id]
        );
        Logger.info(`Deleted rate entry for SKU "${rate.skuName}" (id: ${deleted[0].id})`);
      }
    }
    
    Logger.success(`Deleted ${ratesCreated.length} rate entries from database`);

    // Verify all rates are deleted
    const remainingRates = await database.query<{ id: string }>(
      `SELECT sr.id FROM "skuRate" sr
       JOIN "sku" s ON s.id = sr."skuId"
       WHERE sr."supplierId" = $1 AND s."skuCategoryId" = $2`,
      [supplierId, categoryId]
    );
    expect(remainingRates.length).toBe(0);
    Logger.success('All rate entries confirmed deleted from database');

    Logger.testEnd('Create, Verify and Delete SKU Master Rate', true);
  });
});