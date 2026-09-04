/**
 * FusionOS Automation Controller
 *
 * REST API for Enterprise Automation & Workflow Engine.
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
import { CurrentTenant, RequirePermission } from '../common/decorators';
import type { TenantContext } from '../auth/services/tenant-context.service';
import { AutomationService } from './services/automation.service';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  ListWorkflowsDto,
  SaveVersionConfigDto,
  ListExecutionsDto,
  ApproveRejectDto,
} from './dto/automation.dto';

@Controller('automation') // global prefix 'api/v1' applies — do NOT repeat it here
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  // ── Dashboard ───────────────────────────────────────────────────────────

  @Get('dashboard')
  @RequirePermission('automation:read')
  async getDashboard(@CurrentTenant() ctx: TenantContext) {
    return this.automationService.getDashboard(ctx);
  }

  // ── Workflows ───────────────────────────────────────────────────────────

  @Get('workflows')
  @RequirePermission('automation:read')
  async listWorkflows(
    @CurrentTenant() ctx: TenantContext,
    @Query() dto: ListWorkflowsDto,
  ) {
    return this.automationService.listWorkflows(ctx, dto);
  }

  @Post('workflows')
  @RequirePermission('automation:create')
  async createWorkflow(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: CreateWorkflowDto,
  ) {
    return this.automationService.createWorkflow(ctx, dto);
  }

  @Get('workflows/:id')
  @RequirePermission('automation:read')
  async getWorkflow(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.automationService.getWorkflow(ctx, id);
  }

  @Patch('workflows/:id')
  @RequirePermission('automation:update')
  async updateWorkflow(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkflowDto,
  ) {
    return this.automationService.updateWorkflow(ctx, id, dto);
  }

  @Delete('workflows/:id')
  @RequirePermission('automation:delete')
  async deleteWorkflow(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.automationService.deleteWorkflow(ctx, id);
  }

  // ── Workflow Lifecycle ───────────────────────────────────────────────────

  @Post('workflows/:id/publish')
  @RequirePermission('automation:publish')
  async publishWorkflow(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.automationService.publishWorkflow(ctx, id);
  }

  @Post('workflows/:id/pause')
  @RequirePermission('automation:pause')
  async pauseWorkflow(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.automationService.pauseWorkflow(ctx, id);
  }

  @Post('workflows/:id/resume')
  @RequirePermission('automation:pause')
  async resumeWorkflow(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.automationService.resumeWorkflow(ctx, id);
  }

  @Post('workflows/:id/archive')
  @RequirePermission('automation:delete')
  async archiveWorkflow(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.automationService.archiveWorkflow(ctx, id);
  }

  // ── Version Management ───────────────────────────────────────────────────

  @Post('workflows/:id/versions/config')
  @RequirePermission('automation:update')
  async saveVersionConfig(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveVersionConfigDto,
  ) {
    return this.automationService.saveVersionConfig(ctx, id, dto);
  }

  @Get('workflows/:id/versions')
  @RequirePermission('automation:read')
  async getVersions(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.automationService.getVersions(ctx, id);
  }

  @Post('workflows/:id/validate')
  @RequirePermission('automation:read')
  async validateWorkflow(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.automationService.validateWorkflow(ctx, id);
  }

  // ── Executions ───────────────────────────────────────────────────────────

  @Get('executions')
  @RequirePermission('automation:execution:read')
  async listExecutions(
    @CurrentTenant() ctx: TenantContext,
    @Query() dto: ListExecutionsDto,
  ) {
    return this.automationService.listExecutions(ctx, dto);
  }

  @Get('executions/:id')
  @RequirePermission('automation:execution:read')
  async getExecution(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.automationService.getExecution(ctx, id);
  }

  @Post('executions/:id/retry')
  @RequirePermission('automation:execution:retry')
  async retryExecution(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.automationService.retryExecution(ctx, id);
  }

  @Post('executions/:id/cancel')
  @RequirePermission('automation:execution:cancel')
  async cancelExecution(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.automationService.cancelExecution(ctx, id);
  }

  // ── Approvals ────────────────────────────────────────────────────────────

  @Get('approvals')
  @RequirePermission('automation:execution:read')
  async listPendingApprovals(@CurrentTenant() ctx: TenantContext) {
    return this.automationService.listPendingApprovals(ctx);
  }

  @Post('approvals/:id/approve')
  @RequirePermission('automation:execute')
  async approveRequest(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveRejectDto,
  ) {
    return this.automationService.approveRequest(ctx, id, dto);
  }

  @Post('approvals/:id/reject')
  @RequirePermission('automation:execute')
  async rejectRequest(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveRejectDto,
  ) {
    return this.automationService.rejectRequest(ctx, id, dto);
  }

  // ── Registry (read-only) ─────────────────────────────────────────────────

  @Get('triggers')
  @RequirePermission('automation:read')
  getTriggerRegistry() {
    return this.automationService.getTriggerRegistry();
  }

  @Get('actions')
  @RequirePermission('automation:read')
  getActionTypes() {
    return this.automationService.getActionTypes();
  }
}
