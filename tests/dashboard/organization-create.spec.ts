import { test, expect } from '../../fixtures/test-fixtures';
import { Logger } from '../../utils/logger';
import { TestDataGenerator } from '../../utils/test-data-generator';
import testConfig from '../../config/test-config';

/**
 * Organization Creation Test Suite
 *
 * SELF-CONTAINED TESTS:
 * - Each test creates its own organization
 * - Each test verifies in database
 * - Each test cleans up automatically
 * - No dependencies between tests
 */
test.describe('Organization Creation', () => {
  /**
   * Setup: Authenticate and navigate to Organization page before each test
   */
  test.beforeEach(async ({ authenticatedPage, dashboardPage }) => {
    void authenticatedPage; // User is already signed in

    Logger.info('Navigating to Organization page');
    await dashboardPage.navigateToOrganization();
  });

  /**
   * Test: Navigate to organization create page
   *
   * SELF-ISOLATION:
   * - Pure navigation test
   * - No data creation
   */
  test('should navigate to organization create page', async ({
    dashboardPage,
    organizationPage,
  }) => {
    Logger.testStart('Navigate to Organization Create Page');

    Logger.step(1, 'Verify Create button is visible');
    const isCreateButtonVisible = await dashboardPage.isCreateButtonVisible();
    expect(isCreateButtonVisible).toBe(true);

    Logger.step(2, 'Click Create button');
    await dashboardPage.clickCreateButton();

    Logger.step(3, 'Verify navigation to create page');
    const isOnCreatePage = await organizationPage.isOnCreatePage();
    expect(isOnCreatePage).toBe(true);
    await expect(organizationPage.page).toHaveURL(/\/organization\/create/);

    Logger.success('Successfully navigated to Organization Create page');
    Logger.testEnd('Navigate to Organization Create Page', true);
  });

  /**
   * Test: Display all form elements
   *
   * SELF-ISOLATION:
   * - Pure UI verification
   * - No data operations
   */
  test('should display all form elements', async ({ dashboardPage, organizationPage }) => {
    Logger.testStart('Verify Form Elements');

    Logger.step(1, 'Navigate to create page');
    await dashboardPage.clickCreateButton();
    await expect(organizationPage.page).toHaveURL(/\/organization\/create/);

    Logger.step(2, 'Verify all form fields are present');
    expect(await organizationPage.getNameValue()).toBe('');
    expect(await organizationPage.getSlugValue()).toBe('');
    expect(await organizationPage.isLogoInputVisible()).toBe(true);
    expect(await organizationPage.isSubmitButtonVisible()).toBe(true);
    expect(await organizationPage.isResetButtonVisible()).toBe(true);

    Logger.success('All form elements displayed correctly');
    Logger.testEnd('Verify Form Elements', true);
  });

  /**
   * Test: Successfully create organization
   *
   * SELF-ISOLATION:
   * - Creates unique test organization
   * - Verifies in database
   * - Auto-cleanup via testCleanup
   */
  test('should successfully create organization with database verification', async ({
    dashboardPage,
    organizationPage,
    database,
    testCleanup,
  }) => {
    Logger.testStart('Create Organization with Database Verification');

    // ===== STEP 1: NAVIGATE TO CREATE PAGE =====
    Logger.step(1, 'Navigate to create page');
    await dashboardPage.clickCreateButton();
    await expect(organizationPage.page).toHaveURL(/\/organization\/create/);

    // ===== STEP 2: GENERATE TEST DATA =====
    Logger.step(2, 'Generate unique organization data');
    const orgData = TestDataGenerator.generateOrganization();

    // Register for automatic cleanup
    testCleanup.registerOrganization(orgData.slug);

    Logger.info('Generated organization:', {
      name: orgData.name,
      slug: orgData.slug,
    });

    // ===== STEP 3: VERIFY ORG DOESN'T EXIST (PRECONDITION) =====
    Logger.step(3, 'Verify organization does not exist in database');
    const orgExistsBefore = await database.verifyOrganizationExists(orgData.slug);
    expect(orgExistsBefore).toBe(false);

    // ===== STEP 4: FILL AND SUBMIT FORM =====
    Logger.step(4, 'Fill and submit organization form');
    await organizationPage.fillOrganizationForm(orgData, 'test-logo.png');

    Logger.step(5, 'Verify logo uploaded');
    const isLogoUploaded = await organizationPage.isLogoUploaded();
    expect(isLogoUploaded).toBe(true);

    Logger.step(6, 'Submit form');
    await organizationPage.clickSubmit();

    // ===== STEP 5: VERIFY SUCCESS =====
    Logger.step(7, 'Verify submission success');
    const submissionSuccessful = await organizationPage.verifyNavigationAfterSubmit();
    expect(submissionSuccessful).toBe(true);

    // ===== STEP 6: VERIFY IN DATABASE =====
    Logger.step(8, 'Verify organization in database');

    // Wait for database write
    await organizationPage.page.waitForTimeout(2000);

    const orgExistsAfter = await database.verifyOrganizationExists(orgData.slug);
    expect(orgExistsAfter).toBe(true);

    const dbOrg = await database.findOrganizationBySlug(orgData.slug);
    expect(dbOrg).not.toBeNull();
    expect(dbOrg?.slug).toBe(orgData.slug);
    expect(dbOrg?.name).toBe(orgData.name);

    Logger.success('Organization created and verified in database');
    Logger.testEnd('Create Organization with Database Verification', true);

    // Cleanup happens automatically via testCleanup fixture
  });

  /**
   * Test: Reset button clears form
   *
   * SELF-ISOLATION:
   * - Pure UI test
   * - No data persistence
   */
  test('should reset form when Reset button clicked', async ({
    dashboardPage,
    organizationPage,
  }) => {
    Logger.testStart('Reset Button Functionality');

    Logger.step(1, 'Navigate to create page');
    await dashboardPage.clickCreateButton();
    await expect(organizationPage.page).toHaveURL(/\/organization\/create/);

    Logger.step(2, 'Fill form with data');
    const orgData = TestDataGenerator.generateOrganization();
    await organizationPage.fillName(orgData.name);
    await organizationPage.fillSlug(orgData.slug);

    Logger.step(3, 'Verify data was filled');
    expect(await organizationPage.getNameValue()).toBe(orgData.name);
    expect(await organizationPage.getSlugValue()).toBe(orgData.slug);

    Logger.step(4, 'Click Reset button');
    await organizationPage.clickReset();
    await organizationPage.page.waitForLoadState(testConfig.waitStrategies.loadStates.network);

    Logger.step(5, 'Verify form was cleared');
    expect(await organizationPage.getNameValue()).toBe('');
    expect(await organizationPage.getSlugValue()).toBe('');
    await expect(organizationPage.page).toHaveURL(/\/organization\/create/);

    Logger.success('Reset button works correctly');
    Logger.testEnd('Reset Button Functionality', true);
  });

  /**
   * Test: Slug auto-generation
   *
   * SELF-ISOLATION:
   * - Pure UI test
   * - No data persistence
   */
  test('should auto-generate slug from name if feature exists', async ({
    dashboardPage,
    organizationPage,
  }) => {
    Logger.testStart('Slug Auto-generation');

    Logger.step(1, 'Navigate to create page');
    await dashboardPage.clickCreateButton();
    await expect(organizationPage.page).toHaveURL(/\/organization\/create/);

    Logger.step(2, 'Enter organization name');
    const testName = 'Test Organization Auto Slug';
    await organizationPage.fillName(testName);
    await organizationPage.page.waitForLoadState(testConfig.waitStrategies.loadStates.network);

    Logger.step(3, 'Check if slug was auto-generated');
    const slugValue = await organizationPage.getSlugValue();

    if (slugValue) {
      Logger.info(`Auto-generated slug: ${slugValue}`);
      Logger.step(4, 'Verify slug format');
      expect(slugValue).toMatch(/^[a-z0-9-]+$/);
      expect(slugValue).not.toMatch(/[A-Z\s]/);
      Logger.success('Slug auto-generation working');
    } else {
      Logger.info('No auto-generation detected (manual entry required)');
    }

    Logger.testEnd('Slug Auto-generation', true);
  });

  /**
   * Test: Required field validation
   *
   * SELF-ISOLATION:
   * - Pure UI validation test
   * - No data persistence
   */
  test('should validate required fields', async ({ dashboardPage, organizationPage }) => {
    Logger.testStart('Required Field Validation');

    Logger.step(1, 'Navigate to create page');
    await dashboardPage.clickCreateButton();
    await expect(organizationPage.page).toHaveURL(/\/organization\/create/);

    Logger.step(2, 'Attempt to submit empty form');
    await organizationPage.clickSubmit();
    await organizationPage.page.waitForLoadState(testConfig.waitStrategies.loadStates.network);

    Logger.step(3, 'Verify validation prevents submission');
    const nameHasError = await organizationPage.getNameInputAriaInvalid();
    const slugHasError = await organizationPage.getSlugInputAriaInvalid();
    const hasValidationErrors = nameHasError === 'true' || slugHasError === 'true';

    if (hasValidationErrors) {
      Logger.info('Client-side validation active');
      await expect(organizationPage.page).toHaveURL(/\/organization\/create/);
    } else {
      Logger.info('Checking for server validation');
      const errorToast = organizationPage.page.locator('[data-sonner-toast][data-type="error"]');
      const errorCount = await errorToast.count();
      Logger.info(`Error toasts: ${errorCount}`);
    }

    // Should still be on create page
    const stillOnCreate = organizationPage.page.url().includes('/organization/create');
    expect(stillOnCreate).toBe(true);

    Logger.success('Field validation verified');
    Logger.testEnd('Required Field Validation', true);
  });
});
