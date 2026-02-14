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
   *
   * SELF-ISOLATION:
   * - Uses existing valid user (no data creation)
   * - No cleanup needed
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

  /**
   * Test: Sign-in page displays correctly
   *
   * SELF-ISOLATION:
   * - Pure UI verification
   * - No data operations
   */
  test('should display Sign In page elements correctly', async ({ signInPage, page }) => {
    Logger.testStart('Verify Sign In Page Elements');

    Logger.step(1, 'Navigate to Sign In page');
    await page.click('a:has-text("Sign In")');

    Logger.step(2, 'Verify all form elements are visible');
    await expect(await signInPage.verifySignInTitle()).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#rememberMe')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();

    Logger.success('Sign In page displayed correctly');
    Logger.testEnd('Verify Sign In Page Elements', true);
  });

  /**
   * Test: Sign-in fails with invalid credentials
   *
   * SELF-ISOLATION:
   * - Uses invalid credentials (no data creation)
   * - No cleanup needed
   */
  test('should fail sign in with invalid credentials', async ({ signInPage, page }) => {
    Logger.testStart('Sign In with Invalid Credentials');

    Logger.step(1, 'Navigate to Sign In page');
    await page.click('a:has-text("Sign In")');

    Logger.step(2, 'Attempt sign in with invalid credentials');
    await signInPage.signIn('invalid@example.com', 'wrongpassword', true);

    Logger.step(3, 'Verify user is not redirected to dashboard');
    await page.waitForLoadState(testConfig.waitStrategies.loadStates.network);

    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/dashboard');

    Logger.success('Sign in correctly rejected invalid credentials');
    Logger.testEnd('Sign In with Invalid Credentials', true);
  });

  /**
   * Test: Remember Me checkbox functionality
   *
   * SELF-ISOLATION:
   * - Checks cookie persistence
   * - No data creation or modification
   */
  test('should set auth cookies when "Remember Me" is checked', async ({ signInPage, page }) => {
    Logger.testStart('Remember Me Functionality');

    Logger.step(1, 'Navigate to Sign In page');
    await page.click('a:has-text("Sign In")');

    Logger.step(2, 'Sign in with "Remember Me" checked');
    await signInPage.signIn(
      testConfig.testUsers.validUser.email,
      testConfig.testUsers.validUser.password,
      true
    );

    Logger.step(3, 'Verify successful login');
    await expect(page).toHaveURL(/dashboard/, {
      timeout: testConfig.timeouts.long,
    });

    Logger.step(4, 'Check for authentication cookies');
    const cookies = await page.context().cookies();
    const hasAuthCookie = cookies.some(
      (cookie) =>
        cookie.name.toLowerCase().includes('auth') ||
        cookie.name.toLowerCase().includes('session') ||
        cookie.name.toLowerCase().includes('token')
    );

    Logger.info(`Found ${cookies.length} total cookies`);
    Logger.info(`Auth cookie present: ${hasAuthCookie}`);

    expect(hasAuthCookie).toBe(true);

    Logger.success('Remember Me test completed - cookies verified');
    Logger.testEnd('Remember Me Functionality', true);
  });
});
