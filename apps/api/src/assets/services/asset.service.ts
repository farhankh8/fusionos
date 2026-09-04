/**
 * FusionOS Asset Management Service
 *
 * Core business logic for enterprise asset & equipment management.
 * Handles: Asset CRUD, Categories, Locations, Assignments, Transfers,
 * Maintenance, Inspections, Warnings, Depreciation, Disposal.
 *
 * All operations are tenant-scoped. Uses integer minor units for money.
 * Server-side state transitions enforce lifecycle rules.
 */

import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import type { TenantContext } from '../../auth/services/tenant-context.service';
import { AuditLogService } from '../../common/services/audit-log.service';
import { EventPublisherService } from '../../common/services/event-publisher.service';

// ── Valid State Transitions ─────────────────────────────────────────────────

const VALID_ASSET_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['ACTIVE'],
  ACTIVE: ['AVAILABLE', 'ASSIGNED', 'IN_MAINTENANCE', 'IN_REPAIR', 'RETIRED', 'LOST', 'DAMAGED'],
  AVAILABLE: ['ASSIGNED', 'IN_MAINTENANCE', 'IN_REPAIR', 'RETIRED', 'LOST', 'DAMAGED'],
  ASSIGNED: ['AVAILABLE', 'IN_MAINTENANCE', 'IN_REPAIR', 'LOST', 'DAMAGED'],
  IN_MAINTENANCE: ['AVAILABLE', 'ASSIGNED', 'IN_REPAIR', 'DAMAGED'],
  IN_REPAIR: ['AVAILABLE', 'ASSIGNED', 'DAMAGED'],
  LOST: ['AVAILABLE'],
  DAMAGED: ['IN_REPAIR', 'RETIRED'],
  DISPOSED: [],
  RETIRED: ['DISPOSED'],
};

const VALID_MAINTENANCE_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ['OPEN', 'CANCELLED'],
  OPEN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'OPEN'],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class AssetService {
  private readonly logger = new Logger(AssetService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLog: AuditLogService,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════

  async getDashboard(ctx: TenantContext) {
    const where = { tenantId: ctx.tenantId };
    const [total, active, assigned, available, inMaintenance, disposed, retired] = await Promise.all([
      this.prisma.asset.count({ where }),
      this.prisma.asset.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.asset.count({ where: { ...where, status: 'ASSIGNED' } }),
      this.prisma.asset.count({ where: { ...where, status: 'AVAILABLE' } }),
      this.prisma.asset.count({ where: { ...where, status: 'IN_MAINTENANCE' } }),
      this.prisma.asset.count({ where: { ...where, status: 'DISPOSED' } }),
      this.prisma.asset.count({ where: { ...where, status: 'RETIRED' } }),
    ]);

    const overdueMaintenance = await this.prisma.assetMaintenanceRecord.count({
      where: { tenantId: ctx.tenantId, status: { in: ['SCHEDULED', 'OPEN'] }, scheduledDate: { lt: new Date() } },
    });

    const expiringWarranty = await this.prisma.assetWarranty.count({
      where: { tenantId: ctx.tenantId, isActive: true, endDate: { gte: new Date(), lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } },
    });

    return { total, active, assigned, available, inMaintenance, disposed, retired, overdueMaintenance, expiringWarranty };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ASSETS — CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  async findAllAssets(ctx: TenantContext, params: { page?: number; limit?: number; search?: string; status?: string; condition?: string; categoryId?: string; locationId?: string; assignment?: string; companyId?: string }) {
    const { page = 1, limit = 20, search, status, condition, categoryId, locationId, assignment, companyId } = params;
    const where: Prisma.AssetWhereInput = { tenantId: ctx.tenantId, ...(companyId && { companyId }) };
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { assetCode: { contains: search, mode: 'insensitive' } }, { serialNumber: { contains: search, mode: 'insensitive' } }];
    if (status) where.status = status as any;
    if (condition) where.condition = condition as any;
    if (categoryId) where.categoryId = categoryId;
    if (locationId) where.locationId = locationId;
    if (assignment === 'assigned') where.assignments = { some: { status: 'ACTIVE' } };
    if (assignment === 'unassigned') where.assignments = { none: { status: 'ACTIVE' } };

    const [data, total] = await Promise.all([
      this.prisma.asset.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
        include: { category: { select: { id: true, name: true, code: true } }, location: { select: { id: true, name: true } }, assignments: { where: { status: 'ACTIVE' }, include: { employee: { select: { id: true, firstName: true, lastName: true } } }, take: 1 } },
      }),
      this.prisma.asset.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrevious: page > 1 } };
  }

  async findOneAsset(ctx: TenantContext, id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id }, include: { category: true, location: true, vendor: true,
        assignments: { where: { status: 'ACTIVE' }, include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } }, project: { select: { id: true, name: true, code: true } } } },
        warranties: { orderBy: { endDate: 'desc' }, take: 1 },
        maintenanceRecords: { orderBy: { createdAt: 'desc' }, take: 5 },
        inspections: { orderBy: { createdAt: 'desc' }, take: 5 },
        depreciations: { orderBy: { periodStartDate: 'desc' }, take: 12 },
        activities: { orderBy: { createdAt: 'desc' }, take: 20, include: { actor: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.tenantId !== ctx.tenantId) throw new ForbiddenException('Access denied');
    return asset;
  }

  async createAsset(ctx: TenantContext, dto: any, companyId?: string) {
    // Validate company belongs to tenant
    if (companyId) {
      const company = await this.prisma.company.findFirst({ where: { id: companyId, tenantId: ctx.tenantId } });
      if (!company) throw new NotFoundException('Company not found');
    }
    const effectiveCompanyId = companyId ?? (await this.prisma.company.findFirst({ where: { tenantId: ctx.tenantId } }))?.id;
    if (!effectiveCompanyId) throw new BadRequestException('No company found for tenant');

    // Check unique asset code
    const existing = await this.prisma.asset.findFirst({ where: { tenantId: ctx.tenantId, companyId: effectiveCompanyId, assetCode: dto.assetCode } });
    if (existing) throw new ConflictException(`Asset code "${dto.assetCode}" already exists`);

    // Validate references
    if (dto.categoryId) {
      const cat = await this.prisma.assetCategory.findFirst({ where: { id: dto.categoryId, tenantId: ctx.tenantId } });
      if (!cat) throw new NotFoundException('Category not found');
    }
    if (dto.locationId) {
      const loc = await this.prisma.assetLocation.findFirst({ where: { id: dto.locationId, tenantId: ctx.tenantId } });
      if (!loc) throw new NotFoundException('Location not found');
    }

    const purchaseCost = dto.purchaseCost ?? 0;
    const asset = await this.prisma.asset.create({
      data: { tenantId: ctx.tenantId, companyId: effectiveCompanyId, assetCode: dto.assetCode, name: dto.name, description: dto.description, serialNumber: dto.serialNumber, manufacturer: dto.manufacturer, model: dto.model, purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null, purchaseCost, currency: dto.currency ?? 'USD', categoryId: dto.categoryId, locationId: dto.locationId, vendorId: dto.vendorId, usefulLife: dto.usefulLife, residualValue: dto.residualValue ?? 0, currentBookValue: purchaseCost, inServiceDate: dto.inServiceDate ? new Date(dto.inServiceDate) : null, notes: dto.notes },
    });

    await this.auditLog.record({ tenantId: ctx.tenantId, actorId: ctx.userId, action: 'ASSET_CREATED', entityType: 'Asset', entityId: asset.id, newValue: { assetCode: asset.assetCode, name: asset.name } });

    await this.eventPublisher.publish(ctx, { eventType: 'asset.created', aggregateType: 'asset', aggregateId: asset.id, payload: { assetId: asset.id, assetCode: asset.assetCode, name: asset.name } });

    await this.recordActivity(ctx, asset.id, 'CREATED', `Asset ${asset.assetCode} created`, ctx.userId);

    return asset;
  }

  async updateAsset(ctx: TenantContext, id: string, dto: any) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.tenantId !== ctx.tenantId) throw new ForbiddenException('Access denied');
    if (['DISPOSED', 'RETIRED'].includes(asset.status)) throw new BadRequestException('Cannot update disposed/retired asset');

    const data: Prisma.AssetUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.serialNumber !== undefined) data.serialNumber = dto.serialNumber;
    if (dto.manufacturer !== undefined) data.manufacturer = dto.manufacturer;
    if (dto.model !== undefined) data.model = dto.model;
    if (dto.categoryId !== undefined) data.category = dto.categoryId ? { connect: { id: dto.categoryId } } : { disconnect: true };
    if (dto.locationId !== undefined) data.location = dto.locationId ? { connect: { id: dto.locationId } } : { disconnect: true };
    if (dto.vendorId !== undefined) data.vendor = dto.vendorId ? { connect: { id: dto.vendorId } } : { disconnect: true };
    if (dto.usefulLife !== undefined) data.usefulLife = dto.usefulLife;
    if (dto.residualValue !== undefined) data.residualValue = dto.residualValue;
    if (dto.notes !== undefined) data.notes = dto.notes;

    const updated = await this.prisma.asset.update({ where: { id }, data });

    await this.auditLog.record({ tenantId: ctx.tenantId, actorId: ctx.userId, action: 'ASSET_UPDATED', entityType: 'Asset', entityId: id, previousValue: { name: asset.name }, newValue: { name: updated.name } });

    await this.recordActivity(ctx, id, 'UPDATED', `Asset ${asset.assetCode} updated`, ctx.userId);

    return updated;
  }

  async transitionAsset(ctx: TenantContext, id: string, targetStatus: string, reason?: string, notes?: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.tenantId !== ctx.tenantId) throw new ForbiddenException('Access denied');

    const allowed = VALID_ASSET_TRANSITIONS[asset.status];
    if (!allowed || !allowed.includes(targetStatus)) {
      throw new BadRequestException(`Cannot transition from ${asset.status} to ${targetStatus}`);
    }

    const updateData: Prisma.AssetUpdateInput = { status: targetStatus as any };
    if (targetStatus === 'DISPOSED') {
      updateData.disposalDate = new Date();
      updateData.disposalReason = reason;
      updateData.currentBookValue = 0;
    }
    if (targetStatus === 'RETIRED') {
      updateData.currentBookValue = 0;
    }

    const updated = await this.prisma.asset.update({ where: { id }, data: updateData });

    await this.auditLog.record({ tenantId: ctx.tenantId, actorId: ctx.userId, action: 'ASSET_STATUS_CHANGED', entityType: 'Asset', entityId: id, previousValue: { status: asset.status }, newValue: { status: targetStatus, reason } });

    await this.eventPublisher.publish(ctx, { eventType: `asset.${targetStatus.toLowerCase()}`, aggregateType: 'asset', aggregateId: id, payload: { assetId: id, fromStatus: asset.status, toStatus: targetStatus, reason } });

    await this.recordActivity(ctx, id, `STATUS_${targetStatus}`, `Asset status changed from ${asset.status} to ${targetStatus}${reason ? ': ' + reason : ''}`, ctx.userId);

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORIES
  // ═══════════════════════════════════════════════════════════════════════════

  async findAllCategories(ctx: TenantContext, companyId?: string) {
    return this.prisma.assetCategory.findMany({ where: { tenantId: ctx.tenantId, ...(companyId && { companyId }) }, orderBy: { name: 'asc' }, include: { _count: { select: { assets: true } } } });
  }

  async createCategory(ctx: TenantContext, dto: any, companyId: string) {
    const company = await this.prisma.company.findFirst({ where: { id: companyId, tenantId: ctx.tenantId } });
    if (!company) throw new NotFoundException('Company not found');
    const existing = await this.prisma.assetCategory.findFirst({ where: { tenantId: ctx.tenantId, companyId, code: dto.code } });
    if (existing) throw new ConflictException(`Category code "${dto.code}" already exists`);
    return this.prisma.assetCategory.create({ data: { tenantId: ctx.tenantId, companyId, name: dto.name, code: dto.code, description: dto.description, categoryType: (dto.categoryType as any) ?? 'OTHER', defaultUsefulLife: dto.defaultUsefulLife, defaultDepreciationMethod: 'STRAIGHT_LINE' } });
  }

  async updateCategory(ctx: TenantContext, id: string, dto: any) {
    const cat = await this.prisma.assetCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    if (cat.tenantId !== ctx.tenantId) throw new ForbiddenException('Access denied');
    return this.prisma.assetCategory.update({ where: { id }, data: { name: dto.name, description: dto.description, categoryType: dto.categoryType, defaultUsefulLife: dto.defaultUsefulLife, isActive: dto.isActive } });
  }

  async deleteCategory(ctx: TenantContext, id: string) {
    const cat = await this.prisma.assetCategory.findUnique({ where: { id }, include: { _count: { select: { assets: true } } } });
    if (!cat) throw new NotFoundException('Category not found');
    if (cat.tenantId !== ctx.tenantId) throw new ForbiddenException('Access denied');
    if (cat._count.assets > 0) throw new BadRequestException('Cannot delete category with existing assets');
    return this.prisma.assetCategory.delete({ where: { id } });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async findAllLocations(ctx: TenantContext, companyId?: string) {
    return this.prisma.assetLocation.findMany({ where: { tenantId: ctx.tenantId, ...(companyId && { companyId }) }, orderBy: { name: 'asc' }, include: { branch: { select: { id: true, name: true } }, _count: { select: { assets: true } } } });
  }

  async createLocation(ctx: TenantContext, dto: any, companyId: string) {
    const company = await this.prisma.company.findFirst({ where: { id: companyId, tenantId: ctx.tenantId } });
    if (!company) throw new NotFoundException('Company not found');
    const existing = await this.prisma.assetLocation.findFirst({ where: { tenantId: ctx.tenantId, companyId, code: dto.code } });
    if (existing) throw new ConflictException(`Location code "${dto.code}" already exists`);
    return this.prisma.assetLocation.create({ data: { tenantId: ctx.tenantId, companyId, name: dto.name, code: dto.code, description: dto.description, branchId: dto.branchId, building: dto.building, floor: dto.floor, room: dto.room } });
  }

  async updateLocation(ctx: TenantContext, id: string, dto: any) {
    const loc = await this.prisma.assetLocation.findUnique({ where: { id } });
    if (!loc) throw new NotFoundException('Location not found');
    if (loc.tenantId !== ctx.tenantId) throw new ForbiddenException('Access denied');
    return this.prisma.assetLocation.update({ where: { id }, data: { name: dto.name, description: dto.description, branchId: dto.branchId, building: dto.building, floor: dto.floor, room: dto.room, isActive: dto.isActive } });
  }

  async deleteLocation(ctx: TenantContext, id: string) {
    const loc = await this.prisma.assetLocation.findUnique({ where: { id }, include: { _count: { select: { assets: true } } } });
    if (!loc) throw new NotFoundException('Location not found');
    if (loc.tenantId !== ctx.tenantId) throw new ForbiddenException('Access denied');
    if (loc._count.assets > 0) throw new BadRequestException('Cannot delete location with existing assets');
    return this.prisma.assetLocation.delete({ where: { id } });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ASSIGNMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  async getAssignments(ctx: TenantContext, assetId: string) {
    const asset = await this.validateAssetTenant(ctx, assetId);
    return this.prisma.assetAssignment.findMany({ where: { assetId }, orderBy: { createdAt: 'desc' }, include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } }, project: { select: { id: true, name: true, code: true } } } });
  }

  async createAssignment(ctx: TenantContext, assetId: string, dto: any) {
    const asset = await this.validateAssetTenant(ctx, assetId);
    if (['DISPOSED', 'RETIRED', 'LOST'].includes(asset.status)) throw new BadRequestException('Cannot assign disposed/retired/lost asset');
    if (dto.employeeId) {
      const emp = await this.prisma.employee.findFirst({ where: { id: dto.employeeId, tenantId: ctx.tenantId, deletedAt: null } });
      if (!emp) throw new NotFoundException('Employee not found');
    }
    if (dto.projectId) {
      const proj = await this.prisma.project.findFirst({ where: { id: dto.projectId, tenantId: ctx.tenantId } });
      if (!proj) throw new NotFoundException('Project not found');
    }
    // Check no active assignment to same employee
    if (dto.employeeId) {
      const existing = await this.prisma.assetAssignment.findFirst({ where: { assetId, employeeId: dto.employeeId, status: 'ACTIVE' } });
      if (existing) throw new ConflictException('Asset already assigned to this employee');
    }

    const assignment = await this.prisma.assetAssignment.create({ data: { tenantId: ctx.tenantId, assetId, employeeId: dto.employeeId, projectId: dto.projectId, notes: dto.notes, assignedBy: ctx.userId } });

    await this.prisma.asset.update({ where: { id: assetId }, data: { status: 'ASSIGNED' } });
    await this.recordActivity(ctx, assetId, 'ASSIGNED', `Asset assigned to ${dto.employeeId ? 'employee' : 'project'}`, ctx.userId);

    await this.eventPublisher.publish(ctx, { eventType: 'asset.assigned', aggregateType: 'asset', aggregateId: assetId, payload: { assetId, assignmentId: assignment.id, employeeId: dto.employeeId, projectId: dto.projectId } });

    return assignment;
  }

  async returnAsset(ctx: TenantContext, assetId: string, assignmentId: string, dto?: any) {
    await this.validateAssetTenant(ctx, assetId);
    const assignment = await this.prisma.assetAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment || assignment.assetId !== assetId) throw new NotFoundException('Assignment not found');
    if (assignment.status !== 'ACTIVE') throw new BadRequestException('Assignment is not active');

    await this.prisma.assetAssignment.update({ where: { id: assignmentId }, data: { status: 'RETURNED', returnedAt: new Date(), notes: dto?.notes } });
    await this.prisma.asset.update({ where: { id: assetId }, data: { status: 'AVAILABLE' } });
    await this.recordActivity(ctx, assetId, 'RETURNED', 'Asset returned', ctx.userId);

    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSFERS
  // ═══════════════════════════════════════════════════════════════════════════

  async createTransfer(ctx: TenantContext, assetId: string, dto: any) {
    const asset = await this.validateAssetTenant(ctx, assetId);
    if (['DISPOSED', 'RETIRED', 'LOST'].includes(asset.status)) throw new BadRequestException('Cannot transfer disposed/retired/lost asset');

    const transfer = await this.prisma.assetTransfer.create({ data: { tenantId: ctx.tenantId, assetId, toEmployeeId: dto.toEmployeeId, toBranchId: dto.toBranchId, toLocationId: dto.toLocationId, toProjectId: dto.toProjectId, reason: dto.reason, notes: dto.notes, transferredBy: ctx.userId } });

    // Update asset location if provided
    if (dto.toLocationId) await this.prisma.asset.update({ where: { id: assetId }, data: { locationId: dto.toLocationId } });

    await this.recordActivity(ctx, assetId, 'TRANSFERRED', `Asset transferred: ${dto.reason ?? 'no reason'}`, ctx.userId);

    await this.eventPublisher.publish(ctx, { eventType: 'asset.transferred', aggregateType: 'asset', aggregateId: assetId, payload: { assetId, transferId: transfer.id, toEmployeeId: dto.toEmployeeId, toLocationId: dto.toLocationId } });

    return transfer;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAINTENANCE
  // ═══════════════════════════════════════════════════════════════════════════

  async getMaintenance(ctx: TenantContext, assetId: string) {
    await this.validateAssetTenant(ctx, assetId);
    return this.prisma.assetMaintenanceRecord.findMany({ where: { assetId }, orderBy: { createdAt: 'desc' }, include: { assignedTo: { select: { id: true, firstName: true, lastName: true } } } });
  }

  async createMaintenance(ctx: TenantContext, assetId: string, dto: any) {
    await this.validateAssetTenant(ctx, assetId);
    const record = await this.prisma.assetMaintenanceRecord.create({ data: { tenantId: ctx.tenantId, assetId, type: dto.type as any, title: dto.title, description: dto.description, priority: dto.priority ?? 'MEDIUM', scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null, vendor: dto.vendor, cost: dto.cost ?? 0, currency: dto.currency ?? 'USD', notes: dto.notes, assignedToId: dto.assignedToId, createdBy: ctx.userId } });
    await this.recordActivity(ctx, assetId, 'MAINTENANCE_SCHEDULED', `Maintenance scheduled: ${dto.title}`, ctx.userId);
    await this.eventPublisher.publish(ctx, { eventType: 'asset.maintenance.scheduled', aggregateType: 'asset', aggregateId: assetId, payload: { assetId, maintenanceId: record.id, title: dto.title, type: dto.type } });
    return record;
  }

  async transitionMaintenance(ctx: TenantContext, assetId: string, maintenanceId: string, targetStatus: string) {
    await this.validateAssetTenant(ctx, assetId);
    const record = await this.prisma.assetMaintenanceRecord.findUnique({ where: { id: maintenanceId } });
    if (!record || record.assetId !== assetId) throw new NotFoundException('Maintenance record not found');
    const allowed = VALID_MAINTENANCE_TRANSITIONS[record.status];
    if (!allowed || !allowed.includes(targetStatus)) throw new BadRequestException(`Cannot transition from ${record.status} to ${targetStatus}`);

    const updateData: Prisma.AssetMaintenanceRecordUpdateInput = { status: targetStatus as any };
    if (targetStatus === 'IN_PROGRESS') updateData.startedAt = new Date();
    if (targetStatus === 'COMPLETED') updateData.completedAt = new Date();

    const updated = await this.prisma.assetMaintenanceRecord.update({ where: { id: maintenanceId }, data: updateData });
    await this.recordActivity(ctx, assetId, 'MAINTENANCE_COMPLETED', `Maintenance ${targetStatus.toLowerCase()}: ${record.title}`, ctx.userId);
    if (targetStatus === 'COMPLETED') {
      await this.eventPublisher.publish(ctx, { eventType: 'asset.maintenance.completed', aggregateType: 'asset', aggregateId: assetId, payload: { assetId, maintenanceId, title: record.title } });
    }
    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INSPECTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async getInspections(ctx: TenantContext, assetId: string) {
    await this.validateAssetTenant(ctx, assetId);
    return this.prisma.assetInspection.findMany({ where: { assetId }, orderBy: { createdAt: 'desc' }, include: { inspector: { select: { id: true, firstName: true, lastName: true } } } });
  }

  async createInspection(ctx: TenantContext, assetId: string, dto: any) {
    await this.validateAssetTenant(ctx, assetId);
    const inspection = await this.prisma.assetInspection.create({ data: { tenantId: ctx.tenantId, assetId, inspectionType: dto.inspectionType, scheduledDate: new Date(dto.scheduledDate), inspectorId: dto.inspectorId, notes: dto.notes, createdBy: ctx.userId } });
    await this.recordActivity(ctx, assetId, 'INSPECTION_SCHEDULED', `Inspection scheduled: ${dto.inspectionType}`, ctx.userId);
    return inspection;
  }

  async completeInspection(ctx: TenantContext, assetId: string, inspectionId: string, dto: any) {
    await this.validateAssetTenant(ctx, assetId);
    const inspection = await this.prisma.assetInspection.findUnique({ where: { id: inspectionId } });
    if (!inspection || inspection.assetId !== assetId) throw new NotFoundException('Inspection not found');
    if (inspection.status !== 'SCHEDULED') throw new BadRequestException('Inspection is not scheduled');

    const updated = await this.prisma.assetInspection.update({ where: { id: inspectionId }, data: { status: dto.status as any, completedDate: new Date(), condition: dto.condition, findings: dto.findings, notes: dto.notes } });

    if (dto.condition) {
      await this.prisma.asset.update({ where: { id: assetId }, data: { condition: dto.condition as any } });
    }

    await this.recordActivity(ctx, assetId, 'INSPECTION_COMPLETED', `Inspection completed: ${dto.status}`, ctx.userId);
    if (dto.status === 'FAILED') {
      await this.eventPublisher.publish(ctx, { eventType: 'asset.inspection.failed', aggregateType: 'asset', aggregateId: assetId, payload: { assetId, inspectionId, findings: dto.findings } });
    }
    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WARRANTIES
  // ═══════════════════════════════════════════════════════════════════════════

  async getWarranties(ctx: TenantContext, assetId: string) {
    await this.validateAssetTenant(ctx, assetId);
    return this.prisma.assetWarranty.findMany({ where: { assetId }, orderBy: { endDate: 'desc' } });
  }

  async createWarranty(ctx: TenantContext, assetId: string, dto: any) {
    await this.validateAssetTenant(ctx, assetId);
    return this.prisma.assetWarranty.create({ data: { tenantId: ctx.tenantId, assetId, provider: dto.provider, startDate: new Date(dto.startDate), endDate: new Date(dto.endDate), referenceNumber: dto.referenceNumber, coverage: dto.coverage, notes: dto.notes } });
  }

  async updateWarranty(ctx: TenantContext, assetId: string, warrantyId: string, dto: any) {
    await this.validateAssetTenant(ctx, assetId);
    const warranty = await this.prisma.assetWarranty.findUnique({ where: { id: warrantyId } });
    if (!warranty || warranty.assetId !== assetId) throw new NotFoundException('Warranty not found');
    return this.prisma.assetWarranty.update({ where: { id: warrantyId }, data: { provider: dto.provider, endDate: dto.endDate ? new Date(dto.endDate) : undefined, referenceNumber: dto.referenceNumber, coverage: dto.coverage, notes: dto.notes, isActive: dto.isActive } });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DEPRECIATION
  // ═══════════════════════════════════════════════════════════════════════════

  async getDepreciations(ctx: TenantContext, assetId: string) {
    await this.validateAssetTenant(ctx, assetId);
    return this.prisma.assetDepreciation.findMany({ where: { assetId }, orderBy: { periodStartDate: 'desc' } });
  }

  async calculateDepreciation(ctx: TenantContext, assetId: string, dto: any) {
    const asset = await this.validateAssetTenant(ctx, assetId);
    if (['DISPOSED', 'DRAFT'].includes(asset.status)) throw new BadRequestException('Cannot depreciate disposed/draft asset');
    if (!asset.usefulLife || asset.usefulLife <= 0) throw new BadRequestException('Asset must have useful life set');
    if (asset.purchaseCost <= 0) throw new BadRequestException('Asset must have purchase cost');

    const periodStart = new Date(dto.periodStartDate);
    const periodEnd = new Date(dto.periodEndDate);

    // Check for existing depreciation in this period
    const existing = await this.prisma.assetDepreciation.findFirst({ where: { assetId, periodStartDate: periodStart } });
    if (existing) throw new ConflictException('Depreciation already calculated for this period');

    // Calculate monthly depreciation (straight-line)
    const depreciableAmount = asset.purchaseCost - asset.residualValue;
    const monthlyDepreciation = Math.floor(depreciableAmount / asset.usefulLife);

    // Get opening book value
    const lastDepreciation = await this.prisma.assetDepreciation.findFirst({ where: { assetId }, orderBy: { periodStartDate: 'desc' } });
    const openingBookValue = lastDepreciation?.closingBookValue ?? asset.currentBookValue;

    // Calculate closing book value
    const closingBookValue = Math.max(0, openingBookValue - monthlyDepreciation);
    const actualDepreciation = openingBookValue - closingBookValue;

    const depreciation = await this.prisma.assetDepreciation.create({ data: { tenantId: ctx.tenantId, assetId, periodStartDate: periodStart, periodEndDate: periodEnd, depreciationMethod: 'STRAIGHT_LINE', openingBookValue, depreciationAmount: actualDepreciation, closingBookValue, usefulLifeMonths: asset.usefulLife, monthlyRate: monthlyDepreciation, calculatedBy: ctx.userId } });

    // Update asset book value
    await this.prisma.asset.update({ where: { id: assetId }, data: { currentBookValue: closingBookValue } });

    await this.auditLog.record({ tenantId: ctx.tenantId, actorId: ctx.userId, action: 'ASSET_DEPRECIATION_CALCULATED', entityType: 'Asset', entityId: assetId, newValue: { openingBookValue, depreciationAmount: actualDepreciation, closingBookValue } });

    await this.recordActivity(ctx, assetId, 'DEPRECIATION_CALCULATED', `Depreciation calculated: ${actualDepreciation} for period ${dto.periodStartDate} to ${dto.periodEndDate}`, ctx.userId);

    return depreciation;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPOSAL
  // ═══════════════════════════════════════════════════════════════════════════

  async disposeAsset(ctx: TenantContext, assetId: string, dto: any) {
    const asset = await this.validateAssetTenant(ctx, assetId);
    if (['DISPOSED'].includes(asset.status)) throw new BadRequestException('Asset already disposed');

    const updated = await this.prisma.asset.update({ where: { id: assetId }, data: { status: 'DISPOSED', disposalDate: new Date(dto.disposalDate), disposalMethod: dto.disposalMethod as any, disposalReason: dto.reason, disposalProceeds: dto.proceeds ?? 0, currentBookValue: 0 } });

    // Deactivate active assignments
    await this.prisma.assetAssignment.updateMany({ where: { assetId, status: 'ACTIVE' }, data: { status: 'TRANSFERRED', returnedAt: new Date() } });

    await this.auditLog.record({ tenantId: ctx.tenantId, actorId: ctx.userId, action: 'ASSET_DISPOSED', entityType: 'Asset', entityId: assetId, newValue: { disposalMethod: dto.disposalMethod, disposalReason: dto.reason } });

    await this.eventPublisher.publish(ctx, { eventType: 'asset.disposed', aggregateType: 'asset', aggregateId: assetId, payload: { assetId, disposalMethod: dto.disposalMethod, reason: dto.reason, proceeds: dto.proceeds } });

    await this.recordActivity(ctx, assetId, 'DISPOSED', `Asset disposed: ${dto.disposalMethod}${dto.reason ? ' - ' + dto.reason : ''}`, ctx.userId);

    return updated;
  }

  async retireAsset(ctx: TenantContext, assetId: string, reason?: string) {
    const asset = await this.validateAssetTenant(ctx, assetId);
    if (['DISPOSED', 'RETIRED'].includes(asset.status)) throw new BadRequestException('Asset already disposed/retired');
    const updated = await this.prisma.asset.update({ where: { id: assetId }, data: { status: 'RETIRED', currentBookValue: 0 } });
    await this.auditLog.record({ tenantId: ctx.tenantId, actorId: ctx.userId, action: 'ASSET_RETIRED', entityType: 'Asset', entityId: assetId });
    await this.eventPublisher.publish(ctx, { eventType: 'asset.retired', aggregateType: 'asset', aggregateId: assetId, payload: { assetId, reason } });
    await this.recordActivity(ctx, assetId, 'RETIRED', `Asset retired${reason ? ': ' + reason : ''}`, ctx.userId);
    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIVITIES
  // ═══════════════════════════════════════════════════════════════════════════

  async getActivities(ctx: TenantContext, assetId: string) {
    await this.validateAssetTenant(ctx, assetId);
    return this.prisma.assetActivity.findMany({ where: { assetId }, orderBy: { createdAt: 'desc' }, include: { actor: { select: { id: true, firstName: true, lastName: true } } } });
  }

  private async recordActivity(ctx: TenantContext, assetId: string, action: string, description: string, actorId?: string) {
    try {
      await this.prisma.assetActivity.create({ data: { tenantId: ctx.tenantId, assetId, action, description, actorId } });
    } catch (error) {
      this.logger.warn('Failed to record asset activity', error);
    }
  }

  private async validateAssetTenant(ctx: TenantContext, assetId: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.tenantId !== ctx.tenantId) throw new ForbiddenException('Access denied');
    return asset;
  }
}
