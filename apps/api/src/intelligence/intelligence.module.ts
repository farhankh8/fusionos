/**
 * FusionOS Intelligence Module
 *
 * Provides cross-module business intelligence, orchestration, and insights.
 */

import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuditLogService } from '../common/services/audit-log.service';
import { OllamaProvider } from '../ai/providers/ollama.provider';
import { IntelligenceService } from './services/intelligence.service';
import { IntelligenceController } from './intelligence.controller';

@Module({
  controllers: [IntelligenceController],
  providers: [
    PrismaClient,
    AuditLogService,
    OllamaProvider,
    IntelligenceService,
  ],
  exports: [IntelligenceService],
})
export class IntelligenceModule {}
