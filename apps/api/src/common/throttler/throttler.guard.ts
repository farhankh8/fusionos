/**
 * FusionOS Custom Throttler Guard
 *
 * Uses user ID for authenticated requests, IP for unauthenticated.
 * Prevents user enumeration via rate limiting feedback.
 */

import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, any>): Promise<string> {
    const user = req['user'] as { userId?: string } | undefined;
    if (user?.userId) {
      return `user:${user.userId}`;
    }
    return req['ip'] ?? 'unknown';
  }

  protected override getRequestResponse(context: ExecutionContext) {
    const ctx = context.switchToHttp();
    return { req: ctx.getRequest(), res: ctx.getResponse() };
  }
}
