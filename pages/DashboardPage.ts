import { Page, Locator } from '@playwright/test';
import { Logger } from '../utils/logger';
import testConfig from '../config/test-config';

/**
 * Dashboard Page Object Model
 */
export class DashboardPage {
  private readonly dashboardLink: Locator;
  private readonly createLink: Locator;

  constructor(public page: Page) {
    this.dashboardLink = page.getByRole('link', { name: 'Dashboard' }).first();
    this.createLink = page.locator('a[href="/organization/create"]');
  }

  // ===== SIDEBAR GROUP EXPANSION =====

  /**
   * Expand a collapsible sidebar group by its label text if it is not already open.
   */
  async expandSidebarGroup(groupName: string): Promise<void> {
    const trigger = this.page
      .locator('button[data-slot="sidebar-menu-button"]')
      .filter({ hasText: groupName })
      .first();

    await trigger.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    const state = await trigger.getAttribute('data-state');
    if (state !== 'open') {
      Logger.info(`Expanding sidebar group: ${groupName}`);
      await trigger.click();
      await this.page.waitForTimeout(300); // allow animation to complete
    } else {
      Logger.info(`Sidebar group "${groupName}" is already open`);
    }
  }

  // ===== NAVIGATION =====

  async navigateToDashboard(): Promise<void> {
    Logger.info('Navigating to Dashboard');
    await this.dashboardLink.click();
    await this.page.waitForURL('**/dashboard', { timeout: testConfig.timeouts.medium });
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.default);
  }

  async navigateToOrganization(): Promise<void> {
    Logger.info('Navigating to Organization page');
    await this.expandSidebarGroup('Organization');
    const orgLink = this.page.locator('a[data-slot="sidebar-menu-sub-button"][href="/organization"]');
    await orgLink.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    await orgLink.click();
    await this.page.waitForURL('**/organization', { timeout: testConfig.timeouts.medium });
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.default);
  }

  async navigateToUsers(): Promise<void> {
    Logger.info('Navigating to Users page');
    await this.expandSidebarGroup('Organization');
    const usersLink = this.page.locator('a[data-slot="sidebar-menu-sub-button"][href="/members"]');
    await usersLink.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    await usersLink.click();
    await this.page.waitForURL('**/members', { timeout: testConfig.timeouts.medium });
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.default);
  }

  // ===== VERIFICATION =====

  async isOnDashboard(): Promise<boolean> {
    try {
      await this.dashboardLink.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
      return this.page.url().includes('/dashboard');
    } catch (error) {
      Logger.debug('Not on dashboard page', error);
      return false;
    }
  }

  async verifyDashboardLink(): Promise<Locator> {
    return this.dashboardLink;
  }

  // ===== ORGANIZATION PAGE ACTIONS =====

  async clickCreateButton(): Promise<void> {
    Logger.info('Clicking Create button on Organization page');
    await this.createLink.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    await this.createLink.click();
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.default);
  }

  async isCreateButtonVisible(): Promise<boolean> {
    try {
      await this.createLink.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
      return true;
    } catch (error) {
      Logger.debug('Create button not visible', error);
      return false;
    }
  }

  async waitForDashboardLoaded(): Promise<void> {
    Logger.info('Waiting for dashboard to be fully loaded');
    await this.page.waitForURL('**/dashboard', { timeout: testConfig.timeouts.long });
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.network);
    await this.dashboardLink.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
  }
}