import { Page, Locator } from '@playwright/test';
import { Logger } from '../utils/logger';
import testConfig from '../config/test-config';

/**
 * SKU Page Object Model
 * Handles all interactions with the SKU page including
 * the SKU list table, create dialog with all fields, and row actions.
 */
export class SkusPage {
  // ===== NAVIGATION =====
  private readonly navLink: Locator;

  // ===== PAGE HEADER =====
  private readonly createButton: Locator;

  // ===== CREATE DIALOG FIELDS =====
  private readonly skuCategoryHiddenSelect: Locator;
  private readonly displayNameInput: Locator;
  private readonly skuClassificationTrigger: Locator;
  private readonly unitHiddenSelect: Locator;
  private readonly canConvertToWeightHiddenSelect: Locator;
  private readonly weightFactorInput: Locator;
  private readonly weightUnitHiddenSelect: Locator;
  private readonly dialogSubmitButton: Locator;

  // ===== TABLE =====
  private readonly table: Locator;
  private readonly tableRows: Locator;

  // ===== PAGINATION =====
  private readonly nextPageButton: Locator;
  private readonly previousPageButton: Locator;

  /**
   * Initialize SKU page with locators
   * @param page - Playwright page object
   */
  constructor(public page: Page) {
    // Sidebar nav link
    this.navLink = page.locator('a[data-slot="sidebar-menu-sub-button"][href="/skus"]');

    // Page-level Create button
    this.createButton = page
      .locator('button[data-slot="button"]')
      .filter({ hasText: 'Create' })
      .first();

    // Create dialog fields
    this.skuCategoryHiddenSelect = page.locator('select[name="skuCategoryId"]');
    
    this.displayNameInput = page.locator('input#displayName');
    
    // SKU Classification - look for the field with placeholder "Type or select classification..."
    this.skuClassificationTrigger = page.locator('button[data-slot="popover-trigger"]').filter({ hasText: /Type or select classification/ });
    
    this.unitHiddenSelect = page.locator('select[name="unitId"]');
    
    this.canConvertToWeightHiddenSelect = page.locator('select[name="canConvertToWeight"]');
    
    this.weightFactorInput = page.locator('input#weightFactor');
    
    this.weightUnitHiddenSelect = page.locator('select[name="weightUnitId"]');

    // Submit button inside the dialog
    this.dialogSubmitButton = page.locator('button[type="submit"]').filter({ hasText: 'Create' }).last();

    // Table
    this.table = page.locator('table[data-testid="data-grid"]');
    this.tableRows = page.locator('table[data-testid="data-grid"] tbody tr');

    // Pagination
    this.nextPageButton = page
      .locator('button')
      .filter({ has: page.locator('span.sr-only:has-text("Go to next page")') });
    this.previousPageButton = page
      .locator('button')
      .filter({ has: page.locator('span.sr-only:has-text("Go to previous page")') });
  }

  // ===== NAVIGATION =====

  /**
   * Click the SKUs link in the sidebar
   */
  async navigateToSkus(): Promise<void> {
    Logger.info('Clicking SKUs sidebar link');
    await this.navLink.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    await this.navLink.click();
    // Wait for URL to include /skus (with or without query parameters)
    await this.page.waitForURL(/\/skus(\?.*)?$/, { timeout: testConfig.timeouts.medium });
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.default);
    Logger.success('Navigated to SKUs page');
  }

  // ===== CREATE DIALOG HELPERS =====

  /**
   * Click the Create button to open the create dialog
   */
  async clickCreateButton(): Promise<void> {
    Logger.info('Clicking Create button');
    await this.createButton.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    await this.createButton.click();
    await this.displayNameInput.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    Logger.success('Create dialog opened');
  }

  /**
   * Select a SKU Category from the dropdown using the hidden select
   * @param categoryName - The category name to select
   */
  async selectSkuCategory(categoryName: string): Promise<void> {
    Logger.info(`Selecting SKU Category: ${categoryName}`);
    
    // Use the hidden select directly
    await this.skuCategoryHiddenSelect.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
    await this.skuCategoryHiddenSelect.selectOption({ label: categoryName });
    
    Logger.success(`Selected SKU Category: ${categoryName}`);
  }

  /**
   * Fill the SKU display name
   * @param name - SKU display name
   */
  async fillDisplayName(name: string): Promise<void> {
    Logger.info(`Filling SKU display name: ${name}`);
    await this.displayNameInput.fill(name);
    await this.displayNameInput.blur();
  }

  /**
   * Select a SKU Classification from the popover
   * @param classificationName - The classification name to select
   */
  async selectSkuClassification(classificationName: string): Promise<void> {
    Logger.info(`Selecting SKU Classification: ${classificationName}`);
    
    // Wait for the trigger to be visible and click it
    await this.skuClassificationTrigger.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    await this.skuClassificationTrigger.click();
    
    // Wait for the popover to appear
    await this.page.waitForTimeout(500);
    
    // Find and click the matching item in the popover
    const classificationItem = this.page
      .locator('[role="option"], [cmdk-item]')
      .filter({ hasText: classificationName })
      .first();
    await classificationItem.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
    await classificationItem.click();
    
    Logger.success(`Selected SKU Classification: ${classificationName}`);
  }

  /**
   * Select a Unit from the dropdown using the hidden select
   * @param unitId - The unit ID to select (e.g., 'kg', 't', 'm3')
   */
  async selectUnit(unitId: string): Promise<void> {
    Logger.info(`Selecting Unit: ${unitId}`);
    
    // Use the hidden select directly
    await this.unitHiddenSelect.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
    await this.unitHiddenSelect.selectOption({ value: unitId });
    
    Logger.success(`Selected Unit: ${unitId}`);
  }

  /**
   * Set the "Can Convert To Weight" option using the hidden select
   * @param value - 'yes' or 'no'
   */
  async setCanConvertToWeight(value: 'yes' | 'no'): Promise<void> {
    Logger.info(`Setting "Can Convert To Weight" to: ${value}`);
    
    // Use the hidden select directly
    await this.canConvertToWeightHiddenSelect.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
    await this.canConvertToWeightHiddenSelect.selectOption({ value });
    
    // Wait for the weight fields to appear if setting to yes
    if (value === 'yes') {
      await this.weightFactorInput.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
      await this.weightUnitHiddenSelect.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
    }
    
    Logger.success(`Set "Can Convert To Weight" to: ${value}`);
  }

  /**
   * Fill the weight factor input
   * @param factor - Weight factor number (e.g., 1.87)
   */
  async fillWeightFactor(factor: number): Promise<void> {
    Logger.info(`Filling weight factor: ${factor}`);
    await this.weightFactorInput.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
    await this.weightFactorInput.fill(factor.toString());
    await this.weightFactorInput.blur();
  }

  /**
   * Select a Weight Unit from the dropdown using the hidden select
   * @param unitId - The weight unit ID to select (e.g., 'kg', 't')
   */
  async selectWeightUnit(unitId: string): Promise<void> {
    Logger.info(`Selecting Weight Unit: ${unitId}`);
    
    // Use the hidden select directly
    await this.weightUnitHiddenSelect.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
    await this.weightUnitHiddenSelect.selectOption({ value: unitId });
    
    Logger.success(`Selected Weight Unit: ${unitId}`);
  }

  /**
   * Submit the create SKU dialog form
   */
  async submitCreateDialog(): Promise<void> {
    Logger.info('Submitting Create SKU dialog');
    await this.dialogSubmitButton.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
    await this.dialogSubmitButton.click();
    // Wait for dialog to close
    await this.displayNameInput.waitFor({ state: 'hidden', timeout: testConfig.timeouts.medium });
    Logger.success('Create SKU dialog submitted');
  }

  // ===== CREATE METHODS =====

  /**
   * Create SKU without weight conversion
   * @param name - SKU display name
   * @param categoryName - SKU Category name
   * @param classificationName - SKU Classification name
   * @param unitId - Unit ID
   */
  async createSkuWithoutWeight(
    name: string,
    categoryName: string,
    classificationName: string,
    unitId: string
  ): Promise<void> {
    await this.clickCreateButton();
    await this.selectSkuCategory(categoryName);
    await this.fillDisplayName(name);
    await this.selectSkuClassification(classificationName);
    await this.selectUnit(unitId);
    // Can Convert To Weight defaults to No, so no action needed
    await this.submitCreateDialog();
  }

  /**
   * Create SKU with weight conversion
   * @param name - SKU display name
   * @param categoryName - SKU Category name
   * @param classificationName - SKU Classification name
   * @param unitId - Unit ID
   * @param weightFactor - Weight factor value
   * @param weightUnitId - Weight unit ID
   */
  async createSkuWithWeight(
    name: string,
    categoryName: string,
    classificationName: string,
    unitId: string,
    weightFactor: number,
    weightUnitId: string
  ): Promise<void> {
    await this.clickCreateButton();
    await this.selectSkuCategory(categoryName);
    await this.fillDisplayName(name);
    await this.selectSkuClassification(classificationName);
    await this.selectUnit(unitId);
    await this.setCanConvertToWeight('yes');
    await this.fillWeightFactor(weightFactor);
    await this.selectWeightUnit(weightUnitId);
    await this.submitCreateDialog();
  }

  // ===== TABLE HELPERS =====

  /**
   * Wait for the SKU table to be visible
   */
  async waitForTableToLoad(): Promise<void> {
    Logger.info('Waiting for SKU table to load');
    await this.table.waitFor({ state: 'visible', timeout: testConfig.timeouts.long });
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.network);
  }

  /**
   * Check if next page button is enabled
   */
  async hasNextPage(): Promise<boolean> {
    const isVisible = await this.nextPageButton.isVisible().catch(() => false);
    if (!isVisible) return false;
    const isDisabled = await this.nextPageButton.isDisabled().catch(() => true);
    return !isDisabled;
  }

  /**
   * Click next page button
   */
  async clickNextPage(): Promise<void> {
    Logger.info('Clicking next page button');
    await this.nextPageButton.click();
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.network);
    await this.page.waitForTimeout(1000);
  }

  /**
   * Find a table row by the SKU name
   * Looks in the second column (SKU) with title attribute
   * @param name - The SKU name to search for
   * @returns The row Locator or null if not found
   */
  async getRowBySkuName(name: string, maxPages: number = 10): Promise<Locator | null> {
    Logger.info(`Looking for SKU row with name: "${name}"`);
    await this.waitForTableToLoad();

    let pageNum = 1;

    while (pageNum <= maxPages) {
      Logger.info(`Searching on page ${pageNum}...`);

      const rowCount = await this.tableRows.count();
      Logger.info(`Table has ${rowCount} rows on page ${pageNum}`);

      for (let i = 0; i < rowCount; i++) {
        const row = this.tableRows.nth(i);
        // The SKU name is in the second column (td:nth-child(2)) with a div containing title
        const nameCell = row.locator('td:nth-child(2) div[title]');

        try {
          const titleAttr = await nameCell.getAttribute('title');
          if (titleAttr && titleAttr.trim() === name) {
            Logger.info(`Found SKU "${name}" at row ${i + 1} on page ${pageNum}`);
            return row;
          }
        } catch {
          // cell not found in this row — continue
        }
      }

      // Check for next page
      const hasNext = await this.hasNextPage();
      if (!hasNext) {
        Logger.info(`No more pages to search. Reached page ${pageNum}`);
        break;
      }

      Logger.info(`Moving to next page...`);
      await this.clickNextPage();
      pageNum++;
    }

    Logger.warning(`SKU "${name}" not found in table after searching ${pageNum} pages`);
    return null;
  }

  /**
   * Check whether a SKU with the given name exists in the table
   * @param name - SKU display name
   */
  async skuExistsInTable(name: string): Promise<boolean> {
    const row = await this.getRowBySkuName(name);
    return row !== null;
  }
}