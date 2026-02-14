import { test as base } from '@playwright/test';
import { SignInPage } from '../pages/SignInPage';
import { SignUpPage } from '../pages/SignUpPage';
import { DashboardPage } from '../pages/DashboardPage';
import { OrganizationPage } from '../pages/OrganizationPage';
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
  authenticatedPage: void; // Auto-authenticates user
  database: typeof DatabaseHelper; // Database helper instance
  testCleanup: TestCleanup; // Automatic cleanup tracking
};

/**
 * Test cleanup tracker
 * Tracks resources created during test for automatic cleanup
 */
class TestCleanup {
  private usersToCleanup: string[] = [];
  private organizationsToCleanup: string[] = [];

  /**
   * Register a user email for cleanup after test
   */
  registerUser(email: string): void {
    this.usersToCleanup.push(email);
    Logger.debug(`Registered user for cleanup: ${email}`);
  }

  /**
   * Register an organization slug for cleanup after test
   */
  registerOrganization(slug: string): void {
    this.organizationsToCleanup.push(slug);
    Logger.debug(`Registered organization for cleanup: ${slug}`);
  }

  /**
   * Clean up all registered resources
   */
  async cleanup(): Promise<void> {
    Logger.info('Starting test cleanup...');

    // Clean up organizations first (may have foreign key dependencies)
    for (const slug of this.organizationsToCleanup) {
      await DatabaseHelper.deleteOrganizationBySlug(slug);
    }

    // Clean up users
    for (const email of this.usersToCleanup) {
      await DatabaseHelper.deleteUserByEmail(email);
    }

    Logger.success(
      `Cleanup complete: ${this.usersToCleanup.length} users, ${this.organizationsToCleanup.length} orgs`
    );

    // Clear arrays
    this.usersToCleanup = [];
    this.organizationsToCleanup = [];
  }

  /**
   * Get cleanup statistics
   */
  getStats(): { users: number; organizations: number } {
    return {
      users: this.usersToCleanup.length,
      organizations: this.organizationsToCleanup.length,
    };
  }
}

export const test = base.extend<CustomFixtures>({
  /**
   * Database fixture - provides access to database helper
   */
  database: async ({}, use: (r: typeof DatabaseHelper) => Promise<void>) => {
    // Ensure database is connected
    await DatabaseHelper.connect();
    await use(DatabaseHelper);
    // Connection is closed in global teardown
  },

  /**
   * Test cleanup fixture - automatic cleanup of test data
   */
  testCleanup: async ({}, use: (r: TestCleanup) => Promise<void>) => {
    const cleanup = new TestCleanup();
    await use(cleanup);
    // Cleanup runs after test completes
    await cleanup.cleanup();
  },

  /**
   * Sign In Page fixture
   */
  signInPage: async ({ page }, use) => {
    const signInPage = new SignInPage(page);
    await use(signInPage);
  },

  /**
   * Sign Up Page fixture
   */
  signUpPage: async ({ page }, use) => {
    const signUpPage = new SignUpPage(page);
    await use(signUpPage);
  },

  /**
   * Dashboard Page fixture
   */
  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  /**
   * Organization Page fixture
   */
  organizationPage: async ({ page }, use) => {
    const organizationPage = new OrganizationPage(page);
    await use(organizationPage);
  },

  /**
   * Authenticated Page Fixture
   * Automatically signs in the user before the test runs
   * Use this for tests that require authentication
   */
  authenticatedPage: async ({ page }, use) => {
    Logger.info('🔐 Setting up authenticated session');

    const signInPage = new SignInPage(page);

    // Navigate and sign in
    await signInPage.navigateToHome();
    await page.click('a:has-text("Sign In")');
    await signInPage.signIn(
      testConfig.testUsers.validUser.email,
      testConfig.testUsers.validUser.password,
      true
    );

    // Wait for dashboard to confirm successful login
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    Logger.success('✅ User authenticated and on dashboard');

    await use();

    // Cleanup is handled by browser context closure
  },
});

export { expect } from '@playwright/test';
