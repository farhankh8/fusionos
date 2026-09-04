/**
 * FusionOS AI Agent Controller
 *
 * REST API for AI Agent platform.
 * All endpoints enforce authentication, tenant isolation, and RBAC.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CurrentTenant, RequirePermission } from '../../common/decorators';
import type { TenantContext } from '../../auth/services/tenant-context.service';
import { AgentService } from './services/agent.service';
import {
  CreateAgentDto,
  UpdateAgentDto,
  ListAgentsDto,
  CreateAgentTaskDto,
  ListAgentTasksDto,
  ApproveAgentStepDto,
} from './dto/agent.dto';

@Controller('ai/agents') // global prefix 'api/v1' applies — do NOT repeat it here
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  // ── Dashboard ───────────────────────────────────────────────────────

  @Get('dashboard')
  @RequirePermission('ai:read')
  async getDashboard(@CurrentTenant() ctx: TenantContext) {
    return this.agentService.getDashboard(ctx);
  }

  // ── Profiles ────────────────────────────────────────────────────────

  @Get('profiles')
  @RequirePermission('ai:read')
  async getProfiles() {
    return this.agentService.getProfiles();
  }

  // ── Agent CRUD ──────────────────────────────────────────────────────

  @Get()
  @RequirePermission('ai:read')
  async listAgents(
    @CurrentTenant() ctx: TenantContext,
    @Query() dto: ListAgentsDto,
  ) {
    return this.agentService.listAgents(ctx, dto);
  }

  @Post()
  @RequirePermission('ai:admin')
  async createAgent(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: CreateAgentDto,
  ) {
    return this.agentService.createAgent(ctx, dto);
  }

  @Get(':id')
  @RequirePermission('ai:read')
  async getAgent(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.agentService.getAgent(ctx, id);
  }

  @Patch(':id')
  @RequirePermission('ai:admin')
  async updateAgent(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentDto,
  ) {
    return this.agentService.updateAgent(ctx, id, dto);
  }

  @Delete(':id')
  @RequirePermission('ai:admin')
  async deleteAgent(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.agentService.deleteAgent(ctx, id);
  }

  // ── Version Management ─────────────────────────────────────────────

  @Get(':id/versions')
  @RequirePermission('ai:read')
  async getVersions(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.agentService.getVersions(ctx, id);
  }

  @Post(':id/publish')
  @RequirePermission('ai:admin')
  async publishAgent(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.agentService.publishAgent(ctx, id);
  }

  @Post(':id/pause')
  @RequirePermission('ai:admin')
  async pauseAgent(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.agentService.pauseAgent(ctx, id);
  }

  @Post(':id/resume')
  @RequirePermission('ai:admin')
  async resumeAgent(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.agentService.resumeAgent(ctx, id);
  }

  // ── Tasks ──────────────────────────────────────────────────────────

  @Post(':id/tasks')
  @RequirePermission('ai:tools:use')
  async createTask(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAgentTaskDto,
  ) {
    return this.agentService.createTask(ctx, id, dto);
  }

  @Get(':id/tasks')
  @RequirePermission('ai:read')
  async listTasks(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() dto: ListAgentTasksDto,
  ) {
    return this.agentService.listTasks(ctx, id, dto);
  }

  // ── Task Execution ─────────────────────────────────────────────────

  @Post('tasks/:taskId/execute')
  @RequirePermission('ai:tools:use')
  async executeTask(
    @CurrentTenant() ctx: TenantContext,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.agentService.executeTask(ctx, taskId);
  }

  @Get('tasks/:taskId')
  @RequirePermission('ai:read')
  async getTask(
    @CurrentTenant() ctx: TenantContext,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.agentService.getTask(ctx, taskId);
  }

  @Post('tasks/:taskId/cancel')
  @RequirePermission('ai:tools:use')
  async cancelTask(
    @CurrentTenant() ctx: TenantContext,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.agentService.cancelTask(ctx, taskId);
  }

  // ── Approval ───────────────────────────────────────────────────────

  @Post('steps/:stepId/approve')
  @RequirePermission('ai:tools:use')
  async approveStep(
    @CurrentTenant() ctx: TenantContext,
    @Param('stepId', ParseUUIDPipe) stepId: string,
    @Body() dto: ApproveAgentStepDto,
  ) {
    return this.agentService.approveStep(ctx, stepId, dto.comment);
  }

  @Post('steps/:stepId/reject')
  @RequirePermission('ai:tools:use')
  async rejectStep(
    @CurrentTenant() ctx: TenantContext,
    @Param('stepId', ParseUUIDPipe) stepId: string,
    @Body() dto: ApproveAgentStepDto,
  ) {
    return this.agentService.rejectStep(ctx, stepId, dto.comment);
  }

  // ── Memory ─────────────────────────────────────────────────────────

  @Get('tasks/:taskId/memory')
  @RequirePermission('ai:read')
  async getTaskMemory(
    @CurrentTenant() ctx: TenantContext,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.agentService.getTaskMemory(ctx, taskId);
  }
}
