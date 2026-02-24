import { Page, Locator } from '@playwright/test';
import { Logger } from '../utils/logger';
import testConfig from '../config/test-config';

/**
 * Clients Page Object Model
 * Handles all interactions with the Clients page including
 * the client list table, create dialog, and row actions.
 */
export class ClientsPage {
  // ===== NAVIGATION =====
  private readonly clientsNavLink: Locator;

  // ===== PAGE HEADER =====
  private readonly createButton: Locator;

  // ===== CREATE DIALOG =====
  private readonly displayNameInput: Locator;
  private readonly dialogSubmitButton: Locator;

  // ===== TABLE =====
  private readonly clientsTable: Locator;
  private readonly tableRows: Locator;

  /**
   * Initialize Clients page with locators
   * @param page - Playwright page object
   */
  constructor(public page: Page) {
    // Sidebar nav link - target by href for specificity
    this.clientsNavLink = page.locator('a[data-slot="sidebar-menu-button"][href="/clients"]');

    // Page-level Create button (the one in the top-right area, not inside a dialog)
    // It has a Plus icon and text "Create", but we scope it outside any dialog
    this.createButton = page
      .locator('div.flex.items-center.gap-2 > button')
      .filter({ hasText: 'Create' })
      .first();

    // Create dialog form fields
    this.displayNameInput = page.locator('input#displayName');

    // Submit button inside the dialog form (type="submit")
    this.dialogSubmitButton = page.locator('button[type="submit"]').filter({ hasText: 'Create' });

    // Table
    this.clientsTable = page.locator('table[data-slot="table"]');
    this.tableRows = page.locator('table[data-slot="table"] tbody tr');
  }

  // ===== NAVIGATION =====

  /**
   * Click the Clients link in the sidebar
   */
  async navigateToClients(): Promise<void> {
    Logger.info('Clicking Clients sidebar link');
    await this.clientsNavLink.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    await this.clientsNavLink.click();
    await this.page.waitForURL('**/clients', { timeout: testConfig.timeouts.medium });
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.default);
    Logger.success('Navigated to Clients page');
  }

  // ===== CREATE CLIENT =====

  /**
   * Click the top-level Create button to open the create dialog
   */
  async clickCreateButton(): Promise<void> {
    Logger.info('Clicking Create button');
    await this.createButton.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    await this.createButton.click();
    // Wait for the dialog / input to appear
    await this.displayNameInput.waitFor({ state: 'visible', timeout: testConfig.timeouts.medium });
    Logger.success('Create dialog opened');
  }

  /**
   * Fill the client display name in the dialog
   * @param name - Client display name
   */
  async fillDisplayName(name: string): Promise<void> {
    Logger.info(`Filling client display name: ${name}`);
    await this.displayNameInput.fill(name);
    await this.displayNameInput.blur();
  }

  /**
   * Submit the create client dialog form
   */
  async submitCreateDialog(): Promise<void> {
    Logger.info('Submitting Create Client dialog');
    await this.dialogSubmitButton.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
    await this.dialogSubmitButton.click();
    // Wait for dialog to close (input disappears)
    await this.displayNameInput.waitFor({ state: 'hidden', timeout: testConfig.timeouts.medium });
    Logger.success('Create Client dialog submitted');
  }

  /**
   * Full create client flow: open dialog → fill name → submit
   * @param name - Client display name
   */
  async createClient(name: string): Promise<void> {
    await this.clickCreateButton();
    await this.fillDisplayName(name);
    await this.submitCreateDialog();
  }

  // ===== TABLE HELPERS =====

  /**
   * Wait for the clients table to be visible
   */
  async waitForTableToLoad(): Promise<void> {
    Logger.info('Waiting for clients table to load');
    await this.clientsTable.waitFor({ state: 'visible', timeout: testConfig.timeouts.long });
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.network);
  }

  /**
   * Find a table row by the client display name
   * Looks in the "Client Name" column (second <td>)
   * @param name - The display name to search for
   * @returns The row Locator or null if not found
   */
  async getRowByClientName(name: string): Promise<Locator | null> {
    Logger.info(`Looking for client row with name: "${name}"`);
    await this.waitForTableToLoad();

    const rowCount = await this.tableRows.count();
    Logger.info(`Table has ${rowCount} rows`);

    for (let i = 0; i < rowCount; i++) {
      const row = this.tableRows.nth(i);
      // The name cell is the second <td> — rendered as a div with text-left
      const nameCell = row.locator('td:nth-child(2) div.text-left');
      try {
        const text = await nameCell.textContent({ timeout: testConfig.timeouts.short });
        if (text?.trim() === name) {
          Logger.info(`Found client "${name}" at row ${i + 1}`);
          return row;
        }
      } catch {
        // cell not found in this row — continue
      }
    }

    Logger.warning(`Client "${name}" not found in table`);
    return null;
  }

  /**
   * Check whether a client with the given name exists in the table
   * @param name - Client display name
   */
  async clientExistsInTable(name: string): Promise<boolean> {
    const row = await this.getRowByClientName(name);
    return row !== null;
  }

  // ===== DELETE CLIENT =====

  /**
   * Click the Deactivate (X) icon button for a specific client row.
   * Based on the HTML snippet the action buttons are Eye → Edit → X (Deactivate).
   * We use the X / Deactivate button (title="Deactivate") to remove / deactivate the client.
   * @param name - Client display name
   * @returns true if the button was clicked, false if the row was not found
   */
  async clickDeactivateForClient(name: string): Promise<boolean> {
    Logger.info(`Clicking Deactivate button for client: "${name}"`);
    const row = await this.getRowByClientName(name);
    if (!row) {
      Logger.warning(`Could not find row for client "${name}" — skipping deactivate`);
      return false;
    }

    const deactivateButton = row.locator('button[title="Deactivate"]');
    await deactivateButton.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
    await deactivateButton.click();
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.network);
    Logger.success(`Deactivate button clicked for client "${name}"`);
    return true;
  }

  /**
   * Convenience alias — same as clickDeactivateForClient.
   * Named "deleteClient" so test code reads naturally.
   */
  async deleteClient(name: string): Promise<boolean> {
    return this.clickDeactivateForClient(name);
  }

  // ===== MISC =====

  /**
   * Return whether the page-level Create button is visible
   */
  async isCreateButtonVisible(): Promise<boolean> {
    try {
      await this.createButton.waitFor({ state: 'visible', timeout: testConfig.timeouts.short });
      return true;
    } catch {
      return false;
    }
  }
}