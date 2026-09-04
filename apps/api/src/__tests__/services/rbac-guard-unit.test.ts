/**
 * RBAC Guard Unit Tests — Phase 25 Coverage Engineering
 *
 * Covers: RBACGuard.canActivate(), checkPermission()
 * Tests the authorization pipeline: Super Admin, roles, permissions (all/any).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RBACGuard } from '../../common/guards/rbac.guard';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantContextService, type TenantContext } from '../../auth/services/tenant-context.service';

function makeContext(overrides: { user?: any; headers?: Record<string, string> } = {}) {
  const req: any = {
    user: overrides.user ?? { userId: 'u1', email: 'test@test.com' },
    headers: overrides.headers ?? {},
  };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
    getHandler: () => 'handler',
    getClass: () => 'class',
  } as any;
}

function makeTenantContext(overrides: Partial<TenantContext> = {}): TenantContext {
  return {
    userId: 'u1',
    employeeId: null,
    sessionId: null,
    email: 'test@test.com',
    tenantId: 't1',
    tenantName: 'Test',
    tenantSlug: 'test',
    roleId: 'r1',
    roleName: 'admin',
    roleIsSystem: false,
    userRoleId: 'ur1',
    scope: null,
    permissions: ['employee:read', 'employee:create', 'finance:read'],
    ...overrides,
  };
}

describe('RBACGuard', () => {
  let reflector: Reflector;
  let tenantContextService: TenantContextService;
  let guard: RBACGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(null),
    } as any;
    tenantContextService = {
      resolve: vi.fn().mockResolvedValue(makeTenantContext()),
    } as any;
    guard = new RBACGuard(reflector, tenantContextService);
  });

  it('allows access when no authorization metadata is set', async () => {
    const ctx = makeContext();
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('allows access when user has ALL required permissions', async () => {
    (reflector.getAllAndOverride as any)
      .mockReturnValueOnce(null) // superAdmin
      .mockReturnValueOnce({ type: 'all', permissions: ['employee:read', 'employee:create'] }) // permissions
      .mockReturnValueOnce(null); // roles

    const ctx = makeContext();
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('denies access when user is missing required permission', async () => {
    (reflector.getAllAndOverride as any)
      .mockReturnValueOnce(null) // superAdmin
      .mockReturnValueOnce({ type: 'all', permissions: ['payroll:read'] }) // missing permission
      .mockReturnValueOnce(null); // roles

    const ctx = makeContext();
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('allows access when user has ANY of the required permissions', async () => {
    (reflector.getAllAndOverride as any)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({ type: 'any', permissions: ['employee:read', 'finance:read'] })
      .mockReturnValueOnce(null);

    const ctx = makeContext();
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('denies access when user has NONE of the required permissions (any-match)', async () => {
    (reflector.getAllAndOverride as any)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({ type: 'any', permissions: ['payroll:manage', 'ai:admin'] })
      .mockReturnValueOnce(null);

    const ctx = makeContext();
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('allows access when user has a matching required role', async () => {
    (reflector.getAllAndOverride as any)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(['admin', 'super_admin']);

    const ctx = makeContext();
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('denies access when user has none of the required roles', async () => {
    (reflector.getAllAndOverride as any)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(['super_admin', 'hr_manager']);

    const ctx = makeContext();
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('allows super_admin access when route requires SuperAdmin', async () => {
    (reflector.getAllAndOverride as any)
      .mockReturnValueOnce(true) // superAdmin required
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(null);

    tenantContextService.resolve = vi.fn().mockResolvedValue(
      makeTenantContext({ roleName: 'super_admin', roleIsSystem: true }),
    );

    const ctx = makeContext();
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('denies non-super-admin access when route requires SuperAdmin', async () => {
    (reflector.getAllAndOverride as any)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(null);

    // tenantContext returns regular admin (not super_admin)
    const ctx = makeContext();
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when user is not authenticated', async () => {
    (reflector.getAllAndOverride as any)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({ type: 'all', permissions: ['employee:read'] })
      .mockReturnValueOnce(null);

    // Override makeContext to set req.user = undefined (not use nullish coalescing)
    const req: any = {
      user: undefined, // explicitly undefined, not the default
      headers: {},
    };
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
      getHandler: () => 'handler',
      getClass: () => 'class',
    } as any;
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('stores tenant context on request after successful resolution', async () => {
    (reflector.getAllAndOverride as any)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({ type: 'all', permissions: ['employee:read'] })
      .mockReturnValueOnce(null);

    const ctx = makeContext();
    await guard.canActivate(ctx);

    // After guard runs, request should have tenantContext attached
    const req = ctx.switchToHttp().getRequest();
    expect(req.tenantContext).toBeDefined();
    expect(req.tenantContext.tenantId).toBe('t1');
  });

  it('passes tenantId from request headers to resolve()', async () => {
    (reflector.getAllAndOverride as any)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({ type: 'all', permissions: ['employee:read'] })
      .mockReturnValueOnce(null);

    const ctx = makeContext({ headers: { 'x-tenant-id': 'specific-tenant' } });
    await guard.canActivate(ctx);

    expect(tenantContextService.resolve).toHaveBeenCalledWith('u1', 'specific-tenant');
  });
});
