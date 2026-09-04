/**
 * FusionOS Asset Management DTOs
 */

import { IsString, IsOptional, IsBoolean, IsEnum, IsInt, Min, MaxLength, MinLength, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

// ── Asset DTOs ──────────────────────────────────────────────────────────────

export class CreateAssetDto {
  @IsString() @MinLength(1) @MaxLength(50)
  assetCode!: string;

  @IsString() @MinLength(1) @MaxLength(255)
  name!: string;

  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() @MaxLength(255) serialNumber?: string;
  @IsOptional() @IsString() @MaxLength(255) manufacturer?: string;
  @IsOptional() @IsString() @MaxLength(255) model?: string;
  @IsOptional() @IsString() purchaseDate?: string;
  @IsOptional() @IsInt() @Min(0) purchaseCost?: number;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsUUID() locationId?: string;
  @IsOptional() @IsUUID() vendorId?: string;
  @IsOptional() @IsInt() @Min(0) usefulLife?: number;
  @IsOptional() @IsInt() @Min(0) residualValue?: number;
  @IsOptional() @IsString() inServiceDate?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateAssetDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() @MaxLength(255) serialNumber?: string;
  @IsOptional() @IsString() @MaxLength(255) manufacturer?: string;
  @IsOptional() @IsString() @MaxLength(255) model?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsUUID() locationId?: string;
  @IsOptional() @IsUUID() vendorId?: string;
  @IsOptional() @IsInt() @Min(0) usefulLife?: number;
  @IsOptional() @IsInt() @Min(0) residualValue?: number;
  @IsOptional() @IsString() notes?: string;
}

export class TransitionAssetDto {
  @IsString()
  targetStatus!: string;

  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() notes?: string;
}

export class ListAssetsDto {
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) page?: number = 1;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) limit?: number = 20;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() condition?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsUUID() locationId?: string;
  @IsOptional() @IsString() assignment?: string;
}

// ── Category DTOs ───────────────────────────────────────────────────────────

export class CreateAssetCategoryDto {
  @IsString() @MinLength(1) @MaxLength(255) name!: string;
  @IsString() @MinLength(1) @MaxLength(50) code!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsEnum(['IT_EQUIPMENT', 'OFFICE_EQUIPMENT', 'FURNITURE', 'VEHICLE', 'MACHINERY', 'TOOLS', 'SOFTWARE', 'OTHER']) categoryType?: string;
  @IsOptional() @IsInt() @Min(0) defaultUsefulLife?: number;
}

export class UpdateAssetCategoryDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsEnum(['IT_EQUIPMENT', 'OFFICE_EQUIPMENT', 'FURNITURE', 'VEHICLE', 'MACHINERY', 'TOOLS', 'SOFTWARE', 'OTHER']) categoryType?: string;
  @IsOptional() @IsInt() @Min(0) defaultUsefulLife?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// ── Location DTOs ───────────────────────────────────────────────────────────

export class CreateAssetLocationDto {
  @IsString() @MinLength(1) @MaxLength(255) name!: string;
  @IsString() @MinLength(1) @MaxLength(50) code!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsString() @MaxLength(255) building?: string;
  @IsOptional() @IsString() @MaxLength(100) floor?: string;
  @IsOptional() @IsString() @MaxLength(100) room?: string;
}

export class UpdateAssetLocationDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsString() @MaxLength(255) building?: string;
  @IsOptional() @IsString() @MaxLength(100) floor?: string;
  @IsOptional() @IsString() @MaxLength(100) room?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// ── Assignment DTOs ─────────────────────────────────────────────────────────

export class CreateAssignmentDto {
  @IsOptional() @IsUUID() employeeId?: string;
  @IsOptional() @IsUUID() projectId?: string;
  @IsOptional() @IsString() notes?: string;
}

export class ReturnAssetDto {
  @IsOptional() @IsString() notes?: string;
}

// ── Transfer DTOs ───────────────────────────────────────────────────────────

export class CreateTransferDto {
  @IsOptional() @IsUUID() toEmployeeId?: string;
  @IsOptional() @IsUUID() toBranchId?: string;
  @IsOptional() @IsUUID() toLocationId?: string;
  @IsOptional() @IsUUID() toProjectId?: string;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() notes?: string;
}

// ── Maintenance DTOs ────────────────────────────────────────────────────────

export class CreateMaintenanceDto {
  @IsEnum(['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY', 'INSPECTION', 'CALIBRATION']) type!: string;
  @IsString() @MinLength(1) @MaxLength(255) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() @MaxLength(20) priority?: string;
  @IsOptional() @IsString() scheduledDate?: string;
  @IsOptional() @IsString() @MaxLength(255) vendor?: string;
  @IsOptional() @IsInt() @Min(0) cost?: number;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsUUID() assignedToId?: string;
}

export class UpdateMaintenanceDto {
  @IsOptional() @IsString() @MaxLength(255) title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() @MaxLength(20) priority?: string;
  @IsOptional() @IsString() scheduledDate?: string;
  @IsOptional() @IsString() @MaxLength(255) vendor?: string;
  @IsOptional() @IsInt() @Min(0) cost?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsUUID() assignedToId?: string;
}

export class TransitionMaintenanceDto {
  @IsString()
  targetStatus!: string;
}

// ── Inspection DTOs ─────────────────────────────────────────────────────────

export class CreateInspectionDto {
  @IsString() @MinLength(1) @MaxLength(100) inspectionType!: string;
  @IsString() scheduledDate!: string;
  @IsOptional() @IsUUID() inspectorId?: string;
  @IsOptional() @IsString() notes?: string;
}

export class CompleteInspectionDto {
  @IsEnum(['PASSED', 'FAILED', 'REQUIRES_ACTION']) status!: string;
  @IsOptional() @IsString() condition?: string;
  @IsOptional() @IsString() findings?: string;
  @IsOptional() @IsString() notes?: string;
}

// ── Warranty DTOs ───────────────────────────────────────────────────────────

export class CreateWarrantyDto {
  @IsString() @MinLength(1) @MaxLength(255) provider!: string;
  @IsString() startDate!: string;
  @IsString() endDate!: string;
  @IsOptional() @IsString() @MaxLength(255) referenceNumber?: string;
  @IsOptional() @IsString() @MaxLength(500) coverage?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateWarrantyDto {
  @IsOptional() @IsString() @MaxLength(255) provider?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsString() @MaxLength(255) referenceNumber?: string;
  @IsOptional() @IsString() @MaxLength(500) coverage?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// ── Depreciation DTOs ───────────────────────────────────────────────────────

export class CalculateDepreciationDto {
  @IsString() periodStartDate!: string;
  @IsString() periodEndDate!: string;
}

// ── Disposal DTOs ───────────────────────────────────────────────────────────

export class DisposeAssetDto {
  @IsEnum(['SOLD', 'SCRAPPED', 'DONATED', 'LOST', 'RETURNED', 'OTHER']) disposalMethod!: string;
  @IsString() disposalDate!: string;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
  @IsOptional() @IsInt() @Min(0) proceeds?: number;
  @IsOptional() @IsString() notes?: string;
}
