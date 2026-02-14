/**
 * Manual Test Data Cleanup Script
 * Run this script to manually clean up test data from the database
 *
 * Usage: npm run db:cleanup
 */

import { DatabaseHelper } from '../utils/database-helper';
import { Logger } from '../utils/logger';
import testConfig from '../config/test-config';

async function cleanupTestData() {
  Logger.info('🧹 Starting manual test data cleanup...');

  try {
    // Connect to database
    await DatabaseHelper.connect();

    // Clean up test users
    Logger.info('Cleaning up test users...');
    const usersDeleted = await DatabaseHelper.cleanupTestUsers(
      `%@${testConfig.testData.testEmailDomain}`
    );
    Logger.success(`Deleted ${usersDeleted} test users`);

    // Clean up test organizations
    Logger.info('Cleaning up test organizations...');
    const orgsDeleted = await DatabaseHelper.cleanupTestOrganizations(
      `${testConfig.testData.testOrgPrefix}%`
    );
    Logger.success(`Deleted ${orgsDeleted} test organizations`);

    // Show final counts
    const totalUsers = await DatabaseHelper.getUserCount();
    const totalOrgs = await DatabaseHelper.getOrganizationCount();

    Logger.info('Final database state:');
    Logger.info(`  Total users: ${totalUsers}`);
    Logger.info(`  Total organizations: ${totalOrgs}`);

    // Disconnect
    await DatabaseHelper.disconnect();

    Logger.success('✅ Cleanup complete!');
  } catch (error) {
    Logger.error('❌ Cleanup failed', error);
    process.exit(1);
  }
}

// Run cleanup
cleanupTestData();
