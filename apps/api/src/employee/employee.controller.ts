/**
 * FusionOS Employee Controller
 *
 * REST endpoints for the canonical Employee entity.
 * All endpoints require authentication and RBAC authorization.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentTenant, RequirePermission } from '../common/decorators';
import type { TenantContext } from '../auth/services/tenant-context.service';
import { EmployeeService } from './services/employee.service';
import { CreateEmployeeDto, UpdateEmployeeDto, UpdateEmployeeStatusDto } from './dto';

@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  /**
   * POST /api/v1/employees
   * Create a new employee with full validation and history tracking.
   */
  @Post()
  @RequirePermission('employee:create')
  async create(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.employeeService.create(ctx, dto);
  }

  /**
   * GET /api/v1/employees
   * List employees with pagination, search, filtering, and sorting.
   */
  @Get()
  @RequirePermission('employee:read')
  async list(
    @CurrentTenant() ctx: TenantContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('departmentId') departmentId?: string,
    @Query('branchId') branchId?: string,
    @Query('teamId') teamId?: string,
    @Query('designationId') designationId?: string,
    @Query('companyId') companyId?: string,
    @Query('managerId') managerId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.employeeService.findAll(ctx, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
      status,
      departmentId,
      branchId,
      teamId,
      designationId,
      companyId,
      managerId,
      sortBy,
      sortOrder,
    });
  }

  /**
   * GET /api/v1/employees/:id
   * Get full employee profile with relationships and history.
   */
  @Get(':id')
  @RequirePermission('employee:read')
  async getOne(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.employeeService.findOne(ctx, id);
  }

  /**
   * PATCH /api/v1/employees/:id
   * Update employee details with change tracking.
   */
  @Patch(':id')
  @RequirePermission('employee:update')
  async update(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeeService.update(ctx, id, dto);
  }

  /**
   * PATCH /api/v1/employees/:id/status
   * Change employee status with lifecycle validation.
   */
  @Patch(':id/status')
  @RequirePermission('employee:manage')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeStatusDto,
  ) {
    return this.employeeService.updateStatus(ctx, id, dto);
  }

  /**
   * GET /api/v1/employees/:id/history
   * Get employee change history (append-only audit trail).
   */
  @Get(':id/history')
  @RequirePermission('employee:read')
  async getHistory(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.employeeService.getHistory(ctx, id);
  }

  /**
   * DELETE /api/v1/employees/:id
   * Soft-delete an employee (preserves record for legal compliance).
   */
  @Delete(':id')
  @RequirePermission('employee:manage')
  @HttpCode(HttpStatus.OK)
  async softDelete(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.employeeService.softDelete(ctx, id);
  }
}
