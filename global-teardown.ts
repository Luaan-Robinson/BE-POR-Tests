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
    // Optional: Clean up test data after all tests
    if (testConfig.database.cleanupOnEnd) {
      Logger.info('Cleaning up test data...');

      const usersDeleted = await DatabaseHelper.cleanupTestUsers(
        `%@${testConfig.testData.testEmailDomain}`
      );

      const orgsDeleted = await DatabaseHelper.cleanupTestOrganizations(
        `${testConfig.testData.testOrgPrefix}%`
      );

      Logger.success(`Cleaned up ${usersDeleted} test users, ${orgsDeleted} test organizations`);
    }

    // Disconnect from database
    await DatabaseHelper.disconnect();
    Logger.success('Database connection closed');

    Logger.success('✅ Global teardown complete');
  } catch (error) {
    Logger.error('❌ Global teardown failed', error);
    // Don't throw - allow tests to complete even if teardown fails
  }
}

export default globalTeardown;
