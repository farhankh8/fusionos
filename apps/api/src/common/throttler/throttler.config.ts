/**
 * FusionOS Throttler Configuration
 *
 * Rate limiting design:
 *  - A single GLOBAL 'general' limiter (100 req / 15 min, env-tunable) is
 *    registered in AppModule and applies to every route.
 *  - STRICT brute-force limits (login 5/15min, register 3/hour, password
 *    reset 3/15min) are applied PER-ROUTE with @Throttle on the auth
 *    controller. A global strict limiter would throttle the entire API.
 *  - Health endpoints use @SkipThrottle so probes are never rate-limited.
 *  - Storage is Redis-backed via RedisThrottlerStorage (consistent across
 *    instances) with a transparent in-memory fallback when Redis is down.
 */

import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

/**
 * Default rate limits for different endpoint categories.
 * These are conservative defaults appropriate for a portfolio SaaS.
 */
export const THROTTLE_LIMITS = {
  /** Login / auth attempts: 5 per 15 minutes (per-route on auth controller) */
  AUTH: { ttl: 15 * 60 * 1000, limit: 5 },
  /** Password reset / verify email: 3 per 15 minutes (per-route) */
  PASSWORD_RESET: { ttl: 15 * 60 * 1000, limit: 3 },
  /** Registration: 3 per hour (per-route) */
  REGISTER: { ttl: 60 * 60 * 1000, limit: 3 },
  /** General API: 100 requests per 15 minutes (global, env-tunable) */
  API: { ttl: 15 * 60 * 1000, limit: 100 },
} as const;

/**
 * Global throttler module configuration.
 * Registers ONLY the general limiter — strict per-route limits are applied
 * directly on the auth controller with @Throttle.
 */
@Module({
  imports: [
    ThrottlerModule.forRoot([
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
