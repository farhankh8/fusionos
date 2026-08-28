/**
 * FusionOS Organization Controller
 *
 * REST endpoints for Company, Branch, Department, Team, and Designation.
 * All endpoints require authentication and RBAC authorization.
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
} from '@nestjs/common';
import { CurrentTenant, RequirePermission } from '../common/decorators';
import type { TenantContext } from '../auth/services/tenant-context.service';
import { CompanyService } from './services/company.service';
import { BranchService } from './services/branch.service';
import { DepartmentService } from './services/department.service';
import { TeamService } from './services/team.service';
import { DesignationService } from './services/designation.service';
import {
  CreateCompanyDto,
  UpdateCompanyDto,
  CreateBranchDto,
  UpdateBranchDto,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  CreateTeamDto,
  UpdateTeamDto,
  CreateDesignationDto,
  UpdateDesignationDto,
} from './dto';

@Controller('organization')
export class OrganizationController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly branchService: BranchService,
    private readonly departmentService: DepartmentService,
    private readonly teamService: TeamService,
    private readonly designationService: DesignationService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPANY
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('companies')
  @RequirePermission('company:create')
  async createCompany(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: CreateCompanyDto,
  ) {
    return this.companyService.create(ctx, dto);
  }

  @Get('companies')
  @RequirePermission('company:read')
  async listCompanies(
    @CurrentTenant() ctx: TenantContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.companyService.findAll(ctx, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
      status,
      sortBy,
      sortOrder,
    });
  }

  @Get('companies/:id')
  @RequirePermission('company:read')
  async getCompany(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.companyService.findOne(ctx, id);
  }

  @Patch('companies/:id')
  @RequirePermission('company:update')
  async updateCompany(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companyService.update(ctx, id, dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BRANCH
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('branches')
  @RequirePermission('branch:create')
  async createBranch(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: CreateBranchDto,
  ) {
    return this.branchService.create(ctx, dto);
  }

  @Get('branches')
  @RequirePermission('branch:read')
  async listBranches(
    @CurrentTenant() ctx: TenantContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('companyId') companyId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.branchService.findAll(ctx, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
      status,
      companyId,
      sortBy,
      sortOrder,
    });
  }

  @Get('branches/:id')
  @RequirePermission('branch:read')
  async getBranch(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.branchService.findOne(ctx, id);
  }

  @Patch('branches/:id')
  @RequirePermission('branch:update')
  async updateBranch(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchService.update(ctx, id, dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DEPARTMENT
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('departments')
  @RequirePermission('department:create')
  async createDepartment(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: CreateDepartmentDto,
  ) {
    return this.departmentService.create(ctx, dto);
  }

  @Get('departments')
  @RequirePermission('department:read')
  async listDepartments(
    @CurrentTenant() ctx: TenantContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.departmentService.findAll(ctx, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
      status,
      companyId,
      branchId,
      sortBy,
      sortOrder,
    });
  }

  @Get('departments/:id')
  @RequirePermission('department:read')
  async getDepartment(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.departmentService.findOne(ctx, id);
  }

  @Patch('departments/:id')
  @RequirePermission('department:update')
  async updateDepartment(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentService.update(ctx, id, dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEAM
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('teams')
  @RequirePermission('team:create')
  async createTeam(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: CreateTeamDto,
  ) {
    return this.teamService.create(ctx, dto);
  }

  @Get('teams')
  @RequirePermission('team:read')
  async listTeams(
    @CurrentTenant() ctx: TenantContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('companyId') companyId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.teamService.findAll(ctx, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
      status,
      companyId,
      departmentId,
      sortBy,
      sortOrder,
    });
  }

  @Get('teams/:id')
  @RequirePermission('team:read')
  async getTeam(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.teamService.findOne(ctx, id);
  }

  @Patch('teams/:id')
  @RequirePermission('team:update')
  async updateTeam(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teamService.update(ctx, id, dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DESIGNATION
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('designations')
  @RequirePermission('designation:create')
  async createDesignation(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: CreateDesignationDto,
  ) {
    return this.designationService.create(ctx, dto);
  }

  @Get('designations')
  @RequirePermission('designation:read')
  async listDesignations(
    @CurrentTenant() ctx: TenantContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('companyId') companyId?: string,
    @Query('isActive') isActive?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.designationService.findAll(ctx, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
      companyId,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Get('designations/:id')
  @RequirePermission('designation:read')
  async getDesignation(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.designationService.findOne(ctx, id);
  }

  @Patch('designations/:id')
  @RequirePermission('designation:update')
  async updateDesignation(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDesignationDto,
  ) {
    return this.designationService.update(ctx, id, dto);
  }
}
