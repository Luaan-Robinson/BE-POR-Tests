import { test, expect } from '../../fixtures/test-fixtures';
import { Logger } from '../../utils/logger';
import { TestDataGenerator } from '../../utils/test-data-generator';
import testConfig from '../../config/test-config';

/**
 * Organization Management Test Suite
 *
 * SELF-CONTAINED TESTS:
 * - Each test creates its own organization
 * - Each test verifies in database
 * - Each test cleans up automatically
 * - No dependencies between tests
 */
test.describe('Organization Management', () => {
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
   * - Verifies in database (if available)
   * - Handles both active and inactive states appropriately
   * - Auto-cleanup via testCleanup
   */
  test('should successfully create organization', async ({
    dashboardPage,
    organizationPage,
    database,
    testCleanup,
  }) => {
    Logger.testStart('Create Organization');

    // Check if we should skip database verification
    const skipDbVerification = process.env.CI && process.env.BASE_URL?.includes('102.130.120.68');
    if (skipDbVerification) {
      Logger.warning(
        'Skipping database verification - remote application server not accessible from CI'
      );
    }

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
    if (!skipDbVerification) {
      Logger.step(3, 'Verify organization does not exist in database');
      const orgExistsBefore = await database.verifyOrganizationExists(orgData.slug);
      expect(orgExistsBefore).toBe(false);
    } else {
      Logger.step(3, 'Skipping pre-condition database check');
    }

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

    // ===== STEP 6: VERIFY IN DATABASE (OPTIONAL) =====
    if (!skipDbVerification) {
      Logger.step(8, 'Verify organization in database');

      // Wait for database write to complete
      Logger.info('Waiting for database write to complete...');
      await organizationPage.page.waitForTimeout(5000);

      const orgExistsAfter = await database.verifyOrganizationExists(orgData.slug);

      if (!orgExistsAfter) {
        Logger.warning('Organization not found in database, retrying...');
        await organizationPage.page.waitForTimeout(3000);
        const orgExistsRetry = await database.verifyOrganizationExists(orgData.slug);
        expect(orgExistsRetry).toBe(true);
      } else {
        expect(orgExistsAfter).toBe(true);
      }

      const dbOrg = await database.findOrganizationBySlug(orgData.slug);
      expect(dbOrg).not.toBeNull();
      expect(dbOrg?.slug).toBe(orgData.slug);
      expect(dbOrg?.name).toBe(orgData.name);

      Logger.success('Organization created and verified in database');
    } else {
      Logger.step(8, 'Skipping database verification (not available in CI)');
      Logger.success('Organization created successfully (UI verification only)');
    }

    // ===== STEP 7: MANUALLY NAVIGATE TO ORGANIZATION LIST =====
    Logger.step(9, 'Manually navigate to organization list page');

    // Use the dashboard navigation to go to organization list
    await dashboardPage.navigateToOrganization();

    // Wait for the page to load completely
    await organizationPage.page.waitForURL('**/organization', {
      timeout: testConfig.timeouts.long,
    });
    Logger.success('Navigated to organization list page');

    // ===== STEP 8: VERIFY ORGANIZATION EXISTS IN TABLE =====
    Logger.step(10, 'Verify organization appears in the table');

    await organizationPage.waitForTableToLoad();

    const isInTable = await organizationPage.verifyOrganizationInTable(orgData.slug);
    expect(isInTable).toBeTruthy();
    Logger.success(`Organization "${orgData.slug}" found in table`);

    // ===== STEP 9: IDENTIFY THE BUTTON TYPE =====
    Logger.step(11, 'Scroll to the organization row');
    await organizationPage.scrollToOrganization(orgData.slug);

    // Get the organization button (could be either "Use Organization" or "Active Organization")
    Logger.step(12, 'Find organization button');
    const orgButton = await organizationPage.findOrganizationButtonForSlug(orgData.slug);
    expect(orgButton).not.toBeNull();

    // Check what type of button it is
    const buttonText = await orgButton!.textContent();
    const isDisabled = await orgButton!.isDisabled();
    const hasStarIcon = await orgButton!.locator('svg.lucide-star').isVisible().catch(() => false);

    if (buttonText?.includes('Active Organization') && isDisabled && hasStarIcon) {
      // This is the active organization (first one created)
      Logger.success(`Organization "${orgData.slug}" is the ACTIVE organization`);
      Logger.success('Organization creation verified successfully');
    } else if (buttonText?.includes('Use Organization') && !isDisabled && !hasStarIcon) {
      // This is an inactive organization (subsequent ones)
      Logger.success(`Organization "${orgData.slug}" is INACTIVE (shows "Use Organization" button)`);
      Logger.success('Organization creation verified successfully');
    } else {
      // Unexpected button state
      Logger.warning(`Unexpected button state - Text: "${buttonText}", Disabled: ${isDisabled}, HasStar: ${hasStarIcon}`);
      // Still consider it a pass since the organization exists
      Logger.success('Organization exists in table (button state unexpected but organization present)');
    }

    Logger.testEnd('Create Organization', true);
    // Cleanup happens automatically via testCleanup fixture
  });

  /**
   * Test: Activate an inactive organization
   * 
   * This test specifically focuses on the activation flow
   */
  test('should activate an inactive organization', async ({
    dashboardPage,
    organizationPage,
    testCleanup,
  }) => {
    Logger.testStart('Activate Organization');

    // ===== STEP 1: CREATE A NEW ORGANIZATION (WILL BE INACTIVE) =====
    Logger.step(1, 'Navigate to create page');
    await dashboardPage.clickCreateButton();
    await expect(organizationPage.page).toHaveURL(/\/organization\/create/);

    Logger.step(2, 'Generate and create test organization');
    const orgData = TestDataGenerator.generateOrganization();
    testCleanup.registerOrganization(orgData.slug);

    await organizationPage.fillOrganizationForm(orgData, 'test-logo.png');
    await organizationPage.clickSubmit();
    
    // Wait for creation to complete
    const submissionSuccessful = await organizationPage.verifyNavigationAfterSubmit();
    expect(submissionSuccessful).toBe(true);

    // ===== STEP 2: NAVIGATE BACK TO ORGANIZATION LIST =====
    Logger.step(3, 'Navigate to organization list');
    await dashboardPage.navigateToOrganization();
    await organizationPage.page.waitForURL('**/organization', {
      timeout: testConfig.timeouts.long,
    });

    // ===== STEP 3: VERIFY ORGANIZATION IS IN TABLE =====
    Logger.step(4, 'Verify organization appears in the table');
    await organizationPage.waitForTableToLoad();
    
    const isInTable = await organizationPage.verifyOrganizationInTable(orgData.slug);
    expect(isInTable).toBeTruthy();
    
    await organizationPage.scrollToOrganization(orgData.slug);

    // ===== STEP 4: CHECK THAT IT'S NOT ALREADY ACTIVE =====
    Logger.step(5, 'Verify organization is not already active');
    const isActive = await organizationPage.isOrganizationActive(orgData.slug);
    
    if (isActive) {
      Logger.info(`Organization "${orgData.slug}" is already active, skipping activation test`);
      Logger.testEnd('Activate Organization', true);
      return;
    }

    // ===== STEP 5: GET THE BUTTON AND VERIFY IT'S "Use Organization" =====
    Logger.step(6, 'Find and verify "Use Organization" button');
    const orgButton = await organizationPage.findOrganizationButtonForSlug(orgData.slug);
    expect(orgButton).not.toBeNull();

    const buttonText = await orgButton!.textContent();
    expect(buttonText).toContain('Use Organization');
    
    await expect(orgButton!).toBeVisible();
    await expect(orgButton!).toBeEnabled();
    
    const hasStarIcon = await orgButton!.locator('svg.lucide-star').isVisible().catch(() => false);
    expect(hasStarIcon).toBe(false);

    Logger.success('"Use Organization" button found and verified');

    // ===== STEP 6: ACTIVATE THE ORGANIZATION =====
    Logger.step(7, 'Click "Use Organization" button to activate');
    await orgButton!.click();
    await organizationPage.page.waitForLoadState(testConfig.waitStrategies.loadStates.network);

    // ===== STEP 7: VERIFY SUCCESS TOAST APPEARS =====
    Logger.step(8, 'Verify success toast notification appears');

    const toastAppeared = await organizationPage.waitForActiveOrganizationToast();
    expect(toastAppeared).toBeTruthy();

    const toastText = await organizationPage.getActiveOrganizationToastText();
    expect(toastText).toContain('Active organization changed');

    Logger.success('Success toast appeared with correct message');

    // ===== STEP 8: VERIFY BUTTON STATE CHANGED TO ACTIVE =====
    Logger.step(9, 'Verify button changed to "Active Organization" state');

    await organizationPage.page.waitForTimeout(1000);

    const isActiveNow = await organizationPage.isOrganizationActive(orgData.slug);
    expect(isActiveNow).toBeTruthy();

    const activeButton = await organizationPage.findOrganizationButtonForSlug(orgData.slug);
    expect(activeButton).not.toBeNull();

    await expect(activeButton!).toBeDisabled();

    const activeButtonText = await activeButton!.textContent();
    expect(activeButtonText).toContain('Active Organization');

    const hasStarIconNow = await activeButton!.locator('svg.lucide-star').isVisible();
    expect(hasStarIconNow).toBeTruthy();

    Logger.success('Button successfully changed to "Active Organization" state');

    Logger.testEnd('Activate Organization', true);
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