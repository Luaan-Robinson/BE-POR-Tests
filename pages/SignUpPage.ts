import { Page, Locator } from '@playwright/test';
import { Logger } from '../utils/logger';
import { UserData } from '../utils/test-data-generator';
import testConfig from '../config/test-config';

/**
 * Sign Up Page Object Model
 * Handles all interactions with the user registration/sign-up page
 */
export class SignUpPage {
  private readonly firstNameInput: Locator;
  private readonly lastNameInput: Locator;
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly passwordConfirmationInput: Locator;
  private readonly createAccountButton: Locator;
  private readonly signUpTitle: Locator;

  constructor(public page: Page) {
    this.firstNameInput = page.locator('#first-name');
    this.lastNameInput = page.locator('#last-name');
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.passwordConfirmationInput = page.locator('#password_confirmation');
    this.createAccountButton = page.getByRole('button', { name: 'Create an account' });

    // Use exact match for the Sign Up card title
    this.signUpTitle = page.locator('[data-slot="card-title"]').filter({ hasText: /^Sign Up$/ });
  }

  async fillFirstName(firstName: string): Promise<void> {
    Logger.info(`Filling first name with: ${firstName}`);
    await this.firstNameInput.fill(firstName);
    await this.firstNameInput.blur();
  }

  async fillLastName(lastName: string): Promise<void> {
    Logger.info(`Filling last name with: ${lastName}`);
    await this.lastNameInput.fill(lastName);
    await this.lastNameInput.blur();
  }

  async fillEmail(email: string): Promise<void> {
    Logger.info(`Filling email with: ${email}`);
    await this.emailInput.fill(email);
    await this.emailInput.blur();
  }

  async fillPassword(password: string): Promise<void> {
    Logger.info('Filling password');
    await this.passwordInput.fill(password);
    await this.passwordInput.blur();
  }

  async fillPasswordConfirmation(password: string): Promise<void> {
    Logger.info('Filling password confirmation');
    await this.passwordConfirmationInput.fill(password);
    await this.passwordConfirmationInput.blur();
  }

  async clickCreateAccount(): Promise<void> {
    Logger.info('Clicking Create Account button');
    await this.createAccountButton.click();
  }

  async signUp(userData: UserData): Promise<void> {
    Logger.step(1, 'Fill in sign-up form');
    Logger.info(`Registering user: ${userData.email}`);

    await this.fillFirstName(userData.firstName);
    await this.fillLastName(userData.lastName);
    await this.fillEmail(userData.email);
    await this.fillPassword(userData.password);
    await this.fillPasswordConfirmation(userData.password);

    Logger.step(2, 'Submit sign-up form');
    await this.clickCreateAccount();

    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.network);
  }

  async verifySignUpTitle(): Promise<Locator> {
    Logger.info('Verifying Sign Up title');
    return this.signUpTitle;
  }

  async isOnSignUpPage(): Promise<boolean> {
    try {
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
    const errorLocator = this.page.locator(
      `[id="${await field.getAttribute('id')}"]+.error-message, [id="${await field.getAttribute('id')}"]+[role="alert"]`
    );

    try {
      return (await errorLocator.textContent()) || '';
    } catch {
      return '';
    }
  }

  async isCreateAccountButtonEnabled(): Promise<boolean> {
    return await this.createAccountButton.isEnabled();
  }
}
