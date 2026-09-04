/**
 * TenantContextService Unit Tests — Phase 25 Coverage Engineering
 *
 * Covers: resolve(), validateResourceOwnership(), getUserTenantIds()
 * These are security-critical paths that guard every protected endpoint.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TenantContextService } from '../../auth/services/tenant-context.service';
import { ForbiddenException } from '@nestjs/common';

function createPrismaMock(overrides: Record<string, any> = {}) {
  const userRole = {
    findMany: vi.fn().mockResolvedValue([]),
    ...(overrides['userRole'] ?? {}),
  };
  const employee = {
    findFirst: vi.fn().mockResolvedValue(null),
    ...(overrides['employee'] ?? {}),
  };
  return { userRole, employee } as any;
}

describe('TenantContextService', () => {
  let service: TenantContextService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resolve()', () => {
    it('throws ForbiddenException when user has no tenant memberships', async () => {
      const prisma = createPrismaMock();
      service = new TenantContextService(prisma);

      await expect(
        service.resolve('user-no-memberships'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns default tenant when no tenantId specified and user has active membership', async () => {
      const prisma = createPrismaMock({
        userRole: {
          findMany: vi.fn().mockResolvedValue([
            {
              userRoleId: 'ur-1',
              tenantId: 'tenant-1',
              tenant: { id: 'tenant-1', name: 'Tenant One', slug: 'tenant-one', status: 'ACTIVE' },
              roleId: 'role-1',
              role: {
                id: 'role-1',
                name: 'admin',
                isSystem: false,
                rolePermissions: [
                  { permission: { name: 'employee:read' } },
                  { permission: { name: 'employee:create' } },
                ],
              },
              scope: null,
            },
          ]),
        },
      });
      service = new TenantContextService(prisma);

      const ctx = await service.resolve('user-1');
      expect(ctx.tenantId).toBe('tenant-1');
      expect(ctx.roleName).toBe('admin');
      expect(ctx.permissions).toContain('employee:read');
      expect(ctx.permissions).toContain('employee:create');
      expect(ctx.userId).toBe('user-1');
    });

    it('selects the specified tenant when user has multiple memberships', async () => {
      const prisma = createPrismaMock({
        userRole: {
          findMany: vi.fn().mockResolvedValue([
            {
              userRoleId: 'ur-1',
              tenantId: 'tenant-a',
              tenant: { id: 'tenant-a', name: 'Tenant A', slug: 'a', status: 'ACTIVE' },
              roleId: 'role-1',
              role: { id: 'role-1', name: 'admin', isSystem: false, rolePermissions: [] },
              scope: null,
            },
            {
              userRoleId: 'ur-2',
              tenantId: 'tenant-b',
              tenant: { id: 'tenant-b', name: 'Tenant B', slug: 'b', status: 'ACTIVE' },
              roleId: 'role-2',
              role: { id: 'role-2', name: 'viewer', isSystem: false, rolePermissions: [{ permission: { name: 'read' } }] },
              scope: null,
            },
          ]),
        },
      });
      service = new TenantContextService(prisma);

      const ctx = await service.resolve('user-1', 'tenant-b');
      expect(ctx.tenantId).toBe('tenant-b');
      expect(ctx.tenantName).toBe('Tenant B');
      expect(ctx.roleName).toBe('viewer');
      expect(ctx.permissions).toEqual(['read']);
    });

    it('throws ForbiddenException when specified tenant is not in memberships', async () => {
      const prisma = createPrismaMock({
        userRole: {
          findMany: vi.fn().mockResolvedValue([
            {
              userRoleId: 'ur-1',
              tenantId: 'tenant-a',
              tenant: { id: 'tenant-a', name: 'Tenant A', slug: 'a', status: 'ACTIVE' },
              roleId: 'role-1',
              role: { id: 'role-1', name: 'admin', isSystem: false, rolePermissions: [] },
              scope: null,
            },
          ]),
        },
      });
      service = new TenantContextService(prisma);

      await expect(
        service.resolve('user-1', 'tenant-unknown'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when specified tenant is INACTIVE', async () => {
      const prisma = createPrismaMock({
        userRole: {
          findMany: vi.fn().mockResolvedValue([
            {
              userRoleId: 'ur-1',
              tenantId: 'tenant-a',
              tenant: { id: 'tenant-a', name: 'Tenant A', slug: 'a', status: 'INACTIVE' },
              roleId: 'role-1',
              role: { id: 'role-1', name: 'admin', isSystem: false, rolePermissions: [] },
              scope: null,
            },
          ]),
        },
      });
      service = new TenantContextService(prisma);

      await expect(
        service.resolve('user-1', 'tenant-a'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('resolves employeeId when linked employee exists', async () => {
      const prisma = createPrismaMock({
        userRole: {
          findMany: vi.fn().mockResolvedValue([
            {
              userRoleId: 'ur-1',
              tenantId: 'tenant-1',
              tenant: { id: 'tenant-1', name: 'T', slug: 't', status: 'ACTIVE' },
              roleId: 'role-1',
              role: { id: 'role-1', name: 'admin', isSystem: true, rolePermissions: [] },
              scope: null,
            },
          ]),
        },
        employee: {
          findFirst: vi.fn().mockResolvedValue({ id: 'emp-123' }),
        },
      });
      service = new TenantContextService(prisma);

      const ctx = await service.resolve('user-1', 'tenant-1');
      expect(ctx.employeeId).toBe('emp-123');
      expect(ctx.roleIsSystem).toBe(true);
    });

    it('sets employeeId to null when no linked employee', async () => {
      const prisma = createPrismaMock({
        userRole: {
          findMany: vi.fn().mockResolvedValue([
            {
              userRoleId: 'ur-1',
              tenantId: 'tenant-1',
              tenant: { id: 'tenant-1', name: 'T', slug: 't', status: 'ACTIVE' },
              roleId: 'role-1',
              role: { id: 'role-1', name: 'admin', isSystem: false, rolePermissions: [] },
              scope: null,
            },
          ]),
        },
        employee: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      });
      service = new TenantContextService(prisma);

      const ctx = await service.resolve('user-1', 'tenant-1');
      expect(ctx.employeeId).toBeNull();
    });

    it('throws ForbiddenException when all memberships have inactive tenants', async () => {
      const prisma = createPrismaMock({
        userRole: {
          findMany: vi.fn().mockResolvedValue([
            {
              userRoleId: 'ur-1',
              tenantId: 'tenant-a',
              tenant: { id: 'tenant-a', name: 'A', slug: 'a', status: 'INACTIVE' },
              roleId: 'role-1',
              role: { id: 'role-1', name: 'admin', isSystem: false, rolePermissions: [] },
              scope: null,
            },
          ]),
        },
      });
      service = new TenantContextService(prisma);

      await expect(service.resolve('user-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('validateResourceOwnership()', () => {
    it('does nothing when tenantIds match', () => {
      const prisma = createPrismaMock();
      service = new TenantContextService(prisma);

      expect(() => {
        service.validateResourceOwnership('tenant-1', 'tenant-1', 'employee');
      }).not.toThrow();
    });

    it('throws ForbiddenException when tenantIds differ', () => {
      const prisma = createPrismaMock();
      service = new TenantContextService(prisma);

      expect(() => {
        service.validateResourceOwnership('tenant-a', 'tenant-b', 'invoice');
      }).toThrow(ForbiddenException);
    });

    it('includes resource name in error message', () => {
      const prisma = createPrismaMock();
      service = new TenantContextService(prisma);

      try {
        service.validateResourceOwnership('t1', 't2', 'payroll-run');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
        expect((err as ForbiddenException).message).toContain('payroll-run');
      }
    });
  });

  describe('getUserTenantIds()', () => {
    it('returns empty array when user has no memberships', async () => {
      const prisma = createPrismaMock();
      service = new TenantContextService(prisma);

      const ids = await service.getUserTenantIds('user-1');
      expect(ids).toEqual([]);
    });

    it('returns all active tenant IDs for a user', async () => {
      const prisma = createPrismaMock({
        userRole: {
          findMany: vi.fn().mockResolvedValue([
            { tenantId: 't1' },
            { tenantId: 't2' },
            { tenantId: 't3' },
          ]),
        },
      });
      service = new TenantContextService(prisma);

      const ids = await service.getUserTenantIds('user-1');
      expect(ids).toEqual(['t1', 't2', 't3']);
    });
  });
});
