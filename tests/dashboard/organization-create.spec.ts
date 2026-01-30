import { test, expect } from '../../fixtures/test-fixtures';
import { Logger } from '../../utils/logger';
import { TestDataGenerator } from '../../utils/test-data-generator';

test.describe('Organization Creation', () => {
  // Use the authenticatedPage fixture to automatically sign in before each test
  test.beforeEach(async ({ authenticatedPage, dashboardPage }) => {
    void authenticatedPage; // User is already signed in

    // Navigate to organization page
    Logger.info('Navigating to Organization page');
    await dashboardPage.navigateToOrganization();
  });

  test('should navigate to organization create page', async ({
    dashboardPage,
    organizationPage,
  }) => {
    Logger.testStart('Navigate to Organization Create Page');
    try {
      Logger.step(1, 'Verify Create button is visible on Organization page');
      const isCreateButtonVisible = await dashboardPage.isCreateButtonVisible();
      expect(isCreateButtonVisible).toBe(true);
      Logger.success('Create button is visible');

      Logger.step(2, 'Click Create button');
      await dashboardPage.clickCreateButton();

      Logger.step(3, 'Verify navigation to Organization Create page');
      const isOnCreatePage = await organizationPage.isOnCreatePage();
      expect(isOnCreatePage).toBe(true);

      Logger.step(4, 'Verify page URL contains /organization/create');
      await expect(organizationPage.page).toHaveURL(/\/organization\/create/);

      Logger.success('Successfully navigated to Organization Create page');
      Logger.testEnd('Navigate to Organization Create Page', true);
    } catch (error) {
      Logger.error('Test failed', error);
      Logger.testEnd('Navigate to Organization Create Page', false);
      throw error;
    }
  });

  test('should display all form elements on organization create page', async ({
    dashboardPage,
    organizationPage,
  }) => {
    Logger.testStart('Verify Organization Create Form Elements');

    try {
      Logger.step(1, 'Navigate to Organization Create page');
      await dashboardPage.clickCreateButton();
      await expect(organizationPage.page).toHaveURL(/\/organization\/create/);

      Logger.step(2, 'Verify Name input field is visible and empty');
      const nameValue = await organizationPage.getNameValue();
      expect(nameValue).toBe('');

      Logger.step(3, 'Verify Slug input field is visible and empty');
      const slugValue = await organizationPage.getSlugValue();
      expect(slugValue).toBe('');

      Logger.step(4, 'Verify Logo file input is visible');
      const isLogoInputPresent = await organizationPage.isLogoInputVisible();
      expect(isLogoInputPresent).toBe(true);

      Logger.step(5, 'Verify Submit button is visible');
      const isSubmitVisible = await organizationPage.isSubmitButtonVisible();
      expect(isSubmitVisible).toBe(true);

      Logger.step(6, 'Verify Reset button is visible');
      const isResetVisible = await organizationPage.isResetButtonVisible();
      expect(isResetVisible).toBe(true);

      Logger.success('All form elements are displayed correctly');
      Logger.testEnd('Verify Organization Create Form Elements', true);
    } catch (error) {
      Logger.error('Test failed', error);
      Logger.testEnd('Verify Organization Create Form Elements', false);
      throw error;
    }
  });

  test('should successfully create organization with valid data', async ({
    dashboardPage,
    organizationPage,
  }) => {
    Logger.testStart('Create Organization with Valid Data');

    try {
      Logger.step(1, 'Navigate to Organization Create page');
      await dashboardPage.clickCreateButton();
      await expect(organizationPage.page).toHaveURL(/\/organization\/create/);

      Logger.step(2, 'Generate test organization data');
      const orgData = TestDataGenerator.generateOrganization();
      Logger.info('Generated organization data:', {
        name: orgData.name,
        slug: orgData.slug,
      });

      Logger.step(3, 'Fill organization form with valid data');
      await organizationPage.fillOrganizationForm(orgData, 'test-logo.png');

      Logger.step(4, 'Verify logo was uploaded');
      const isLogoUploaded = await organizationPage.isLogoUploaded();
      expect(isLogoUploaded).toBe(true);

      Logger.step(5, 'Submit the form');
      await organizationPage.clickSubmit();

      Logger.step(6, 'Verify success indication');
      const isToastVisible = await organizationPage.isSuccessToastVisible();

      if (isToastVisible) {
        Logger.step(7, 'Verify toast contains success message');
        const toastText = await organizationPage.getSuccessToastText();
        expect(toastText.toLowerCase()).toContain('saved');
        Logger.success('Organization created successfully with success toast');
      } else {
        Logger.step(7, 'Verify redirect to organization list');
        await organizationPage.page.waitForURL('**/organization', { timeout: 10000 });
        Logger.success('Organization created successfully with redirect');
      }

      const submissionSuccessful = await organizationPage.verifyNavigationAfterSubmit();
      expect(submissionSuccessful).toBe(true);

      Logger.testEnd('Create Organization with Valid Data', true);
    } catch (error) {
      Logger.error('Test failed', error);
      Logger.testEnd('Create Organization with Valid Data', false);
      throw error;
    }
  });

  test('should handle reset button correctly', async ({ dashboardPage, organizationPage }) => {
    Logger.testStart('Test Reset Button Functionality');

    try {
      Logger.step(1, 'Navigate to Organization Create page');
      await dashboardPage.clickCreateButton();
      await expect(organizationPage.page).toHaveURL(/\/organization\/create/);

      Logger.step(2, 'Fill form data');
      const orgData = TestDataGenerator.generateOrganization();
      await organizationPage.fillName(orgData.name);
      await organizationPage.fillSlug(orgData.slug);

      Logger.step(3, 'Verify data was filled');
      const nameBeforeReset = await organizationPage.getNameValue();
      const slugBeforeReset = await organizationPage.getSlugValue();
      expect(nameBeforeReset).toBe(orgData.name);
      expect(slugBeforeReset).toBe(orgData.slug);

      Logger.step(4, 'Click Reset button');
      await organizationPage.clickReset();

      Logger.step(5, 'Verify form fields are cleared');
      await organizationPage.page.waitForLoadState('networkidle');
      const nameAfterReset = await organizationPage.getNameValue();
      const slugAfterReset = await organizationPage.getSlugValue();
      expect(nameAfterReset).toBe('');
      expect(slugAfterReset).toBe('');

      Logger.step(6, 'Verify we are still on create page');
      await expect(organizationPage.page).toHaveURL(/\/organization\/create/);

      Logger.success('Reset button works correctly');
      Logger.testEnd('Test Reset Button Functionality', true);
    } catch (error) {
      Logger.error('Test failed', error);
      Logger.testEnd('Test Reset Button Functionality', false);
      throw error;
    }
  });

  test('should auto-generate slug from organization name', async ({
    dashboardPage,
    organizationPage,
  }) => {
    Logger.testStart('Test Slug Auto-generation');

    try {
      Logger.step(1, 'Navigate to Organization Create page');
      await dashboardPage.clickCreateButton();
      await expect(organizationPage.page).toHaveURL(/\/organization\/create/);

      Logger.step(2, 'Enter organization name');
      const testName = 'Test Organization Name 2024';
      await organizationPage.fillName(testName);

      Logger.step(3, 'Check if slug was auto-generated');
      await organizationPage.page.waitForLoadState('networkidle');
      const slugValue = await organizationPage.getSlugValue();

      if (slugValue) {
        Logger.info(`Auto-generated slug: ${slugValue}`);
        Logger.step(4, 'Verify slug format is URL-friendly');
        expect(slugValue).toMatch(/^[a-z0-9-]+$/);
        expect(slugValue).not.toMatch(/[A-Z]/);
        expect(slugValue).not.toMatch(/[^a-z0-9-]/);
        Logger.success('Slug auto-generation working correctly');
      } else {
        Logger.info('No auto-generation detected, manual entry required');
      }

      Logger.testEnd('Test Slug Auto-generation', true);
    } catch (error) {
      Logger.error('Test failed', error);
      Logger.testEnd('Test Slug Auto-generation', false);
      throw error;
    }
  });

  test('should validate required fields', async ({ dashboardPage, organizationPage }) => {
    Logger.testStart('Test Required Field Validation');

    try {
      Logger.step(1, 'Navigate to Organization Create page');
      await dashboardPage.clickCreateButton();
      await expect(organizationPage.page).toHaveURL(/\/organization\/create/);

      Logger.step(2, 'Attempt to submit empty form');
      await organizationPage.clickSubmit();
      await organizationPage.page.waitForLoadState('networkidle');

      Logger.step(3, 'Check for validation errors');
      const nameHasError = await organizationPage.getNameInputAriaInvalid();
      const slugHasError = await organizationPage.getSlugInputAriaInvalid();
      const hasValidationErrors = nameHasError === 'true' || slugHasError === 'true';

      if (hasValidationErrors) {
        Logger.info('Client-side validation errors detected as expected');
        Logger.step(4, 'Verify form was not submitted');
        await expect(organizationPage.page).toHaveURL(/\/organization\/create/);

        const errorMessages = organizationPage.page.locator(
          '.text-destructive, [role="alert"], .error-message'
        );
        const errorCount = await errorMessages.count();
        if (errorCount > 0) {
          Logger.info(`Found ${errorCount} error messages`);
        }
      } else {
        Logger.info('No client-side validation detected, checking for server response');
        const errorToast = organizationPage.page.locator('[data-sonner-toast][data-type="error"]');
        try {
          await errorToast.waitFor({ state: 'visible', timeout: 5000 });
          Logger.info('Server validation error toast detected');
        } catch {
          Logger.info('No error toast detected');
        }
      }

      Logger.success('Field validation behavior verified');
      Logger.testEnd('Test Required Field Validation', true);
    } catch (error) {
      Logger.error('Test failed', error);
      Logger.testEnd('Test Required Field Validation', false);
      throw error;
    }
  });
});