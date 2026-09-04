/**
 * FusionOS Projects Controller
 * REST endpoints for the complete Project Management system.
 */

import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { CurrentTenant, RequirePermission } from '../common/decorators';
import type { TenantContext } from '../auth/services/tenant-context.service';
import { ProjectsService } from './services/projects.service';
import {
  CreateProjectDto, UpdateProjectDto, TransitionProjectDto,
  AddProjectMemberDto, UpdateProjectMemberDto,
  CreateProjectTaskDto, UpdateProjectTaskDto,
  CreateMilestoneDto, UpdateMilestoneDto,
  CreateTimeEntryDto, UpdateTimeEntryDto,
  CreateBudgetDto,
} from './dto/projects.dto';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // ── Dashboard ─────────────────────────────────────────────────────────

  @Get('dashboard')
  @RequirePermission('project:read')
  async getDashboard(@CurrentTenant() ctx: TenantContext, @Query('companyId') companyId?: string) {
    return this.projectsService.getDashboard(ctx, companyId || '');
  }

  // ── Projects CRUD ─────────────────────────────────────────────────────

  @Get()
  @RequirePermission('project:read')
  async listProjects(
    @CurrentTenant() ctx: TenantContext,
    @Query('companyId') companyId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('projectManagerId') projectManagerId?: string,
    @Query('customerId') customerId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.projectsService.listProjects(ctx, companyId || '', {
      status, search, projectManagerId, customerId,
      page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20,
    });
  }

  @Post()
  @RequirePermission('project:create')
  @HttpCode(HttpStatus.CREATED)
  async createProject(@CurrentTenant() ctx: TenantContext, @Body() dto: CreateProjectDto) {
    return this.projectsService.createProject(ctx, dto);
  }

  @Get(':id')
  @RequirePermission('project:read')
  async getProject(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.getProject(ctx, id);
  }

  @Patch(':id')
  @RequirePermission('project:update')
  async updateProject(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.updateProject(ctx, id, dto);
  }

  @Post(':id/transition')
  @RequirePermission('project:update')
  async transitionProject(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionProjectDto,
  ) {
    return this.projectsService.transitionProject(ctx, id, dto);
  }

  // ── Members ───────────────────────────────────────────────────────────

  @Get(':id/members')
  @RequirePermission('project.member:read')
  async listMembers(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.listMembers(ctx, id);
  }

  @Post(':id/members')
  @RequirePermission('project.member:create')
  @HttpCode(HttpStatus.CREATED)
  async addMember(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddProjectMemberDto,
  ) {
    return this.projectsService.addMember(ctx, id, dto);
  }

  @Patch(':id/members/:memberId')
  @RequirePermission('project.member:update')
  async updateMember(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateProjectMemberDto,
  ) {
    return this.projectsService.updateMember(ctx, id, memberId, dto);
  }

  @Delete(':id/members/:memberId')
  @RequirePermission('project.member:remove')
  @HttpCode(HttpStatus.OK)
  async removeMember(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.projectsService.removeMember(ctx, id, memberId);
  }

  // ── Tasks ─────────────────────────────────────────────────────────────

  @Get(':id/tasks')
  @RequirePermission('project.task:read')
  async listTasks(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.projectsService.listTasks(ctx, id, {
      status, priority, assigneeId,
      page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 50,
    });
  }

  @Post(':id/tasks')
  @RequirePermission('project.task:create')
  @HttpCode(HttpStatus.CREATED)
  async createTask(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProjectTaskDto,
  ) {
    return this.projectsService.createTask(ctx, id, dto);
  }

  @Patch(':id/tasks/:taskId')
  @RequirePermission('project.task:update')
  async updateTask(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateProjectTaskDto,
  ) {
    return this.projectsService.updateTask(ctx, id, taskId, dto);
  }

  // ── Milestones ────────────────────────────────────────────────────────

  @Get(':id/milestones')
  @RequirePermission('project.milestone:read')
  async listMilestones(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.listMilestones(ctx, id);
  }

  @Post(':id/milestones')
  @RequirePermission('project.milestone:create')
  @HttpCode(HttpStatus.CREATED)
  async createMilestone(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.projectsService.createMilestone(ctx, id, dto);
  }

  @Patch(':id/milestones/:milestoneId')
  @RequirePermission('project.milestone:update')
  async updateMilestone(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.projectsService.updateMilestone(ctx, id, milestoneId, dto);
  }

  // ── Time Entries ──────────────────────────────────────────────────────

  @Get(':id/time')
  @RequirePermission('project.time:read')
  async listTimeEntries(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('employeeId') employeeId?: string,
    @Query('taskId') taskId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.projectsService.listTimeEntries(ctx, id, {
      employeeId, taskId,
      page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 50,
    });
  }

  @Post(':id/time')
  @RequirePermission('project.time:create')
  @HttpCode(HttpStatus.CREATED)
  async createTimeEntry(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTimeEntryDto,
  ) {
    return this.projectsService.createTimeEntry(ctx, id, dto);
  }

  @Patch(':id/time/:entryId')
  @RequirePermission('project.time:update')
  async updateTimeEntry(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: UpdateTimeEntryDto,
  ) {
    return this.projectsService.updateTimeEntry(ctx, id, entryId, dto);
  }

  // ── Activities ────────────────────────────────────────────────────────

  @Get(':id/activities')
  @RequirePermission('project:read')
  async listActivities(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.projectsService.listActivities(ctx, id, {
      page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 50,
    });
  }

  // ── Budget ────────────────────────────────────────────────────────────

  @Get(':id/budget')
  @RequirePermission('project.budget:read')
  async getBudget(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.getBudget(ctx, id);
  }

  @Post(':id/budget')
  @RequirePermission('project.budget:create')
  @HttpCode(HttpStatus.CREATED)
  async upsertBudget(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBudgetDto,
  ) {
    return this.projectsService.upsertBudget(ctx, id, dto);
  }
}
