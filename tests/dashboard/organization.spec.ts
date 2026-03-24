import { test, expect } from '../../fixtures/test-fixtures';
import { Logger } from '../../utils/logger';
import { TestDataGenerator } from '../../utils/test-data-generator';

/**
 * Organization Management Test Suite
 *
 * SELF-CONTAINED:
 * - Creates a unique organization
 * - Verifies it in the UI table
 * - Verifies it in the database
 * - Cleans up any dependent data before deleting the organization
 * - Deletes it from the database
 */
test.describe('Organization Management', () => {
  test.beforeEach(async ({ authenticatedPage, dashboardPage }) => {
    void authenticatedPage;
    Logger.info('Navigating to Organization page');
    await dashboardPage.navigateToOrganization();
  });

  test('should create, verify and delete an organization', async ({
    page,
    dashboardPage,
    organizationPage,
    database,
  }) => {
    Logger.testStart('Create, Verify and Delete Organization');

    // ===== STEP 1: Navigate to create page =====
    Logger.step(1, 'Navigate to create page');
    await dashboardPage.clickCreateButton();
    await expect(organizationPage.page).toHaveURL(/\/organization\/create/);

    // ===== STEP 2: Generate unique organization data =====
    Logger.step(2, 'Generate unique organization data');
    const orgData = TestDataGenerator.generateOrganization();
    Logger.info(`Organization: name="${orgData.name}", slug="${orgData.slug}"`);

    // ===== STEP 3: Fill and submit the form =====
    Logger.step(3, 'Fill and submit organization form');
    await organizationPage.fillOrganizationForm(orgData, 'test-logo.png');
    await organizationPage.clickSubmit();

    const submissionSuccessful = await organizationPage.verifyNavigationAfterSubmit();
    expect(submissionSuccessful).toBe(true);
    Logger.success('Form submitted successfully');

    // ===== STEP 4: Verify organization appears in the UI table =====
    Logger.step(4, 'Navigate to organization list and verify in table');
    await dashboardPage.navigateToOrganization();
    
    // Refresh to ensure latest data
    Logger.info('Refreshing page to ensure latest data...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await organizationPage.waitForTableToLoad();

    const isInTable = await organizationPage.verifyOrganizationInTable(orgData.slug);
    expect(isInTable).toBeTruthy();
    Logger.success(`Organization "${orgData.slug}" found in UI table`);

    // ===== STEP 5: Verify organization exists in the database =====
    Logger.step(5, 'Verify organization exists in the database');
    const dbOrg = await database.findOrganizationBySlug(orgData.slug);
    expect(dbOrg).not.toBeNull();
    expect(dbOrg?.slug).toBe(orgData.slug);
    expect(dbOrg?.name).toBe(orgData.name);
    Logger.success(`Organization "${orgData.slug}" confirmed in database`);

    // ===== STEP 6: Clean up dependent data and delete organization =====
    Logger.step(6, 'Clean up dependent data and delete organization from the database');

    // First, find the organization ID
    const orgId = dbOrg?.id;
    if (orgId) {
      // Delete any clients associated with this organization
      const clientsDeleted = await database.query(
        `DELETE FROM client WHERE organization_id = $1`,
        [orgId]
      );
      Logger.info(`Deleted ${clientsDeleted.length} clients associated with organization`);

      // Delete any suppliers associated with this organization
      const suppliersDeleted = await database.query(
        `DELETE FROM suppliers WHERE organization_id = $1`,
        [orgId]
      );
      Logger.info(`Deleted ${suppliersDeleted.length} suppliers associated with organization`);

      // Delete any supplier groups associated with this organization
      const supplierGroupsDeleted = await database.query(
        `DELETE FROM supplier_groups WHERE organization_id = $1`,
        [orgId]
      );
      Logger.info(`Deleted ${supplierGroupsDeleted.length} supplier groups associated with organization`);
    }

    // Now delete the organization
    const deleted = await database.deleteOrganizationBySlug(orgData.slug);
    expect(deleted).toBe(true);
    Logger.success(`Organization "${orgData.slug}" deleted from database`);

    Logger.testEnd('Create, Verify and Delete Organization', true);
  });
});