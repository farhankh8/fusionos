/**
 * FusionOS AI Controller — Phase 20 Enhanced
 *
 * REST API for AI Command Center & Runtime.
 * All endpoints enforce authentication, tenant isolation, and RBAC.
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CurrentTenant, RequirePermission } from '../common/decorators';
import type { TenantContext } from '../auth/services/tenant-context.service';
import { AIService } from './services/ai.service';
import { AIRuntimeService } from './services/ai-runtime.service';
import {
  CreateConversationDto,
  SendMessageDto,
} from './dto/ai.dto';

@Controller('ai') // global prefix 'api/v1' applies — do NOT repeat it here
export class AIController {
  constructor(
    private readonly aiService: AIService,
    private readonly runtimeService: AIRuntimeService,
  ) {}

  // ── AI Runtime ─────────────────────────────────────────────────────

  @Get('runtime/status')
  @RequirePermission('ai:read')
  async getRuntimeStatus() {
    return this.runtimeService.getRuntimeStatus();
  }

  @Get('runtime/config')
  @RequirePermission('ai:admin')
  async getRuntimeConfig() {
    return this.runtimeService.getRuntimeConfig();
  }

  @Post('runtime/health')
  @RequirePermission('ai:read')
  async performHealthCheck() {
    return this.runtimeService.performHealthCheck();
  }

  @Get('runtime/models')
  @RequirePermission('ai:read')
  async listModels() {
    return this.runtimeService.listModels();
  }

  @Get('runtime/usage')
  @RequirePermission('ai:read')
  async getUsageStats() {
    return this.runtimeService.getUsageStats();
  }

  // ── Conversations ───────────────────────────────────────────────────

  @Post('conversations')
  @RequirePermission('ai:chat')
  async createConversation(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: CreateConversationDto,
  ) {
    return this.aiService.createConversation(ctx, dto.title);
  }

  @Get('conversations')
  @RequirePermission('ai:conversation:read')
  async listConversations(@CurrentTenant() ctx: TenantContext) {
    return this.aiService.listConversations(ctx);
  }

  @Get('conversations/:id')
  @RequirePermission('ai:conversation:read')
  async getConversation(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.aiService.getConversation(ctx, id);
  }

  @Delete('conversations/:id')
  @RequirePermission('ai:conversation:delete')
  async deleteConversation(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.aiService.deleteConversation(ctx, id);
  }

  // ── Query ───────────────────────────────────────────────────────────

  @Post('query')
  @RequirePermission('ai:chat')
  async processQuery(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: SendMessageDto,
  ) {
    return this.aiService.processQuery(ctx, {
      conversationId: dto.conversationId,
      message: dto.message,
    });
  }

  // ── Insights ────────────────────────────────────────────────────────

  @Get('insights')
  @RequirePermission('ai:insights:read')
  async getInsights(@CurrentTenant() ctx: TenantContext) {
    return this.aiService.getInsights(ctx);
  }

  // ── Capabilities ────────────────────────────────────────────────────

  @Get('capabilities')
  @RequirePermission('ai:read')
  async getCapabilities() {
    return this.aiService.getCapabilities();
  }

  // ── Provider Status ─────────────────────────────────────────────────

  @Get('provider/status')
  @RequirePermission('ai:read')
  async getProviderStatus() {
    return this.aiService.getProviderStatus();
  }
}
