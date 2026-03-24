import { Page } from '@playwright/test';
import { DatabaseHelper } from './database-helper';
import { TestDataGenerator } from './test-data-generator';
import { OrganizationPage } from '../pages/OrganizationPage';
import { DashboardPage } from '../pages/DashboardPage';
import { Logger } from './logger';

/**
 * Organization Helper Utility
 * Provides reusable methods for ensuring an active organization exists
 */
export class OrganizationHelper {
  /**
   * Ensure there is an active organization before running tests
   * Creates one if none exists, or activates the first available if none is active
   * Includes manual page refresh to handle potential UI bugs
   *
   * @param page - Playwright page
   * @param database - Database helper instance
   * @param dashboardPage - Dashboard page object
   * @param organizationPage - Organization page object
   * @returns The slug of the active organization
   */
  static async ensureActiveOrganization(
    page: Page,
    database: DatabaseHelper,
    dashboardPage: DashboardPage,
    organizationPage: OrganizationPage
  ): Promise<string> {
    Logger.info('Ensuring an active organization exists...');

    // Navigate to organization page
    await dashboardPage.expandSidebarGroup('Organization');
    await page.locator('a[data-slot="sidebar-menu-sub-button"][href="/organization"]').click();
    await page.waitForURL('**/organization', { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');

    // MANUAL REFRESH: Refresh the page to ensure we have the latest data
    Logger.info('Refreshing organization page to ensure latest data...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Wait a bit for the table to render
    await page.waitForTimeout(1000);

    // Check if there are any organizations in the table
    const table = page.locator('table[data-testid="data-grid"]');
    const hasTable = await table.isVisible().catch(() => false);

    if (!hasTable) {
      Logger.info('No organization table found — creating new organization');
      return await this.createNewOrganization(page, dashboardPage, organizationPage);
    }

    const rows = page.locator('table[data-testid="data-grid"] tbody tr');
    const rowCount = await rows.count();

    // CASE 1: No organizations exist - create one
    if (rowCount === 0) {
      Logger.info('No organizations found in table — creating a new organization');
      return await this.createNewOrganization(page, dashboardPage, organizationPage);
    }

    // CASE 2: Check if any organization is already active
    let activeOrgSlug: string | null = null;

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      // Slug is in the 4th column with title attribute
      const slugCell = row.locator('td:nth-child(4) div[title]');

      // Check if slug cell exists and has content
      const hasSlugCell = await slugCell.isVisible().catch(() => false);
      if (!hasSlugCell) {
        continue;
      }

      const slug = (await slugCell.getAttribute('title'))?.trim() || '';
      if (!slug) {
        continue;
      }

      const button = row.locator('td:first-child button');
      const hasButton = await button.isVisible().catch(() => false);

      if (hasButton) {
        const buttonTitle = await button.getAttribute('title');
        if (buttonTitle === 'Active organization') {
          activeOrgSlug = slug;
          Logger.info(`Found active organization: ${activeOrgSlug}`);
          break;
        }
      }
    }

    // CASE 3: No active organization found - activate the first one
    if (!activeOrgSlug && rowCount > 0) {
      Logger.info('No active organization found. Activating the first organization...');

      const firstRow = rows.first();
      const slugCell = firstRow.locator('td:nth-child(4) div[title]');
      const hasSlugCell = await slugCell.isVisible().catch(() => false);

      if (hasSlugCell) {
        const slug = (await slugCell.getAttribute('title'))?.trim() || '';

        // Look for button with title "Set as active organization"
        const useButton = firstRow.locator('td:first-child button[title="Set as active organization"]');
        const hasUseButton = await useButton.isVisible().catch(() => false);

        if (hasUseButton) {
          await useButton.click();
          await page.waitForLoadState('networkidle');
          activeOrgSlug = slug;
          Logger.success(`Organization "${slug}" activated`);
        } else {
          // Check if it's already active
          const activeButton = firstRow.locator('td:first-child button[title="Active organization"]');
          const hasActiveButton = await activeButton.isVisible().catch(() => false);
          if (hasActiveButton) {
            activeOrgSlug = slug;
            Logger.info(`Organization "${slug}" is already active`);
          }
        }
      }
    }

    // If we still don't have an active organization, create one
    if (!activeOrgSlug) {
      Logger.info('Could not find or activate an existing organization — creating new one');
      return await this.createNewOrganization(page, dashboardPage, organizationPage);
    }

    return activeOrgSlug;
  }

  /**
   * Create a new organization and activate it
   */
  private static async createNewOrganization(
    page: Page,
    dashboardPage: DashboardPage,
    organizationPage: OrganizationPage
  ): Promise<string> {
    Logger.info('Creating a new organization...');

    const orgData = TestDataGenerator.generateOrganization();

    // Navigate to create page
    await dashboardPage.clickCreateButton();
    await organizationPage.fillOrganizationForm(orgData, 'test-logo.png');
    await organizationPage.clickSubmit();

    // Wait for creation to complete
    await organizationPage.verifyNavigationAfterSubmit();
    Logger.success(`Organization "${orgData.name}" created successfully`);

    // Navigate back to organization list and activate it
    await dashboardPage.navigateToOrganization();
    
    // MANUAL REFRESH: Refresh after navigation to ensure latest data
    Logger.info('Refreshing organization page after creation...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await organizationPage.waitForTableToLoad();

    // Find and click the Use Organization button
    const useButton = await organizationPage.findUseOrganizationButtonForSlug(orgData.slug);
    if (useButton) {
      const buttonTitle = await useButton.getAttribute('title');
      if (buttonTitle === 'Set as active organization') {
        await useButton.click();
        await page.waitForLoadState('networkidle');
        Logger.success(`Organization "${orgData.slug}" activated`);
      }
    }

    return orgData.slug;
  }
}