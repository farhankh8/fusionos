/**
 * FusionOS Authorization Decorators
 *
 * These decorators attach metadata to controller methods/handlers.
 * The RBACGuard reads this metadata and enforces authorization.
 *
 * Usage:
 *   @RequirePermission('employee:read')
 *   @RequireRole('hr_manager')
 *   @RequireSuperAdmin()
 *   @RequireAllPermissions('employee:read', 'employee:update')
 *   @RequireAnyPermission('payroll:read', 'payroll:manage')
 */

import { SetMetadata } from '@nestjs/common';

// ── Metadata Keys ──────────────────────────────────────────────────────────

export const PERMISSIONS_KEY = 'fusionos:permissions';
export const ROLES_KEY = 'fusionos:roles';
export const SUPER_ADMIN_KEY = 'fusionos:super_admin';
export const TENANT_SCOPED_KEY = 'fusionos:tenant_scoped';

// ── Permission Decorators ──────────────────────────────────────────────────

/**
 * Require a single permission.
 * @example @RequirePermission('employee:read')
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, { type: 'all', permissions });

/**
 * Require ALL of the listed permissions.
 * @example @RequireAllPermissions('employee:read', 'employee:update')
 */
export const RequireAllPermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, { type: 'all', permissions });

/**
 * Require ANY of the listed permissions.
 * @example @RequireAnyPermission('payroll:read', 'payroll:manage')
 */
export const RequireAnyPermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, { type: 'any', permissions });

// ── Role Decorators ────────────────────────────────────────────────────────

/**
 * Require a specific role.
 * @example @RequireRole('hr_manager')
 */
export const RequireRole = (...roles: string[]) =>
  SetMetadata(ROLES_KEY, roles);

/**
 * Require Super Admin role.
 * @example @RequireSuperAdmin()
 */
export const RequireSuperAdmin = () =>
  SetMetadata(SUPER_ADMIN_KEY, true);

// ── Scope Decorator ────────────────────────────────────────────────────────

/**
 * Mark an endpoint as tenant-scoped (default behavior).
 * This decorator is optional — RBACGuard enforces tenant isolation by default.
 * Use this to explicitly document intent.
 * @example @RequireTenantScoped()
 */
export const RequireTenantScoped = () =>
  SetMetadata(TENANT_SCOPED_KEY, true);
