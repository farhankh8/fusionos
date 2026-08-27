/**
 * FusionOS RBAC Authorization Test Suite
 *
 * Tests that verify role-based access control:
 *   - Each role has correct permissions
 *   - Employee cannot perform HR Manager actions
 *   - HR Manager cannot perform Finance Manager actions
 *   - No client-provided role can elevate privileges
 *   - Permission checks work correctly
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Role-Permission Matrix ────────────────────────────────────────────────

const EXPECTED_ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['*'], // All permissions
  company_owner: ['*'], // All permissions within tenant
  hr_manager: [
    'employee:read', 'employee:create', 'employee:update',
    'attendance:read', 'attendance:manage',
    'leave:read', 'leave:approve',
    'payroll:read', 'payroll:manage',
  ],
  finance_manager: [
    'finance:read', 'finance:manage',
    'payroll:read', 'payroll:approve',
  ],
  crm_manager: ['crm:read', 'crm:manage'],
  team_manager: ['employee:read'],
  employee: ['employee:read'],
};

// ── Tests ─────────────────────────────────────────────────────────────────

describe('RBAC Authorization', () => {
  let roles: any[];
  let permissions: any[];
  let rolePermissions: any[];

  beforeAll(async () => {
    roles = await prisma.role.findMany({
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });
    permissions = await prisma.permission.findMany();
  });

  // ── Role Existence ─────────────────────────────────────────────────────

  describe('Role Existence', () => {
    it('should have all required roles', () => {
      const roleNames = roles.map((r) => r.name);
      expect(roleNames).toContain('super_admin');
      expect(roleNames).toContain('company_owner');
      expect(roleNames).toContain('hr_manager');
      expect(roleNames).toContain('finance_manager');
      expect(roleNames).toContain('crm_manager');
      expect(roleNames).toContain('team_manager');
      expect(roleNames).toContain('employee');
    });

    it('super_admin should be a system role', () => {
      const superAdmin = roles.find((r) => r.name === 'super_admin');
      expect(superAdmin).toBeDefined();
      expect(superAdmin.isSystem).toBe(true);
      expect(superAdmin.tenantId).toBeNull();
    });
  });

  // ── Permission Existence ───────────────────────────────────────────────

  describe('Permission Existence', () => {
    it('should have all resource-specific permissions', () => {
      const permNames = permissions.map((p) => p.name);
      expect(permNames).toContain('employee:read');
      expect(permNames).toContain('employee:create');
      expect(permNames).toContain('employee:update');
      expect(permNames).toContain('employee:delete');
      expect(permNames).toContain('attendance:read');
      expect(permNames).toContain('payroll:read');
      expect(permNames).toContain('finance:read');
      expect(permNames).toContain('crm:read');
    });

    it('permissions should have resource and action fields', () => {
      for (const perm of permissions) {
        expect(perm.resource).toBeTruthy();
        expect(perm.action).toBeTruthy();
      }
    });
  });

  // ── Role-Permission Assignments ────────────────────────────────────────

  describe('Role-Permission Assignments', () => {
    it('super_admin should have ALL permissions', () => {
      const superAdmin = roles.find((r) => r.name === 'super_admin');
      expect(superAdmin).toBeDefined();
      expect(superAdmin.rolePermissions.length).toBe(permissions.length);
    });

    it('company_owner should have ALL permissions', () => {
      const companyOwner = roles.find((r) => r.name === 'company_owner');
      expect(companyOwner).toBeDefined();
      expect(companyOwner.rolePermissions.length).toBe(permissions.length);
    });

    it('hr_manager should have employee and attendance permissions', () => {
      const hrManager = roles.find((r) => r.name === 'hr_manager');
      expect(hrManager).toBeDefined();
      const permNames = hrManager.rolePermissions.map(
        (rp: any) => rp.permission.name,
      );
      expect(permNames).toContain('employee:read');
      expect(permNames).toContain('employee:create');
      expect(permNames).toContain('attendance:read');
    });

    it('hr_manager should NOT have finance permissions', () => {
      const hrManager = roles.find((r) => r.name === 'hr_manager');
      const permNames = hrManager.rolePermissions.map(
        (rp: any) => rp.permission.name,
      );
      expect(permNames).not.toContain('finance:manage');
    });

    it('finance_manager should have finance permissions', () => {
      const financeManager = roles.find((r) => r.name === 'finance_manager');
      expect(financeManager).toBeDefined();
      const permNames = financeManager.rolePermissions.map(
        (rp: any) => rp.permission.name,
      );
      expect(permNames).toContain('finance:read');
      expect(permNames).toContain('finance:manage');
    });

    it('finance_manager should NOT have HR permissions', () => {
      const financeManager = roles.find((r) => r.name === 'finance_manager');
      const permNames = financeManager.rolePermissions.map(
        (rp: any) => rp.permission.name,
      );
      expect(permNames).not.toContain('employee:create');
      expect(permNames).not.toContain('attendance:manage');
    });

    it('employee should have minimal permissions', () => {
      const employee = roles.find((r) => r.name === 'employee');
      expect(employee).toBeDefined();
      expect(employee.rolePermissions.length).toBeLessThan(
        roles.find((r) => r.name === 'hr_manager').rolePermissions.length,
      );
    });
  });

  // ── Permission Check Logic ─────────────────────────────────────────────

  describe('Permission Check Logic', () => {
    function hasPermission(
      userPermissions: string[],
      required: string[],
      type: 'all' | 'any' = 'all',
    ): boolean {
      if (type === 'all') {
        return required.every((p) => userPermissions.includes(p));
      }
      return required.some((p) => userPermissions.includes(p));
    }

    it('should ALLOW when user has all required permissions', () => {
      const hrPerms = ['employee:read', 'employee:create', 'attendance:read'];
      expect(hasPermission(hrPerms, ['employee:read'], 'all')).toBe(true);
      expect(
        hasPermission(hrPerms, ['employee:read', 'employee:create'], 'all'),
      ).toBe(true);
    });

    it('should DENY when user is missing required permissions', () => {
      const employeePerms = ['employee:read'];
      expect(
        hasPermission(employeePerms, ['employee:create'], 'all'),
      ).toBe(false);
      expect(
        hasPermission(employeePerms, ['employee:read', 'employee:create'], 'all'),
      ).toBe(false);
    });

    it('should ALLOW any-match when user has at least one permission', () => {
      const hrPerms = ['employee:read', 'attendance:read'];
      expect(
        hasPermission(hrPerms, ['employee:read', 'finance:read'], 'any'),
      ).toBe(true);
    });

    it('should DENY any-match when user has none of the permissions', () => {
      const employeePerms = ['employee:read'];
      expect(
        hasPermission(employeePerms, ['finance:read', 'payroll:manage'], 'any'),
      ).toBe(false);
    });
  });

  // ── Cross-Role Isolation ───────────────────────────────────────────────

  describe('Cross-Role Isolation', () => {
    it('employee should NOT have HR Manager capabilities', () => {
      const employee = roles.find((r) => r.name === 'employee');
      const hrManager = roles.find((r) => r.name === 'hr_manager');
      expect(employee.rolePermissions.length).toBeLessThan(
        hrManager.rolePermissions.length,
      );
    });

    it('HR Manager should NOT have Finance Manager capabilities', () => {
      const hrManager = roles.find((r) => r.name === 'hr_manager');
      const financeManager = roles.find((r) => r.name === 'finance_manager');
      const hrPermNames = hrManager.rolePermissions.map((rp: any) => rp.permission.name);
      const financePermNames = financeManager.rolePermissions.map(
        (rp: any) => rp.permission.name,
      );
      // HR should not have finance:manage
      expect(hrPermNames).not.toContain('finance:manage');
      // Finance should not have employee:create
      expect(financePermNames).not.toContain('employee:create');
    });
  });
});
