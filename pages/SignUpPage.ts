import { Page, Locator } from '@playwright/test';
import { Logger } from '../utils/logger';
import { UserData } from '../utils/test-data-generator';
import testConfig from '../config/test-config';

/**
 * Sign Up Page Object Model
 * Handles all interactions with the user registration/sign-up page
 *
 * This class encapsulates the sign-up page elements and actions,
 * following the Page Object Model pattern for maintainable tests.
 */
export class SignUpPage {
  // Page elements - using private readonly for immutability
  private readonly firstNameInput: Locator;
  private readonly lastNameInput: Locator;
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly passwordConfirmationInput: Locator;
  private readonly createAccountButton: Locator;
  private readonly signUpTitle: Locator;

  /**
   * Initialize Sign Up page with locators
   * @param page - Playwright page object
   */
  constructor(public page: Page) {
    // Use ID selectors for form inputs (most stable)
    this.firstNameInput = page.locator('#first-name');
    this.lastNameInput = page.locator('#last-name');
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.passwordConfirmationInput = page.locator('#password_confirmation');

    // Use role-based selector for submit button
    this.createAccountButton = page.getByRole('button', { name: 'Create an account' });

    // Use exact text match for title to avoid confusion with Sign In
    this.signUpTitle = page.getByText('Sign Up', { exact: true });
  }

  /**
   * Fill the first name input field
   * @param firstName - First name to enter
   */
  async fillFirstName(firstName: string): Promise<void> {
    Logger.info(`Filling first name with: ${firstName}`);
    await this.firstNameInput.fill(firstName);
    await this.firstNameInput.blur(); // Trigger validation
  }

  /**
   * Fill the last name input field
   * @param lastName - Last name to enter
   */
  async fillLastName(lastName: string): Promise<void> {
    Logger.info(`Filling last name with: ${lastName}`);
    await this.lastNameInput.fill(lastName);
    await this.lastNameInput.blur(); // Trigger validation
  }

  /**
   * Fill the email input field
   * @param email - Email address to enter
   */
  async fillEmail(email: string): Promise<void> {
    Logger.info(`Filling email with: ${email}`);
    await this.emailInput.fill(email);
    await this.emailInput.blur(); // Trigger validation
  }

  /**
   * Fill the password input field
   * @param password - Password to enter
   */
  async fillPassword(password: string): Promise<void> {
    Logger.info('Filling password');
    await this.passwordInput.fill(password);
    await this.passwordInput.blur(); // Trigger validation
  }

  /**
   * Fill the password confirmation input field
   * @param password - Password confirmation to enter (should match password)
   */
  async fillPasswordConfirmation(password: string): Promise<void> {
    Logger.info('Filling password confirmation');
    await this.passwordConfirmationInput.fill(password);
    await this.passwordConfirmationInput.blur(); // Trigger validation
  }

  /**
   * Click the Create Account button
   */
  async clickCreateAccount(): Promise<void> {
    Logger.info('Clicking Create Account button');
    await this.createAccountButton.click();
  }

  /**
   * Complete sign-up process with user data
   * This is a convenience method that fills all fields and submits the form
   *
   * @param userData - Complete user data object with all required fields
   */
  async signUp(userData: UserData): Promise<void> {
    Logger.step(1, 'Fill in sign-up form');
    Logger.info(`Registering user: ${userData.email}`);

    // Fill all form fields
    await this.fillFirstName(userData.firstName);
    await this.fillLastName(userData.lastName);
    await this.fillEmail(userData.email);
    await this.fillPassword(userData.password);
    await this.fillPasswordConfirmation(userData.password);

    Logger.step(2, 'Submit sign-up form');
    await this.clickCreateAccount();

    // Wait for form submission to complete
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.network);
  }

  /**
   * Get the sign-up title locator for verification
   * @returns Locator for the sign-up title element
   */
  async verifySignUpTitle(): Promise<Locator> {
    Logger.info('Verifying Sign Up title');
    return this.signUpTitle;
  }

  /**
   * Check if currently on the sign-up page
   * @returns true if on sign-up page, false otherwise
   */
  async isOnSignUpPage(): Promise<boolean> {
    try {
      // Wait for title to be visible with timeout
      await this.signUpTitle.waitFor({
        state: 'visible',
        timeout: testConfig.timeouts.short,
      });
      return true;
    } catch (error) {
      Logger.debug('Not on sign-up page', error);
      return false;
    }
  }

  /**
   * Get validation error message for a specific field
   * @param fieldName - Name of the field to check for errors
   * @returns Error message text or empty string if no error
   */
  async getFieldError(
    fieldName: 'firstName' | 'lastName' | 'email' | 'password' | 'passwordConfirmation'
  ): Promise<string> {
    const fieldMap = {
      firstName: this.firstNameInput,
      lastName: this.lastNameInput,
      email: this.emailInput,
      password: this.passwordInput,
      passwordConfirmation: this.passwordConfirmationInput,
    };

    const field = fieldMap[fieldName];
    // Look for error message near the field
    const errorLocator = this.page.locator(
      `[id="${await field.getAttribute('id')}"]+.error-message, [id="${await field.getAttribute('id')}"]+[role="alert"]`
    );

    try {
      return (await errorLocator.textContent()) || '';
    } catch {
      return '';
    }
  }

  /**
   * Check if the Create Account button is enabled
   * @returns true if button is enabled, false otherwise
   */
  async isCreateAccountButtonEnabled(): Promise<boolean> {
    return await this.createAccountButton.isEnabled();
  }
}
