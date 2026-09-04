/**
 * FusionOS Ollama AI Provider — Phase 20 Enhanced
 *
 * Production-grade local AI runtime provider with:
 * - Retry with exponential backoff
 * - Model discovery and validation
 * - Health check with detailed status
 * - Usage tracking
 * - Request correlation IDs
 * - Graceful degradation
 * - Timeout handling
 * - Malformed response handling
 *
 * Configuration via environment:
 *   AI_PROVIDER=ollama
 *   AI_BASE_URL=http://localhost:11434
 *   AI_MODEL=llama3.2
 *   AI_TIMEOUT=60000
 *   AI_MAX_RETRIES=2
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  AIProvider,
  AIMessage,
  AIProviderResponse,
} from './ai-provider.interface';

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modifiedAt: string;
}

export interface OllamaHealthStatus {
  provider: string;
  model: string;
  available: boolean;
  ollamaReachable: boolean;
  modelInstalled: boolean;
  configuredModel: string;
  installedModels: string[];
  lastHealthCheck: string;
  latencyMs: number;
  status: 'READY' | 'UNAVAILABLE' | 'MODEL_MISSING' | 'CONFIGURATION_ERROR' | 'PROVIDER_ERROR';
}

export interface AIUsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatencyMs: number;
  totalTokensUsed: number;
  lastRequestAt: string | null;
}

@Injectable()
export class OllamaProvider extends AIProvider {
  readonly name = 'ollama';
  private readonly logger = new Logger(OllamaProvider.name);

  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  // Usage tracking (in-memory for this phase)
  private usageStats: AIUsageStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageLatencyMs: 0,
    totalTokensUsed: 0,
    lastRequestAt: null,
  };

  private lastHealthStatus: OllamaHealthStatus | null = null;
  private cachedModels: OllamaModel[] | null = null;
  private modelsCacheExpiry = 0;
  private readonly MODELS_CACHE_TTL = 60_000; // 1 minute

  constructor() {
    super();
    this.baseUrl = process.env['AI_BASE_URL'] ?? 'http://localhost:11434';
    this.model = process.env['AI_MODEL'] ?? 'llama3.2';
    this.timeout = parseInt(process.env['AI_TIMEOUT'] ?? '60000', 10);
    this.maxRetries = parseInt(process.env['AI_MAX_RETRIES'] ?? '2', 10);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEXT GENERATION
  // ═══════════════════════════════════════════════════════════════════════════

  async generateText(
    messages: AIMessage[],
    options?: { temperature?: number; maxTokens?: number; requestId?: string },
  ): Promise<AIProviderResponse> {
    const requestId = options?.['requestId'] as string | undefined ?? this.generateRequestId();
    const startTime = Date.now();

    this.usageStats.totalRequests++;
    this.usageStats.lastRequestAt = new Date().toISOString();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.doGenerate(messages, options);
        const latencyMs = Date.now() - startTime;

        // Update usage stats
        this.usageStats.successfulRequests++;
        this.updateAverageLatency(latencyMs);
        this.usageStats.totalTokensUsed += response.usage?.totalTokens ?? 0;

        this.logger.debug(`Ollama response [${requestId}] in ${latencyMs}ms (attempt ${attempt + 1})`);
        return response;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Ollama attempt ${attempt + 1}/${this.maxRetries + 1} failed: ${lastError.message}`);

        // Don't retry on client errors (4xx) or parse errors
        if (lastError.message.includes('400') || lastError.message.includes('parse')) {
          break;
        }

        // Exponential backoff before retry
        if (attempt < this.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    // All retries exhausted
    this.usageStats.failedRequests++;
    const latencyMs = Date.now() - startTime;
    this.updateAverageLatency(latencyMs);

    this.logger.error(`Ollama request [${requestId}] failed after ${this.maxRetries + 1} attempts: ${lastError?.message}`);
    throw lastError ?? new Error('Ollama request failed');
  }

  private async doGenerate(
    messages: AIMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<AIProviderResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: false,
          options: {
            temperature: options?.temperature ?? 0.7,
            num_predict: options?.maxTokens ?? 2048,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as {
        message?: { content?: string };
        done?: boolean;
        eval_count?: number;
        prompt_eval_count?: number;
      };

      return {
        content: data.message?.content ?? '',
        finishReason: data.done ? 'stop' : 'length',
        usage: {
          promptTokens: data.prompt_eval_count ?? 0,
          completionTokens: data.eval_count ?? 0,
          totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
        },
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STRUCTURED OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════

  async generateStructuredOutput<T>(
    messages: AIMessage[],
    schema: Record<string, unknown>,
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<T> {
    const systemMessage = messages.find((m) => m.role === 'system');
    const otherMessages = messages.filter((m) => m.role !== 'system');

    const enhancedSystem = [
      systemMessage?.content ?? '',
      `\n\nYou MUST respond with valid JSON that conforms to this schema:\n${JSON.stringify(schema, null, 2)}\n\nRespond ONLY with the JSON object. No markdown, no explanation, no code fences.`,
    ].join('');

    const response = await this.generateText(
      [
        { role: 'system', content: enhancedSystem },
        ...otherMessages,
      ],
      { ...options, temperature: options?.temperature ?? 0.3 },
    );

    return this.parseStructuredOutput<T>(response.content);
  }

  /**
   * Safely parse structured output from AI response.
   * Handles markdown code fences, leading/trailing text, etc.
   */
  private parseStructuredOutput<T>(content: string): T {
    // Try direct parse first
    try {
      return JSON.parse(content) as T;
    } catch {
      // Try extracting JSON from code fences
      const fenceMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (fenceMatch) {
        try {
          return JSON.parse(fenceMatch[1].trim()) as T;
        } catch {
          // Continue to next attempt
        }
      }

      // Try finding first { ... } or [ ... ]
      const jsonMatch = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1]) as T;
        } catch {
          // Continue
        }
      }

      throw new Error(`Failed to parse structured output from AI response`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH & AVAILABILITY
  // ═══════════════════════════════════════════════════════════════════════════

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getStatus(): Promise<{
    provider: string;
    model: string;
    available: boolean;
  }> {
    const available = await this.isAvailable();
    return {
      provider: 'ollama',
      model: this.model,
      available,
    };
  }

  /**
   * Comprehensive health check with detailed status.
   */
  async getHealthStatus(): Promise<OllamaHealthStatus> {
    const startTime = Date.now();

    const ollamaReachable = await this.isAvailable();
    let installedModels: string[] = [];
    let modelInstalled = false;

    if (ollamaReachable) {
      try {
        const models = await this.listModels();
        installedModels = models.map((m) => m.name);
        modelInstalled = installedModels.some(
          (name) => name === this.model || name.startsWith(this.model + ':'),
        );
      } catch {
        // Model listing failed — treat as unknown
      }
    }

    const latencyMs = Date.now() - startTime;

    let status: OllamaHealthStatus['status'];
    if (!ollamaReachable) {
      status = 'UNAVAILABLE';
    } else if (!modelInstalled) {
      status = 'MODEL_MISSING';
    } else {
      status = 'READY';
    }

    const healthStatus: OllamaHealthStatus = {
      provider: 'ollama',
      model: this.model,
      available: ollamaReachable && modelInstalled,
      ollamaReachable,
      modelInstalled,
      configuredModel: this.model,
      installedModels,
      lastHealthCheck: new Date().toISOString(),
      latencyMs,
      status,
    };

    this.lastHealthStatus = healthStatus;
    return healthStatus;
  }

  /**
   * Get cached or fresh health status.
   */
  getLastHealthStatus(): OllamaHealthStatus | null {
    return this.lastHealthStatus;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODEL MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * List all locally installed Ollama models.
   */
  async listModels(): Promise<OllamaModel[]> {
    const now = Date.now();
    if (this.cachedModels && now < this.modelsCacheExpiry) {
      return this.cachedModels;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.status}`);
      }

      const data = (await response.json()) as {
        models?: Array<{
          name: string;
          size: number;
          digest: string;
          modified_at: string;
        }>;
      };

      this.cachedModels = (data.models ?? []).map((m) => ({
        name: m.name,
        size: m.size,
        digest: m.digest,
        modifiedAt: m.modified_at,
      }));

      this.modelsCacheExpiry = now + this.MODELS_CACHE_TTL;
      return this.cachedModels;
    } catch (error) {
      this.logger.warn(`Failed to list Ollama models: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Check if a specific model is available.
   */
  async isModelAvailable(modelName?: string): Promise<boolean> {
    const target = modelName ?? this.model;
    const models = await this.listModels();
    return models.some((m) => m.name === target || m.name.startsWith(target + ':'));
  }

  /**
   * Get the configured model name.
   */
  getConfiguredModel(): string {
    return this.model;
  }

  /**
   * Get the base URL (for safe display).
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // USAGE TRACKING
  // ═══════════════════════════════════════════════════════════════════════════

  getUsageStats(): AIUsageStats {
    return { ...this.usageStats };
  }

  resetUsageStats(): void {
    this.usageStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatencyMs: 0,
      totalTokensUsed: 0,
      lastRequestAt: null,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private generateRequestId(): string {
    return `ollama-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  private updateAverageLatency(latencyMs: number): void {
    const total = this.usageStats.totalRequests;
    if (total <= 1) {
      this.usageStats.averageLatencyMs = latencyMs;
    } else {
      this.usageStats.averageLatencyMs = Math.round(
        (this.usageStats.averageLatencyMs * (total - 1) + latencyMs) / total,
      );
    }
  }
}
