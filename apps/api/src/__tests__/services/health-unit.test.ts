/**
 * HealthService Unit Tests — Phase 25 Coverage Engineering
 *
 * Covers: getHealth(), checkApplication(), checkDatabase(), checkRedis(), determineOverallStatus()
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthService } from '../../health/health.service';
import { RedisThrottlerStorage } from '../../common/throttler/redis-throttler.storage';
import { PrismaClient } from '@prisma/client';

function createRedisMock(overrides: Partial<RedisThrottlerStorage> = {}) {
  return {
    ping: vi.fn().mockResolvedValue(null),
    isConfigured: vi.fn().mockReturnValue(false),
    ...overrides,
  } as unknown as RedisThrottlerStorage;
}

function createPrismaMock(overrides: Record<string, unknown> = {}) {
  return {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as PrismaClient;
}

describe('HealthService', () => {
  let healthService: HealthService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getHealth()', () => {
    it('returns healthy status structure with all required fields', async () => {
      const redisMock = createRedisMock({
        ping: vi.fn().mockResolvedValue(null),
        isConfigured: vi.fn().mockReturnValue(false),
      });
      healthService = new HealthService(redisMock, createPrismaMock());

      // Without DATABASE_URL, DB check reports 'unknown' not 'down'
      const result = await healthService.getHealth();
      expect(result.services.application.status).toBe('up');
      expect(result.version).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(typeof result.uptime).toBe('number');
      expect(result.services).toHaveProperty('application');
      expect(result.services).toHaveProperty('database');
      expect(result.services).toHaveProperty('redis');
    });

    it('returns status with application always up', async () => {
      const redisMock = createRedisMock();
      healthService = new HealthService(redisMock, createPrismaMock());
      const result = await healthService.getHealth();
      expect(result.services.application.status).toBe('up');
    });

    it('reports Redis as unknown when REDIS_URL not set', async () => {
      const origUrl = process.env['REDIS_URL'];
      delete process.env['REDIS_URL'];

      const redisMock = createRedisMock();
      healthService = new HealthService(redisMock, createPrismaMock());
      const result = await healthService.getHealth();

      expect(result.services.redis.status).toBe('unknown');
      expect(result.services.redis.message).toContain('REDIS_URL not configured');

      if (origUrl !== undefined) process.env['REDIS_URL'] = origUrl;
    });

    it('reports Redis as up when ping succeeds', async () => {
      const origUrl = process.env['REDIS_URL'];
      process.env['REDIS_URL'] = 'redis://localhost:6379';

      const redisMock = createRedisMock({
        ping: vi.fn().mockResolvedValue({ reachable: true, latencyMs: 5 }),
      });
      healthService = new HealthService(redisMock, createPrismaMock());
      const result = await healthService.getHealth();

      expect(result.services.redis.status).toBe('up');
      expect(result.services.redis.latencyMs).toBe(5);

      if (origUrl !== undefined) {
        process.env['REDIS_URL'] = origUrl;
      } else {
        delete process.env['REDIS_URL'];
      }
    });

    it('reports Redis as down when ping fails', async () => {
      const origUrl = process.env['REDIS_URL'];
      process.env['REDIS_URL'] = 'redis://localhost:6379';

      const redisMock = createRedisMock({
        ping: vi.fn().mockResolvedValue({ reachable: false, latencyMs: 0 }),
      });
      healthService = new HealthService(redisMock, createPrismaMock());
      const result = await healthService.getHealth();

      expect(result.services.redis.status).toBe('down');
      expect(result.services.redis.message).toContain('unreachable');

      if (origUrl !== undefined) {
        process.env['REDIS_URL'] = origUrl;
      } else {
        delete process.env['REDIS_URL'];
      }
    });

    it('reports database as unknown when DATABASE_URL not set', async () => {
      const origDbUrl = process.env['DATABASE_URL'];
      delete process.env['DATABASE_URL'];

      const redisMock = createRedisMock();
      healthService = new HealthService(redisMock, createPrismaMock());
      const result = await healthService.getHealth();

      expect(result.services.database.status).toBe('unknown');
      expect(result.services.database.message).toContain('DATABASE_URL not configured');

      if (origDbUrl !== undefined) process.env['DATABASE_URL'] = origDbUrl;
    });

    it('reports degraded when database is down', async () => {
      const origDbUrl = process.env['DATABASE_URL'];
      process.env['DATABASE_URL'] = 'postgresql://invalid:invalid@localhost:1/invalid';

      const redisMock = createRedisMock();
      healthService = new HealthService(redisMock, createPrismaMock({
        $queryRaw: vi.fn().mockRejectedValue(new Error('Connection refused')),
      }));
      const result = await healthService.getHealth();

      // Database check will fail (no local DB), overall should be degraded
      expect(['degraded', 'unhealthy']).toContain(result.status);
      expect(result.services.database.status).toBe('down');

      if (origDbUrl !== undefined) {
        process.env['DATABASE_URL'] = origDbUrl;
      } else {
        delete process.env['DATABASE_URL'];
      }
    });
  });
});
