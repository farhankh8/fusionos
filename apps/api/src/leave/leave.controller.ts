/**
 * FusionOS Leave Controller
 *
 * REST endpoints for leave management:
 * - Leave types (CRUD)
 * - Leave policies (CRUD)
 * - Leave balances (read, adjust)
 * - Leave requests (CRUD, submit, approve, reject, cancel)
 * - Holidays (CRUD)
 * - Leave calendar
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentTenant, RequirePermission } from '../common/decorators';
import type { TenantContext } from '../auth/services/tenant-context.service';
import { LeaveService } from './services/leave.service';
import {
  CreateLeaveTypeDto,
  UpdateLeaveTypeDto,
  CreateLeavePolicyDto,
  UpdateLeavePolicyDto,
  CreateLeaveRequestDto,
  ReviewLeaveRequestDto,
  CancelLeaveRequestDto,
  CreateHolidayDto,
  UpdateHolidayDto,
  AdjustBalanceDto,
} from './dto/leave.dto';

@Controller('leave')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  // ── Leave Types ───────────────────────────────────────────────────────────

  @Post('types')
  @RequirePermission('leave.type:manage')
  @HttpCode(HttpStatus.CREATED)
  async createLeaveType(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: CreateLeaveTypeDto,
  ) {
    return this.leaveService.createLeaveType(ctx, dto);
  }

  @Get('types')
  @RequirePermission('leave.type:read')
  async listLeaveTypes(@CurrentTenant() ctx: TenantContext) {
    return this.leaveService.findAllLeaveTypes(ctx);
  }

  @Get('types/:id')
  @RequirePermission('leave.type:read')
  async getLeaveType(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leaveService.findOneLeaveType(ctx, id);
  }

  @Patch('types/:id')
  @RequirePermission('leave.type:manage')
  async updateLeaveType(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeaveTypeDto,
  ) {
    return this.leaveService.updateLeaveType(ctx, id, dto);
  }

  // ── Leave Policies ────────────────────────────────────────────────────────

  @Post('policies')
  @RequirePermission('leave.policy:manage')
  @HttpCode(HttpStatus.CREATED)
  async createLeavePolicy(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: CreateLeavePolicyDto,
  ) {
    return this.leaveService.createLeavePolicy(ctx, dto);
  }

  @Get('policies')
  @RequirePermission('leave.policy:read')
  async listLeavePolicies(@CurrentTenant() ctx: TenantContext) {
    return this.leaveService.findAllLeavePolicies(ctx);
  }

  @Get('policies/:id')
  @RequirePermission('leave.policy:read')
  async getLeavePolicy(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leaveService.findOneLeavePolicy(ctx, id);
  }

  @Patch('policies/:id')
  @RequirePermission('leave.policy:manage')
  async updateLeavePolicy(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeavePolicyDto,
  ) {
    return this.leaveService.updateLeavePolicy(ctx, id, dto);
  }

  // ── Leave Balances ────────────────────────────────────────────────────────

  @Get('balances')
  @RequirePermission('leave.balance:read')
  async listBalances(
    @CurrentTenant() ctx: TenantContext,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.leaveService.getBalances(ctx, employeeId);
  }

  @Post('balances/adjust')
  @RequirePermission('leave.balance:adjust')
  @HttpCode(HttpStatus.OK)
  async adjustBalance(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: AdjustBalanceDto,
  ) {
    return this.leaveService.adjustBalance(ctx, dto);
  }

  // ── Leave Requests ────────────────────────────────────────────────────────

  @Post('requests')
  @RequirePermission('leave:create')
  @HttpCode(HttpStatus.CREATED)
  async createLeaveRequest(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: CreateLeaveRequestDto,
  ) {
    return this.leaveService.createLeaveRequest(ctx, dto);
  }

  @Get('requests')
  @RequirePermission('leave:read')
  async listLeaveRequests(
    @CurrentTenant() ctx: TenantContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('leaveTypeId') leaveTypeId?: string,
  ) {
    return this.leaveService.findAllLeaveRequests(ctx, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      employeeId, status, startDate, endDate, leaveTypeId,
    });
  }

  @Get('requests/:id')
  @RequirePermission('leave:read')
  async getLeaveRequest(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leaveService.findOneLeaveRequest(ctx, id);
  }

  @Post('requests/:id/submit')
  @RequirePermission('leave:submit')
  @HttpCode(HttpStatus.OK)
  async submitLeaveRequest(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leaveService.submitLeaveRequest(ctx, id);
  }

  @Post('requests/:id/approve')
  @RequirePermission('leave:approve')
  @HttpCode(HttpStatus.OK)
  async approveLeaveRequest(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewLeaveRequestDto,
  ) {
    return this.leaveService.approveLeaveRequest(ctx, id, dto);
  }

  @Post('requests/:id/reject')
  @RequirePermission('leave:reject')
  @HttpCode(HttpStatus.OK)
  async rejectLeaveRequest(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewLeaveRequestDto,
  ) {
    return this.leaveService.rejectLeaveRequest(ctx, id, dto);
  }

  @Post('requests/:id/cancel')
  @RequirePermission('leave:cancel')
  @HttpCode(HttpStatus.OK)
  async cancelLeaveRequest(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelLeaveRequestDto,
  ) {
    return this.leaveService.cancelLeaveRequest(ctx, id, dto);
  }

  // ── Holidays ──────────────────────────────────────────────────────────────

  @Post('holidays')
  @RequirePermission('leave:manage')
  @HttpCode(HttpStatus.CREATED)
  async createHoliday(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: CreateHolidayDto,
  ) {
    return this.leaveService.createHoliday(ctx, dto);
  }

  @Get('holidays')
  @RequirePermission('leave:read')
  async listHolidays(
    @CurrentTenant() ctx: TenantContext,
    @Query('year') year?: string,
  ) {
    return this.leaveService.findAllHolidays(ctx, year ? parseInt(year, 10) : undefined);
  }

  @Patch('holidays/:id')
  @RequirePermission('leave:manage')
  async updateHoliday(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHolidayDto,
  ) {
    return this.leaveService.updateHoliday(ctx, id, dto);
  }

  // ── Calendar ──────────────────────────────────────────────────────────────

  @Get('calendar')
  @RequirePermission('leave:read')
  async getCalendar(
    @CurrentTenant() ctx: TenantContext,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.leaveService.getLeaveCalendar(ctx, parseInt(year, 10), parseInt(month, 10));
  }
}