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
 * - Deletes it from the database
 */
test.describe('Organization Management', () => {
  test.beforeEach(async ({ authenticatedPage, dashboardPage }) => {
    void authenticatedPage;
    Logger.info('Navigating to Organization page');
    await dashboardPage.navigateToOrganization();
  });

  test('should create, verify and delete an organization', async ({
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

    // ===== STEP 6: Delete organization from the database =====
    Logger.step(6, 'Delete organization from the database');
    const deleted = await database.deleteOrganizationBySlug(orgData.slug);
    expect(deleted).toBe(true);
    Logger.success(`Organization "${orgData.slug}" deleted from database`);

    Logger.testEnd('Create, Verify and Delete Organization', true);
  });
});
