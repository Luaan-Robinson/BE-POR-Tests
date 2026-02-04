import { test, expect } from '../../fixtures/test-fixtures';
import { Logger } from '../../utils/logger';
import { TestDataGenerator } from '../../utils/test-data-generator';

/**
 * User Registration Test Suite
 * Tests for user sign-up/registration functionality
 */
test.describe('User Registration', () => {
  /**
   * Setup: Navigate to sign-up page before each test
   */
  test.beforeEach(async ({ signInPage }) => {
    await signInPage.navigateToHome();
    await signInPage.page.click('a:has-text("Sign In")');
    await signInPage.navigateToSignUp();
  });

  /**
   * Test: Successfully create a new user account
   * Verifies that a user can register with valid data
   * and is redirected to sign-in page after successful registration
   */
  test('should successfully create a new user account', async ({ signUpPage, signInPage }) => {
    Logger.testStart('User Sign Up Process');

    // ===== VERIFY SIGN UP PAGE IS DISPLAYED =====
    Logger.step(1, 'Verify Sign Up page is displayed');
    await expect(await signUpPage.verifySignUpTitle()).toBeVisible();
    Logger.success('Sign Up page is displayed');

    // ===== GENERATE UNIQUE USER DATA =====
    Logger.step(2, 'Generate unique test user data');
    const userData = TestDataGenerator.generateUser();

    Logger.info('Generated test user', {
      email: userData.email,
      name: userData.fullName,
    });

    // ===== FILL AND SUBMIT SIGN UP FORM =====
    Logger.step(3, 'Complete sign up form');
    await signUpPage.signUp(userData);
    Logger.success('Sign up form submitted');

    // ===== VERIFY SUCCESSFUL REGISTRATION =====
    Logger.step(4, 'Verify successful registration');

    // Should be redirected to Sign In page after successful registration
    await expect(await signInPage.verifySignInTitle()).toBeVisible();

    Logger.success('User successfully registered and redirected to Sign In page');
    Logger.testEnd('User Sign Up Process', true);
  });
});
