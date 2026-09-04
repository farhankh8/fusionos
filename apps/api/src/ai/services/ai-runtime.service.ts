/**
 * FusionOS AI Runtime Service — Phase 20
 *
 * Centralized AI runtime management providing:
 * - Health monitoring
 * - Model management
 * - Usage tracking
 * - Runtime configuration
 * - Graceful degradation
 *
 * All operations are safe and do not expose secrets.
 */

import { Injectable, Logger } from '@nestjs/common';
import { OllamaProvider, type OllamaHealthStatus, type AIUsageStats } from '../providers/ollama.provider';
import { CONTEXT_REGISTRY } from '../engine/context-registry';
import { TOOL_REGISTRY } from '../engine/tool-registry';

export interface AIRuntimeStatus {
  provider: string;
  status: 'READY' | 'UNAVAILABLE' | 'MODEL_MISSING' | 'CONFIGURATION_ERROR' | 'PROVIDER_ERROR';
  ollama: {
    reachable: boolean;
    baseUrl: string;
    configuredModel: string;
    modelInstalled: boolean;
    installedModels: string[];
    lastHealthCheck: string | null;
    latencyMs: number;
  };
  capabilities: {
    textGeneration: boolean;
    structuredOutput: boolean;
    contextSources: number;
    tools: number;
  };
  usage: AIUsageStats;
}

export interface AIRuntimeConfig {
  provider: string;
  baseUrl: string;
  model: string;
  timeout: number;
  maxRetries: number;
}

@Injectable()
export class AIRuntimeService {
  private readonly logger = new Logger(AIRuntimeService.name);

  constructor(private readonly ollamaProvider: OllamaProvider) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // RUNTIME STATUS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get comprehensive AI runtime status.
   * Safe for frontend display — no secrets exposed.
   */
  async getRuntimeStatus(): Promise<AIRuntimeStatus> {
    const healthStatus = await this.ollamaProvider.getHealthStatus();
    const usageStats = this.ollamaProvider.getUsageStats();

    return {
      provider: 'ollama',
      status: healthStatus.status,
      ollama: {
        reachable: healthStatus.ollamaReachable,
        baseUrl: this.maskUrl(healthStatus.provider === 'ollama' ? this.ollamaProvider.getBaseUrl() : ''),
        configuredModel: healthStatus.configuredModel,
        modelInstalled: healthStatus.modelInstalled,
        installedModels: healthStatus.installedModels,
        lastHealthCheck: healthStatus.lastHealthCheck,
        latencyMs: healthStatus.latencyMs,
      },
      capabilities: {
        textGeneration: healthStatus.available,
        structuredOutput: healthStatus.available,
        contextSources: CONTEXT_REGISTRY.length,
        tools: TOOL_REGISTRY.length,
      },
      usage: usageStats,
    };
  }

  /**
   * Get runtime configuration (safe for display).
   */
  getRuntimeConfig(): AIRuntimeConfig {
    return {
      provider: 'ollama',
      baseUrl: this.maskUrl(this.ollamaProvider.getBaseUrl()),
      model: this.ollamaProvider.getConfiguredModel(),
      timeout: parseInt(process.env['AI_TIMEOUT'] ?? '60000', 10),
      maxRetries: parseInt(process.env['AI_MAX_RETRIES'] ?? '2', 10),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH CHECK
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Perform a fresh health check.
   */
  async performHealthCheck(): Promise<OllamaHealthStatus> {
    return this.ollamaProvider.getHealthStatus();
  }

  /**
   * Get last cached health status.
   */
  getLastHealthStatus(): OllamaHealthStatus | null {
    return this.ollamaProvider.getLastHealthStatus();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODEL MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * List available models.
   */
  async listModels() {
    return this.ollamaProvider.listModels();
  }

  /**
   * Check if a specific model is available.
   */
  async checkModelAvailability(modelName?: string) {
    const available = await this.ollamaProvider.isModelAvailable(modelName);
    return {
      model: modelName ?? this.ollamaProvider.getConfiguredModel(),
      available,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // USAGE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get usage statistics.
   */
  getUsageStats(): AIUsageStats {
    return this.ollamaProvider.getUsageStats();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Mask URL for safe frontend display.
   * Shows protocol and host but masks ports in non-dev environments.
   */
  private maskUrl(url: string): string {
    if (!url) return '';
    try {
      const parsed = new URL(url);
      // In development, show full URL for convenience
      if (process.env['NODE_ENV'] === 'development') {
        return url;
      }
      return `${parsed.protocol}//${parsed.hostname}`;
    } catch {
      return url;
    }
  }
}
