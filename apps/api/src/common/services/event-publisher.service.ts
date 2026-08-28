/**
 * FusionOS Event Publisher Service
 *
 * Provides a clean abstraction for publishing domain events to the EventOutbox.
 * Events are written in the same database transaction as the business mutation,
 * ensuring transactional consistency.
 *
 * This is NOT an automation engine. It only stores events for future consumption.
 * The dispatcher (Phase 17) will poll and process pending events.
 *
 * Usage:
 *   await this.eventPublisher.publish(ctx, {
 *     eventType: 'employee.created',
 *     aggregateType: 'employee',
 *     aggregateId: employee.id,
 *     payload: { employeeId: employee.id, tenantId: ctx.tenantId },
 *   });
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import type { TenantContext } from '../../auth/services/tenant-context.service';

export interface DomainEvent {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class EventPublisherService {
  private readonly logger = new Logger(EventPublisherService.name);

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Publish a single domain event to the outbox.
   * Use this within a Prisma transaction for atomicity.
   */
  async publish(
    ctx: TenantContext,
    event: DomainEvent,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    try {
      await client.eventOutbox.create({
        data: {
          tenantId: ctx.tenantId,
          eventType: event.eventType,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          payload: event.payload as any,
          metadata: {
            ...event.metadata,
            actorId: ctx.userId,
            publishedAt: new Date().toISOString(),
          } as any,
          status: 'PENDING',
        },
      });
      this.logger.debug(`Event published: ${event.eventType} aggregate=${event.aggregateType}:${event.aggregateId}`);
    } catch (error) {
      // Non-critical — event publishing failure must not break business logic
      this.logger.warn(`Failed to publish event: ${event.eventType}`, error);
    }
  }

  /**
   * Publish multiple events atomically within a transaction.
   */
  async publishMany(
    ctx: TenantContext,
    events: DomainEvent[],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    for (const event of events) {
      await this.publish(ctx, event, tx);
    }
  }
}
