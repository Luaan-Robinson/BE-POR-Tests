/**
 * Test Logger Utility
 * Provides consistent, formatted logging throughout test execution
 *
 * Usage:
 *   Logger.info('Starting test');
 *   Logger.step(1, 'Fill form');
 *   Logger.success('Test passed');
 *   Logger.error('Test failed', error);
 */

export class Logger {
  /**
   * Get ISO timestamp for log entries
   * @returns ISO formatted timestamp string
   */
  private static getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Log informational message
   * @param message - The message to log
   * @param data - Optional data object to stringify and display
   */
  static info(message: string, data?: unknown): void {
    console.log(`[${this.getTimestamp()}] ℹ️  INFO: ${message}`);
    if (data) console.log(JSON.stringify(data, null, 2));
  }

  /**
   * Log success message
   * @param message - The success message to log
   * @param data - Optional data object to stringify and display
   */
  static success(message: string, data?: unknown): void {
    console.log(`[${this.getTimestamp()}] ✅ SUCCESS: ${message}`);
    if (data) console.log(JSON.stringify(data, null, 2));
  }

  /**
   * Log warning message
   * @param message - The warning message to log
   * @param data - Optional data object to stringify and display
   */
  static warning(message: string, data?: unknown): void {
    console.warn(`[${this.getTimestamp()}] ⚠️  WARNING: ${message}`);
    if (data) console.warn(JSON.stringify(data, null, 2));
  }

  /**
   * Log error message
   * @param message - The error message to log
   * @param error - Optional error object or additional context
   */
  static error(message: string, error?: unknown): void {
    console.error(`[${this.getTimestamp()}] ❌ ERROR: ${message}`);
    if (error) {
      // Handle Error objects specially to show stack trace
      if (error instanceof Error) {
        console.error(error.stack || error.message);
      } else {
        console.error(error);
      }
    }
  }

  /**
   * Log a test step
   * @param stepNumber - Sequential step number
   * @param description - Description of what this step does
   */
  static step(stepNumber: number, description: string): void {
    console.log(`[${this.getTimestamp()}] 📍 STEP ${stepNumber}: ${description}`);
  }

  /**
   * Log the start of a test
   * @param testName - Name of the test being started
   */
  static testStart(testName: string): void {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`[${this.getTimestamp()}] 🚀 Starting Test: ${testName}`);
    console.log(`${'='.repeat(80)}\n`);
  }

  /**
   * Log the end of a test
   * @param testName - Name of the test that finished
   * @param passed - Whether the test passed or failed
   */
  static testEnd(testName: string, passed: boolean): void {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`[${this.getTimestamp()}] ${passed ? '✅ PASSED' : '❌ FAILED'}: ${testName}`);
    console.log(`${'='.repeat(80)}\n`);
  }

  /**
   * Log debug information (only in verbose mode)
   * @param message - Debug message
   * @param data - Optional debug data
   */
  static debug(message: string, data?: unknown): void {
    if (process.env.DEBUG === 'true') {
      console.log(`[${this.getTimestamp()}] 🐛 DEBUG: ${message}`);
      if (data) console.log(JSON.stringify(data, null, 2));
    }
  }
}
