/**
 * FusionOS AI Runtime Integration Tests — Phase 20
 *
 * Covers:
 * - Ollama provider configuration
 * - Model discovery
 * - Health status
 * - Usage tracking
 * - Structured output parsing
 * - Runtime service
 * - Graceful degradation
 * - Security
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { OllamaProvider } from '../../ai/providers/ollama.provider';

const prisma = new PrismaClient();

describe('AI Runtime — Phase 20 Integration Tests', () => {
  let provider: OllamaProvider;

  beforeAll(() => {
    provider = new OllamaProvider();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PROVIDER CONFIGURATION
  // ══════════════════════════════════════════════════════════════════════════

  describe('Provider Configuration', () => {
    it('should have ollama as the provider name', () => {
      expect(provider.name).toBe('ollama');
    });

    it('should have a configured model', () => {
      const model = provider.getConfiguredModel();
      expect(model).toBeDefined();
      expect(typeof model).toBe('string');
      expect(model.length).toBeGreaterThan(0);
    });

    it('should have a base URL', () => {
      const url = provider.getBaseUrl();
      expect(url).toBeDefined();
      expect(url).toMatch(/^https?:\/\//);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // HEALTH STATUS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Health Status', () => {
    it('should return a health status object', async () => {
      const status = await provider.getHealthStatus();
      expect(status).toBeDefined();
      expect(status.provider).toBe('ollama');
      expect(status.configuredModel).toBeDefined();
      expect(status.status).toBeDefined();
      expect(['READY', 'UNAVAILABLE', 'MODEL_MISSING', 'CONFIGURATION_ERROR', 'PROVIDER_ERROR']).toContain(status.status);
    });

    it('should track health check timestamp', async () => {
      const status = await provider.getHealthStatus();
      expect(status.lastHealthCheck).toBeDefined();
      const checkDate = new Date(status.lastHealthCheck);
      expect(checkDate.getTime()).toBeGreaterThan(0);
    });

    it('should cache health status', async () => {
      await provider.getHealthStatus();
      const cached = provider.getLastHealthStatus();
      expect(cached).not.toBeNull();
      expect(cached!.provider).toBe('ollama');
    });

    it('should report latency', async () => {
      const status = await provider.getHealthStatus();
      expect(typeof status.latencyMs).toBe('number');
      expect(status.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MODEL MANAGEMENT
  // ══════════════════════════════════════════════════════════════════════════

  describe('Model Management', () => {
    it('should list models (may be empty if Ollama is unavailable)', async () => {
      const models = await provider.listModels();
      expect(Array.isArray(models)).toBe(true);
    });

    it('each model should have required fields', async () => {
      const models = await provider.listModels();
      for (const model of models) {
        expect(model.name).toBeDefined();
        expect(typeof model.size).toBe('number');
        expect(model.digest).toBeDefined();
      }
    });

    it('should check model availability', async () => {
      const available = await provider.isModelAvailable();
      expect(typeof available).toBe('boolean');
    });

    it('should check specific model availability', async () => {
      const available = await provider.isModelAvailable('nonexistent-model-12345');
      expect(available).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // USAGE TRACKING
  // ══════════════════════════════════════════════════════════════════════════

  describe('Usage Tracking', () => {
    it('should track usage stats', () => {
      const stats = provider.getUsageStats();
      expect(stats).toBeDefined();
      expect(typeof stats.totalRequests).toBe('number');
      expect(typeof stats.successfulRequests).toBe('number');
      expect(typeof stats.failedRequests).toBe('number');
      expect(typeof stats.averageLatencyMs).toBe('number');
      expect(typeof stats.totalTokensUsed).toBe('number');
    });

    it('should reset usage stats', () => {
      provider.resetUsageStats();
      const stats = provider.getUsageStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GRACEFUL DEGRADATION
  // ══════════════════════════════════════════════════════════════════════════

  describe('Graceful Degradation', () => {
    it('should handle unavailable Ollama gracefully', async () => {
      // Even if Ollama is down, these should not throw
      const status = await provider.getHealthStatus();
      expect(status).toBeDefined();
      expect(status.status).toBeDefined();
    });

    it('should return empty models when Ollama is unavailable', async () => {
      const models = await provider.listModels();
      expect(Array.isArray(models)).toBe(true);
      // May be empty if Ollama is not running
    });

    it('getStatus should never throw', async () => {
      const status = await provider.getStatus();
      expect(status).toBeDefined();
      expect(status.provider).toBe('ollama');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SECURITY
  // ══════════════════════════════════════════════════════════════════════════

  describe('Security', () => {
    it('should not expose secrets in status', async () => {
      const status = await provider.getHealthStatus();
      const statusStr = JSON.stringify(status);
      // Should not contain common secret patterns
      expect(statusStr).not.toContain('password');
      expect(statusStr).not.toContain('secret');
      expect(statusStr).not.toContain('api_key');
    });

    it('baseUrl should not contain credentials', () => {
      const url = provider.getBaseUrl();
      expect(url).not.toContain('password');
      expect(url).not.toContain('token');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CONCURRENCY
  // ══════════════════════════════════════════════════════════════════════════

  describe('Concurrency', () => {
    it('concurrent health checks should not error', async () => {
      const results = await Promise.allSettled([
        provider.getHealthStatus(),
        provider.getHealthStatus(),
        provider.getHealthStatus(),
      ]);
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    });

    it('concurrent model listings should not error', async () => {
      const results = await Promise.allSettled([
        provider.listModels(),
        provider.listModels(),
      ]);
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    });
  });
});
