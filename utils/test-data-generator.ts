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
 * Provides methods to generate realistic, unique test data for automated tests
 * Uses Faker.js library to create random but valid data
 */
export class TestDataGenerator {
  /**
   * Generate a unique user with valid credentials
   * Creates a new user with randomized personal information
   *
   * @returns UserData object with all required user fields
   *
   * @example
   * const user = TestDataGenerator.generateUser();
   * // Returns: { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com', ... }
   */
  static generateUser(): UserData {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    // Generate lowercase email to ensure consistency across systems
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
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
   * Generate a secure password that meets common password requirements
   * Ensures password contains: uppercase, lowercase, numbers, and special characters
   *
   * @returns A randomly generated password string
   *
   * @example
   * const password = TestDataGenerator.generatePassword();
   * // Returns: 'aB3$dEfGhIjK' (example)
   */
  static generatePassword(): string {
    const basePassword = faker.internet.password({
      length: testConfig.testData.passwordLength,
      memorable: false, // Use random characters for stronger passwords
    });

    // Append characters to guarantee password requirements are met
    // !1Aa ensures: special char, number, uppercase, lowercase
    return basePassword + '!1Aa';
  }

  /**
   * Generate organization data with a valid name and URL-safe slug
   *
   * @returns OrganizationData object with name and slug
   *
   * @example
   * const org = TestDataGenerator.generateOrganization();
   * // Returns: { name: 'Acme Corp', slug: 'acme-corp' }
   */
  static generateOrganization(): OrganizationData {
    const companyName = faker.company.name();
    const slug = this.generateSlug(companyName);

    return {
      name: companyName,
      slug: slug,
    };
  }

  /**
   * Convert text to a URL-safe slug
   * Transforms any string into a lowercase, hyphenated slug suitable for URLs
   *
   * @param text - The text to convert to a slug
   * @returns URL-safe slug string
   *
   * @example
   * const slug = TestDataGenerator.generateSlug('My Company Name!');
   * // Returns: 'my-company-name'
   */
  static generateSlug(text: string): string {
    return text
      .toLowerCase() // Convert to lowercase
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, '') // Remove leading and trailing hyphens
      .trim() // Remove whitespace
      .substring(0, 50); // Limit length to 50 characters
  }

  /**
   * Generate a random email address
   * Useful for tests that don't need full user data
   *
   * @returns Random email address string
   */
  static generateEmail(): string {
    return faker.internet.email().toLowerCase();
  }

  /**
   * Generate a random company name
   * Useful for tests that only need a company name
   *
   * @returns Random company name string
   */
  static generateCompanyName(): string {
    return faker.company.name();
  }
}
