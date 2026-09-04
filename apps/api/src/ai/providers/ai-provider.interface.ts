/**
 * FusionOS AI Provider Interface
 *
 * Provider-agnostic abstraction for AI capabilities.
 * Each provider implements this interface to support:
 * - Text generation
 * - Structured output generation
 * - Tool calling (where supported)
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  name?: string;
}

export interface AIToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AIProviderResponse {
  content: string;
  toolCalls?: AIMessage[];
  finishReason: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIProviderConfig {
  provider: string;
  model: string;
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Abstract AI Provider interface.
 * All AI providers must implement this interface.
 */
export abstract class AIProvider {
  abstract readonly name: string;

  /**
   * Generate text from messages.
   */
  abstract generateText(
    messages: AIMessage[],
    options?: {
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<AIProviderResponse>;

  /**
   * Generate structured output (JSON) from messages.
   */
  abstract generateStructuredOutput<T>(
    messages: AIMessage[],
    schema: Record<string, unknown>,
    options?: {
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<T>;

  /**
   * Check if the provider is available.
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Get provider status info.
   */
  abstract getStatus(): Promise<{
    provider: string;
    model: string;
    available: boolean;
  }>;
}
