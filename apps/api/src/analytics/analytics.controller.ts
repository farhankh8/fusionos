/**
 * FusionOS Analytics Controller
 *
 * REST API for Enterprise Analytics & Business Intelligence.
 * All endpoints enforce authentication, tenant isolation, and RBAC.
 */

import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { CurrentTenant, RequirePermission } from '../common/decorators';
import type { TenantContext } from '../auth/services/tenant-context.service';
import { AnalyticsService } from './services/analytics.service';
import { AnalyticsFilterDto, SavedReportDto, UpdateReportDto, ExportDto } from './dto/analytics.dto';

@Controller('analytics') // global prefix 'api/v1' applies — do NOT repeat it here
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @RequirePermission('analytics:read')
  async getDashboard(@CurrentTenant() ctx: TenantContext, @Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getDashboard(ctx, filters);
  }

  @Get('finance')
  @RequirePermission('analytics:finance:read')
  async getFinance(@CurrentTenant() ctx: TenantContext, @Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getFinanceAnalytics(ctx, filters);
  }

  @Get('workforce')
  @RequirePermission('analytics:workforce:read')
  async getWorkforce(@CurrentTenant() ctx: TenantContext, @Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getWorkforceAnalytics(ctx, filters);
  }

  @Get('attendance')
  @RequirePermission('analytics:attendance:read')
  async getAttendance(@CurrentTenant() ctx: TenantContext, @Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getAttendanceAnalytics(ctx, filters);
  }

  @Get('leave')
  @RequirePermission('analytics:leave:read')
  async getLeave(@CurrentTenant() ctx: TenantContext, @Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getLeaveAnalytics(ctx, filters);
  }

  @Get('payroll')
  @RequirePermission('analytics:payroll:read')
  async getPayroll(@CurrentTenant() ctx: TenantContext, @Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getPayrollAnalytics(ctx, filters);
  }

  @Get('crm')
  @RequirePermission('analytics:crm:read')
  async getCRM(@CurrentTenant() ctx: TenantContext, @Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getCRMAnalytics(ctx, filters);
  }

  @Get('projects')
  @RequirePermission('analytics:project:read')
  async getProjects(@CurrentTenant() ctx: TenantContext, @Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getProjectAnalytics(ctx, filters);
  }

  @Get('assets')
  @RequirePermission('analytics:asset:read')
  async getAssets(@CurrentTenant() ctx: TenantContext, @Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getAssetAnalytics(ctx, filters);
  }

  // ── Reports ────────────────────────────────────────────────────────────────

  @Get('reports')
  @RequirePermission('analytics:report:read')
  async listReports(@CurrentTenant() ctx: TenantContext) {
    return this.analyticsService.listReports(ctx);
  }

  @Post('reports')
  @RequirePermission('analytics:report:create')
  async createReport(@CurrentTenant() ctx: TenantContext, @Body() dto: SavedReportDto) {
    return this.analyticsService.createReport(ctx, dto);
  }

  @Get('reports/:id')
  @RequirePermission('analytics:report:read')
  async getReport(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.analyticsService.getReport(ctx, id);
  }

  @Patch('reports/:id')
  @RequirePermission('analytics:report:update')
  async updateReport(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateReportDto) {
    return this.analyticsService.updateReport(ctx, id, dto);
  }

  @Delete('reports/:id')
  @RequirePermission('analytics:report:delete')
  async deleteReport(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.analyticsService.deleteReport(ctx, id);
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  @Get('export')
  @RequirePermission('analytics:export')
  async exportData(@CurrentTenant() ctx: TenantContext, @Query() dto: ExportDto) {
    const { domain, format, ...filters } = dto;
    return this.analyticsService.exportData(ctx, domain || '', format || 'csv', filters as AnalyticsFilterDto);
  }
}
