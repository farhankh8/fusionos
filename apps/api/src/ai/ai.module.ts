/**
 * FusionOS AI Module — Phase 20 Enhanced
 *
 * AI Command Center, Runtime, & Intelligence Foundation.
 * Provides AI provider abstraction, runtime management,
 * conversation management, context retrieval, and tool execution.
 */

import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { AIService } from './services/ai.service';
import { AIRuntimeService } from './services/ai-runtime.service';
import { OllamaProvider } from './providers/ollama.provider';

@Module({
  controllers: [AIController],
  providers: [
    AIService,
    AIRuntimeService,
    OllamaProvider,
  ],
  exports: [AIService, AIRuntimeService, OllamaProvider],
})
export class AIModule {}
