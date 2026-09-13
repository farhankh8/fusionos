import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { RedisThrottlerStorage } from '../common/throttler/redis-throttler.storage';

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
    ollama: ServiceHealth;
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly redisThrottlerStorage: RedisThrottlerStorage,
    private readonly prisma: PrismaClient,
  ) {}

  async getHealth(): Promise<HealthCheckResult> {
    const [database, redis, ollama] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkOllama(),
    ]);

    const services = {
      application: this.checkApplication(),
      database,
      redis,
      ollama,
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
      await this.prisma.$queryRaw`SELECT 1`;
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
        message: 'REDIS_URL not configured — in-memory throttling fallback active',
      };
    }

    const start = Date.now();
    const result = await this.redisThrottlerStorage.ping();
    if (result === null) {
      return {
        status: 'unknown',
        latencyMs: Date.now() - start,
        message: 'Redis client not configured',
      };
    }
    if (result.reachable) {
      return {
        status: 'up',
        latencyMs: result.latencyMs,
      };
    }
    return {
      status: 'down',
      latencyMs: Date.now() - start,
      message: 'Redis unreachable — in-memory throttling fallback active',
    };
  }

  private async checkOllama(): Promise<ServiceHealth> {
    const ollamaUrl = process.env['AI_BASE_URL'] ?? 'http://localhost:11434';
    const start = Date.now();
    try {
      const response = await fetch(`${ollamaUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        return { status: 'up', latencyMs: Date.now() - start };
      }
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        message: `Ollama returned ${response.status}`,
      };
    } catch (error) {
      // Ollama failure should NOT kill the ERP — log and return degraded
      this.logger.debug(`Ollama health check failed: ${error}`);
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        message: 'Ollama unavailable — AI features disabled',
      };
    }
  }

  private determineOverallStatus(services: {
    application: ServiceHealth;
    database: ServiceHealth;
    redis: ServiceHealth;
    ollama: ServiceHealth;
  }): 'healthy' | 'degraded' | 'unhealthy' {
    if (services.application.status === 'down') return 'unhealthy';
    if (services.database.status === 'down') return 'degraded';
    // Redis and Ollama failures are degraded, not unhealthy
    // AI is optional — ERP continues operating without it
    return 'healthy';
  }
}
