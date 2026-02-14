import { faker } from '@faker-js/faker';
import testConfig from '../config/test-config';

/**
 * User data structure for test user generation
 */
export interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  fullName: string;
}

/**
 * Organization data structure for test organization generation
 */
export interface OrganizationData {
  name: string;
  slug: string;
}

/**
 * Test Data Generator
 * Generates unique, identifiable test data that can be easily cleaned up
 */
export class TestDataGenerator {
  /**
   * Generate a unique user with test email domain
   * Email uses test domain to make cleanup easier
   */
  static generateUser(): UserData {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const timestamp = Date.now();
    const random = faker.string.alphanumeric(4);

    // Use test email domain for easy identification and cleanup
    const email = `test-${firstName.toLowerCase()}-${timestamp}-${random}@${testConfig.testData.testEmailDomain}`;
    const password = this.generatePassword();

    return {
      firstName,
      lastName,
      email,
      password,
      fullName: `${firstName} ${lastName}`,
    };
  }

  /**
   * Generate a secure password that meets requirements
   */
  static generatePassword(): string {
    const basePassword = faker.internet.password({
      length: testConfig.testData.passwordLength,
      memorable: false,
    });

    // Ensure password meets requirements: !1Aa = special, number, upper, lower
    return basePassword + '!1Aa';
  }

  /**
   * Generate organization data with test prefix
   * Slug includes prefix for easy identification and cleanup
   */
  static generateOrganization(): OrganizationData {
    const companyName = faker.company.name();
    const timestamp = Date.now();
    const random = faker.string.alphanumeric(4);

    // Add test prefix and timestamp to make slug unique and identifiable
    const slug = this.generateSlug(
      `${testConfig.testData.testOrgPrefix}${timestamp}-${random}-${companyName}`
    );

    return {
      name: `Test ${companyName}`,
      slug: slug,
    };
  }

  /**
   * Convert text to a URL-safe slug
   */
  static generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .trim()
      .substring(0, 50);
  }

  /**
   * Generate a random test email
   */
  static generateEmail(): string {
    const timestamp = Date.now();
    const random = faker.string.alphanumeric(8);
    return `test-${timestamp}-${random}@${testConfig.testData.testEmailDomain}`;
  }

  /**
   * Generate a test company name with prefix
   */
  static generateCompanyName(): string {
    return `Test ${faker.company.name()}`;
  }

  /**
   * Generate unique identifier for test resources
   * Useful for creating unique test data that can be tracked
   */
  static generateTestId(): string {
    return `test-${Date.now()}-${faker.string.alphanumeric(6)}`;
  }
}
