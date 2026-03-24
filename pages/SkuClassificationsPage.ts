import { Page, Locator } from '@playwright/test';
import { Logger } from '../utils/logger';
import testConfig from '../config/test-config';

/**
 * SKU Classifications Page Object Model
 * Handles all interactions with the SKU Classifications page including
 * the classification list table, create dialog, and row actions.
 */
export class SkuClassificationsPage {
  // ===== NAVIGATION =====
  private readonly navLink: Locator;

  // ===== PAGE HEADER =====
  private readonly createButton: Locator;

  // ===== CREATE DIALOG =====
  private readonly displayNameInput: Locator;
  private readonly dialogSubmitButton: Locator;

  // ===== TABLE =====
  private readonly table: Locator;
  private readonly tableRows: Locator;

  // ===== PAGINATION =====
  private readonly nextPageButton: Locator;
  private readonly previousPageButton: Locator;

  // ===== DELETE CONFIRMATION DIALOG =====
  private readonly confirmDeleteButton: Locator;

  /**
   * Initialize SKU Classifications page with locators
   * @param page - Playwright page object
   */
  constructor(public page: Page) {
    // Sidebar nav link
    this.navLink = page.locator('a[data-slot="sidebar-menu-sub-button"][href="/sku-classifications"]');

    // Page-level Create button
    this.createButton = page
      .locator('button[data-slot="button"]')
      .filter({ hasText: 'Create' })
      .first();

    // Create dialog form fields
    this.displayNameInput = page.locator('input#displayName');

    // Submit button inside the dialog
    this.dialogSubmitButton = page.locator('button[type="submit"]').filter({ hasText: 'Create' });

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

    // Delete confirmation dialog
    this.confirmDeleteButton = page.locator('button[data-slot="button"]').filter({ hasText: 'Delete' });
  }

  // ===== NAVIGATION =====

  /**
   * Click the SKU Classifications link in the sidebar
   */
  async navigateToSkuClassifications(): Promise<void> {
    Logger.info('Clicking SKU Classifications sidebar link');
    await this.navLink.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    await this.navLink.click();
    await this.page.waitForURL('**/sku-classifications', { timeout: testConfig.timeouts.medium });
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.default);
    Logger.success('Navigated to SKU Classifications page');
  }

  // ===== CREATE CLASSIFICATION =====

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
   * Fill the classification display name in the dialog
   * @param name - Classification display name
   */
  async fillDisplayName(name: string): Promise<void> {
    Logger.info(`Filling classification display name: ${name}`);
    await this.displayNameInput.fill(name);
    await this.displayNameInput.blur();
  }

  /**
   * Submit the create classification dialog form
   */
  async submitCreateDialog(): Promise<void> {
    Logger.info('Submitting Create Classification dialog');
    await this.dialogSubmitButton.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
    await this.dialogSubmitButton.click();
    await this.displayNameInput.waitFor({ state: 'hidden', timeout: testConfig.timeouts.medium });
    Logger.success('Create Classification dialog submitted');
  }

  /**
   * Full create classification flow: open dialog → fill name → submit
   * @param name - Classification display name
   */
  async createClassification(name: string): Promise<void> {
    await this.clickCreateButton();
    await this.fillDisplayName(name);
    await this.submitCreateDialog();
  }

  // ===== TABLE HELPERS =====

  /**
   * Wait for the classification table to be visible
   */
  async waitForTableToLoad(): Promise<void> {
    Logger.info('Waiting for classification table to load');
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
   * Find a table row by the classification name
   * Looks in the second column (Classification Name) with title attribute
   * @param name - The classification name to search for
   * @returns The row Locator or null if not found
   */
  async getRowByClassificationName(name: string, maxPages: number = 10): Promise<Locator | null> {
    Logger.info(`Looking for classification row with name: "${name}"`);
    await this.waitForTableToLoad();

    let pageNum = 1;

    while (pageNum <= maxPages) {
      Logger.info(`Searching on page ${pageNum}...`);

      const rowCount = await this.tableRows.count();
      Logger.info(`Table has ${rowCount} rows on page ${pageNum}`);

      for (let i = 0; i < rowCount; i++) {
        const row = this.tableRows.nth(i);
        // The name cell is the second column (td:nth-child(2)) with a div containing title
        const nameCell = row.locator('td:nth-child(2) div[title]');

        try {
          const titleAttr = await nameCell.getAttribute('title');
          if (titleAttr && titleAttr.trim() === name) {
            Logger.info(`Found classification "${name}" at row ${i + 1} on page ${pageNum}`);
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

    Logger.warning(`Classification "${name}" not found in table after searching ${pageNum} pages`);
    return null;
  }

  /**
   * Check whether a classification with the given name exists in the table
   * @param name - Classification display name
   */
  async classificationExistsInTable(name: string): Promise<boolean> {
    const row = await this.getRowByClassificationName(name);
    return row !== null;
  }

  // ===== DELETE CLASSIFICATION =====

  /**
   * Click the Delete (trash) button for a specific classification row
   * @param name - Classification display name
   * @returns true if the button was clicked, false if the row was not found
   */
  async clickDeleteButtonForClassification(name: string): Promise<boolean> {
    Logger.info(`Clicking Delete button for classification: "${name}"`);
    const row = await this.getRowByClassificationName(name);
    if (!row) {
      Logger.warning(`Could not find row for classification "${name}" — skipping delete`);
      return false;
    }

    const deleteButton = row.locator('button[title="Delete"]');
    await deleteButton.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
    await deleteButton.click();
    Logger.success(`Delete button clicked for classification "${name}"`);
    return true;
  }

  /**
   * Confirm deletion in the confirmation dialog
   */
  async confirmDeletion(): Promise<void> {
    Logger.info('Waiting for confirmation dialog and clicking Delete button');
    await this.confirmDeleteButton.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    await this.confirmDeleteButton.click();
    await this.confirmDeleteButton.waitFor({ state: 'hidden', timeout: testConfig.timeouts.medium });
    Logger.success('Deletion confirmed');
  }

  /**
   * Delete a classification via UI and verify it's removed from the table
   * @param name - Classification display name
   */
  async deleteClassification(name: string): Promise<boolean> {
    const clicked = await this.clickDeleteButtonForClassification(name);
    if (!clicked) {
      return false;
    }

    // Wait for confirmation dialog to appear and confirm
    await this.confirmDeletion();

    // Wait for deletion to process
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.network);
    await this.page.waitForTimeout(1000);
    await this.page.reload();
    await this.waitForTableToLoad();

    const stillExists = await this.classificationExistsInTable(name);
    return !stillExists;
  }
}