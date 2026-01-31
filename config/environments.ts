/**
 * Environment Configuration
 * Manages different test environments (SIT, UAT, prod)
 * This is unused for now but may be useful later
 */

export interface Environment {
  name: string;
  baseUrl: string;
  apiUrl?: string;
}

export const environments: Record<string, Environment> = {
  dev: {
    name: 'Development',
    baseUrl: 'http://102.130.120.68:3001',
    apiUrl: 'http://102.130.120.68:3001/api',
  },
  staging: {
    name: 'Staging',
    baseUrl: process.env.STAGING_URL || 'https://staging.example.com',
    apiUrl: process.env.STAGING_API_URL || 'https://staging.example.com/api',
  },
  production: {
    name: 'Production',
    baseUrl: process.env.PROD_URL || 'https://example.com',
    apiUrl: process.env.PROD_API_URL || 'https://example.com/api',
  },
};

/**
 * Get current environment configuration
 */
export function getEnvironment(): Environment {
  const env = process.env.TEST_ENV || 'dev';
  return environments[env] || environments.dev;
}
