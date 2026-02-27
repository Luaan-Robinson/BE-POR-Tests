import { Page, Locator } from '@playwright/test';
import { Logger } from '../utils/logger';
import testConfig from '../config/test-config';

/**
 * Suppliers Page Object Model
 */
export class SuppliersPage {
  private readonly navLink: Locator;
  private readonly createButton: Locator;
  private readonly displayNameInput: Locator;
  private readonly gpsLatitudeInput: Locator;
  private readonly gpsLongitudeInput: Locator;
  private readonly supplierGroupsDropdownTrigger: Locator;
  private readonly table: Locator;

  constructor(public page: Page) {
    this.navLink = page.locator('a[data-slot="sidebar-menu-button"][href="/suppliers"]');
    this.createButton = page
      .locator('div.flex.items-center.gap-2 > button')
      .filter({ hasText: 'Create' });
    this.displayNameInput = page.locator('input#displayName');
    this.gpsLatitudeInput = page.locator('input#gpsLatitude');
    this.gpsLongitudeInput = page.locator('input#gpsLongitude');
    this.supplierGroupsDropdownTrigger = page.locator(
      'button[data-slot="popover-trigger"][name="supplierGroups"]'
    );
    this.table = page.locator('table[data-slot="table"]');
  }

  async navigateToSuppliers(): Promise<void> {
    Logger.info('Clicking Suppliers sidebar link');
    await this.navLink.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    await this.navLink.click();
    await this.page.waitForURL('**/suppliers', { timeout: testConfig.timeouts.medium });
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.default);
    Logger.success('Navigated to Suppliers page');
  }

  async waitForTableToLoad(): Promise<void> {
    await this.table.waitFor({ state: 'visible', timeout: testConfig.timeouts.long });
  }

  async createSupplier(name: string, lat: string, lng: string): Promise<void> {
    // Open dialog
    await this.createButton.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    await this.createButton.click();
    await this.displayNameInput.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });

    // Fill fields
    await this.displayNameInput.fill(name);
    await this.gpsLatitudeInput.fill(lat);
    await this.gpsLongitudeInput.fill(lng);

    // Open supplier groups dropdown
    await this.supplierGroupsDropdownTrigger.click();

    // Select a non-default option if available, otherwise just close
    const items = this.page
      .locator('[cmdk-item]')
      .filter({ hasNotText: '(Select All)' })
      .filter({ hasNotText: 'Close' });
    const itemCount = await items.count().catch(() => 0);
    if (itemCount > 0) {
      Logger.info(`Selecting first available supplier group option`);
      await items.first().click();
    } else {
      Logger.info('No supplier groups to select — closing dropdown');
    }

    // Close the dropdown
    const closeBtn = this.page.locator('[cmdk-item]').filter({ hasText: 'Close' });
    await closeBtn.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
    await closeBtn.click();

    // Submit
    const submitButton = this.page.locator('button[type="submit"]').filter({ hasText: 'Create' });
    await submitButton.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
    await submitButton.click();
    Logger.success('Create supplier dialog submitted');
  }
}
