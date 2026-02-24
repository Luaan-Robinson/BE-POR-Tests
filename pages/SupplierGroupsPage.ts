import { Page, Locator } from '@playwright/test';
import { Logger } from '../utils/logger';
import testConfig from '../config/test-config';

/**
 * Supplier Groups Page Object Model
 */
export class SupplierGroupsPage {
  private readonly navLink: Locator;
  private readonly createButton: Locator;
  private readonly displayNameInput: Locator;
  private readonly suppliersDropdownTrigger: Locator;
  private readonly table: Locator;
  private readonly tableRows: Locator;

  constructor(public page: Page) {
    this.navLink = page.locator('a[data-slot="sidebar-menu-button"][href="/supplier-groups"]');
    this.createButton = page
      .locator('div.flex.items-center.gap-2 > button')
      .filter({ hasText: 'Create' });
    this.displayNameInput = page.locator('input#displayName');
    this.suppliersDropdownTrigger = page.locator(
      'button[data-slot="popover-trigger"][name="supplierIds"]'
    );
    this.table = page.locator('table[data-slot="table"]');
    this.tableRows = page.locator('table[data-slot="table"] tbody tr');
  }

  async navigateToSupplierGroups(): Promise<void> {
    Logger.info('Clicking Supplier Groups sidebar link');
    await this.navLink.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    await this.navLink.click();
    await this.page.waitForURL('**/supplier-groups', { timeout: testConfig.timeouts.medium });
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.default);
    Logger.success('Navigated to Supplier Groups page');
  }

  async waitForTableToLoad(): Promise<void> {
    await this.table.waitFor({ state: 'visible', timeout: testConfig.timeouts.long });
  }

  async createSupplierGroup(name: string): Promise<void> {
    // Open dialog
    await this.createButton.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    await this.createButton.click();
    await this.displayNameInput.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });

    // Fill name
    await this.displayNameInput.fill(name);

    // Open suppliers dropdown
    await this.suppliersDropdownTrigger.click();

    // Select All if available
    const selectAll = this.page.locator('[cmdk-item]').filter({ hasText: '(Select All)' }).first();
    if (await selectAll.isVisible().catch(() => false)) {
      await selectAll.click();
    } else {
      Logger.info('No suppliers to select — skipping');
    }

    // Click Close button inside the dropdown
    const closeBtn = this.page.locator('[cmdk-item]').filter({ hasText: 'Close' });
    await closeBtn.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
    await closeBtn.click();

    // Submit
    await this.displayNameInput.press('Tab');
    const submitButton = this.page.locator('button[type="submit"][data-slot="button"]');
    await submitButton.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
    await submitButton.click();
    Logger.success('Create dialog submitted');
  }
}
