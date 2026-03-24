import { test, expect } from '../../fixtures/test-fixtures';
import { Logger } from '../../utils/logger';
import { TestDataGenerator } from '../../utils/test-data-generator';

/**
 * User Registration Test Suite
 *
 * SELF-CONTAINED TESTS:
 * - Each test creates its own test data
 * - Each test cleans up its own data via testCleanup fixture
 * - No dependencies between tests
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
   */
  test('should successfully create a new user account', async ({
    signUpPage,
    signInPage,
    testCleanup,
  }) => {
    Logger.testStart('User Sign Up');

    // ===== STEP 1: VERIFY SIGN UP PAGE =====
    Logger.step(1, 'Verify Sign Up page is displayed');
    await expect(await signUpPage.verifySignUpTitle()).toBeVisible();

    // ===== STEP 2: GENERATE UNIQUE TEST USER =====
    Logger.step(2, 'Generate unique test user');
    const userData = TestDataGenerator.generateUser();
    testCleanup.registerUser(userData.email);
    Logger.info('Generated test user:', {
      email: userData.email,
      name: userData.fullName,
    });

    // ===== STEP 3: SUBMIT SIGN UP FORM =====
    Logger.step(3, 'Complete and submit sign up form');
    await signUpPage.signUp(userData);

    // ===== STEP 4: VERIFY REDIRECT =====
    Logger.step(4, 'Verify redirect to Sign In page');
    await expect(await signInPage.verifySignInTitle()).toBeVisible();

    Logger.success('Sign-up form submitted successfully');
    Logger.testEnd('User Sign Up', true);
  });
});