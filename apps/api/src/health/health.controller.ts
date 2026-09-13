import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthService } from './health.service';
import type { HealthCheckResult } from './health.service';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Health endpoints are exempt from rate limiting.
 * Load balancers, orchestrators, and monitoring probes must always
 * be able to reach liveness/readiness without being throttled.
 *
 * NOTE: the throttler is registered under the name 'general' (not 'default'),
 * so the skip must target `general` explicitly — a bare @SkipThrottle() writes
 * THROTTLER:SKIPdefault and is ignored by the guard in @nestjs/throttler v6.
 */
@SkipThrottle({ general: true })
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Full health check — returns all dependency statuses.
   * Used for monitoring dashboards.
   */
  @Public()
  @Get()
  async check(): Promise<HealthCheckResult> {
    return this.healthService.getHealth();
  }

  /**
   * Liveness probe — is the application process alive?
   * Kubernetes/container orchestrators use this to know if the pod should be restarted.
   */
  @Public()
  @Get('live')
  live(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness probe — is the application ready to serve traffic?
   * Returns unhealthy if critical dependencies (database) are down.
   */
  @Public()
  @Get('ready')
  async ready(): Promise<{ status: string; timestamp: string; ready: boolean }> {
    const health = await this.healthService.getHealth();
    const ready = health.status !== 'unhealthy';

    return {
      status: ready ? 'ok' : 'not_ready',
      timestamp: new Date().toISOString(),
      ready,
    };
  }
}
