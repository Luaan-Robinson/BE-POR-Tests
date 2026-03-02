/**
 * Database Helper for Test Suite
 * Handles database operations for test setup, verification, and cleanup
 * Uses PostgreSQL client directly with schema from auth-schema.ts
 */

import { Pool } from 'pg';
import { Logger } from './logger';

// Database schema types (matching auth-schema.ts)
interface User {
  id: string;
  name: string;
  surname: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: Date | null;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: Date;
  metadata: string | null;
}

interface Member {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  createdAt: Date;
}

export class DatabaseHelper {
  private static pool: Pool | null = null;

  /**
   * Initialize database connection
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

    try {
      await this.pool.query('SELECT 1');
      Logger.success('Database connected successfully');
    } catch (error) {
      Logger.error('Failed to connect to database', error);
      this.pool = null;
      throw error;
    }
  }

  /**
   * Check if database is connected
   */
  static isConnected(): boolean {
    return this.pool !== null;
  }

  /**
   * Close database connection
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
   */
  static async findUserByEmail(email: string): Promise<User | null> {
    try {
      const result = await this.query<User>(
        'SELECT id, name, surname, email, email_verified as "emailVerified", image, created_at as "createdAt", updated_at as "updatedAt", role, banned, ban_reason as "banReason", ban_expires as "banExpires" FROM "user" WHERE email = $1 LIMIT 1',
        [email]
      );
      return result[0] || null;
    } catch (error) {
      Logger.error(`Failed to find user: ${email}`, error);
      return null;
    }
  }

  /**
   * Find user by ID
   */
  static async findUserById(id: string): Promise<User | null> {
    try {
      const result = await this.query<User>(
        'SELECT id, name, surname, email, email_verified as "emailVerified", image, created_at as "createdAt", updated_at as "updatedAt", role, banned, ban_reason as "banReason", ban_expires as "banExpires" FROM "user" WHERE id = $1 LIMIT 1',
        [id]
      );
      return result[0] || null;
    } catch (error) {
      Logger.error(`Failed to find user by id: ${id}`, error);
      return null;
    }
  }

  /**
   * Delete user by email
   */
  static async deleteUserByEmail(email: string): Promise<boolean> {
    try {
      const user = await this.findUserByEmail(email);
      if (!user) {
        return false;
      }

      await this.query('DELETE FROM session WHERE user_id = $1', [user.id]);
      await this.query('DELETE FROM account WHERE user_id = $1', [user.id]);
      await this.query('DELETE FROM member WHERE user_id = $1', [user.id]);
      await this.query('DELETE FROM invitation WHERE inviter_id = $1', [user.id]);

      const result = await this.query('DELETE FROM "user" WHERE id = $1 RETURNING id', [user.id]);

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
      await this.query('DELETE FROM session WHERE user_id = $1', [userId]);
      await this.query('DELETE FROM account WHERE user_id = $1', [userId]);
      await this.query('DELETE FROM member WHERE user_id = $1', [userId]);
      await this.query('DELETE FROM invitation WHERE inviter_id = $1', [userId]);

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
        'SELECT id, name, slug, logo, created_at as "createdAt", metadata FROM organization WHERE slug = $1 LIMIT 1',
        [slug]
      );
      return result[0] || null;
    } catch (error) {
      Logger.error(`Failed to find organization: ${slug}`, error);
      return null;
    }
  }

  /**
   * Find organization by ID
   */
  static async findOrganizationById(id: string): Promise<Organization | null> {
    try {
      const result = await this.query<Organization>(
        'SELECT id, name, slug, logo, created_at as "createdAt", metadata FROM organization WHERE id = $1 LIMIT 1',
        [id]
      );
      return result[0] || null;
    } catch (error) {
      Logger.error(`Failed to find organization by id: ${id}`, error);
      return null;
    }
  }

  /**
   * Find members of an organization
   */
  static async findOrganizationMembers(organizationId: string): Promise<Member[]> {
    try {
      const result = await this.query<Member>(
        'SELECT id, organization_id as "organizationId", user_id as "userId", role, created_at as "createdAt" FROM member WHERE organization_id = $1',
        [organizationId]
      );
      return result;
    } catch (error) {
      Logger.error(`Failed to find members for organization: ${organizationId}`, error);
      return [];
    }
  }

  /**
   * Delete organization by slug.
   * Nullifies active_organization_id in sessions first to avoid FK constraint violations.
   */
  static async deleteOrganizationBySlug(slug: string): Promise<boolean> {
    try {
      const org = await this.findOrganizationBySlug(slug);
      if (!org) {
        return false;
      }

      // Nullify references in active sessions before deleting
      await this.query(
        'UPDATE session SET active_organization_id = NULL WHERE active_organization_id = $1',
        [org.id]
      );

      await this.query('DELETE FROM member WHERE organization_id = $1', [org.id]);
      await this.query('DELETE FROM invitation WHERE organization_id = $1', [org.id]);
      await this.query('DELETE FROM organization_role WHERE organization_id = $1', [org.id]);

      const result = await this.query('DELETE FROM organization WHERE id = $1 RETURNING id', [
        org.id,
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
   * Delete organization by ID.
   * Nullifies active_organization_id in sessions first to avoid FK constraint violations.
   */
  static async deleteOrganizationById(orgId: string): Promise<boolean> {
    try {
      // Nullify references in active sessions before deleting
      await this.query(
        'UPDATE session SET active_organization_id = NULL WHERE active_organization_id = $1',
        [orgId]
      );

      await this.query('DELETE FROM member WHERE organization_id = $1', [orgId]);
      await this.query('DELETE FROM invitation WHERE organization_id = $1', [orgId]);
      await this.query('DELETE FROM organization_role WHERE organization_id = $1', [orgId]);

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
   * Get the active organization for a user's session
   */
  static async getUserActiveOrganization(userId: string): Promise<string | null> {
    try {
      const result = await this.query<{ active_organization_id: string }>(
        'SELECT active_organization_id FROM session WHERE user_id = $1 AND active_organization_id IS NOT NULL LIMIT 1',
        [userId]
      );
      return result[0]?.active_organization_id || null;
    } catch (error) {
      Logger.error(`Failed to get active organization for user: ${userId}`, error);
      return null;
    }
  }

  /**
   * Clean up test users by email pattern
   */
  static async cleanupTestUsers(emailPattern: string = '%test%'): Promise<number> {
    try {
      const users = await this.query<{ id: string }>('SELECT id FROM "user" WHERE email LIKE $1', [
        emailPattern,
      ]);

      if (users.length === 0) {
        return 0;
      }

      for (const user of users) {
        await this.query('DELETE FROM session WHERE user_id = $1', [user.id]);
        await this.query('DELETE FROM account WHERE user_id = $1', [user.id]);
        await this.query('DELETE FROM member WHERE user_id = $1', [user.id]);
        await this.query('DELETE FROM invitation WHERE inviter_id = $1', [user.id]);
      }

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
   * Clean up test organizations by slug pattern.
   * Nullifies active_organization_id in sessions first.
   */
  static async cleanupTestOrganizations(slugPattern: string = '%test%'): Promise<number> {
    try {
      const orgs = await this.query<{ id: string }>(
        'SELECT id FROM organization WHERE slug LIKE $1',
        [slugPattern]
      );

      if (orgs.length === 0) {
        return 0;
      }

      for (const org of orgs) {
        // Nullify references in active sessions before deleting
        await this.query(
          'UPDATE session SET active_organization_id = NULL WHERE active_organization_id = $1',
          [org.id]
        );
        await this.query('DELETE FROM member WHERE organization_id = $1', [org.id]);
        await this.query('DELETE FROM invitation WHERE organization_id = $1', [org.id]);
        await this.query('DELETE FROM organization_role WHERE organization_id = $1', [org.id]);
      }

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
   * Verify user is a member of an organization
   */
  static async verifyUserInOrganization(
    userEmail: string,
    organizationSlug: string
  ): Promise<boolean> {
    try {
      const user = await this.findUserByEmail(userEmail);
      const org = await this.findOrganizationBySlug(organizationSlug);

      if (!user || !org) {
        return false;
      }

      const result = await this.query<{ id: string }>(
        'SELECT id FROM member WHERE user_id = $1 AND organization_id = $2 LIMIT 1',
        [user.id, org.id]
      );

      return result.length > 0;
    } catch (error) {
      Logger.error(`Failed to verify user in organization`, error);
      return false;
    }
  }

  /**
   * Get user count
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
   * Get organization count
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

  /**
   * Get member count
   */
  static async getMemberCount(): Promise<number> {
    try {
      const result = await this.query<{ count: string }>('SELECT COUNT(*) as count FROM member');
      return parseInt(result[0]?.count || '0', 10);
    } catch (error) {
      Logger.error('Failed to get member count', error);
      return 0;
    }
  }
}
