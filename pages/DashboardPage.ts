import { Page, Locator } from '@playwright/test';
import { Logger } from '../utils/logger';
import testConfig from '../config/test-config';

/**
 * Dashboard Page Object Model
 * Handles all interactions with the main dashboard page and navigation sidebar
 *
 * This class encapsulates dashboard elements and navigation actions,
 * following the Page Object Model pattern for maintainable tests.
 */
export class DashboardPage {
  // Sidebar navigation links
  private readonly dashboardLink: Locator;
  private readonly organizationLink: Locator;
  private readonly usersLink: Locator;

  // Organization page elements
  private readonly createLink: Locator;
  private readonly createButton: Locator;

  /**
   * Initialize Dashboard page with locators
   * @param page - Playwright page object
   */
  constructor(public page: Page) {
    // Use getByRole with .first() to handle potential duplicates
    // Role-based selectors are preferred for accessibility
    this.dashboardLink = page.getByRole('link', { name: 'Dashboard' }).first();
    this.organizationLink = page.getByRole('link', { name: 'Organization' }).first();
    this.usersLink = page.getByRole('link', { name: 'Users' }).first();

    // Target the link that wraps the create button for reliable clicking
    this.createLink = page.locator('a[href="/organization/create"]');
    this.createButton = page.locator('a[href="/organization/create"] button');
  }

  // ===== NAVIGATION METHODS =====

  /**
   * Navigate to the Dashboard page
   */
  async navigateToDashboard(): Promise<void> {
    Logger.info('Navigating to Dashboard');
    await this.dashboardLink.click();

    // Wait for navigation to complete
    await this.page.waitForURL('**/dashboard', {
      timeout: testConfig.timeouts.medium,
    });
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.default);
  }

  /**
   * Navigate to the Organization page
   */
  async navigateToOrganization(): Promise<void> {
    Logger.info('Navigating to Organization page');
    await this.organizationLink.click();

    // Wait for navigation and content to load
    await this.page.waitForURL('**/organization', {
      timeout: testConfig.timeouts.medium,
    });
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.default);

    // Small buffer to ensure UI is fully rendered
    // This is more reliable than arbitrary timeout
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.network);
  }

  /**
   * Navigate to the Users page
   */
  async navigateToUsers(): Promise<void> {
    Logger.info('Navigating to Users page');
    await this.usersLink.click();

    // Wait for navigation to complete
    await this.page.waitForURL('**/members', {
      timeout: testConfig.timeouts.medium,
    });
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.default);
  }

  // ===== VERIFICATION METHODS =====

  /**
   * Check if currently on the Dashboard page
   * @returns true if on dashboard page, false otherwise
   */
  async isOnDashboard(): Promise<boolean> {
    try {
      await this.dashboardLink.waitFor({
        state: 'visible',
        timeout: testConfig.timeouts.short,
      });
      return this.page.url().includes('/dashboard');
    } catch (error) {
      Logger.debug('Not on dashboard page', error);
      return false;
    }
  }

  /**
   * Check if Dashboard link is in active state
   * @returns true if dashboard link is active, false otherwise
   */
  async isDashboardLinkActive(): Promise<boolean> {
    const dataActive = await this.dashboardLink.getAttribute('data-active');
    const ariaCurrent = await this.dashboardLink.getAttribute('aria-current');
    return dataActive === 'true' || ariaCurrent === 'page';
  }

  /**
   * Check if Organization link is in active state
   * @returns true if organization link is active, false otherwise
   */
  async isOrganizationLinkActive(): Promise<boolean> {
    const dataActive = await this.organizationLink.getAttribute('data-active');
    const ariaCurrent = await this.organizationLink.getAttribute('aria-current');
    return dataActive === 'true' || ariaCurrent === 'page';
  }

  /**
   * Check if Users link is in active state
   * @returns true if users link is active, false otherwise
   */
  async isUsersLinkActive(): Promise<boolean> {
    const dataActive = await this.usersLink.getAttribute('data-active');
    const ariaCurrent = await this.usersLink.getAttribute('aria-current');
    return dataActive === 'true' || ariaCurrent === 'page';
  }

  // ===== ELEMENT VISIBILITY CHECKS =====

  /**
   * Get Dashboard link locator for assertions
   * @returns Locator for dashboard link
   */
  async verifyDashboardLink(): Promise<Locator> {
    Logger.info('Verifying Dashboard link is visible');
    return this.dashboardLink;
  }

  /**
   * Get Organization link locator for assertions
   * @returns Locator for organization link
   */
  async verifyOrganizationLink(): Promise<Locator> {
    Logger.info('Verifying Organization link is visible');
    return this.organizationLink;
  }

  /**
   * Get Users link locator for assertions
   * @returns Locator for users link
   */
  async verifyUsersLink(): Promise<Locator> {
    Logger.info('Verifying Users link is visible');
    return this.usersLink;
  }

  // ===== ORGANIZATION PAGE ACTIONS =====

  /**
   * Click the Create Organization button
   * Clicks the link wrapper rather than the button itself for reliability
   */
  async clickCreateButton(): Promise<void> {
    Logger.info('Clicking Create button on Organization page');

    // Wait for the link to be visible and clickable
    await this.createLink.waitFor({
      state: 'visible',
      timeout: testConfig.timeouts.medium,
    });

    // Click the link (not the inner button)
    await this.createLink.click();

    // Wait for navigation to create page
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.default);
  }

  /**
   * Check if Create button is visible on the page
   * Checks for the link wrapper that contains the button
   * @returns true if create button is visible, false otherwise
   */
  async isCreateButtonVisible(): Promise<boolean> {
    try {
      await this.createLink.waitFor({
        state: 'visible',
        timeout: testConfig.timeouts.medium,
      });
      return true;
    } catch (error) {
      Logger.debug('Create button not visible', error);
      return false;
    }
  }

  /**
   * Alternative method to verify Create button by button text
   * Checks the actual button element inside the link
   * @returns true if create button text is visible, false otherwise
   */
  async isCreateButtonVisibleByText(): Promise<boolean> {
    try {
      await this.createButton.waitFor({
        state: 'visible',
        timeout: testConfig.timeouts.medium,
      });
      return true;
    } catch (error) {
      Logger.debug('Create button text not visible', error);
      return false;
    }
  }

  /**
   * Wait for the dashboard page to be fully loaded
   * Useful for ensuring page is ready before running assertions
   */
  async waitForDashboardLoaded(): Promise<void> {
    Logger.info('Waiting for dashboard to be fully loaded');

    // Wait for URL to contain dashboard
    await this.page.waitForURL('**/dashboard', {
      timeout: testConfig.timeouts.long,
    });

    // Wait for network to be idle
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.network);

    // Verify key elements are visible
    await this.dashboardLink.waitFor({
      state: 'visible',
      timeout: testConfig.timeouts.short,
    });
  }
}
