/**
 * FusionOS Tenant Context Service
 *
 * Derives tenant context from authenticated identity.
 * NEVER trusts client-provided tenantId, companyId, role, or permissions.
 *
 * Security Model:
 *   1. User authenticates → JWT contains userId + email
 *   2. JWT strategy loads user's tenant memberships from database
 *   3. TenantContext resolves the active tenant for the request
 *   4. All downstream services use TenantContext — never raw request data
 */

import {
  Injectable,
  Logger,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export interface TenantMembership {
  userRoleId: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  roleId: string;
  roleName: string;
  roleIsSystem: boolean;
  scope: Record<string, string> | null;
}

export interface TenantContext {
  userId: string;
  employeeId: string | null; // Resolved Employee ID for this user+tenant (null if no linked employee)
  sessionId: string | null;
  email: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  roleId: string;
  roleName: string;
  roleIsSystem: boolean;
  userRoleId: string;
  scope: Record<string, string> | null;
  permissions: string[];
}

@Injectable()
export class TenantContextService {
  private readonly logger = new Logger(TenantContextService.name);

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Resolve tenant context for an authenticated user.
   *
   * @param userId - The authenticated user's ID (from JWT, NEVER from client)
   * @param tenantId - The tenant to operate in (must be a valid membership)
   * @returns Resolved TenantContext with permissions
   * @throws ForbiddenException if user has no membership in the tenant
   */
  async resolve(
    userId: string,
    tenantId?: string,
  ): Promise<TenantContext> {
    // 1. Find user's tenant memberships
    const memberships = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        tenant: { select: { id: true, name: true, slug: true, status: true } },
        role: {
          // NOTE: Prisma forbids mixing `select` and `include` at the same
          // level — use a fully nested select (this was a runtime-only error
          // that crashed every RBAC request: PrismaClientValidationError).
          select: {
            id: true,
            name: true,
            isSystem: true,
            rolePermissions: {
              select: {
                permission: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (memberships.length === 0) {
      throw new ForbiddenException(
        'User has no tenant memberships. Access denied.',
      );
    }

    // 2. Find the target membership
    let membership;
    if (tenantId) {
      membership = memberships.find(
        (m) => m.tenantId === tenantId && m.tenant.status === 'ACTIVE',
      );
      if (!membership) {
        throw new ForbiddenException(
          'User does not have access to this tenant.',
        );
      }
    } else {
      // Default to first active tenant
      membership = memberships.find((m) => m.tenant.status === 'ACTIVE');
      if (!membership) {
        throw new ForbiddenException('User has no active tenant membership.');
      }
    }

    // 3. Extract permissions
    const permissions = membership.role.rolePermissions.map(
      (rp) => rp.permission.name,
    );

    // 4. Resolve employee linked to this user in this tenant (nullable)
    const employee = await this.prisma.employee.findFirst({
      where: { userId, tenantId: membership.tenantId, deletedAt: null },
      select: { id: true },
    });

    // 5. Build context
    const context: TenantContext = {
      userId,
      employeeId: employee?.id ?? null,
      sessionId: null,
      email: '', // Will be set by the strategy
      tenantId: membership.tenantId,
      tenantName: membership.tenant.name,
      tenantSlug: membership.tenant.slug,
      roleId: membership.roleId,
      roleName: membership.role.name,
      roleIsSystem: membership.role.isSystem,
      userRoleId: membership.id,
      scope: membership.scope as Record<string, string> | null,
      permissions,
    };

    this.logger.debug(
      `Tenant context resolved: user=${userId} tenant=${context.tenantSlug} role=${context.roleName} perms=${permissions.length}`,
    );

    return context;
  }

  /**
   * Validate that a resource belongs to the current tenant.
   * Use this for object-level authorization.
   *
   * @param tenantId - The current tenant ID from TenantContext
   * @param resourceTenantId - The tenant ID of the resource being accessed
   * @param resourceName - Description for error messages
   * @throws ForbiddenException if resource belongs to another tenant
   */
  validateResourceOwnership(
    tenantId: string,
    resourceTenantId: string,
    resourceName: string = 'resource',
  ): void {
    if (tenantId !== resourceTenantId) {
      this.logger.warn(
        `Cross-tenant access attempt: tenant=${tenantId} tried to access ${resourceName} from tenant=${resourceTenantId}`,
      );
      throw new ForbiddenException(
        `Access denied: ${resourceName} belongs to another tenant.`,
      );
    }
  }

  /**
   * Get all active tenant IDs a user belongs to.
   * Useful for super admin operations.
   */
  async getUserTenantIds(userId: string): Promise<string[]> {
    const memberships = await this.prisma.userRole.findMany({
      where: {
        userId,
        tenant: { status: 'ACTIVE' },
      },
      select: { tenantId: true },
    });
    return memberships.map((m) => m.tenantId);
  }
}
