/**
 * FusionOS Throttler Configuration
 *
 * Rate limiting for authentication endpoints.
 * Uses @nestjs/throttler with in-memory storage.
 * Can be swapped to Redis-backed storage when needed.
 */

import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

/**
 * Default rate limits for different endpoint categories.
 * These are conservative defaults appropriate for a portfolio SaaS.
 */
export const THROTTLE_LIMITS = {
  /** Auth endpoints: 5 attempts per 15 minutes */
  AUTH: { ttl: 15 * 60 * 1000, limit: 5 },
  /** Password reset: 3 attempts per 15 minutes */
  PASSWORD_RESET: { ttl: 15 * 60 * 1000, limit: 3 },
  /** Registration: 3 attempts per hour */
  REGISTER: { ttl: 60 * 60 * 1000, limit: 3 },
  /** General API: 100 requests per 15 minutes */
  API: { ttl: 15 * 60 * 1000, limit: 100 },
} as const;

/**
 * Global throttler module configuration.
 * Imported in AppModule to provide global rate limiting.
 */
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'auth',
        ttl: THROTTLE_LIMITS.AUTH.ttl,
        limit: THROTTLE_LIMITS.AUTH.limit,
      },
      {
        name: 'general',
        ttl: THROTTLE_LIMITS.API.ttl,
        limit: THROTTLE_LIMITS.API.limit,
      },
    ]),
  ],
  exports: [ThrottlerModule],
})
export class ThrottlerConfigModule {}
