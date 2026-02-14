/**
 * Database Helper for Test Suite
 * Handles database operations for test setup, verification, and cleanup
 * Uses PostgreSQL client directly
 */

import { Pool } from 'pg';
import { Logger } from './logger';

// Database schema types (adjusted to match actual Drizzle schema)
interface User {
  id: string;
  email: string;
  name: string; // Full name field
  surname: string; // Last name field
  createdAt: Date;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
}

export class DatabaseHelper {
  private static pool: Pool | null = null;

  /**
   * Initialize database connection
   * Call this once before running tests
   */
  static async connect(): Promise<void> {
    if (this.pool) {
      Logger.debug('Database already connected');
      return;
    }

    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://postgres:as98d7f98798dafdsafas@localhost:5432/be_por';

    Logger.info('Connecting to database...');

    this.pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    Logger.success('Database connected successfully');
  }

  /**
   * Close database connection
   * Call this after all tests complete
   */
  static async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      Logger.info('Database connection closed');
    }
  }

  /**
   * Execute raw SQL query
   * Useful for complex operations
   */
  static async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    if (!this.pool) {
      throw new Error('Database not connected. Call DatabaseHelper.connect() first.');
    }

    try {
      const result = await this.pool.query(sql, params);
      return result.rows as T[];
    } catch (error) {
      Logger.error('Database query failed', error);
      throw error;
    }
  }

  /**
   * Find user by email
   * Returns null if user doesn't exist
   */
  static async findUserByEmail(email: string): Promise<User | null> {
    try {
      const result = await this.query<User>(
        'SELECT id, email, name, surname, created_at as "createdAt" FROM "user" WHERE email = $1 LIMIT 1',
        [email]
      );
      return result[0] || null;
    } catch (error) {
      Logger.error(`Failed to find user: ${email}`, error);
      return null;
    }
  }

  /**
   * Delete user by email
   * Returns true if user was deleted, false if not found
   */
  static async deleteUserByEmail(email: string): Promise<boolean> {
    try {
      const result = await this.query('DELETE FROM "user" WHERE email = $1 RETURNING id', [email]);
      const deleted = result.length > 0;
      if (deleted) {
        Logger.info(`Deleted user: ${email}`);
      }
      return deleted;
    } catch (error) {
      Logger.error(`Failed to delete user: ${email}`, error);
      return false;
    }
  }

  /**
   * Delete user by ID
   */
  static async deleteUserById(userId: string): Promise<boolean> {
    try {
      const result = await this.query('DELETE FROM "user" WHERE id = $1 RETURNING id', [userId]);
      return result.length > 0;
    } catch (error) {
      Logger.error(`Failed to delete user: ${userId}`, error);
      return false;
    }
  }

  /**
   * Find organization by slug
   */
  static async findOrganizationBySlug(slug: string): Promise<Organization | null> {
    try {
      const result = await this.query<Organization>(
        'SELECT id, name, slug, created_at as "createdAt" FROM organization WHERE slug = $1 LIMIT 1',
        [slug]
      );
      return result[0] || null;
    } catch (error) {
      Logger.error(`Failed to find organization: ${slug}`, error);
      return null;
    }
  }

  /**
   * Delete organization by slug
   */
  static async deleteOrganizationBySlug(slug: string): Promise<boolean> {
    try {
      const result = await this.query('DELETE FROM organization WHERE slug = $1 RETURNING id', [
        slug,
      ]);
      const deleted = result.length > 0;
      if (deleted) {
        Logger.info(`Deleted organization: ${slug}`);
      }
      return deleted;
    } catch (error) {
      Logger.error(`Failed to delete organization: ${slug}`, error);
      return false;
    }
  }

  /**
   * Delete organization by ID
   */
  static async deleteOrganizationById(orgId: string): Promise<boolean> {
    try {
      const result = await this.query('DELETE FROM organization WHERE id = $1 RETURNING id', [
        orgId,
      ]);
      return result.length > 0;
    } catch (error) {
      Logger.error(`Failed to delete organization: ${orgId}`, error);
      return false;
    }
  }

  /**
   * Clean up test data by email pattern
   * Useful for cleaning up all test users after test runs
   */
  static async cleanupTestUsers(emailPattern: string = '%test%'): Promise<number> {
    try {
      const result = await this.query('DELETE FROM "user" WHERE email LIKE $1 RETURNING id', [
        emailPattern,
      ]);
      const count = result.length;
      if (count > 0) {
        Logger.info(`Cleaned up ${count} test users`);
      }
      return count;
    } catch (error) {
      Logger.error('Failed to cleanup test users', error);
      return 0;
    }
  }

  /**
   * Clean up test organizations by slug pattern
   */
  static async cleanupTestOrganizations(slugPattern: string = '%test%'): Promise<number> {
    try {
      const result = await this.query('DELETE FROM organization WHERE slug LIKE $1 RETURNING id', [
        slugPattern,
      ]);
      const count = result.length;
      if (count > 0) {
        Logger.info(`Cleaned up ${count} test organizations`);
      }
      return count;
    } catch (error) {
      Logger.error('Failed to cleanup test organizations', error);
      return 0;
    }
  }

  /**
   * Verify user exists in database
   */
  static async verifyUserExists(email: string): Promise<boolean> {
    const user = await this.findUserByEmail(email);
    return user !== null;
  }

  /**
   * Verify organization exists in database
   */
  static async verifyOrganizationExists(slug: string): Promise<boolean> {
    const org = await this.findOrganizationBySlug(slug);
    return org !== null;
  }

  /**
   * Get user count for testing
   */
  static async getUserCount(): Promise<number> {
    try {
      const result = await this.query<{ count: string }>('SELECT COUNT(*) as count FROM "user"');
      return parseInt(result[0]?.count || '0', 10);
    } catch (error) {
      Logger.error('Failed to get user count', error);
      return 0;
    }
  }

  /**
   * Get organization count for testing
   */
  static async getOrganizationCount(): Promise<number> {
    try {
      const result = await this.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM organization'
      );
      return parseInt(result[0]?.count || '0', 10);
    } catch (error) {
      Logger.error('Failed to get organization count', error);
      return 0;
    }
  }
}
