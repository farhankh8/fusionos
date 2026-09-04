/**
 * FusionOS RedisThrottlerStorage tests — Phase 25
 *
 * Covers the in-memory fallback semantics (the path used when REDIS_URL is
 * not configured or Redis is unreachable — including CI and local dev):
 * fixed-window counting, over-limit blocking, and unconfigured ping.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RedisThrottlerStorage } from '../../common/throttler/redis-throttler.storage';

// Ensure REDIS_URL is not set for these tests (deterministic memory fallback)
const originalRedisUrl = process.env['REDIS_URL'];
delete process.env['REDIS_URL'];

let storage: RedisThrottlerStorage;

beforeAll(() => {
  storage = new RedisThrottlerStorage();
});

afterAll(() => {
  if (originalRedisUrl !== undefined) process.env['REDIS_URL'] = originalRedisUrl;
});

describe('RedisThrottlerStorage (in-memory fallback)', () => {
  it('is not configured when REDIS_URL is absent', () => {
    expect(storage.isConfigured()).toBe(false);
  });

  it('ping returns null when not configured', async () => {
    expect(await storage.ping()).toBeNull();
  });

  it('allows requests within the limit and counts hits', async () => {
    const first = await storage.increment('test-ip', 60_000, 5, 60_000, 'general');
    expect(first.isBlocked).toBe(false);
    expect(first.totalHits).toBe(1);
    expect(first.timeToExpire).toBeGreaterThan(0);

    const second = await storage.increment('test-ip', 60_000, 5, 60_000, 'general');
    expect(second.isBlocked).toBe(false);
    expect(second.totalHits).toBe(2);
  });

  it('blocks when the limit is exceeded', async () => {
    const key = `overlimit-${Date.now()}`;
    for (let i = 1; i <= 5; i++) {
      const r = await storage.increment(key, 60_000, 5, 60_000, 'general');
      expect(r.isBlocked).toBe(false);
    }
    const blocked = await storage.increment(key, 60_000, 5, 60_000, 'general');
    expect(blocked.isBlocked).toBe(true);
    expect(blocked.timeToBlockExpire).toBeGreaterThan(0);
  });

  it('keeps separate counters per throttler name and key (no cross-talk)', async () => {
    const r1 = await storage.increment('tenant-a-ip', 60_000, 5, 60_000, 'general');
    const r2 = await storage.increment('tenant-b-ip', 60_000, 5, 60_000, 'general');
    expect(r1.totalHits).toBe(1);
    expect(r2.totalHits).toBe(1);
  });

  it('expires the window and resets the counter', async () => {
    // ttl of 1ms → next increment starts a fresh window
    const key = `expiry-${Date.now()}`;
    await storage.increment(key, 1, 5, 60_000, 'general');
    await new Promise((r) => setTimeout(r, 5));
    const fresh = await storage.increment(key, 60_000, 5, 60_000, 'general');
    expect(fresh.totalHits).toBe(1);
  });
});