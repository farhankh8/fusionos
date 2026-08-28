/**
 * FusionOS Attendance Controller
 *
 * REST endpoints for attendance operations:
 * - Clock in/out
 * - Break start/end
 * - Today's attendance
 * - Attendance history with filters
 * - Corrections (create, review)
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
import { AttendanceService } from './services/attendance.service';
import {
  ClockInDto,
  ClockOutDto,
  BreakStartDto,
  BreakEndDto,
  CreateCorrectionDto,
  ReviewCorrectionDto,
} from './dto/attendance.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // ── Clock In / Out ──────────────────────────────────────────────────────

  @Post('clock-in')
  @RequirePermission('attendance:create')
  @HttpCode(HttpStatus.CREATED)
  async clockIn(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: ClockInDto,
  ) {
    return this.attendanceService.clockIn(ctx, dto);
  }

  @Post('clock-out')
  @RequirePermission('attendance:create')
  @HttpCode(HttpStatus.OK)
  async clockOut(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: ClockOutDto,
  ) {
    return this.attendanceService.clockOut(ctx, dto);
  }

  // ── Breaks ──────────────────────────────────────────────────────────────

  @Post('break-start')
  @RequirePermission('attendance:create')
  @HttpCode(HttpStatus.CREATED)
  async breakStart(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: BreakStartDto,
  ) {
    return this.attendanceService.breakStart(ctx, dto);
  }

  @Post('break-end')
  @RequirePermission('attendance:create')
  @HttpCode(HttpStatus.OK)
  async breakEnd(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: BreakEndDto,
  ) {
    return this.attendanceService.breakEnd(ctx, dto);
  }

  // ── Today's Attendance ──────────────────────────────────────────────────

  @Get('today')
  @RequirePermission('attendance:read')
  async getToday(
    @CurrentTenant() ctx: TenantContext,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.attendanceService.getToday(ctx, employeeId);
  }

  // ── List / History ──────────────────────────────────────────────────────

  @Get()
  @RequirePermission('attendance:read')
  async list(
    @CurrentTenant() ctx: TenantContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('employeeId') employeeId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
    @Query('recordStatus') recordStatus?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.attendanceService.findAll(ctx, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      employeeId, departmentId, branchId,
      status, recordStatus, startDate, endDate,
      sortBy, sortOrder,
    });
  }

  @Get(':id')
  @RequirePermission('attendance:read')
  async getOne(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.attendanceService.findOne(ctx, id);
  }

  // ── Corrections ─────────────────────────────────────────────────────────

  @Post('corrections')
  @RequirePermission('attendance:correct')
  @HttpCode(HttpStatus.CREATED)
  async createCorrection(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: CreateCorrectionDto,
  ) {
    return this.attendanceService.createCorrection(ctx, dto);
  }

  @Get('corrections/list')
  @RequirePermission('attendance:read')
  async listCorrections(
    @CurrentTenant() ctx: TenantContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.attendanceService.listCorrections(ctx, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status, employeeId,
    });
  }

  @Patch('corrections/:id/review')
  @RequirePermission('attendance:approve')
  @HttpCode(HttpStatus.OK)
  async reviewCorrection(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewCorrectionDto,
  ) {
    return this.attendanceService.reviewCorrection(ctx, id, dto);
  }
}
