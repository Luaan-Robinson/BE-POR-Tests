import { Page, Locator } from '@playwright/test';
import { Logger } from '../utils/logger';
import testConfig from '../config/test-config';

/**
 * SKU Master Rates Page Object Model
 * Handles all interactions with the SKU Master Rates page including
 * the "Add Supplier to Category" dialog and table verification.
 */
export class SkuMasterRatesPage {
  // ===== NAVIGATION =====
  private readonly navLink: Locator;

  // ===== PAGE HEADER =====
  private readonly addSupplierToCategoryButton: Locator;

  // ===== ADD SUPPLIER DIALOG =====
  private readonly skuCategoryTrigger: Locator;
  private readonly supplierTrigger: Locator;
  private readonly addSupplierButton: Locator;

  // ===== TABLE =====
  private readonly table: Locator;
  private readonly tableRows: Locator;

  /**
   * Initialize SKU Master Rates page with locators
   * @param page - Playwright page object
   */
  constructor(public page: Page) {
    // Sidebar nav link
    this.navLink = page.locator('a[data-slot="sidebar-menu-sub-button"][href="/sku-master-rates"]');

    // Add Supplier to Category button (top of page, not inside dialog)
    this.addSupplierToCategoryButton = page
      .locator('button[data-slot="button"]')
      .filter({ hasText: 'Add Supplier to Category' })
      .first();

    // Add Supplier dialog fields - scope to the dialog content
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

    // Table
    this.table = page.locator('table[data-testid="data-grid"]');
    this.tableRows = page.locator('table[data-testid="data-grid"] tbody tr');
  }

  // ===== NAVIGATION =====

  /**
   * Click the SKU Master Rates link in the sidebar
   */
  async navigateToSkuMasterRates(): Promise<void> {
    Logger.info('Clicking SKU Master Rates sidebar link');
    await this.navLink.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    await this.navLink.click();
    await this.page.waitForURL(/\/sku-master-rates(\?.*)?$/, { timeout: testConfig.timeouts.medium });
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.default);
    Logger.success('Navigated to SKU Master Rates page');
  }

  // ===== ADD SUPPLIER TO CATEGORY =====

  /**
   * Click the "Add Supplier to Category" button to open the dialog
   */
  async clickAddSupplierToCategory(): Promise<void> {
    Logger.info('Clicking Add Supplier to Category button');
    await this.addSupplierToCategoryButton.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    await this.addSupplierToCategoryButton.click();
    // Wait for the dialog to appear
    await this.page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    await this.skuCategoryTrigger.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    Logger.success('Add Supplier dialog opened');
  }

  /**
   * Select a random SKU Category from the dropdown
   * @returns The selected category name
   */
  async selectRandomSkuCategory(): Promise<string> {
    Logger.info('Selecting a random SKU Category');
    
    await this.skuCategoryTrigger.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
    await this.skuCategoryTrigger.click();
    
    // Wait for options to appear
    await this.page.waitForTimeout(500);
    
    // Get all select items
    const options = this.page.locator('[data-slot="select-item"]');
    const optionCount = await options.count();
    
    if (optionCount === 0) {
      throw new Error('No SKU Categories found in the dropdown');
    }
    
    // Choose a random option (avoid the "Select a category" placeholder if present)
    let randomIndex = Math.floor(Math.random() * optionCount);
    
    // If the first option is the placeholder, start from index 1
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

  /**
   * Select a random Supplier from the dropdown
   * @returns The selected supplier name
   */
  async selectRandomSupplier(): Promise<string> {
    Logger.info('Selecting a random Supplier');
    
    await this.supplierTrigger.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
    await this.supplierTrigger.click();
    
    // Wait for options to appear
    await this.page.waitForTimeout(500);
    
    // Get all select items
    const options = this.page.locator('[data-slot="select-item"]');
    const optionCount = await options.count();
    
    if (optionCount === 0) {
      throw new Error('No Suppliers found in the dropdown');
    }
    
    // Choose a random option (avoid the "Select a supplier" placeholder if present)
    let randomIndex = Math.floor(Math.random() * optionCount);
    
    // If the first option is the placeholder, start from index 1
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

  /**
   * Click the Add Supplier button to submit the dialog
   */
  async clickAddSupplier(): Promise<void> {
    Logger.info('Clicking Add Supplier button');
    await this.addSupplierButton.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
    await this.addSupplierButton.click();
    // Wait for dialog to close
    await this.page.locator('[role="dialog"]').waitFor({ state: 'hidden', timeout: testConfig.timeouts.medium }).catch(() => {
      Logger.warning('Add Supplier dialog may still be open, continuing...');
    });
    Logger.success('Add Supplier dialog submitted');
  }

  /**
   * Full flow: open dialog → select category → select supplier → add
   * @returns Object containing the selected category and supplier names
   */
  async addSupplierToCategory(): Promise<{ categoryName: string; supplierName: string }> {
    await this.clickAddSupplierToCategory();
    const categoryName = await this.selectRandomSkuCategory();
    const supplierName = await this.selectRandomSupplier();
    await this.clickAddSupplier();
    return { categoryName, supplierName };
  }

  // ===== TABLE HELPERS =====

  /**
   * Wait for the SKU Master Rates table to be visible
   */
  async waitForTableToLoad(): Promise<void> {
    Logger.info('Waiting for SKU Master Rates table to load');
    await this.table.waitFor({ state: 'visible', timeout: testConfig.timeouts.long });
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.network);
    // Wait a bit for all rows to render (up to 500 rows)
    await this.page.waitForTimeout(2000);
  }

  /**
   * Find a table row by SKU name and Supplier name
   * The table rows have SKU in the second column and Supplier in the third column
   * This table can have up to 500 rows per page, so we search all visible rows
   * @param skuName - The SKU name to search for
   * @param supplierName - The supplier name to search for
   * @returns The row Locator or null if not found
   */
  async getRowBySkuAndSupplier(skuName: string, supplierName: string): Promise<Locator | null> {
    Logger.info(`Looking for row with SKU: "${skuName}" and Supplier: "${supplierName}"`);
    await this.waitForTableToLoad();

    // Get all rows and search through them
    const rowCount = await this.tableRows.count();
    Logger.info(`Total rows in table: ${rowCount}`);
    
    for (let i = 0; i < rowCount; i++) {
      const row = this.tableRows.nth(i);
      
      // Check if this is a section header row (has colspan)
      const hasColspan = await row.locator('td[colspan]').count() > 0;
      if (hasColspan) {
        continue; // Skip section header rows
      }
      
      // SKU is in the second column, Supplier in the third column
      const skuCell = row.locator('td:nth-child(2) span[title]');
      const supplierCell = row.locator('td:nth-child(3) span[title]');

      try {
        const skuText = await skuCell.getAttribute('title');
        const supplierText = await supplierCell.getAttribute('title');
        
        if (skuText && skuText.trim() === skuName && supplierText && supplierText.trim() === supplierName) {
          Logger.info(`Found row with SKU "${skuName}" and Supplier "${supplierName}" at row index ${i}`);
          return row;
        }
      } catch (error) {
        // cell not found in this row — continue
        continue;
      }
    }
    
    Logger.warning(`Row with SKU "${skuName}" and Supplier "${supplierName}" not found among ${rowCount} rows`);
    return null;
  }

  /**
   * Check whether any SKU Master Rate entry exists for a given supplier
   * @param supplierName - The supplier name to search for
   */
  async anyRateExistsForSupplier(supplierName: string): Promise<boolean> {
    Logger.info(`Looking for any rate entry with Supplier: "${supplierName}"`);
    await this.waitForTableToLoad();

    // Get all rows and search through them
    const rowCount = await this.tableRows.count();
    Logger.info(`Total rows in table: ${rowCount}`);
    
    for (let i = 0; i < rowCount; i++) {
      const row = this.tableRows.nth(i);
      
      // Check if this is a section header row (has colspan)
      const hasColspan = await row.locator('td[colspan]').count() > 0;
      if (hasColspan) {
        continue; // Skip section header rows
      }
      
      // Supplier is in the third column
      const supplierCell = row.locator('td:nth-child(3) span[title]');

      try {
        const supplierText = await supplierCell.getAttribute('title');
        
        if (supplierText && supplierText.trim() === supplierName) {
          Logger.info(`Found row with Supplier "${supplierName}" at row index ${i}`);
          return true;
        }
      } catch (error) {
        // cell not found in this row — continue
        continue;
      }
    }
    
    Logger.warning(`No rows found with Supplier "${supplierName}" among ${rowCount} rows`);
    return false;
  }

  /**
   * Check whether a SKU Master Rate entry exists in the table
   * @param skuName - SKU name
   * @param supplierName - Supplier name
   */
  async rateExistsInTable(skuName: string, supplierName: string): Promise<boolean> {
    const row = await this.getRowBySkuAndSupplier(skuName, supplierName);
    return row !== null;
  }
}