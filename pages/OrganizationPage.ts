import { Page, Locator } from '@playwright/test';
import { Logger } from '../utils/logger';
import { OrganizationData } from '../utils/test-data-generator';
import testConfig from '../config/test-config';
import path from 'path';

/**
 * Organization Page Object Model
 * Handles all interactions with organization management pages
 * Covers both the organization list view and create/edit form
 *
 * This class encapsulates organization-related elements and actions,
 * following the Page Object Model pattern for maintainable tests.
 */
export class OrganizationPage {
  // ===== FORM FIELDS (Create Organization) =====
  private readonly nameInput: Locator;
  private readonly slugInput: Locator;
  private readonly logoInput: Locator;

  // ===== BUTTONS (Create Organization) =====
  private readonly submitButton: Locator;
  private readonly resetButton: Locator;

  // ===== NOTIFICATION/TOAST =====
  private readonly successToast: Locator;
  private readonly pageTitle: Locator;
  private readonly form: Locator;

  // ===== ORGANIZATION LIST TABLE ELEMENTS =====
  private readonly organizationsTable: Locator;
  private readonly tableRows: Locator;
  private readonly createButton: Locator;

  /**
   * Initialize Organization page with locators
   * @param page - Playwright page object
   */
  constructor(public page: Page) {
    // ===== CREATE FORM ELEMENTS =====
    this.nameInput = page.locator('input#name');
    this.slugInput = page.locator('input#slug');
    this.logoInput = page.locator('input#logo[type="file"]');

    this.submitButton = page.locator('button[type="submit"]:has-text("Submit")').first();
    this.resetButton = page.locator('button[type="button"]:has-text("Reset")').first();

    this.successToast = page.locator('[data-sonner-toast][data-type="success"]');
    this.pageTitle = page.locator('h1, [data-slot="title"]').first();
    this.form = page.locator('form#organization-form');

    // ===== ORGANIZATION LIST ELEMENTS =====
    this.organizationsTable = page.locator('table[data-slot="table"]');
    this.tableRows = page.locator('table[data-slot="table"] tbody tr');
    this.createButton = page.locator('a[href="/organization/create"] button');
  }

  // ===== HELPER METHODS =====

  public getTableRow(index: number): Locator {
    return this.tableRows.nth(index);
  }

  public async getSuccessToastCount(): Promise<number> {
    return this.successToast.count();
  }

  public async hasActiveOrgChangedToast(): Promise<boolean> {
    const newToast = this.successToast.filter({ hasText: 'Active organization changed' });
    return (await newToast.count()) > 0;
  }

  // ===== TABLE METHODS =====

  async waitForTableToLoad(): Promise<void> {
    Logger.info('Waiting for organizations table to load');
    await this.organizationsTable.waitFor({
      state: 'visible',
      timeout: testConfig.timeouts.long,
    });
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.network);
  }

  async getOrganizationRowBySlug(slug: string): Promise<Locator | null> {
    Logger.info(`Looking for organization with slug: ${slug}`);
    await this.waitForTableToLoad();

    const rows = this.tableRows;
    const rowCount = await rows.count();
    Logger.info(`Found ${rowCount} organization rows in table`);

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const slugCell = row.locator('td:nth-child(4) div.text-left');

      try {
        const cellText = await slugCell.textContent({
          timeout: testConfig.timeouts.short,
        });

        if (cellText && cellText.trim() === slug) {
          Logger.info(`Found organization row for slug: ${slug} at row ${i + 1}`);
          return row;
        }
      } catch (error) {
        Logger.debug(`Cell not found in row ${i}`, error);
        continue;
      }
    }

    Logger.warning(`Organization with slug "${slug}" not found in table`);
    return null;
  }

  /**
   * Find the action button for an organization (either "Use Organization" or "Active Organization")
   * @param slug - The organization slug
   * @returns The button locator or null if not found
   */
  async findOrganizationButtonForSlug(slug: string): Promise<Locator | null> {
    Logger.info(`Looking for organization button for slug: ${slug}`);

    const row = await this.getOrganizationRowBySlug(slug);
    if (!row) {
      return null;
    }

    // Look for any button in the first cell (action column)
    const actionButton = row.locator('td:first-child button');

    try {
      await actionButton.waitFor({
        state: 'visible',
        timeout: testConfig.timeouts.short,
      });
      
      const buttonText = await actionButton.textContent();
      Logger.info(`Found button with text: "${buttonText}" for slug: ${slug}`);
      return actionButton;
    } catch (error) {
      Logger.warning(`No button found for slug: ${slug}`);
      Logger.debug('Button search error', error);
      return null;
    }
  }

  /**
   * Find the "Use Organization" button for a specific organization
   * @deprecated Use findOrganizationButtonForSlug instead and check the button state
   */
  async findUseOrganizationButtonForSlug(slug: string): Promise<Locator | null> {
    Logger.info(`Looking for "Use Organization" button for slug: ${slug}`);

    const row = await this.getOrganizationRowBySlug(slug);
    if (!row) {
      return null;
    }

    const useButton = row.locator('td:first-child button:has-text("Use Organization")');

    try {
      await useButton.waitFor({
        state: 'visible',
        timeout: testConfig.timeouts.short,
      });
      Logger.info(`Found "Use Organization" button for slug: ${slug}`);
      return useButton;
    } catch (error) {
      Logger.warning(`"Use Organization" button not found for slug: ${slug}`);
      Logger.debug('Button search error', error);
      return null;
    }
  }

  async clickUseOrganizationForSlug(slug: string): Promise<boolean> {
    Logger.info(`Clicking "Use Organization" for slug: ${slug}`);

    const button = await this.findOrganizationButtonForSlug(slug);
    if (!button) {
      return false;
    }

    // Check if it's already active
    const buttonText = await button.textContent();
    if (buttonText?.includes('Active Organization')) {
      Logger.info(`Organization "${slug}" is already active, cannot click`);
      return false;
    }

    const isDisabled = await button.isDisabled();
    if (isDisabled) {
      Logger.info(`Organization "${slug}" button is disabled`);
      return false;
    }

    await button.click();
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.network);

    return true;
  }

  async isOrganizationActive(slug: string): Promise<boolean> {
    Logger.info(`Checking if organization "${slug}" is active`);

    const button = await this.findOrganizationButtonForSlug(slug);
    if (!button) {
      return false;
    }

    const isDisabled = await button.isDisabled();
    const hasStarIcon = await button
      .locator('svg.lucide-star')
      .isVisible()
      .catch(() => false);
    const buttonText = await button.textContent();
    const isActiveText = buttonText?.includes('Active Organization') || false;

    return isDisabled && hasStarIcon && isActiveText;
  }

  async verifyOrganizationInTable(slug: string): Promise<boolean> {
    Logger.info(`Verifying organization "${slug}" exists in table`);
    const row = await this.getOrganizationRowBySlug(slug);
    return row !== null;
  }

  async waitForActiveOrganizationToast(): Promise<boolean> {
    Logger.info('Waiting for "Active organization changed" toast');

    try {
      const toast = this.successToast.filter({ hasText: 'Active organization changed' });
      await toast.waitFor({
        state: 'visible',
        timeout: testConfig.timeouts.medium,
      });

      const checkIcon = toast.locator('.lucide-circle-check');
      await checkIcon.waitFor({
        state: 'visible',
        timeout: testConfig.timeouts.short,
      });

      Logger.success('Active organization toast appeared');
      return true;
    } catch (error) {
      Logger.warning('Active organization toast not found');
      Logger.debug('Toast wait error', error);
      return false;
    }
  }

  async getActiveOrganizationToastText(): Promise<string> {
    try {
      const toast = this.successToast.filter({ hasText: 'Active organization changed' });
      const titleElement = toast.locator('[data-title]');
      return (await titleElement.textContent()) || '';
    } catch (error) {
      Logger.debug('Could not get toast text', error);
      return '';
    }
  }

  async getTotalOrganizationsCount(): Promise<number> {
    await this.waitForTableToLoad();
    return await this.tableRows.count();
  }

  async scrollToOrganization(slug: string): Promise<void> {
    const row = await this.getOrganizationRowBySlug(slug);
    if (row) {
      Logger.info(`Scrolling to organization row for slug: ${slug}`);
      await row.scrollIntoViewIfNeeded();
      await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.default);
    }
  }

  // ===== CREATE FORM METHODS =====

  public async isLogoInputVisible(): Promise<boolean> {
    return this.logoInput.isVisible();
  }

  public async getNameInputAriaInvalid(): Promise<string | null> {
    return this.nameInput.getAttribute('aria-invalid');
  }

  public async getSlugInputAriaInvalid(): Promise<string | null> {
    return this.slugInput.getAttribute('aria-invalid');
  }

  async fillName(name: string): Promise<void> {
    Logger.info(`Filling organization name with: ${name}`);
    await this.nameInput.fill(name);
    await this.nameInput.blur(); // Trigger validation
  }

  async fillSlug(slug: string): Promise<void> {
    Logger.info(`Filling organization slug with: ${slug}`);
    await this.slugInput.fill(slug);
    await this.slugInput.blur(); // Trigger validation
  }

  async uploadLogo(imagePath: string): Promise<void> {
    Logger.info(`Uploading logo from: ${imagePath}`);

    const absolutePath = path.resolve(process.cwd(), imagePath);
    Logger.info(`Absolute path: ${absolutePath}`);

    await this.logoInput.setInputFiles(absolutePath);

    // Wait for file to be uploaded and processed
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.network);
  }

  async clickSubmit(): Promise<void> {
    Logger.info('Clicking Submit button');
    await this.submitButton.click();
  }

  async clickReset(): Promise<void> {
    Logger.info('Clicking Reset button');
    await this.resetButton.click();
  }

  async fillOrganizationForm(
    orgData: OrganizationData,
    logoPath: string = 'test-logo.png'
  ): Promise<void> {
    Logger.step(1, 'Fill organization name');
    await this.fillName(orgData.name);

    Logger.step(2, 'Fill organization slug');
    await this.fillSlug(orgData.slug);

    Logger.step(3, 'Upload organization logo');
    await this.uploadLogo(logoPath);
  }

  async createOrganization(
    orgData: OrganizationData,
    logoPath: string = 'test-logo.png'
  ): Promise<void> {
    Logger.info(`Creating organization: ${orgData.name}`);

    await this.fillOrganizationForm(orgData, logoPath);
    await this.clickSubmit();
  }

  async isOnCreatePage(): Promise<boolean> {
    try {
      await this.page.waitForURL('**/organization/create', {
        timeout: testConfig.timeouts.medium,
      });
      return true;
    } catch (error) {
      Logger.debug('Not on create page', error);
      return false;
    }
  }

  async verifyPageTitle(): Promise<Locator> {
    Logger.info('Verifying page title');
    return this.pageTitle;
  }

  async isSuccessToastVisible(): Promise<boolean> {
    try {
      await this.successToast.waitFor({
        state: 'visible',
        timeout: testConfig.timeouts.long,
      });
      return true;
    } catch (error) {
      Logger.debug('Success toast not visible', error);
      return false;
    }
  }

  async waitForSuccessToast(): Promise<void> {
    Logger.info('Waiting for success toast');
    await this.successToast.waitFor({
      state: 'visible',
      timeout: testConfig.timeouts.extraLong,
    });
  }

  async getSuccessToastText(): Promise<string> {
    try {
      const titleElement = this.successToast.locator('[data-title]');
      return (await titleElement.textContent()) || '';
    } catch (error) {
      Logger.debug('Could not get toast text', error);
      return '';
    }
  }

  async getNameValue(): Promise<string> {
    return await this.nameInput.inputValue();
  }

  async getSlugValue(): Promise<string> {
    return await this.slugInput.inputValue();
  }

  async isLogoUploaded(): Promise<boolean> {
    const files = await this.logoInput.inputValue();
    return files.length > 0;
  }

  async isSubmitButtonVisible(): Promise<boolean> {
    try {
      await this.submitButton.waitFor({
        state: 'visible',
        timeout: testConfig.timeouts.short,
      });
      return true;
    } catch (error) {
      Logger.debug('Submit button not visible', error);
      return false;
    }
  }

  async isResetButtonVisible(): Promise<boolean> {
    try {
      await this.resetButton.waitFor({
        state: 'visible',
        timeout: testConfig.timeouts.short,
      });
      return true;
    } catch (error) {
      Logger.debug('Reset button not visible', error);
      return false;
    }
  }

  async verifyFormReset(): Promise<boolean> {
    const nameValue = await this.getNameValue();
    const slugValue = await this.getSlugValue();
    return nameValue === '' && slugValue === '';
  }

  async verifyNavigationAfterSubmit(): Promise<boolean> {
    try {
      // First, try waiting for success toast
      try {
        await this.successToast.waitFor({
          state: 'visible',
          timeout: testConfig.timeouts.short,
        });
        Logger.info('Success toast appeared');
        return true;
      } catch {
        // If no toast, check for redirect to organization list
        await this.page.waitForURL('**/organization', {
          timeout: testConfig.timeouts.medium,
        });
        Logger.info('Redirected to organization list');
        return true;
      }
    } catch (error) {
      Logger.error('Neither success toast nor redirect occurred');
      Logger.debug('Navigation verification error', error);
      return false;
    }
  }

  async areFieldsCleared(): Promise<boolean> {
    const nameValue = await this.getNameValue();
    const slugValue = await this.getSlugValue();
    return nameValue === '' && slugValue === '';
  }

  // ===== NAVIGATION METHODS =====

  async navigateToOrganizationList(): Promise<void> {
    Logger.info('Navigating to organization list page');
    await this.page.goto('/organization');
    await this.page.waitForLoadState(testConfig.waitStrategies.loadStates.default);
  }

  async clickCreateOrganization(): Promise<void> {
    Logger.info('Clicking Create Organization button');
    await this.createButton.click();
  }

  async isCreateButtonVisible(): Promise<boolean> {
    try {
      await this.createButton.waitFor({
        state: 'visible',
        timeout: testConfig.timeouts.medium,
      });
      return true;
    } catch (error) {
      Logger.debug('Create button not visible', error);
      return false;
    }
  }
}