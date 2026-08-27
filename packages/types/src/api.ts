/**
 * API contract types for FusionOS.
 *
 * These types define the shape of API requests and responses.
 * They are shared between frontend and backend to ensure type safety.
 */

import type { PaginationParams } from '@fusionos/shared';

// ── Health ───────────────────────────────────────────────────────────────────

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  uptime: number;
  services: {
    application: ServiceHealth;
    database: ServiceHealth;
    redis: ServiceHealth;
  };
}

export interface ServiceHealth {
  status: 'up' | 'down' | 'unknown';
  latencyMs?: number;
  message?: string;
}

// ── Common Query Types ───────────────────────────────────────────────────────

export interface ListQueryParams extends PaginationParams {
  filters?: Record<string, string>;
}

// ── Error Types ──────────────────────────────────────────────────────────────

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
}
