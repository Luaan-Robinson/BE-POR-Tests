import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '.env') });

/**
 * Production-ready Playwright Test Configuration
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',

  // Maximum time one test can run
  timeout: 60 * 1000,

  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 4,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: process.env.CI ? 'never' : 'on-failure' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],

  // Global test settings
  use: {
    // Base URL - defaults to localhost for local development
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // Browser context options
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,

    // Capture screenshots and videos
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',

    // Test timeout settings
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,
  },

  // Global setup and teardown - they handle CI detection internally
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process'],
        },
      },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],

  // Output folders
  outputDir: 'test-results/',

  // Web server configuration (optional - starts your app automatically)
  // Uncomment if you want Playwright to start your app
  /*
  webServer: {
    command: 'docker-compose up',
    url: 'http://localhost:3000',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
  */
});
