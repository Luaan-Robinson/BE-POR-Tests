/**
 * Global Teardown
 * Runs once after all tests complete
 * - Optionally cleans up test data
 * - Closes database connection
 */

import { DatabaseHelper } from './utils/database-helper';
import { Logger } from './utils/logger';
import testConfig from './config/test-config';

async function globalTeardown() {
  Logger.info('🧹 Starting global teardown...');

  try {
    // Skip all database operations in CI
    if (process.env.CI) {
      Logger.info('CI environment detected - skipping all database operations');
      Logger.success('✅ Global teardown complete');
      return;
    }

    // Check if DATABASE_URL is set and try to connect
    if (process.env.DATABASE_URL) {
      Logger.info('DATABASE_URL found, attempting database cleanup...');

      try {
        await DatabaseHelper.connect();
        Logger.success('Database connected for teardown cleanup');
      } catch (dbError) {
        Logger.warning('Could not connect to database for teardown:', dbError);
        Logger.success('✅ Global teardown complete');
        return;
      }

      // Optional: Clean up test data after all tests
      if (testConfig.database.cleanupOnEnd && DatabaseHelper.isConnected()) {
        Logger.info('Cleaning up test data...');

        try {
          const usersDeleted = await DatabaseHelper.cleanupTestUsers(
            `%@${testConfig.testData.testEmailDomain}`
          );
          Logger.success(`Cleaned up ${usersDeleted} test users`);
        } catch (userError) {
          Logger.warning('Failed to cleanup test users:', userError);
        }

        try {
          const orgsDeleted = await DatabaseHelper.cleanupTestOrganizations(
            `${testConfig.testData.testOrgPrefix}%`
          );
          Logger.success(`Cleaned up ${orgsDeleted} test organizations`);
        } catch (orgError) {
          Logger.warning('Failed to cleanup test organizations:', orgError);
        }
      } else {
        Logger.info('Skipping database cleanup (disabled or DB not connected)');
      }

      // Disconnect from database if connected
      if (DatabaseHelper.isConnected()) {
        try {
          await DatabaseHelper.disconnect();
          Logger.success('Database connection closed');
        } catch (disconnectError) {
          Logger.warning('Error disconnecting from database:', disconnectError);
        }
      }
    } else {
      Logger.info('No DATABASE_URL found, skipping database cleanup');
    }

    Logger.success('✅ Global teardown complete');
  } catch (error) {
    Logger.error('❌ Global teardown had errors but continuing', error);
    // Don't throw - allow tests to complete even if teardown fails
  }
}

export default globalTeardown;
