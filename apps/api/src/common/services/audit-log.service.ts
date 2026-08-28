/**
 * FusionOS Audit Log Service
 *
 * Append-only business audit trail.
 * Records important mutations for investigation and compliance.
 * Never stores passwords, tokens, or secrets.
 *
 * Keep AuthEvent for authentication/security events.
 * This is for BUSINESS activity auditing.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export interface AuditLogEntry {
  tenantId: string;
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Record a business audit event.
   * This is append-only — never update or delete audit entries.
   */
  async record(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: entry.tenantId,
          actorId: entry.actorId,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          previousValue: entry.previousValue as any,
          newValue: entry.newValue as any,
          metadata: entry.metadata as any,
        },
      });

      this.logger.debug(`Audit: ${entry.action} on ${entry.entityType} by=${entry.actorId ?? 'system'}`);
    } catch (error) {
      // Audit logging should never crash the business operation
      // Log the error but don't throw
      this.logger.error(`Failed to record audit: ${(error as Error).message}`, error);
    }
  }

  /**
   * Query audit logs for a tenant (read-only).
   */
  async findAll(
    tenantId: string,
    params: {
      page?: number;
      limit?: number;
      action?: string;
      entityType?: string;
      entityId?: string;
      actorId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ) {
    const { page = 1, limit = 50, action, entityType, entityId, actorId, startDate, endDate } = params;

    const where: any = {
      tenantId,
      ...(action && { action }),
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
      ...(actorId && { actorId }),
      ...(startDate && endDate && {
        createdAt: { gte: startDate, lte: endDate },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1,
      },
    };
  }
}
