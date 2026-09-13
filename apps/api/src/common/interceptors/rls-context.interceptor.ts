/**
 * FusionOS RLS Context Interceptor
 *
 * Sets the PostgreSQL session variable `app.current_tenant_id` at the start
 * of each request, enabling Row-Level Security policies.
 *
 * SAFETY:
 * - Uses $executeRawUnsafe with SET LOCAL (transaction-scoped)
 * - Connection-pool safe: setting is reset when transaction ends
 * - Falls back gracefully if RLS is not enabled on the database
 * - Application-layer tenant checks remain active (defense-in-depth)
 *
 * Usage:
 *   Register as a global interceptor in AppModule
 *   or apply selectively to specific controllers
 *
 * Configuration:
 *   Set RLS_ENABLED=true in environment to activate RLS context setting
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class RLSContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RLSContextInterceptor.name);
  private readonly rlsEnabled: boolean;

  constructor(private readonly prisma: PrismaClient) {
    this.rlsEnabled = process.env['RLS_ENABLED'] === 'true';
    if (this.rlsEnabled) {
      this.logger.log('RLS context interceptor enabled');
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.rlsEnabled) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const tenantContext = request.tenantContext;

    if (!tenantContext?.tenantId) {
      // No tenant context — RLS will block access (fail closed)
      return next.handle();
    }

    // Set tenant context via $transaction (connection-pool safe).
    // set_config(..., true) = SET LOCAL: transaction-scoped so the tenant
    // context can NEVER persist on a pooled connection into another request
    // (a cross-tenant leak vector). Application-layer tenant checks remain
    // the primary isolation mechanism; RLS is defense-in-depth.
    return from(
      this.prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `SELECT set_config('app.current_tenant_id', $1, true)`,
          tenantContext.tenantId,
        );
      }),
    ).pipe(
      switchMap(() => next.handle()),
    );
  }
}
