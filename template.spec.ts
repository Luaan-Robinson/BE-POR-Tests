import { test, expect } from './fixtures/test-fixtures';
import { Logger } from './utils/logger';

/**
 * TEMPLATE TEST SUITE
 *
 * Copy this file to create new test suites following the same structure
 * Replace "Template" with your actual feature name (e.g., "Dashboard", "Profile")
 */

test.describe('Template Test Suite', () => {
  /**
   * beforeEach runs before every test in this suite
   * Use it to set up common preconditions
   */
  test.beforeEach(async ({ signInPage }) => {
    // Example: Navigate to home page before each test
    await signInPage.navigateToHome();
  });

  /**
   * afterEach runs after every test in this suite
   * Use it for cleanup if needed
   */
  test.afterEach(async ({ page: _page }) => {
    // Example: Clear cookies after each test
    // await _page.context().clearCookies();
  });

  /**
   * EXAMPLE TEST 1: Basic flow
   */
  test('should perform basic action successfully', async ({ signInPage }) => {
    Logger.testStart('Basic Action Test');

    try {
      // ===== STEP 1: Setup/Precondition =====
      Logger.step(1, 'Navigate to sign in page');
      await signInPage.page.click('a:has-text("Sign In")');

      // ===== STEP 2: Perform action =====
      Logger.step(2, 'Verify sign in page is displayed');
      const signInTitle = await signInPage.verifySignInTitle();
      await expect(signInTitle).toBeVisible();

      // ===== STEP 3: Verify result =====
      Logger.step(3, 'Verify expected outcome');
      const isOnSignInPage = await signInPage.isOnSignInPage();
      expect(isOnSignInPage).toBeTruthy();

      Logger.success('Test completed successfully');
      Logger.testEnd('Basic Action Test', true);
    } catch (error) {
      Logger.error('Test failed', error);
      Logger.testEnd('Basic Action Test', false);
      throw error;
    }
  });

  /**
   * EXAMPLE TEST 2: Negative test scenario
   */
  test('should handle error scenario correctly', async ({ signInPage }) => {
    Logger.testStart('Error Handling Test');

    try {
      // Setup
      await signInPage.page.click('a:has-text("Sign In")');

      // Perform action that should fail
      await signInPage.fillEmail('invalid@email.com');
      await signInPage.fillPassword('wrongpassword');
      await signInPage.clickLogin();

      // Verify error is shown (adjust based on your app's behavior)
      // await expect(page.locator('.error-message')).toBeVisible();

      Logger.testEnd('Error Handling Test', true);
    } catch (error) {
      Logger.error('Test failed', error);
      Logger.testEnd('Error Handling Test', false);
      throw error;
    }
  });

  /**
   * EXAMPLE TEST 3: Skip test (for tests that are WIP)
   */
  test.skip('should do something - work in progress', async ({ page: _page }) => {
    // This test will be skipped
    // Use test.skip() for tests you're still working on
  });

  /**
   * EXAMPLE TEST 4: Test with custom timeout
   */
  test('should complete within custom timeout', async ({ signInPage }) => {
    // Set custom timeout for this specific test
    test.setTimeout(120000); // 2 minutes

    await signInPage.navigateToHome();
    // ... rest of test
  });

  /**
   * EXAMPLE TEST 5: Test with retry
   */
  test('should retry on failure', async ({ signInPage }) => {
    // This test will retry up to the configured number of times
    test.info().annotations.push({
      type: 'flaky',
      description: 'This test is known to be flaky',
    });

    await signInPage.navigateToHome();
    // ... rest of test
  });
});

/**
 * EXAMPLE: Nested describe blocks for organizing tests
 */
test.describe('Feature - Sub-feature A', () => {
  test('should test sub-feature A', async ({ signInPage }) => {
    // Test implementation
    await signInPage.navigateToHome();
  });
});

test.describe('Feature - Sub-feature B', () => {
  test('should test sub-feature B', async ({ signInPage }) => {
    // Test implementation
    await signInPage.navigateToHome();
  });
});
