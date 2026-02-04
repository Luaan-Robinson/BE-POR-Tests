import { Page, Locator } from '@playwright/test';
import { Logger } from '../utils/logger';
import testConfig from '../config/test-config';

/**
 * Sign In Page Object Model
 * Handles all interactions with the sign-in page
 *
 * This class encapsulates the sign-in page elements and actions,
 * following the Page Object Model pattern for maintainable tests.
 */
export class SignInPage {
  // Page elements - using private readonly for immutability
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly rememberMeCheckbox: Locator;
  private readonly loginButton: Locator;
  private readonly signInTitle: Locator;
  private readonly signUpTab: Locator;

  /**
   * Initialize Sign In page with locators
   * @param page - Playwright page object
   */
  constructor(public page: Page) {
    // Use ID selectors for stability (IDs are less likely to change)
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.rememberMeCheckbox = page.locator('#rememberMe');

    // Use role-based selectors for accessibility and stability
    this.loginButton = page.getByRole('button', { name: 'Login' });
    this.signUpTab = page.getByRole('tab', { name: 'Sign Up' });

    // Use data attributes when available for better test stability
    this.signInTitle = page.locator('[data-slot="card-title"]');
  }

  /**
   * Fill the email input field
   * @param email - Email address to enter
   */
  async fillEmail(email: string): Promise<void> {
    Logger.info(`Filling email with: ${email}`);
    await this.emailInput.fill(email);
    // Wait for input to be filled
    await this.emailInput.blur();
  }

  /**
   * Fill the password input field
   * @param password - Password to enter
   */
  async fillPassword(password: string): Promise<void> {
    Logger.info('Filling password');
    await this.passwordInput.fill(password);
    // Wait for input to be filled
    await this.passwordInput.blur();
  }

  /**
   * Toggle the Remember Me checkbox
   * @param check - true to check the box, false to uncheck it (default: true)
   */
  async toggleRememberMe(check: boolean = true): Promise<void> {
    const isChecked = await this.rememberMeCheckbox.isChecked();

    // Only click if the current state differs from desired state
    if (check && !isChecked) {
      Logger.info('Checking Remember Me checkbox');
      await this.rememberMeCheckbox.check();
    } else if (!check && isChecked) {
      Logger.info('Unchecking Remember Me checkbox');
      await this.rememberMeCheckbox.uncheck();
    } else {
      Logger.info(
        `Remember Me checkbox already in desired state: ${check ? 'checked' : 'unchecked'}`
      );
    }
  }

  /**
   * Click the Login button
   */
  async clickLogin(): Promise<void> {
    Logger.info('Clicking Login button');
    await this.loginButton.click();
  }

  /**
   * Complete sign-in process with credentials
   * This is a convenience method that combines all sign-in steps
   *
   * @param email - Email address for login
   * @param password - Password for login
   * @param rememberMe - Whether to check Remember Me (default: true)
   */
  async signIn(email: string, password: string, rememberMe: boolean = true): Promise<void> {
    Logger.step(1, 'Fill in sign-in credentials');
    await this.fillEmail(email);
    await this.fillPassword(password);

    if (rememberMe) {
      await this.toggleRememberMe(true);
    }

    Logger.step(2, 'Submit sign-in form');
    await this.clickLogin();
  }

  /**
   * Navigate to the Sign Up tab
   */
  async navigateToSignUp(): Promise<void> {
    Logger.info('Clicking Sign Up tab');
    await this.signUpTab.click();
    // Wait for tab content to load
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.default);
  }

  /**
   * Get the sign-in title locator for verification
   * @returns Locator for the sign-in title element
   */
  async verifySignInTitle(): Promise<Locator> {
    Logger.info('Verifying Sign In title');
    return this.signInTitle;
  }

  /**
   * Get the text content of the sign-in title
   * @returns The title text content
   */
  async getSignInTitleText(): Promise<string> {
    return (await this.signInTitle.textContent()) || '';
  }

  /**
   * Check if currently on the sign-in page
   * @returns true if on sign-in page, false otherwise
   */
  async isOnSignInPage(): Promise<boolean> {
    try {
      // Wait for title to be visible with timeout
      await this.signInTitle.waitFor({
        state: 'visible',
        timeout: testConfig.timeouts.short,
      });

      // Verify title text contains "Sign In"
      const titleText = await this.getSignInTitleText();
      return titleText.includes('Sign In');
    } catch (error) {
      Logger.debug('Not on sign-in page', error);
      return false;
    }
  }

  /**
   * Navigate to the home/root page
   * Uses baseURL from Playwright config
   */
  async navigateToHome(): Promise<void> {
    Logger.info('Navigating to home page');
    await this.page.goto('/');
    // Wait for navigation to complete
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.default);
  }

  /**
   * Wait for successful login redirect to dashboard
   * @param timeout - Maximum time to wait (default: from config)
   */
  async waitForDashboardRedirect(timeout: number = testConfig.timeouts.long): Promise<void> {
    Logger.info('Waiting for redirect to dashboard');
    await this.page.waitForURL('**/dashboard', { timeout });
  }
}
