/**
 * Test Configuration
 * Central configuration for test data, timeouts, credentials, and database
 */

export const testConfig = {
  // Base URL - defaults to localhost for local testing
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',

  // Database configuration
  database: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://postgres:as98d7f98798dafdsafas@localhost:5432/be_por',
    cleanupOnStart: process.env.CLEANUP_ON_START === 'true' || false,
    cleanupOnEnd: process.env.CLEANUP_ON_END === 'true' || true,
  },

  // Test users - Uses environment variables with fallback defaults
  testUsers: {
    validUser: {
      email: process.env.TEST_USER_EMAIL || 'dummydumdopple@gmail.com',
      password: process.env.TEST_USER_PASSWORD || 'dummy@123',
    },
  },

  // Timeouts (in milliseconds)
  timeouts: {
    short: 5000, // Quick operations like button clicks
    medium: 10000, // Normal page loads and transitions
    long: 30000, // Complex operations like file uploads
    extraLong: 60000, // Very slow operations or network-dependent tasks
  },

  // Test data settings
  testData: {
    passwordLength: 12,
    passwordPattern: /[A-Za-z\d!@#$%^&*]/,
    // Email domain for test users - makes cleanup easier
    testEmailDomain: 'playwright-test.example.com',
    // Prefix for test organizations - makes cleanup easier
    testOrgPrefix: 'test-org-',
  },

  // Retry settings
  retries: {
    flaky: 2, // Tests known to be flaky due to timing issues
    stable: 0, // Stable tests should not retry
  },

  // Wait strategies
  waitStrategies: {
    loadStates: {
      default: 'domcontentloaded' as const,
      full: 'load' as const,
      network: 'networkidle' as const,
    },
    pollingInterval: 100,
    maxRetries: 50,
  },
};

export default testConfig;
