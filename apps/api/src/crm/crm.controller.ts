/**
 * FusionOS CRM Controller
 * REST endpoints for the complete CRM system.
 */

import {
  Controller, Get, Post, Patch, Param, Body, Query,
  ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { CurrentTenant, RequirePermission } from '../common/decorators';
import type { TenantContext } from '../auth/services/tenant-context.service';
import { CrmService } from './services/crm.service';
import {
  CreateCustomerProfileDto, UpdateCustomerProfileDto,
  CreateContactDto, UpdateContactDto,
  CreateLeadDto, UpdateLeadDto, QualifyLeadDto, ConvertLeadDto, DisqualifyLeadDto,
  CreateOpportunityDto, UpdateOpportunityDto,
  CreateActivityDto, CreateTaskDto, UpdateTaskDto,
  CreateNoteDto, UpdateNoteDto,
} from './dto/crm.dto';

@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  // ── Dashboard ─────────────────────────────────────────────────────────

  @Get('dashboard')
  @RequirePermission('crm:read')
  async getDashboard(@CurrentTenant() ctx: TenantContext, @Query('companyId') companyId: string) {
    return this.crmService.getDashboard(ctx, companyId);
  }

  @Get('pipeline')
  @RequirePermission('crm:read')
  async getPipeline(@CurrentTenant() ctx: TenantContext, @Query('companyId') companyId: string) {
    return this.crmService.getPipeline(ctx, companyId);
  }

  // ── Customer Profiles ─────────────────────────────────────────────────

  @Post('customer-profiles')
  @RequirePermission('crm.customer:create')
  @HttpCode(HttpStatus.CREATED)
  async createCustomerProfile(@CurrentTenant() ctx: TenantContext, @Body() dto: CreateCustomerProfileDto) {
    return this.crmService.createCustomerProfile(ctx, dto);
  }

  @Get('customer-profiles')
  @RequirePermission('crm.customer:read')
  async listCustomerProfiles(
    @CurrentTenant() ctx: TenantContext,
    @Query('companyId') companyId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.crmService.listCustomerProfiles(ctx, companyId, {
      status, search, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('customer-profiles/:id')
  @RequirePermission('crm.customer:read')
  async getCustomerProfile(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.crmService.getCustomerProfile(ctx, id);
  }

  @Patch('customer-profiles/:id')
  @RequirePermission('crm.customer:update')
  async updateCustomerProfile(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return this.crmService.updateCustomerProfile(ctx, id, dto);
  }

  // ── Contacts ──────────────────────────────────────────────────────────

  @Post('contacts')
  @RequirePermission('crm.contact:create')
  @HttpCode(HttpStatus.CREATED)
  async createContact(@CurrentTenant() ctx: TenantContext, @Body() dto: CreateContactDto) {
    return this.crmService.createContact(ctx, dto);
  }

  @Get('contacts')
  @RequirePermission('crm.contact:read')
  async listContacts(
    @CurrentTenant() ctx: TenantContext,
    @Query('customerProfileId') customerProfileId: string,
  ) {
    return this.crmService.listContacts(ctx, customerProfileId);
  }

  @Get('contacts/:id')
  @RequirePermission('crm.contact:read')
  async getContact(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.crmService.getContact(ctx, id);
  }

  @Patch('contacts/:id')
  @RequirePermission('crm.contact:update')
  async updateContact(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.crmService.updateContact(ctx, id, dto);
  }

  // ── Leads ─────────────────────────────────────────────────────────────

  @Post('leads')
  @RequirePermission('crm.lead:create')
  @HttpCode(HttpStatus.CREATED)
  async createLead(@CurrentTenant() ctx: TenantContext, @Body() dto: CreateLeadDto) {
    return this.crmService.createLead(ctx, dto);
  }

  @Get('leads')
  @RequirePermission('crm.lead:read')
  async listLeads(
    @CurrentTenant() ctx: TenantContext,
    @Query('companyId') companyId: string,
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('ownerId') ownerId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.crmService.listLeads(ctx, companyId, {
      status, source, ownerId, search,
      page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('leads/:id')
  @RequirePermission('crm.lead:read')
  async getLead(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.crmService.getLead(ctx, id);
  }

  @Patch('leads/:id')
  @RequirePermission('crm.lead:update')
  async updateLead(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.crmService.updateLead(ctx, id, dto);
  }

  @Patch('leads/:id/qualify')
  @RequirePermission('crm.lead:convert')
  async qualifyLead(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: QualifyLeadDto,
  ) {
    return this.crmService.qualifyLead(ctx, id, dto);
  }

  @Patch('leads/:id/convert')
  @RequirePermission('crm.lead:convert')
  async convertLead(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertLeadDto,
  ) {
    return this.crmService.convertLead(ctx, id, dto);
  }

  @Patch('leads/:id/disqualify')
  @RequirePermission('crm.lead:convert')
  async disqualifyLead(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DisqualifyLeadDto,
  ) {
    return this.crmService.disqualifyLead(ctx, id, dto);
  }

  // ── Opportunities ─────────────────────────────────────────────────────

  @Post('opportunities')
  @RequirePermission('crm.opportunity:create')
  @HttpCode(HttpStatus.CREATED)
  async createOpportunity(@CurrentTenant() ctx: TenantContext, @Body() dto: CreateOpportunityDto) {
    return this.crmService.createOpportunity(ctx, dto);
  }

  @Get('opportunities')
  @RequirePermission('crm.opportunity:read')
  async listOpportunities(
    @CurrentTenant() ctx: TenantContext,
    @Query('companyId') companyId: string,
    @Query('stage') stage?: string,
    @Query('status') status?: string,
    @Query('ownerId') ownerId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.crmService.listOpportunities(ctx, companyId, {
      stage, status, ownerId,
      page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('opportunities/:id')
  @RequirePermission('crm.opportunity:read')
  async getOpportunity(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.crmService.getOpportunity(ctx, id);
  }

  @Patch('opportunities/:id')
  @RequirePermission('crm.opportunity:update')
  async updateOpportunity(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOpportunityDto,
  ) {
    return this.crmService.updateOpportunity(ctx, id, dto);
  }

  @Patch('opportunities/:id/stage')
  @RequirePermission('crm.opportunity:update')
  async changeStage(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('stage') stage: string,
  ) {
    return this.crmService.changeOpportunityStage(ctx, id, stage);
  }

  // ── Activities ────────────────────────────────────────────────────────

  @Post('activities')
  @RequirePermission('crm.activity:create')
  @HttpCode(HttpStatus.CREATED)
  async createActivity(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: CreateActivityDto,
  ) {
    // Actor is derived from auth context — use a placeholder for now
    return this.crmService.createActivity(ctx, dto, ctx.userId);
  }

  @Get('activities')
  @RequirePermission('crm.activity:read')
  async listActivities(
    @CurrentTenant() ctx: TenantContext,
    @Query('companyId') companyId: string,
    @Query('customerProfileId') customerProfileId?: string,
    @Query('leadId') leadId?: string,
    @Query('opportunityId') opportunityId?: string,
    @Query('activityType') activityType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.crmService.listActivities(ctx, companyId, {
      customerProfileId, leadId, opportunityId, activityType,
      page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20,
    });
  }

  // ── Tasks ─────────────────────────────────────────────────────────────

  @Post('tasks')
  @RequirePermission('crm.task:create')
  @HttpCode(HttpStatus.CREATED)
  async createTask(@CurrentTenant() ctx: TenantContext, @Body() dto: CreateTaskDto) {
    return this.crmService.createTask(ctx, dto);
  }

  @Get('tasks')
  @RequirePermission('crm.task:read')
  async listTasks(
    @CurrentTenant() ctx: TenantContext,
    @Query('companyId') companyId: string,
    @Query('status') status?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('customerProfileId') customerProfileId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.crmService.listTasks(ctx, companyId, {
      status, assigneeId, customerProfileId,
      page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20,
    });
  }

  @Patch('tasks/:id')
  @RequirePermission('crm.task:update')
  async updateTask(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.crmService.updateTask(ctx, id, dto);
  }

  // ── Notes ─────────────────────────────────────────────────────────────

  @Post('notes')
  @RequirePermission('crm.activity:create')
  @HttpCode(HttpStatus.CREATED)
  async createNote(@CurrentTenant() ctx: TenantContext, @Body() dto: CreateNoteDto) {
    return this.crmService.createNote(ctx, dto, ctx.userId);
  }

  @Get('notes')
  @RequirePermission('crm:read')
  async listNotes(
    @CurrentTenant() ctx: TenantContext,
    @Query('customerProfileId') customerProfileId?: string,
    @Query('leadId') leadId?: string,
    @Query('opportunityId') opportunityId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.crmService.listNotes(ctx, {
      customerProfileId, leadId, opportunityId,
      page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20,
    });
  }

  @Patch('notes/:id')
  @RequirePermission('crm.activity:create')
  async updateNote(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.crmService.updateNote(ctx, id, dto, ctx.userId);
  }
}
