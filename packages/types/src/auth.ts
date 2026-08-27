/**
 * Authentication and authorization types for FusionOS.
 *
 * These types define the identity and access model.
 * Actual implementation begins in Phase 3.
 */

import type { BaseEntity } from '@fusionos/shared';

// ── User ─────────────────────────────────────────────────────────────────────

export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  isActive: boolean;
  mfaEnabled: boolean;
  lastLoginAt?: Date;
}

// ── Session ──────────────────────────────────────────────────────────────────

export interface Session {
  id: string;
  userId: string;
  tenantId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
  deviceInfo?: string;
  ipAddress?: string;
}

// ── RBAC ─────────────────────────────────────────────────────────────────────

export interface Role extends BaseEntity {
  name: string;
  description?: string;
  isSystem: boolean; // system roles cannot be deleted
  tenantId?: string; // null = platform-level role
}

export interface Permission extends BaseEntity {
  name: string;
  description?: string;
  resource: string;
  action: string;
}

export interface RolePermission {
  roleId: string;
  permissionId: string;
}

export interface UserRole {
  userId: string;
  roleId: string;
  tenantId: string;
  scope?: Record<string, string>; // e.g., { branchId: "...", departmentId: "..." }
}
