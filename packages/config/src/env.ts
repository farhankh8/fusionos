/**
 * FusionOS environment configuration.
 *
 * This module provides type-safe access to environment variables.
 * Each application (web, api) should import and extend these as needed.
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvOptional(key: string, defaultValue?: string): string | undefined {
  return process.env[key] ?? defaultValue;
}

function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return defaultValue;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number, got: ${value}`);
  }
  return parsed;
}

function getEnvBoolean(key: string, defaultValue?: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return defaultValue;
  }
  return value === 'true' || value === '1';
}

// ── Base Environment (shared across apps) ────────────────────────────────────

export const env = {
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  IS_DEV: getEnv('NODE_ENV', 'development') === 'development',
  IS_PROD: getEnv('NODE_ENV', 'development') === 'production',
  IS_TEST: getEnv('NODE_ENV', 'development') === 'test',
} as const;

// ── API Environment ──────────────────────────────────────────────────────────

export const apiEnv = {
  PORT: getEnvNumber('PORT', 3001),
  API_BASE_URL: getEnvOptional('API_BASE_URL', 'http://localhost:3001'),
  WEB_BASE_URL: getEnvOptional('WEB_BASE_URL', 'http://localhost:3000'),
  DATABASE_URL: getEnvOptional('DATABASE_URL'),
  REDIS_URL: getEnvOptional('REDIS_URL'),
  CORS_ORIGIN: getEnvOptional('CORS_ORIGIN', 'http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900_000),
  RATE_LIMIT_MAX: getEnvNumber('RATE_LIMIT_MAX', 100),
} as const;

// ── Web Environment ──────────────────────────────────────────────────────────

export const webEnv = {
  API_BASE_URL: getEnvOptional('API_BASE_URL', 'http://localhost:3001'),
  NEXT_PUBLIC_APP_NAME: getEnvOptional('NEXT_PUBLIC_APP_NAME', 'FusionOS'),
} as const;
