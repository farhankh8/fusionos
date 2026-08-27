/**
 * FusionOS Security Audit Service
 *
 * Records security-relevant events for compliance and incident response.
 * Append-only — events are never updated or deleted.
 *
 * Events logged:
 *   - permission_denied
 *   - role_changed
 *   - permission_changed
 *   - tenant_membership_changed
 *   - scope_changed
 *   - ownership_changed
 *   - administrative_action
 *   - cross_tenant_access_attempt
 *   - privilege_escalation_attempt
 *   - idor_attempt
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export interface SecurityAuditEvent {
  eventType: string;
  userId: string | null;
  tenantId: string | null;
  targetType?: string;
  targetId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger(SecurityAuditService.name);

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Record a security event.
   * Never throws — audit logging failure must not break business logic.
   */
  async record(event: SecurityAuditEvent): Promise<void> {
    try {
      // Use AuthEvent table for auth-related events
      // For broader security events, we reuse the same table with a different eventType prefix
      await this.prisma.authEvent.create({
        data: {
          userId: event.userId,
          eventType: `security:${event.eventType}`,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          metadata: {
            tenantId: event.tenantId,
            targetType: event.targetType,
            targetId: event.targetId,
            description: event.description,
            ...event.metadata,
          } as Record<string, string>,
        },
      });

      this.logger.log(
        `Security event recorded: ${event.eventType} user=${event.userId} tenant=${event.tenantId}`,
      );
    } catch (error) {
      // Non-critical — don't fail the request
      this.logger.warn(
        `Failed to record security event: ${event.eventType}`,
        error,
      );
    }
  }

  /**
   * Record a permission denied event.
   */
  async recordPermissionDenied(
    userId: string,
    tenantId: string,
    permission: string,
    resource: string,
    resourceId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.record({
      eventType: 'permission_denied',
      userId,
      tenantId,
      targetType: resource,
      targetId: resourceId,
      description: `Permission denied: ${permission} on ${resource}`,
      metadata: { permission, resource },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Record a cross-tenant access attempt.
   */
  async recordCrossTenantAttempt(
    userId: string,
    attemptedTenantId: string,
    resource: string,
    resourceId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.record({
      eventType: 'cross_tenant_access_attempt',
      userId,
      tenantId: attemptedTenantId,
      targetType: resource,
      targetId: resourceId,
      description: `Cross-tenant access attempt on ${resource} ${resourceId}`,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Record a privilege escalation attempt.
   */
  async recordPrivilegeEscalation(
    userId: string,
    tenantId: string,
    attempt: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.record({
      eventType: 'privilege_escalation_attempt',
      userId,
      tenantId,
      description: `Privilege escalation attempt: ${attempt}`,
      metadata: { attempt },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Record a role change event.
   */
  async recordRoleChanged(
    actorId: string,
    targetUserId: string,
    tenantId: string,
    oldRole: string,
    newRole: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.record({
      eventType: 'role_changed',
      userId: actorId,
      tenantId,
      targetType: 'user',
      targetId: targetUserId,
      description: `Role changed from ${oldRole} to ${newRole}`,
      metadata: { targetUserId, oldRole, newRole },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Record an IDOR attempt.
   */
  async recordIdorAttempt(
    userId: string,
    tenantId: string,
    resource: string,
    resourceId: string,
    resourceTenantId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.record({
      eventType: 'idor_attempt',
      userId,
      tenantId,
      targetType: resource,
      targetId: resourceId,
      description: `IDOR attempt: user from tenant ${tenantId} tried to access ${resource} ${resourceId} from tenant ${resourceTenantId}`,
      metadata: { resourceTenantId },
      ipAddress,
      userAgent,
    });
  }
}
