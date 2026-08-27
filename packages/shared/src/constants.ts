/**
 * FusionOS shared constants.
 *
 * These constants are used across multiple packages and applications.
 * Domain-specific constants should live in their respective modules.
 */

// ── API ──────────────────────────────────────────────────────────────────────
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ── Pagination ───────────────────────────────────────────────────────────────
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// ── Money ────────────────────────────────────────────────────────────────────
export const DEFAULT_CURRENCY = 'USD';

// ── Date ─────────────────────────────────────────────────────────────────────
export const ISO_DATE_FORMAT = 'yyyy-MM-dd';
export const ISO_DATETIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ss'Z'";

// ── Roles (conceptual — actual roles defined in Phase 3) ─────────────────────
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  COMPANY_OWNER: 'company_owner',
  HR_MANAGER: 'hr_manager',
  FINANCE_MANAGER: 'finance_manager',
  CRM_MANAGER: 'crm_manager',
  TEAM_MANAGER: 'team_manager',
  EMPLOYEE: 'employee',
} as const;

// ── Permissions (conceptual — actual permissions defined in Phase 3) ─────────
export const PERMISSIONS = {
  READ: 'read',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  EXPORT: 'export',
  MANAGE: 'manage',
  ADMIN: 'admin',
} as const;
