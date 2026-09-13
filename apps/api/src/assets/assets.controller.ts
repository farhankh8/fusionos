/**
 * FusionOS Assets Controller
 */

import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { CurrentTenant, RequirePermission } from '../common/decorators';
import type { TenantContext } from '../auth/services/tenant-context.service';
import { AssetService } from './services/asset.service';
import { CreateAssetDto, UpdateAssetDto, TransitionAssetDto, ListAssetsDto, CreateAssetCategoryDto, UpdateAssetCategoryDto, CreateAssetLocationDto, UpdateAssetLocationDto, CreateAssignmentDto, ReturnAssetDto, CreateTransferDto, CreateMaintenanceDto, TransitionMaintenanceDto, CreateInspectionDto, CompleteInspectionDto, CreateWarrantyDto, UpdateWarrantyDto, CalculateDepreciationDto, DisposeAssetDto } from './dto/assets.dto';

@Controller('assets') // global prefix 'api/v1' applies — do NOT repeat it here
export class AssetsController {
  constructor(private readonly assetService: AssetService) {}

  @Get('dashboard')
  @RequirePermission('asset:read')
  async getDashboard(@CurrentTenant() ctx: TenantContext) { return this.assetService.getDashboard(ctx); }

  @Get()
  @RequirePermission('asset:read')
  async findAll(@CurrentTenant() ctx: TenantContext, @Query() dto: ListAssetsDto, @Query('companyId') companyId?: string) { return this.assetService.findAllAssets(ctx, { ...dto, companyId }); }

  @Post()
  @RequirePermission('asset:create')
  async create(@CurrentTenant() ctx: TenantContext, @Body() dto: CreateAssetDto, @Query('companyId') companyId?: string) { return this.assetService.createAsset(ctx, dto, companyId); }

  @Get(':id')
  @RequirePermission('asset:read')
  async findOne(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) { return this.assetService.findOneAsset(ctx, id); }

  @Patch(':id')
  @RequirePermission('asset:update')
  async update(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAssetDto) { return this.assetService.updateAsset(ctx, id, dto); }

  @Post(':id/transition')
  @RequirePermission('asset:manage')
  async transition(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: TransitionAssetDto) { return this.assetService.transitionAsset(ctx, id, dto.targetStatus, dto.reason, dto.notes); }

  // ── Categories ──────────────────────────────────────────────────────────

  @Get('categories/list')
  @RequirePermission('asset.category:read')
  async listCategories(@CurrentTenant() ctx: TenantContext, @Query('companyId') companyId?: string) { return this.assetService.findAllCategories(ctx, companyId); }

  @Post('categories')
  @RequirePermission('asset.category:create')
  async createCategory(@CurrentTenant() ctx: TenantContext, @Body() dto: CreateAssetCategoryDto, @Query('companyId') companyId: string) { return this.assetService.createCategory(ctx, dto, companyId); }

  @Patch('categories/:id')
  @RequirePermission('asset.category:update')
  async updateCategory(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAssetCategoryDto) { return this.assetService.updateCategory(ctx, id, dto); }

  @Delete('categories/:id')
  @RequirePermission('asset.category:delete')
  async deleteCategory(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) { return this.assetService.deleteCategory(ctx, id); }

  // ── Locations ───────────────────────────────────────────────────────────

  @Get('locations/list')
  @RequirePermission('asset.location:read')
  async listLocations(@CurrentTenant() ctx: TenantContext, @Query('companyId') companyId?: string) { return this.assetService.findAllLocations(ctx, companyId); }

  @Post('locations')
  @RequirePermission('asset.location:create')
  async createLocation(@CurrentTenant() ctx: TenantContext, @Body() dto: CreateAssetLocationDto, @Query('companyId') companyId: string) { return this.assetService.createLocation(ctx, dto, companyId); }

  @Patch('locations/:id')
  @RequirePermission('asset.location:update')
  async updateLocation(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAssetLocationDto) { return this.assetService.updateLocation(ctx, id, dto); }

  @Delete('locations/:id')
  @RequirePermission('asset.location:delete')
  async deleteLocation(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) { return this.assetService.deleteLocation(ctx, id); }

  // ── Assignments ─────────────────────────────────────────────────────────

  @Get(':id/assignments')
  @RequirePermission('asset:read')
  async listAssignments(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) { return this.assetService.getAssignments(ctx, id); }

  @Post(':id/assignments')
  @RequirePermission('asset:assign')
  async createAssignment(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateAssignmentDto) { return this.assetService.createAssignment(ctx, id, dto); }

  @Patch(':id/assignments/:assignmentId/return')
  @RequirePermission('asset:assign')
  async returnAsset(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string, @Param('assignmentId', ParseUUIDPipe) assignmentId: string, @Body() dto?: ReturnAssetDto) { return this.assetService.returnAsset(ctx, id, assignmentId, dto); }

  // ── Transfers ───────────────────────────────────────────────────────────

  @Post(':id/transfer')
  @RequirePermission('asset:transfer')
  async createTransfer(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateTransferDto) { return this.assetService.createTransfer(ctx, id, dto); }

  // ── Maintenance ─────────────────────────────────────────────────────────

  @Get(':id/maintenance')
  @RequirePermission('asset.maintenance:read')
  async listMaintenance(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) { return this.assetService.getMaintenance(ctx, id); }

  @Post(':id/maintenance')
  @RequirePermission('asset.maintenance:create')
  async createMaintenance(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateMaintenanceDto) { return this.assetService.createMaintenance(ctx, id, dto); }

  @Patch(':id/maintenance/:maintenanceId/transition')
  @RequirePermission('asset.maintenance:update')
  async transitionMaintenance(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string, @Param('maintenanceId', ParseUUIDPipe) maintenanceId: string, @Body() dto: TransitionMaintenanceDto) { return this.assetService.transitionMaintenance(ctx, id, maintenanceId, dto.targetStatus); }

  // ── Inspections ─────────────────────────────────────────────────────────

  @Get(':id/inspections')
  @RequirePermission('asset.inspection:read')
  async listInspections(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) { return this.assetService.getInspections(ctx, id); }

  @Post(':id/inspections')
  @RequirePermission('asset.inspection:create')
  async createInspection(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateInspectionDto) { return this.assetService.createInspection(ctx, id, dto); }

  @Patch(':id/inspections/:inspectionId/complete')
  @RequirePermission('asset.inspection:update')
  async completeInspection(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string, @Param('inspectionId', ParseUUIDPipe) inspectionId: string, @Body() dto: CompleteInspectionDto) { return this.assetService.completeInspection(ctx, id, inspectionId, dto); }

  // ── Warranties ──────────────────────────────────────────────────────────

  @Get(':id/warranty')
  @RequirePermission('asset.warranty:read')
  async listWarranties(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) { return this.assetService.getWarranties(ctx, id); }

  @Post(':id/warranty')
  @RequirePermission('asset.warranty:create')
  async createWarranty(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateWarrantyDto) { return this.assetService.createWarranty(ctx, id, dto); }

  @Patch(':id/warranty/:warrantyId')
  @RequirePermission('asset.warranty:update')
  async updateWarranty(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string, @Param('warrantyId', ParseUUIDPipe) warrantyId: string, @Body() dto: UpdateWarrantyDto) { return this.assetService.updateWarranty(ctx, id, warrantyId, dto); }

  // ── Depreciation ────────────────────────────────────────────────────────

  @Get(':id/depreciation')
  @RequirePermission('asset.depreciation:read')
  async listDepreciations(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) { return this.assetService.getDepreciations(ctx, id); }

  @Post(':id/depreciation/calculate')
  @RequirePermission('asset.depreciation:calculate')
  async calculateDepreciation(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CalculateDepreciationDto) { return this.assetService.calculateDepreciation(ctx, id, dto); }

  // ── Disposal / Retirement ───────────────────────────────────────────────

  @Post(':id/dispose')
  @RequirePermission('asset:dispose')
  async disposeAsset(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: DisposeAssetDto) { return this.assetService.disposeAsset(ctx, id, dto); }

  @Post(':id/retire')
  @RequirePermission('asset:retire')
  async retireAsset(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string, @Body('reason') reason?: string) { return this.assetService.retireAsset(ctx, id, reason); }

  // ── Activities ──────────────────────────────────────────────────────────

  @Get(':id/activities')
  @RequirePermission('asset:read')
  async listActivities(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) { return this.assetService.getActivities(ctx, id); }
}
