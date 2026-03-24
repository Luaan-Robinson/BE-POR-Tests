import { test, expect } from '../../fixtures/test-fixtures';
import { Logger } from '../../utils/logger';
import testConfig from '../../config/test-config';

/**
 * User Authentication Test Suite
 *
 * SELF-CONTAINED TESTS:
 * - Uses pre-existing valid user (configured in .env)
 * - No cleanup needed as it doesn't create data
 * - Each test is independent
 */
test.describe('User Authentication', () => {
  /**
   * Setup: Navigate to home page before each test
   */
  test.beforeEach(async ({ signInPage }) => {
    await signInPage.navigateToHome();
  });

  /**
   * Test: Successful sign-in with valid credentials
   */
  test('should successfully sign in with valid credentials', async ({ signInPage, page }) => {
    Logger.testStart('Sign In with Valid Credentials');

    // ===== STEP 1: NAVIGATE TO SIGN IN =====
    Logger.step(1, 'Navigate to Sign In page');
    await page.click('a:has-text("Sign In")');
    await expect(await signInPage.verifySignInTitle()).toBeVisible();

    // ===== STEP 2: PERFORM SIGN IN =====
    Logger.step(2, 'Sign in with valid credentials');
    await signInPage.signIn(
      testConfig.testUsers.validUser.email,
      testConfig.testUsers.validUser.password,
      true
    );

    // ===== STEP 3: VERIFY SUCCESS =====
    Logger.step(3, 'Verify successful sign in and redirect');
    await expect(page).toHaveURL(/dashboard/, {
      timeout: testConfig.timeouts.long,
    });

    Logger.success('Successfully signed in and redirected to dashboard');
    Logger.testEnd('Sign In with Valid Credentials', true);
  });
});