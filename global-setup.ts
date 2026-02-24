/**
 * Global Setup
 * Runs once before all tests
 * - Connects to database
 * - Optionally cleans up old test data
 */

import { DatabaseHelper } from './utils/database-helper';
import { Logger } from './utils/logger';
import testConfig from './config/test-config';

async function globalSetup() {
  Logger.info('🚀 Starting global setup...');

  try {
    if (!process.env.DATABASE_URL) {
      Logger.info('No DATABASE_URL found - skipping database setup');
      Logger.success('✅ Global setup complete');
      return;
    }

    await DatabaseHelper.connect();
    Logger.success('Database connected');

    if (testConfig.database.cleanupOnStart) {
      Logger.info('Cleaning up old test data...');

      const usersDeleted = await DatabaseHelper.cleanupTestUsers(
        `%@${testConfig.testData.testEmailDomain}`
      );

      const orgsDeleted = await DatabaseHelper.cleanupTestOrganizations(
        `${testConfig.testData.testOrgPrefix}%`
      );

      Logger.success(`Cleaned up ${usersDeleted} test users, ${orgsDeleted} test organizations`);
    }

    Logger.success('✅ Global setup complete');
  } catch (error) {
    Logger.error('❌ Global setup failed', error);
    throw error;
  }
}

export default globalSetup;
