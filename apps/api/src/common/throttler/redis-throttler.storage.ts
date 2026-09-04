/**
 * FusionOS Redis-backed Throttler Storage — Phase 25
 *
 * Implements @nestjs/throttler's ThrottlerStorage using Redis for consistent
 * rate limiting across multiple API instances, with a fully transparent
 * in-memory fallback when Redis is unavailable.
 *
 * Design guarantees:
 *  - PostgreSQL remains the source of truth for ALL business data. Redis is
 *    used ONLY for ephemeral rate-limit counters (no authoritative data).
 *  - Graceful degradation: any Redis failure falls back to in-memory storage
 *    for that request; requests never hang (1s command/connect timeouts).
 *  - Key scheme: `fusionos:throttle:{throttlerName}:{trackerKey}` — tenant
 *    isolation is preserved because keys are per tracker (IP/user), never
 *    shared across tenants, and contain no tenant data.
 *  - TTL-based expiry mirrors @nestjs/throttler's fixed-window semantics;
 *    over-limit requests set a short-lived block key.
 */

import { Injectable, Logger } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';

/** Shape required by @nestjs/throttler's storage contract (v6). */
interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

interface MemoryRecord {
  totalHits: number;
  expiresAt: number;
  blockedUntil: number;
}

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(RedisThrottlerStorage.name);

  private readonly redis: Redis | null;
  private readonly memory = new Map<string, MemoryRecord>();

  private redisAvailable = false;
  private redisDownAt: number | null = null;
  private readonly RECONNECT_AFTER_MS = 30_000;

  constructor() {
    const url = process.env['REDIS_URL'];
    if (!url) {
      this.redis = null;
      return;
    }
    this.redis = new Redis(url, {
      lazyConnect: true,
      connectTimeout: 1000,
      commandTimeout: 1000,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: () => null, // no automatic reconnect — probe on demand
    });
    void this.probe().catch(() => undefined);
  }

  // ── Health / availability ────────────────────────────────────────────────

  /** True when REDIS_URL is configured (regardless of current reachability). */
  isConfigured(): boolean {
    return this.redis !== null;
  }

  /**
   * Ping Redis with a short timeout. Returns null when not configured.
   * Used by the /health readiness endpoint.
   */
  async ping(): Promise<{ reachable: boolean; latencyMs: number } | null> {
    if (!this.redis) return null;
    const start = Date.now();
    try {
      await this.redis.ping();
      this.redisAvailable = true;
      this.redisDownAt = null;
      return { reachable: true, latencyMs: Date.now() - start };
    } catch {
      this.redisAvailable = false;
      return { reachable: false, latencyMs: 0 };
    }
  }

  private async probe(): Promise<boolean> {
    if (!this.redis) return false;
    // Respect a cooldown before re-probing a known-down Redis
    if (this.redisDownAt && Date.now() - this.redisDownAt < this.RECONNECT_AFTER_MS) {
      return false;
    }
    try {
      await this.redis.ping();
      this.redisAvailable = true;
      this.redisDownAt = null;
      return true;
    } catch (error) {
      this.redisAvailable = false;
      this.redisDownAt = Date.now();
      this.logger.warn(
        `Redis unavailable — using in-memory throttling fallback: ${(error as Error).message}`,
      );
      return false;
    }
  }

  // ── ThrottlerStorage contract ────────────────────────────────────────────

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    if (this.redis && (this.redisAvailable || (await this.probe()))) {
      try {
        return await this.incrementRedis(key, ttl, limit, blockDuration, throttlerName);
      } catch (error) {
        // Any Redis failure → in-memory fallback for this request
        this.redisAvailable = false;
        this.redisDownAt = Date.now();
        this.logger.warn(
          `Redis throttler error, falling back to in-memory: ${(error as Error).message}`,
        );
      }
    }
    return this.incrementMemory(key, ttl, limit, blockDuration);
  }

  private async incrementRedis(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const redis = this.redis!;
    const fullKey = `fusionos:throttle:${throttlerName}:${key}`;
    const blockKey = `${fullKey}:blocked`;

    // 1. Blocked?
    const blocked = await redis.get(blockKey);
    if (blocked !== null) {
      const ttlSec = Math.max(0, await redis.ttl(blockKey));
      return {
        totalHits: limit,
        timeToExpire: ttlSec * 1000,
        isBlocked: true,
        timeToBlockExpire: ttlSec * 1000,
      };
    }

    // 2. Increment counter (fixed window)
    const totalHits = await redis.incr(fullKey);
    if (totalHits === 1) {
      await redis.expire(fullKey, Math.max(1, Math.ceil(ttl / 1000)));
    }

    // 3. Over limit → block
    if (totalHits > limit) {
      await redis.set(blockKey, '1', 'PX', Math.max(1, blockDuration));
      const ttlSec = Math.max(0, await redis.ttl(blockKey));
      return {
        totalHits,
        timeToExpire: ttlSec * 1000,
        isBlocked: true,
        timeToBlockExpire: ttlSec * 1000,
      };
    }

    const remainingTtlSec = Math.max(0, await redis.ttl(fullKey));
    return {
      totalHits,
      timeToExpire: remainingTtlSec * 1000,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }

  private incrementMemory(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ): ThrottlerStorageRecord {
    const now = Date.now();
    const rec =
      this.memory.get(key) ?? { totalHits: 0, expiresAt: now + ttl, blockedUntil: 0 };

    if (rec.blockedUntil > now) {
      return {
        totalHits: rec.totalHits,
        timeToExpire: Math.max(0, rec.blockedUntil - now),
        isBlocked: true,
        timeToBlockExpire: Math.max(0, rec.blockedUntil - now),
      };
    }

    if (rec.expiresAt <= now) {
      rec.totalHits = 0;
      rec.expiresAt = now + ttl;
      rec.blockedUntil = 0;
    }

    rec.totalHits += 1;
    if (rec.totalHits > limit) {
      rec.blockedUntil = now + blockDuration;
      this.memory.set(key, rec);
      return {
        totalHits: rec.totalHits,
        timeToExpire: Math.max(0, rec.expiresAt - now),
        isBlocked: true,
        timeToBlockExpire: blockDuration,
      };
    }

    this.memory.set(key, rec);
    return {
      totalHits: rec.totalHits,
      timeToExpire: Math.max(0, rec.expiresAt - now),
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }
}