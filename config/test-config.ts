/**
 * Test Configuration
 * Central configuration for test data, timeouts, and credentials
 *
 * This file consolidates all test-related configuration to ensure consistency
 * across the entire test suite and make it easy to adjust settings globally.
 */

export const testConfig = {
  // Test users - Uses environment variables with fallback defaults
  // In production CI/CD, these should ALWAYS come from environment variables
  testUsers: {
    validUser: {
      email: process.env.TEST_USER_EMAIL || 'dummydumdopple@gmail.com',
      password: process.env.TEST_USER_PASSWORD || 'dummy@123',
    },
  },

  // Timeouts (in milliseconds)
  // Centralized timeout values for consistent waiting behavior across tests
  timeouts: {
    short: 5000, // Quick operations like button clicks
    medium: 10000, // Normal page loads and transitions
    long: 30000, // Complex operations like file uploads
    extraLong: 60000, // Very slow operations or network-dependent tasks
  },

  // Test data settings
  // Configuration for test data generation
  testData: {
    passwordLength: 12,
    passwordPattern: /[A-Za-z\d!@#$%^&*]/,
  },

  // Retry settings
  // Controls how many times flaky tests should be retried
  retries: {
    flaky: 2, // Tests known to be flaky due to timing issues
    stable: 0, // Stable tests should not retry
  },

  // Wait strategies
  // Preferred wait strategies to use instead of hardcoded timeouts
  waitStrategies: {
    // Use these load states for page.waitForLoadState()
    loadStates: {
      default: 'domcontentloaded' as const,
      full: 'load' as const,
      network: 'networkidle' as const,
    },
    // Polling intervals for custom wait conditions
    pollingInterval: 100,
    // Maximum number of retry attempts for wait conditions
    maxRetries: 50,
  },
};

export default testConfig;
