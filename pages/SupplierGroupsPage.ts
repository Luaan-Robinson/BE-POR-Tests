import { Page, Locator } from '@playwright/test';
import { Logger } from '../utils/logger';
import testConfig from '../config/test-config';

/**
 * Supplier Groups Page Object Model
 * Handles all interactions with the Supplier Groups page including
 * the table, create dialog, suppliers dropdown, and row actions.
 */
export class SupplierGroupsPage {
  // ===== NAVIGATION =====
  private readonly navLink: Locator;

  // ===== PAGE HEADER =====
  private readonly createButton: Locator;

  // ===== CREATE DIALOG =====
  private readonly displayNameInput: Locator;
  private readonly suppliersDropdownTrigger: Locator;
  private readonly selectAllOption: Locator;
  private readonly closeDropdownOption: Locator;
  private readonly dialogSubmitButton: Locator;

  // ===== TABLE =====
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

    this.selectAllOption = page.locator('[cmdk-item][data-value="(Select All)"]').first();
    this.closeDropdownOption = page.locator('[cmdk-item][data-value="Close"]');

    this.dialogSubmitButton = page.locator('button[type="submit"][data-slot="button"]');

    this.table = page.locator('table[data-slot="table"]');
    this.tableRows = page.locator('table[data-slot="table"] tbody tr');
  }

  // ===== NAVIGATION =====

  async navigateToSupplierGroups(): Promise<void> {
    Logger.info('Clicking Supplier Groups sidebar link');
    await this.navLink.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    await this.navLink.click();
    await this.page.waitForURL('**/supplier-groups', { timeout: testConfig.timeouts.medium });
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.default);
    Logger.success('Navigated to Supplier Groups page');
  }

  // ===== TABLE HELPERS =====

  async waitForTableToLoad(): Promise<void> {
    await this.table.waitFor({ state: 'visible', timeout: testConfig.timeouts.long });
  }

  /**
   * Find a table row by the supplier group display name (second column)
   */
  getRowByName(name: string): Locator {
    return this.tableRows.filter({
      has: this.page.locator('td:nth-child(2) div.text-left', { hasText: name }),
    });
  }

  // ===== CREATE SUPPLIER GROUP =====

  async clickCreateButton(): Promise<void> {
    Logger.info('Clicking Create button');
    await this.createButton.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    await this.createButton.click();
    await this.displayNameInput.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    Logger.success('Create dialog opened');
  }

  async fillDisplayName(name: string): Promise<void> {
    Logger.info(`Filling display name: ${name}`);
    await this.displayNameInput.fill(name);
  }

  /**
   * Open the suppliers dropdown, tick Select All (if available), then close.
   * Safe to call even when there are no suppliers to select.
   */
  async selectSuppliersAndClose(): Promise<void> {
    Logger.info('Opening suppliers dropdown');
    await this.suppliersDropdownTrigger.click();

    if (await this.selectAllOption.isVisible().catch(() => false)) {
      Logger.info('Selecting all available suppliers');
      await this.selectAllOption.click();
    } else {
      Logger.info('No suppliers available — skipping selection');
    }

    await this.closeDropdownOption.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
    await this.closeDropdownOption.click();
    Logger.success('Suppliers dropdown closed');
  }

  async submitCreateDialog(): Promise<void> {
    Logger.info('Submitting Create dialog');
    await this.displayNameInput.press('Tab');
    await this.dialogSubmitButton.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
    await this.dialogSubmitButton.click();
    Logger.success('Create dialog submitted');
  }

  /**
   * Full create flow: open dialog → fill name → select suppliers → submit
   */
  async createSupplierGroup(name: string): Promise<void> {
    await this.clickCreateButton();
    await this.fillDisplayName(name);
    await this.selectSuppliersAndClose();
    await this.submitCreateDialog();
  }
}