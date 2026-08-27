/**
 * FusionOS RBAC Authorization Guard
 *
 * Enforces authorization on every protected endpoint.
 * Reads metadata from decorators and checks against the user's TenantContext.
 *
 * Security hierarchy:
 *   1. Authentication (JwtAuthGuard) — who is this user?
 *   2. Tenant Context (TenantContextService) — which tenant are they in?
 *   3. RBAC (this guard) — what are they allowed to do?
 *
 * This guard MUST run AFTER JwtAuthGuard (which is the global APP_GUARD).
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantContextService, type TenantContext } from '../../auth/services/tenant-context.service';
import {
  PERMISSIONS_KEY,
  ROLES_KEY,
  SUPER_ADMIN_KEY,
} from '../decorators/authorization.decorators';

@Injectable()
export class RBACGuard implements CanActivate {
  private readonly logger = new Logger(RBACGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Check if the route requires Super Admin
    const requiresSuperAdmin = this.reflector.getAllAndOverride<boolean>(
      SUPER_ADMIN_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 2. Check for required permissions
    const permissionMeta = this.reflector.getAllAndOverride<{
      type: 'all' | 'any';
      permissions: string[];
    } | null>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    // 3. Check for required roles
    const requiredRoles = this.reflector.getAllAndOverride<string[] | null>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no authorization metadata is set, allow access (endpoint is not protected by RBAC)
    if (!requiresSuperAdmin && !permissionMeta && !requiredRoles) {
      return true;
    }

    // 4. Get the authenticated user from the request (set by JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user as { userId: string; email: string } | undefined;

    if (!user?.userId) {
      throw new ForbiddenException('Authentication required');
    }

    // 5. Resolve tenant context
    const tenantId = request.headers['x-tenant-id'] as string | undefined;
    let tenantContext: TenantContext;

    try {
      tenantContext = await this.tenantContextService.resolve(
        user.userId,
        tenantId,
      );
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(
        `Failed to resolve tenant context for user ${user.userId}`,
        error,
      );
      throw new ForbiddenException('Unable to resolve tenant context');
    }

    // 6. Store tenant context on request for downstream use
    request.tenantContext = tenantContext;

    // 7. Enforce Super Admin
    if (requiresSuperAdmin) {
      if (tenantContext.roleName !== 'super_admin' || !tenantContext.roleIsSystem) {
        this.logger.warn(
          `Super Admin access denied: user=${user.userId} role=${tenantContext.roleName}`,
        );
        throw new ForbiddenException('Super Admin access required');
      }
      return true;
    }

    // 8. Enforce roles
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(tenantContext.roleName)) {
        this.logger.warn(
          `Role check failed: user=${user.userId} has role=${tenantContext.roleName} but needs one of=[${requiredRoles.join(', ')}]`,
        );
        throw new ForbiddenException(
          `Access denied: requires one of roles [${requiredRoles.join(', ')}]`,
        );
      }
    }

    // 9. Enforce permissions
    if (permissionMeta) {
      const hasPermission = this.checkPermission(
        tenantContext.permissions,
        permissionMeta.type,
        permissionMeta.permissions,
      );

      if (!hasPermission) {
        this.logger.warn(
          `Permission check failed: user=${user.userId} role=${tenantContext.roleName} missing=[${permissionMeta.permissions.join(', ')}] type=${permissionMeta.type}`,
        );
        throw new ForbiddenException(
          `Access denied: missing required permission(s) [${permissionMeta.permissions.join(', ')}]`,
        );
      }
    }

    return true;
  }

  /**
   * Check if the user has the required permissions.
   */
  private checkPermission(
    userPermissions: string[],
    type: 'all' | 'any',
    requiredPermissions: string[],
  ): boolean {
    if (type === 'all') {
      // User must have ALL required permissions
      return requiredPermissions.every((perm) => userPermissions.includes(perm));
    } else {
      // User must have ANY of the required permissions
      return requiredPermissions.some((perm) => userPermissions.includes(perm));
    }
  }
}
