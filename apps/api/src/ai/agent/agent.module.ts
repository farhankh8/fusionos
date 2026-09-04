/**
 * FusionOS AI Agent Module
 *
 * Provides AI agent capabilities: lifecycle, execution, planning,
 * risk assessment, policy enforcement, and verification.
 */

import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuditLogService } from '../../common/services/audit-log.service';
import { OllamaProvider } from '../providers/ollama.provider';
import { AgentService } from './services/agent.service';
import { AgentController } from './agent.controller';

@Module({
  controllers: [AgentController],
  providers: [
    PrismaClient,
    AuditLogService,
    OllamaProvider,
    AgentService,
  ],
  exports: [AgentService],
})
export class AgentModule {}
