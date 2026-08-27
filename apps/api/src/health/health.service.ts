import { Injectable, Logger } from '@nestjs/common';

interface ServiceHealth {
  status: 'up' | 'down' | 'unknown';
  latencyMs?: number;
  message?: string;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  uptime: number;
  services: {
    application: ServiceHealth;
    database: ServiceHealth;
    redis: ServiceHealth;
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  async getHealth(): Promise<HealthCheckResult> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const services = {
      application: this.checkApplication(),
      database,
      redis,
    };

    const status = this.determineOverallStatus(services);

    return {
      status,
      version: process.env['npm_package_version'] ?? '0.1.0',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      services,
    };
  }

  private checkApplication(): ServiceHealth {
    return { status: 'up' };
  }

  private async checkDatabase(): Promise<ServiceHealth> {
    const databaseUrl = process.env['DATABASE_URL'];
    if (!databaseUrl) {
      return {
        status: 'unknown',
        message: 'DATABASE_URL not configured',
      };
    }

    const start = Date.now();
    try {
      // Dynamic import to avoid hard dependency when DB is not configured
      const { PrismaClient } = await import('@prisma/client');
      const client = new PrismaClient();
      await client.$queryRaw`SELECT 1`;
      await client.$disconnect();
      return {
        status: 'up',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      this.logger.warn(`Database health check failed: ${error}`);
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkRedis(): Promise<ServiceHealth> {
    const redisUrl = process.env['REDIS_URL'];
    if (!redisUrl) {
      return {
        status: 'unknown',
        message: 'REDIS_URL not configured',
      };
    }

    const start = Date.now();
    try {
      // Redis check will be implemented when Redis client is added
      return {
        status: 'unknown',
        latencyMs: Date.now() - start,
        message: 'Redis health check not yet implemented',
      };
    } catch (error) {
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private determineOverallStatus(services: {
    application: ServiceHealth;
    database: ServiceHealth;
    redis: ServiceHealth;
  }): 'healthy' | 'degraded' | 'unhealthy' {
    if (services.application.status === 'down') return 'unhealthy';
    if (services.database.status === 'down') return 'degraded';
    if (services.redis.status === 'down') return 'degraded';
    return 'healthy';
  }
}
