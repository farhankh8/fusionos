/**
 * FusionOS Payroll Controller
 *
 * REST endpoints for payroll management:
 * - Policies (CRUD)
 * - Components (CRUD)
 * - Salary Structures (CRUD)
 * - Periods (CRUD, status transitions)
 * - Runs (CRUD, calculate, approve, finalize)
 * - Lines (read)
 * - Adjustments (CRUD, approve/reject)
 * - Payslips (read)
 * - Dashboard
 */

import {
  Controller, Get, Post, Patch, Param, Body, Query, ParseUUIDPipe,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { CurrentTenant, RequirePermission } from '../common/decorators';
import type { TenantContext } from '../auth/services/tenant-context.service';
import { PayrollService } from './services/payroll.service';
import {
  CreatePayrollPolicyDto, UpdatePayrollPolicyDto,
  CreatePayrollComponentDto, UpdatePayrollComponentDto,
  CreateSalaryStructureDto, UpdateSalaryStructureDto,
  CreatePayrollPeriodDto, UpdatePayrollPeriodDto,
  CreatePayrollRunDto,
  CreatePayrollAdjustmentDto, ReviewPayrollAdjustmentDto,
} from './dto/payroll.dto';

@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  // ── Dashboard ─────────────────────────────────────────────────────────────

  @Get('dashboard')
  @RequirePermission('payroll:read')
  async getDashboard(@CurrentTenant() ctx: TenantContext) {
    return this.payrollService.getDashboard(ctx);
  }

  // ── Policies ──────────────────────────────────────────────────────────────

  @Post('policies')
  @RequirePermission('payroll:manage')
  @HttpCode(HttpStatus.CREATED)
  async createPolicy(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: CreatePayrollPolicyDto,
  ) {
    return this.payrollService.createPolicy(ctx, dto);
  }

  @Get('policies')
  @RequirePermission('payroll:read')
  async listPolicies(@CurrentTenant() ctx: TenantContext) {
    return this.payrollService.findAllPolicies(ctx);
  }

  @Get('policies/:id')
  @RequirePermission('payroll:read')
  async getPolicy(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.findOnePolicy(ctx, id);
  }

  @Patch('policies/:id')
  @RequirePermission('payroll:manage')
  async updatePolicy(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePayrollPolicyDto,
  ) {
    return this.payrollService.updatePolicy(ctx, id, dto);
  }

  // ── Components ────────────────────────────────────────────────────────────

  @Post('components')
  @RequirePermission('payroll:manage')
  @HttpCode(HttpStatus.CREATED)
  async createComponent(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: CreatePayrollComponentDto,
  ) {
    return this.payrollService.createComponent(ctx, dto);
  }

  @Get('components')
  @RequirePermission('payroll:read')
  async listComponents(@CurrentTenant() ctx: TenantContext) {
    return this.payrollService.findAllComponents(ctx);
  }

  @Get('components/:id')
  @RequirePermission('payroll:read')
  async getComponent(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.findOneComponent(ctx, id);
  }

  @Patch('components/:id')
  @RequirePermission('payroll:manage')
  async updateComponent(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePayrollComponentDto,
  ) {
    return this.payrollService.updateComponent(ctx, id, dto);
  }

  // ── Salary Structures ─────────────────────────────────────────────────────

  @Post('salaries')
  @RequirePermission('payroll:manage')
  @HttpCode(HttpStatus.CREATED)
  async createSalaryStructure(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: CreateSalaryStructureDto,
  ) {
    return this.payrollService.createSalaryStructure(ctx, dto);
  }

  @Get('salaries')
  @RequirePermission('payroll:read')
  async listSalaryStructures(
    @CurrentTenant() ctx: TenantContext,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.payrollService.findAllSalaryStructures(ctx, employeeId);
  }

  @Get('salaries/:id')
  @RequirePermission('payroll:read')
  async getSalaryStructure(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.findOneSalaryStructure(ctx, id);
  }

  @Patch('salaries/:id')
  @RequirePermission('payroll:manage')
  async updateSalaryStructure(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSalaryStructureDto,
  ) {
    return this.payrollService.updateSalaryStructure(ctx, id, dto);
  }

  // ── Periods ───────────────────────────────────────────────────────────────

  @Post('periods')
  @RequirePermission('payroll:manage')
  @HttpCode(HttpStatus.CREATED)
  async createPeriod(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: CreatePayrollPeriodDto,
  ) {
    return this.payrollService.createPeriod(ctx, dto);
  }

  @Get('periods')
  @RequirePermission('payroll:read')
  async listPeriods(@CurrentTenant() ctx: TenantContext) {
    return this.payrollService.findAllPeriods(ctx);
  }

  @Get('periods/:id')
  @RequirePermission('payroll:read')
  async getPeriod(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.findOnePeriod(ctx, id);
  }

  @Patch('periods/:id')
  @RequirePermission('payroll:manage')
  async updatePeriod(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePayrollPeriodDto,
  ) {
    return this.payrollService.updatePeriod(ctx, id, dto);
  }

  @Post('periods/:id/transition')
  @RequirePermission('payroll:manage')
  @HttpCode(HttpStatus.OK)
  async transitionPeriod(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
  ) {
    return this.payrollService.transitionPeriod(ctx, id, status);
  }

  // ── Runs ──────────────────────────────────────────────────────────────────

  @Post('runs')
  @RequirePermission('payroll:manage')
  @HttpCode(HttpStatus.CREATED)
  async createRun(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: CreatePayrollRunDto,
  ) {
    return this.payrollService.createRun(ctx, dto);
  }

  @Get('runs')
  @RequirePermission('payroll:read')
  async listRuns(
    @CurrentTenant() ctx: TenantContext,
    @Query('periodId') periodId?: string,
  ) {
    return this.payrollService.findAllRuns(ctx, periodId);
  }

  @Get('runs/:id')
  @RequirePermission('payroll:read')
  async getRun(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.findOneRun(ctx, id);
  }

  @Post('runs/:id/calculate')
  @RequirePermission('payroll:manage')
  @HttpCode(HttpStatus.OK)
  async calculateRun(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.calculateRun(ctx, id);
  }

  @Post('runs/:id/approve')
  @RequirePermission('payroll:approve')
  @HttpCode(HttpStatus.OK)
  async approveRun(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.transitionRun(ctx, id, 'APPROVED');
  }

  @Post('runs/:id/finalize')
  @RequirePermission('payroll:manage')
  @HttpCode(HttpStatus.OK)
  async finalizeRun(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.transitionRun(ctx, id, 'FINALIZED');
  }

  @Post('runs/:id/post-to-finance')
  @RequirePermission('finance.journal:create')
  @HttpCode(HttpStatus.CREATED)
  async postToFinance(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.postToFinance(ctx, id);
  }

  // ── Lines ─────────────────────────────────────────────────────────────────

  @Get('lines')
  @RequirePermission('payroll:read')
  async listLines(
    @CurrentTenant() ctx: TenantContext,
    @Query('runId') runId?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.payrollService.findAllLines(ctx, runId, employeeId);
  }

  @Get('lines/:id')
  @RequirePermission('payroll:read')
  async getLine(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.findOneLine(ctx, id);
  }

  // ── Adjustments ───────────────────────────────────────────────────────────

  @Post('adjustments')
  @RequirePermission('payroll:manage')
  @HttpCode(HttpStatus.CREATED)
  async createAdjustment(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: CreatePayrollAdjustmentDto,
  ) {
    return this.payrollService.createAdjustment(ctx, dto);
  }

  @Get('adjustments')
  @RequirePermission('payroll:read')
  async listAdjustments(
    @CurrentTenant() ctx: TenantContext,
    @Query('lineId') lineId?: string,
  ) {
    return this.payrollService.findAllAdjustments(ctx, lineId);
  }

  @Post('adjustments/:id/review')
  @RequirePermission('payroll:approve')
  @HttpCode(HttpStatus.OK)
  async reviewAdjustment(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewPayrollAdjustmentDto,
  ) {
    return this.payrollService.reviewAdjustment(ctx, id, dto);
  }

  // ── Payslips ──────────────────────────────────────────────────────────────

  @Get('payslips')
  @RequirePermission('payroll:read')
  async listPayslips(
    @CurrentTenant() ctx: TenantContext,
    @Query('employeeId') employeeId?: string,
    @Query('periodId') periodId?: string,
  ) {
    return this.payrollService.findAllPayslips(ctx, employeeId, periodId);
  }

  @Get('payslips/:id')
  @RequirePermission('payroll:read')
  async getPayslip(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.findOnePayslip(ctx, id);
  }
}
