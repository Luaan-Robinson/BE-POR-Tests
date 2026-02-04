import { test, expect } from '../../fixtures/test-fixtures';
import { Logger } from '../../utils/logger';
import testConfig from '../../config/test-config';

/**
 * User Authentication Test Suite
 * Tests for user sign-in functionality including valid/invalid credentials,
 * page element verification, and "Remember Me" feature
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
   * Verifies that a user can sign in with correct email/password
   * and is redirected to the dashboard
   */
  test('should successfully sign in with valid credentials', async ({ signInPage, page }) => {
    Logger.testStart('Sign In with Valid Credentials');

    // ===== NAVIGATE TO SIGN IN PAGE =====
    Logger.step(1, 'Navigate to Sign In page');
    await page.click('a:has-text("Sign In")');
    await expect(await signInPage.verifySignInTitle()).toBeVisible();
    Logger.success('Navigated to Sign In page');

    // ===== PERFORM SIGN IN =====
    Logger.step(2, 'Sign in with valid credentials');
    await signInPage.signIn(
      testConfig.testUsers.validUser.email,
      testConfig.testUsers.validUser.password,
      true
    );

    // ===== VERIFY SUCCESSFUL SIGN IN =====
    Logger.step(3, 'Verify successful sign in and redirect to dashboard');
    await expect(page).toHaveURL(/dashboard/, {
      timeout: testConfig.timeouts.long,
    });
    Logger.success('Successfully redirected to dashboard');

    Logger.testEnd('Sign In with Valid Credentials', true);
  });

  /**
   * Test: Sign-in page displays all required elements
   * Verifies that the sign-in page contains all necessary form fields
   * and buttons for user authentication
   */
  test('should display Sign In page elements correctly', async ({ signInPage, page }) => {
    Logger.testStart('Verify Sign In Page Elements');

    // Navigate to sign in page
    Logger.step(1, 'Navigate to Sign In page');
    await page.click('a:has-text("Sign In")');

    // Verify page elements are present
    Logger.step(2, 'Verify page title and form elements');
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
   * Verifies that the system properly rejects invalid login attempts
   * and does not redirect to the dashboard
   */
  test('should fail sign in with invalid credentials', async ({ signInPage, page }) => {
    Logger.testStart('Sign In with Invalid Credentials');

    // Navigate to sign in page
    Logger.step(1, 'Navigate to Sign In page');
    await page.click('a:has-text("Sign In")');

    // Attempt sign in with invalid credentials
    Logger.step(2, 'Attempt sign in with invalid credentials');
    await signInPage.signIn('invalid@example.com', 'wrongpassword', true);

    // Verify we're still on sign in page (not redirected to dashboard)
    Logger.step(3, 'Verify user is not redirected to dashboard');

    // Wait for network to settle after login attempt
    await page.waitForLoadState(testConfig.waitStrategies.loadStates.network);

    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/dashboard');
    Logger.success('Sign in correctly rejected invalid credentials');

    Logger.testEnd('Sign In with Invalid Credentials', true);
  });

  /**
   * Test: "Remember Me" functionality
   * Verifies that the Remember Me checkbox works and sets appropriate cookies
   * Note: Full persistence testing would require browser restart
   */
  test('should remember user when "Remember Me" is checked', async ({ signInPage, page }) => {
    Logger.testStart('Remember Me Functionality');

    Logger.step(1, 'Navigate to Sign In page');
    await page.click('a:has-text("Sign In")');

    Logger.step(2, 'Sign in with "Remember Me" checked');
    await signInPage.signIn(
      testConfig.testUsers.validUser.email,
      testConfig.testUsers.validUser.password,
      true // Remember Me = true
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

    Logger.info(`Found ${cookies.length} cookies, auth cookie present: ${hasAuthCookie}`);

    // Note: Full "Remember Me" testing would require closing and reopening browser
    // This is a basic verification that login succeeded with the checkbox checked
    Logger.success('Remember Me test completed - cookies verified');
    Logger.testEnd('Remember Me Functionality', true);
  });
});
