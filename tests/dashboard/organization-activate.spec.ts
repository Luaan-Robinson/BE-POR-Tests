import { test, expect } from '../../fixtures/test-fixtures';
import { Logger } from '../../utils/logger';
import { TestDataGenerator } from '../../utils/test-data-generator';

/**
 * ORGANIZATION ACTIVATION TESTS
 *
 * Status: TEMPORARILY SKIPPED
 * Reason: Performance issue with organization list page loading times
 * After running the test multiple times the organization table gets full
 * which causes very long loading times and test failures.
 *
 * The test works the first few times on a new account
 * but as more organizations are created the load time increases significantly.
 *
 * TODO: Re-enable these tests once the following issues are resolved:
 * 1. Organization table loading performance optimization
 * 2. User can delete organizations or a limit is created for how many organizations a user can have?
 *
 * These tests are functional and will work once performance issues are addressed.
 * Last tested: [2026-01-29]
 */
test.describe.skip('Organization Activation', () => {
  let testOrganizationSlug: string;

  // Use the authenticatedPage fixture to automatically sign in before each test
  test.beforeEach(async ({ authenticatedPage, dashboardPage }) => {
    void authenticatedPage; // User is already signed in

    // Navigate to organization page
    Logger.info('Navigating to Organization page');
    await dashboardPage.navigateToOrganization();
  });

  test('should activate organization after creation', async ({
    dashboardPage,
    organizationPage,
  }) => {
    Logger.testStart('Activate Newly Created Organization');

    try {
      // ===== STEP 1: CREATE A NEW ORGANIZATION =====
      Logger.step(1, 'Create a new organization for testing');

      await dashboardPage.clickCreateButton();
      await organizationPage.page.waitForURL('**/organization/create');

      const orgData = TestDataGenerator.generateOrganization();
      testOrganizationSlug = orgData.slug;

      Logger.info('Generated organization data:', {
        name: orgData.name,
        slug: orgData.slug,
      });

      await organizationPage.fillOrganizationForm(orgData, 'test-logo.png');
      await organizationPage.clickSubmit();

      const submissionSuccessful = await organizationPage.verifyNavigationAfterSubmit();
      expect(submissionSuccessful).toBeTruthy();
      Logger.success('Organization created successfully');

      // ===== STEP 2: NAVIGATE BACK TO ORGANIZATION LIST =====
      Logger.step(2, 'Navigate back to organization list page');

      await organizationPage.page.waitForTimeout(2000);

      if (!organizationPage.page.url().includes('/organization')) {
        await dashboardPage.navigateToOrganization();
      }

      await organizationPage.page.waitForURL('**/organization');
      Logger.success('Navigated to organization list page');

      // ===== STEP 3: VERIFY ORGANIZATION EXISTS IN TABLE =====
      Logger.step(3, 'Verify organization appears in the table');

      await organizationPage.waitForTableToLoad();

      const isInTable = await organizationPage.verifyOrganizationInTable(testOrganizationSlug);
      expect(isInTable).toBeTruthy();
      Logger.success(`Organization "${testOrganizationSlug}" found in table`);

      // ===== STEP 4: SCROLL TO AND VERIFY "USE ORGANIZATION" BUTTON =====
      Logger.step(4, 'Find and verify "Use Organization" button');

      await organizationPage.scrollToOrganization(testOrganizationSlug);

      const useButton =
        await organizationPage.findUseOrganizationButtonForSlug(testOrganizationSlug);
      expect(useButton).not.toBeNull();

      await expect(useButton!).toBeVisible();
      await expect(useButton!).toBeEnabled();
      await expect(useButton!).toHaveText('Use Organization');

      Logger.success('"Use Organization" button found and is clickable');

      // ===== STEP 5: CLICK "USE ORGANIZATION" BUTTON =====
      Logger.step(5, 'Click "Use Organization" button');

      const clicked = await organizationPage.clickUseOrganizationForSlug(testOrganizationSlug);
      expect(clicked).toBeTruthy();
      Logger.success('Clicked "Use Organization" button');

      // ===== STEP 6: VERIFY SUCCESS TOAST APPEARS =====
      Logger.step(6, 'Verify success toast notification appears');

      const toastAppeared = await organizationPage.waitForActiveOrganizationToast();
      expect(toastAppeared).toBeTruthy();

      const toastText = await organizationPage.getActiveOrganizationToastText();
      expect(toastText).toContain('Active organization changed');

      Logger.success('Success toast appeared with correct message');

      // ===== STEP 7: VERIFY BUTTON STATE CHANGED =====
      Logger.step(7, 'Verify button changed to "Active Organization" state');

      await organizationPage.page.waitForTimeout(1000);

      const isActive = await organizationPage.isOrganizationActive(testOrganizationSlug);
      expect(isActive).toBeTruthy();

      const activeButton =
        await organizationPage.findUseOrganizationButtonForSlug(testOrganizationSlug);
      expect(activeButton).not.toBeNull();

      await expect(activeButton!).toBeDisabled();

      const buttonText = await activeButton!.textContent();
      expect(buttonText).toContain('Active Organization');

      const hasStarIcon = await activeButton!.locator('svg.lucide-star').isVisible();
      expect(hasStarIcon).toBeTruthy();

      Logger.success('Button successfully changed to "Active Organization" state');

      // ===== STEP 8: VERIFY ORGANIZATION REMAINS IN TABLE =====
      Logger.step(8, 'Verify organization still appears in table after activation');

      const stillInTable = await organizationPage.verifyOrganizationInTable(testOrganizationSlug);
      expect(stillInTable).toBeTruthy();

      Logger.success('Organization remains in table after activation');

      Logger.testEnd('Activate Newly Created Organization', true);
    } catch (error) {
      Logger.error('Test failed', error);
      Logger.testEnd('Activate Newly Created Organization', false);
      throw error;
    }
  });

  test('should not allow activating already active organization', async ({ organizationPage }) => {
    Logger.testStart('Prevent Activating Already Active Organization');

    try {
      Logger.step(1, 'Find an already active organization');

      await organizationPage.waitForTableToLoad();
      const totalOrgs = await organizationPage.getTotalOrganizationsCount();

      if (totalOrgs === 0) {
        Logger.warning('No organizations found in table, skipping test');
        test.skip();
        return;
      }

      let activeOrganizationSlug: string | null = null;

      for (let i = 0; i < totalOrgs; i++) {
        const row = organizationPage.getTableRow(i);

        const useButton = row.locator('td:first-child button');
        const isDisabled = await useButton.isDisabled();
        const hasStarIcon = await useButton
          .locator('svg.lucide-star')
          .isVisible()
          .catch(() => false);

        if (isDisabled && hasStarIcon) {
          const slugCell = row.locator('td:nth-child(4) div.text-left');
          const slug = await slugCell.textContent();
          if (slug) {
            activeOrganizationSlug = slug.trim();
            break;
          }
        }
      }

      if (!activeOrganizationSlug) {
        Logger.warning('No active organization found, skipping test');
        test.skip();
        return;
      }

      Logger.info(`Found active organization: ${activeOrganizationSlug}`);

      Logger.step(2, 'Verify "Use Organization" button is disabled');

      const button =
        await organizationPage.findUseOrganizationButtonForSlug(activeOrganizationSlug);
      expect(button).not.toBeNull();

      await expect(button!).toBeDisabled();
      await expect(button!).toContainText('Active Organization');

      Logger.success('Active organization button is properly disabled');

      Logger.step(3, 'Attempt to click disabled button');

      const clicked = await organizationPage.clickUseOrganizationForSlug(activeOrganizationSlug);
      expect(clicked).toBeFalsy();

      Logger.success('Cannot click already active organization button');

      Logger.step(4, 'Verify no new toast appears');

      await organizationPage.page.waitForTimeout(2000);

      const toastCount = await organizationPage.getSuccessToastCount();

      if (toastCount > 0) {
        const newToast = await organizationPage.hasActiveOrgChangedToast();
        expect(newToast).toBeFalsy();
      }

      Logger.success('No new toast appeared (as expected)');

      Logger.testEnd('Prevent Activating Already Active Organization', true);
    } catch (error) {
      Logger.error('Test failed', error);
      Logger.testEnd('Prevent Activating Already Active Organization', false);
      throw error;
    }
  });
});
