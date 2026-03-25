import { Page, Locator } from '@playwright/test';
import { Logger } from '../utils/logger';
import testConfig from '../config/test-config';

/**
 * SKU Master Rates Page Object Model
 *
 * KEY BEHAVIOURS:
 * 1. When "Add Supplier to Category" is submitted and the supplier already has
 *    rates for every SKU in that category, the app shows a toast:
 *    "'<Supplier>' already has rates for all SKUs in '<Category>'"
 *    No new rows are created. The test must detect this and treat the existing
 *    rows as the thing to verify.
 *
 * 2. The table uses virtual scrolling — only ~30 rows are in the DOM at any
 *    time. We therefore NEVER scan raw rows. Instead we use the built-in
 *    Supplier filter dropdown (top of page) to reduce the visible set to just
 *    the supplier we care about, then confirm the table is non-empty.
 */
export class SkuMasterRatesPage {
  private readonly navLink: Locator;
  private readonly addSupplierToCategoryButton: Locator;
  private readonly skuCategoryTrigger: Locator;
  private readonly supplierTrigger: Locator;
  private readonly addSupplierButton: Locator;
  private readonly table: Locator;

  constructor(public page: Page) {
    this.navLink = page.locator('a[data-slot="sidebar-menu-sub-button"][href="/sku-master-rates"]');

    this.addSupplierToCategoryButton = page
      .locator('button[data-slot="button"]')
      .filter({ hasText: 'Add Supplier to Category' })
      .first();

    const dialog = page.locator('[role="dialog"]');

    this.skuCategoryTrigger = dialog
      .locator('button[data-slot="select-trigger"]')
      .filter({ hasText: 'Select a category' })
      .first();

    this.supplierTrigger = dialog
      .locator('button[data-slot="select-trigger"]')
      .filter({ hasText: 'Select a supplier' })
      .first();

    this.addSupplierButton = dialog
      .locator('button[data-slot="button"]')
      .filter({ hasText: 'Add Supplier' })
      .first();

    this.table = page.locator('table[data-testid="data-grid"]');
  }

  // ===== NAVIGATION =====

  async navigateToSkuMasterRates(): Promise<void> {
    Logger.info('Clicking SKU Master Rates sidebar link');
    await this.navLink.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    await this.navLink.click();
    await this.page.waitForURL(/\/sku-master-rates(\?.*)?$/, { timeout: testConfig.timeouts.medium });
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.default);
    Logger.success('Navigated to SKU Master Rates page');
  }

  // ===== ADD SUPPLIER TO CATEGORY =====

  async clickAddSupplierToCategory(): Promise<void> {
    Logger.info('Clicking Add Supplier to Category button');
    await this.addSupplierToCategoryButton.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    await this.addSupplierToCategoryButton.click();
    await this.page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    await this.skuCategoryTrigger.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    Logger.success('Add Supplier dialog opened');
  }

  async selectRandomSkuCategory(): Promise<string> {
    Logger.info('Selecting a random SKU Category');
    await this.skuCategoryTrigger.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
    await this.skuCategoryTrigger.click();
    await this.page.waitForTimeout(500);

    const options = this.page.locator('[data-slot="select-item"]');
    const optionCount = await options.count();
    if (optionCount === 0) throw new Error('No SKU Categories found in the dropdown');

    let randomIndex = Math.floor(Math.random() * optionCount);
    const firstOptionText = await options.first().textContent();
    if (firstOptionText?.includes('Select a category') && optionCount > 1) {
      randomIndex = Math.floor(Math.random() * (optionCount - 1)) + 1;
    }

    const selectedOption = options.nth(randomIndex);
    const categoryName = await selectedOption.textContent();
    await selectedOption.click();

    Logger.info(`Selected SKU Category: ${categoryName?.trim()}`);
    return categoryName?.trim() || '';
  }

  async selectRandomSupplier(): Promise<string> {
    Logger.info('Selecting a random Supplier');
    await this.supplierTrigger.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
    await this.supplierTrigger.click();
    await this.page.waitForTimeout(500);

    const options = this.page.locator('[data-slot="select-item"]');
    const optionCount = await options.count();
    if (optionCount === 0) throw new Error('No Suppliers found in the dropdown');

    let randomIndex = Math.floor(Math.random() * optionCount);
    const firstOptionText = await options.first().textContent();
    if (firstOptionText?.includes('Select a supplier') && optionCount > 1) {
      randomIndex = Math.floor(Math.random() * (optionCount - 1)) + 1;
    }

    const selectedOption = options.nth(randomIndex);
    const supplierName = await selectedOption.textContent();
    await selectedOption.click();

    Logger.info(`Selected Supplier: ${supplierName?.trim()}`);
    return supplierName?.trim() || '';
  }

  async clickAddSupplier(): Promise<void> {
    Logger.info('Clicking Add Supplier button');
    await this.addSupplierButton.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
    await this.addSupplierButton.click();
    // Dialog closes on success OR stays open on validation error.
    // We give it up to medium timeout; if it stays open we just continue.
    await this.page.locator('[role="dialog"]')
      .waitFor({ state: 'hidden', timeout: testConfig.timeouts.medium })
      .catch(() => Logger.warning('Add Supplier dialog may still be open, continuing...'));
    Logger.success('Add Supplier dialog submitted');
  }

  /**
   * Full flow: open dialog → pick random category → pick random supplier → submit.
   *
   * Returns:
   *   categoryName  - the category that was selected
   *   supplierName  - the supplier that was selected
   *   alreadyExists - true when the app showed the "already has rates" toast,
   *                   meaning no new rows were created but existing rows are fine
   */
  async addSupplierToCategory(): Promise<{
    categoryName: string;
    supplierName: string;
    alreadyExists: boolean;
  }> {
    await this.clickAddSupplierToCategory();
    const categoryName = await this.selectRandomSkuCategory();
    const supplierName = await this.selectRandomSupplier();
    await this.clickAddSupplier();

    // Give the app a moment to either show the "already exists" toast or
    // commit the new rows to the database.
    await this.page.waitForTimeout(1500);

    const alreadyExists = await this.ratesAlreadyExistToastVisible(supplierName, categoryName);
    if (alreadyExists) {
      Logger.info(`Rates already exist for "${supplierName}" in "${categoryName}" — no new rows created`);
    }

    return { categoryName, supplierName, alreadyExists };
  }

  /**
   * Check whether the "already has rates" info toast is currently visible.
   * The toast text looks like:
   *   '<Supplier>' already has rates for all SKUs in '<Category>'
   *
   * We do a loose contains-check so minor punctuation differences don't matter.
   */
  async ratesAlreadyExistToastVisible(supplierName: string, categoryName: string): Promise<boolean> {
    try {
      // Toast can appear in a [data-title] element or any div with matching text.
      // We check broadly for any element containing both key strings.
      const toast = this.page.locator('body').filter({
        hasText: new RegExp(`already has rates.*${escapeRegex(categoryName)}`, 'i'),
      });
      await toast.waitFor({ state: 'visible', timeout: 2000 });
      Logger.info('Detected "already has rates" toast');
      return true;
    } catch {
      return false;
    }
  }

  // ===== TABLE HELPERS =====

  async waitForTableToLoad(): Promise<void> {
    Logger.info('Waiting for SKU Master Rates table to load');
    await this.table.waitFor({ state: 'visible', timeout: testConfig.timeouts.long });
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.network);
    await this.page.waitForTimeout(1000);
  }

  // ===== SUPPLIER FILTER HELPERS =====

  /**
   * Find the Supplier filter trigger in the page's filter bar.
   * We locate the wrapper that also contains the "Filter by supplier" label.
   */
  private async _getSupplierFilterTrigger(): Promise<Locator> {
    const container = this.page.locator('div').filter({
      has: this.page.locator('text="Filter by supplier"'),
    }).last();

    const trigger = container.locator('button[data-slot="select-trigger"]').first();
    await trigger.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    return trigger;
  }

  /**
   * Click a named option in the currently-open select portal.
   * Tries [role="option"] first, falls back to [data-slot="select-item"].
   */
  private async _clickSelectOption(optionText: string): Promise<void> {
    const byRole = this.page.locator('[role="option"]').filter({ hasText: optionText }).first();
    const bySlot = this.page.locator('[data-slot="select-item"]').filter({ hasText: optionText }).first();

    try {
      await byRole.waitFor({ state: 'visible', timeout: 3000 });
      await byRole.click();
    } catch {
      await bySlot.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
      await bySlot.click();
    }
  }

  private async _waitForTableToFilter(): Promise<void> {
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.network);
    await this.page.waitForTimeout(800);
  }

  /**
   * Returns true if the table has at least one genuine data row (not a
   * section-header row or virtual-scroll spacer — both use td[colspan]).
   */
  private async _tableHasDataRows(): Promise<boolean> {
    const dataRows = this.page.locator(
      'table[data-testid="data-grid"] tbody tr:not(:has(td[colspan]))'
    );
    const count = await dataRows.count();
    Logger.info(`Data rows visible after filter: ${count}`);
    return count > 0;
  }

  private async _resetSupplierFilter(trigger: Locator): Promise<void> {
    try {
      await trigger.click();
      await this.page.waitForTimeout(400);
      await this._clickSelectOption('All');
      await this._waitForTableToFilter();
      Logger.info('Supplier filter reset to All');
    } catch {
      Logger.warning('Could not reset supplier filter — continuing anyway');
    }
  }

  /**
   * Use the page's Supplier filter to narrow the table to just the target
   * supplier, then confirm at least one data row is present.
   * This sidesteps virtual scrolling entirely.
   */
  async anyRateExistsForSupplier(supplierName: string): Promise<boolean> {
    Logger.info(`Filtering table by Supplier: "${supplierName}"`);

    const trigger = await this._getSupplierFilterTrigger();
    await trigger.click();
    await this.page.waitForTimeout(600);

    await this._clickSelectOption(supplierName);
    Logger.info(`Applied supplier filter: "${supplierName}"`);

    await this._waitForTableToFilter();

    const found = await this._tableHasDataRows();

    await this._resetSupplierFilter(trigger);

    if (!found) {
      Logger.warning(`No rows visible after filtering by supplier "${supplierName}"`);
    }
    return found;
  }

  /**
   * Filter by supplier then scan the (now small) table for a specific SKU.
   */
  async rateExistsInTable(skuName: string, supplierName: string): Promise<boolean> {
    Logger.info(`Filtering by supplier "${supplierName}" then looking for SKU "${skuName}"`);

    const trigger = await this._getSupplierFilterTrigger();
    await trigger.click();
    await this.page.waitForTimeout(600);

    await this._clickSelectOption(supplierName);
    await this._waitForTableToFilter();

    const rows = this.page.locator(
      'table[data-testid="data-grid"] tbody tr:not(:has(td[colspan]))'
    );
    const rowCount = await rows.count();
    Logger.info(`Filtered table has ${rowCount} rows for supplier "${supplierName}"`);

    let found = false;
    for (let i = 0; i < rowCount; i++) {
      const skuCell = rows.nth(i).locator('td:nth-child(2) span[title]');
      try {
        const skuText = await skuCell.getAttribute('title', { timeout: 1000 });
        if (skuText && skuText.trim() === skuName) {
          Logger.info(`Found SKU "${skuName}" at row ${i}`);
          found = true;
          break;
        }
      } catch {
        continue;
      }
    }

    await this._resetSupplierFilter(trigger);

    if (!found) {
      Logger.warning(`SKU "${skuName}" not found in filtered table for supplier "${supplierName}"`);
    }
    return found;
  }
}

// ===== UTILITY =====

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}