import { Page, Locator } from '@playwright/test';
import { Logger } from '../utils/logger';
import testConfig from '../config/test-config';

/**
 * SKU Categories Page Object Model
 */
export class SkuCategoriesPage {
  private readonly navLink: Locator;
  private readonly createButton: Locator;
  private readonly displayNameInput: Locator;
  private readonly ifRateNotFoundUseTrigger: Locator;
  private readonly supplierGroupTrigger: Locator;
  private readonly table: Locator;
  private readonly tableRows: Locator;

  constructor(public page: Page) {
    this.navLink = page.locator('a[data-slot="sidebar-menu-sub-button"][href="/sku-categories"]');
    this.createButton = page
      .locator('button[data-slot="button"]')
      .filter({ hasText: 'Create' })
      .first();
    this.displayNameInput = page.locator('input#displayName');
    this.ifRateNotFoundUseTrigger = page.locator('button[data-slot="select-trigger"]#ifRateNotFoundUse');
    this.supplierGroupTrigger = page.locator('button[data-slot="select-trigger"]#supplierGroupId');
    this.table = page.locator('table[data-testid="data-grid"]');
    this.tableRows = page.locator('table[data-testid="data-grid"] tbody tr');
  }

  async navigateToSkuCategories(): Promise<void> {
    Logger.info('Clicking SKU Categories sidebar link');
    await this.navLink.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    await this.navLink.click();
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.default);
    Logger.success('Navigated to SKU Categories page');
  }

  async openCreateDialog(): Promise<void> {
    await this.createButton.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    await this.createButton.click();
    await this.displayNameInput.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    Logger.info('Create SKU Category dialog opened');
  }

  async fillDisplayName(name: string): Promise<void> {
    await this.displayNameInput.fill(name);
    Logger.info(`Filled SKU Category name: ${name}`);
  }

  async selectIfRateNotFoundUse(option: 'Minimum' | 'Average' | 'Maximum'): Promise<void> {
    await this.ifRateNotFoundUseTrigger.click();
    await this.page
      .locator(`[data-slot="select-content"] [data-slot="select-item"]`)
      .filter({ hasText: option })
      .click();
    Logger.info(`Selected "If Rate Not Found Use": ${option}`);
  }

  async selectSupplierGroup(groupName: string): Promise<void> {
    await this.supplierGroupTrigger.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
    await this.supplierGroupTrigger.click();
    await this.page
      .locator(`[data-slot="select-content"] [data-slot="select-item"]`)
      .filter({ hasText: groupName })
      .click();
    Logger.info(`Selected Supplier Group: ${groupName}`);
  }

  /**
   * Select a supplier from the supplier dropdown
   * The dropdown appears when clicking "Select a supplier" and shows a list of supplier names
   */
  async selectSupplier(rowIndex: number = 0): Promise<void> {
    // Find all "Select a supplier" popover triggers (there may be multiple rows)
    const supplierTriggers = this.page.locator(
      'button[data-slot="popover-trigger"]'
    ).filter({ hasText: 'Select a supplier' });
    
    const triggerCount = await supplierTriggers.count();
    Logger.info(`Found ${triggerCount} "Select a supplier" triggers`);
    
    if (triggerCount === 0) {
      Logger.warning('No "Select a supplier" triggers found');
      return;
    }
    
    // Use the trigger at the specified index
    const trigger = supplierTriggers.nth(rowIndex);
    await trigger.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
    await trigger.click();
    Logger.info('Clicked "Select a supplier" trigger');
    
    // Wait for the popover/dropdown to appear
    await this.page.waitForTimeout(500);
    
    // The dropdown appears to use a popover with a list of items
    // Look for any clickable items that aren't "Close"
    const supplierOption = this.page
      .locator('[role="option"], [role="menuitem"], [cmdk-item], [data-slot="select-item"]')
      .filter({ hasNotText: 'Close' })
      .first();
    
    // Wait for option to be visible and click it
    await supplierOption.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
    const supplierName = await supplierOption.textContent();
    await supplierOption.click();
    Logger.info(`Selected supplier: ${supplierName}`);
    
    // Wait a moment for the selection to register
    await this.page.waitForTimeout(300);
    
    // Close the popover by clicking outside or on Close button if present
    const closeButton = this.page.locator('[cmdk-item]').filter({ hasText: 'Close' });
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
      Logger.info('Closed supplier dropdown');
    } else {
      // Click outside to close
      await this.page.keyboard.press('Escape');
      Logger.info('Pressed Escape to close dropdown');
    }
  }

  async submitCreateDialog(): Promise<void> {
    const submitButton = this.page.locator('button[type="submit"]').filter({ hasText: 'Create' });
    await submitButton.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
    await submitButton.click();
    await this.displayNameInput.waitFor({ state: 'hidden', timeout: testConfig.timeouts.medium });
    Logger.success('Create SKU Category dialog submitted');
  }

  async waitForTableToLoad(): Promise<void> {
    await this.table.waitFor({ state: 'visible', timeout: testConfig.timeouts.long });
  }

  async findRowByName(name: string, maxPages: number = 10): Promise<boolean> {
    let pageNum = 1;

    while (pageNum <= maxPages) {
      Logger.info(`Searching for "${name}" on page ${pageNum}...`);

      const rowCount = await this.tableRows.count();

      for (let i = 0; i < rowCount; i++) {
        const row = this.tableRows.nth(i);
        const nameCell = row.locator('td:nth-child(2) div[title]');

        try {
          const cellText = await nameCell.getAttribute('title');
          if (cellText && cellText.trim() === name) {
            Logger.info(`Found "${name}" at row ${i + 1} on page ${pageNum}`);
            return true;
          }
        } catch {
          continue;
        }
      }

      const nextButton = this.page
        .locator('button')
        .filter({ has: this.page.locator('span.sr-only:has-text("Go to next page")') });
      const hasNext = await nextButton.isVisible().catch(() => false);
      const isDisabled = await nextButton.isDisabled().catch(() => true);

      if (!hasNext || isDisabled) {
        Logger.info(`No more pages. Reached page ${pageNum}`);
        break;
      }

      await nextButton.click();
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(1000);
      pageNum++;
    }

    return false;
  }
}