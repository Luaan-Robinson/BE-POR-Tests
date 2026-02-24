import { test as base } from '@playwright/test';
import { SignInPage } from '../pages/SignInPage';
import { SignUpPage } from '../pages/SignUpPage';
import { DashboardPage } from '../pages/DashboardPage';
import { OrganizationPage } from '../pages/OrganizationPage';
import { ClientsPage } from '../pages/ClientsPage';
import { SupplierGroupsPage } from '../pages/SupplierGroupsPage';
import { DatabaseHelper } from '../utils/database-helper';
import testConfig from '../config/test-config';
import { Logger } from '../utils/logger';

/**
 * Extended fixtures for test isolation and database support
 */
type CustomFixtures = {
  signInPage: SignInPage;
  signUpPage: SignUpPage;
  dashboardPage: DashboardPage;
  organizationPage: OrganizationPage;
  clientsPage: ClientsPage;
  supplierGroupsPage: SupplierGroupsPage;
  authenticatedPage: void;
  database: typeof DatabaseHelper;
  testCleanup: TestCleanup;
};

/**
 * Test cleanup tracker
 * Tracks resources created during test for automatic cleanup
 */
class TestCleanup {
  private usersToCleanup: string[] = [];
  private organizationsToCleanup: string[] = [];

  registerUser(email: string): void {
    this.usersToCleanup.push(email);
    Logger.debug(`Registered user for cleanup: ${email}`);
  }

  registerOrganization(slug: string): void {
    this.organizationsToCleanup.push(slug);
    Logger.debug(`Registered organization for cleanup: ${slug}`);
  }

  async cleanup(): Promise<void> {
    if (!process.env.DATABASE_URL || (process.env.CI && !process.env.DATABASE_URL)) {
      Logger.info('Skipping database cleanup - no DATABASE_URL or CI without database');
      this.usersToCleanup = [];
      this.organizationsToCleanup = [];
      return;
    }

    Logger.info('Starting test cleanup...');

    try {
      await DatabaseHelper.connect();
    } catch (error) {
      Logger.warning('Could not connect to database for cleanup', error);
      return;
    }

    for (const slug of this.organizationsToCleanup) {
      try {
        await DatabaseHelper.deleteOrganizationBySlug(slug);
        Logger.debug(`Cleaned up organization: ${slug}`);
      } catch (error) {
        Logger.warning(`Failed to cleanup organization ${slug}:`, error);
      }
    }

    for (const email of this.usersToCleanup) {
      try {
        await DatabaseHelper.deleteUserByEmail(email);
        Logger.debug(`Cleaned up user: ${email}`);
      } catch (error) {
        Logger.warning(`Failed to cleanup user ${email}:`, error);
      }
    }

    Logger.success(
      `Cleanup complete: ${this.usersToCleanup.length} users, ${this.organizationsToCleanup.length} orgs`
    );

    this.usersToCleanup = [];
    this.organizationsToCleanup = [];
  }

  getStats(): { users: number; organizations: number } {
    return {
      users: this.usersToCleanup.length,
      organizations: this.organizationsToCleanup.length,
    };
  }
}

export const test = base.extend<CustomFixtures>({
  database: async ({}, use) => {
    if (process.env.CI && !process.env.DATABASE_URL) {
      Logger.info('Skipping database connection - CI without DATABASE_URL');
      await use(DatabaseHelper);
      return;
    }

    if (process.env.DATABASE_URL) {
      try {
        await DatabaseHelper.connect();
      } catch (error) {
        Logger.warning('Could not connect to database', error);
      }
    } else {
      Logger.info('Skipping database connection - no DATABASE_URL');
    }

    await use(DatabaseHelper);
  },

  testCleanup: async ({}, use) => {
    const cleanup = new TestCleanup();
    await use(cleanup);

    if (process.env.CI && !process.env.DATABASE_URL) {
      Logger.info('Skipping test cleanup - CI without DATABASE_URL');
      return;
    }

    if (process.env.DATABASE_URL) {
      try {
        await DatabaseHelper.connect();
      } catch (error) {
        Logger.warning('Could not connect to database for cleanup', error);
      }
      await cleanup.cleanup();
    } else {
      Logger.info('Skipping test cleanup - no DATABASE_URL');
    }
  },

  signInPage: async ({ page }, use) => {
    await use(new SignInPage(page));
  },

  signUpPage: async ({ page }, use) => {
    await use(new SignUpPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  organizationPage: async ({ page }, use) => {
    await use(new OrganizationPage(page));
  },

  clientsPage: async ({ page }, use) => {
    await use(new ClientsPage(page));
  },

  supplierGroupsPage: async ({ page }, use) => {
    await use(new SupplierGroupsPage(page));
  },

  authenticatedPage: async ({ page }, use) => {
    Logger.info('🔐 Setting up authenticated session');

    const signInPage = new SignInPage(page);

    await signInPage.navigateToHome();
    await page.click('a:has-text("Sign In")');
    await signInPage.signIn(
      testConfig.testUsers.validUser.email,
      testConfig.testUsers.validUser.password,
      true
    );

    await page.waitForURL('**/dashboard', { timeout: 15000 });
    Logger.success('✅ User authenticated and on dashboard');

    await use();
  },
});

export { expect } from '@playwright/test';