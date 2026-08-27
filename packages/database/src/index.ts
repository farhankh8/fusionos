/**
 * FusionOS Database Package
 *
 * Re-exports the Prisma client and all generated types.
 * All database access should go through this package.
 *
 * Schema: packages/database/prisma/schema.prisma
 * Migrations: packages/database/prisma/migrations/
 */

// ── Prisma Client ────────────────────────────────────────────────────────────
export { PrismaClient } from '@prisma/client';

// ── All Model Types ──────────────────────────────────────────────────────────
export type {
  // Platform
  Tenant,
  TenantStatus,
  // Organization
  Company,
  CompanyStatus,
  Branch,
  BranchStatus,
  Department,
  DepartmentStatus,
  Team,
  TeamStatus,
  // Identity
  User,
  UserStatus,
  Role,
  Permission,
  RolePermission,
  UserRole,
  // Employee
  Employee,
  EmployeeHistory,
  EmploymentStatus,
  Designation,
  Gender,
  MaritalStatus,
  // Auth
  Session,
  VerificationToken,
  PasswordResetToken,
  AuthEvent,
  // Events
  EventOutbox,
} from '@prisma/client';
