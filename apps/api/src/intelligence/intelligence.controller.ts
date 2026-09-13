/**
 * FusionOS Intelligence Controller
 *
 * REST API for cross-module business intelligence.
 * All endpoints enforce authentication, tenant isolation, and RBAC.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
} from '@nestjs/common';
import { CurrentTenant, RequirePermission } from '../common/decorators';
import type { TenantContext } from '../auth/services/tenant-context.service';
import { IntelligenceService } from './services/intelligence.service';
import { ExecuteScenarioDto } from './dto/intelligence.dto';

@Controller('intelligence') // global prefix 'api/v1' applies — do NOT repeat it here
export class IntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  // ── Business Health ─────────────────────────────────────────────────

  @Get('business-health')
  @RequirePermission('ai:read')
  async getBusinessHealth(@CurrentTenant() ctx: TenantContext) {
    return this.intelligenceService.getBusinessHealth(ctx);
  }

  // ── Insights ────────────────────────────────────────────────────────

  @Get('insights')
  @RequirePermission('ai:insights:read')
  async getInsights(@CurrentTenant() ctx: TenantContext) {
    return this.intelligenceService.getInsights(ctx);
  }

  // ── Scenarios ───────────────────────────────────────────────────────

  @Get('scenarios')
  @RequirePermission('ai:read')
  async getScenarios() {
    return this.intelligenceService.getScenarios();
  }

  @Get('scenarios/categories')
  @RequirePermission('ai:read')
  async getScenarioCategories() {
    return this.intelligenceService.getScenarioCategories();
  }

  @Get('scenarios/:id')
  @RequirePermission('ai:read')
  async getScenario(@Param('id') id: string) {
    return this.intelligenceService.getScenarioById(id);
  }

  @Get('scenarios/event/:eventType')
  @RequirePermission('ai:read')
  async getScenariosForEvent(@Param('eventType') eventType: string) {
    return this.intelligenceService.getScenariosForEvent(eventType);
  }

  // ── Scenario Execution ──────────────────────────────────────────────

  @Post('scenarios/:id/execute')
  @RequirePermission('ai:tools:use')
  async executeScenario(
    @CurrentTenant() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: ExecuteScenarioDto,
  ) {
    return this.intelligenceService.executeScenarioManually(ctx, id, dto.entityType, dto.entityId);
  }

  @Get('executions')
  @RequirePermission('ai:read')
  async listExecutions(@CurrentTenant() ctx: TenantContext) {
    return this.intelligenceService.listExecutions(ctx.tenantId);
  }

  @Get('executions/:id')
  @RequirePermission('ai:read')
  async getExecution(@Param('id') id: string) {
    return this.intelligenceService.getExecution(id);
  }
}
