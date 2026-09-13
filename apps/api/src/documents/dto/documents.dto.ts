/**
 * FusionOS Document Management DTOs
 */

import {
  IsString, IsOptional, IsEnum, IsUUID, IsInt, IsBoolean,
  MaxLength, Min,
} from 'class-validator';

// ── Document DTOs ────────────────────────────────────────────────────────

export class CreateDocumentDto {
  @IsString() @MaxLength(500) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() companyId?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsUUID() folderId?: string;
  @IsOptional() @IsUUID() ownerId?: string;
}

export class UpdateDocumentDto {
  @IsOptional() @IsString() @MaxLength(500) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsUUID() folderId?: string;
  @IsOptional() @IsUUID() ownerId?: string;
}

// ── Category DTOs ────────────────────────────────────────────────────────

export class CreateCategoryDto {
  @IsString() @MaxLength(100) name!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsString() @MaxLength(7) color?: string;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class UpdateCategoryDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsString() @MaxLength(7) color?: string;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// ── Folder DTOs ──────────────────────────────────────────────────────────

export class CreateFolderDto {
  @IsString() @MaxLength(255) name!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsUUID() parentId?: string;
}

export class UpdateFolderDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
}

// ── Entity Link DTOs ─────────────────────────────────────────────────────

export class LinkEntityDto {
  @IsEnum(['EMPLOYEE', 'CUSTOMER', 'CONTACT', 'LEAD', 'OPPORTUNITY', 'PROJECT', 'TASK', 'INVOICE', 'BILL', 'EXPENSE', 'PAYSLIP', 'COMPANY', 'BRANCH', 'DEPARTMENT', 'OTHER'] as const)
  entityType!: string;
  @IsUUID() entityId!: string;
}

// ── Permission DTOs ──────────────────────────────────────────────────────

export class UpdatePermissionDto {
  @IsUUID() employeeId!: string;
  @IsOptional() @IsBoolean() canRead?: boolean;
  @IsOptional() @IsBoolean() canDownload?: boolean;
  @IsOptional() @IsBoolean() canEdit?: boolean;
  @IsOptional() @IsBoolean() canDelete?: boolean;
  @IsOptional() @IsBoolean() canManage?: boolean;
}

// ── Search / List DTOs ───────────────────────────────────────────────────

export class ListDocumentsDto {
  @IsOptional() @IsUUID() companyId?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsUUID() folderId?: string;
  @IsOptional() @IsEnum(['ACTIVE', 'ARCHIVED', 'TRASHED'] as const) status?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsUUID() ownerId?: string;
  @IsOptional() @IsInt() @Min(1) page?: number;
  @IsOptional() @IsInt() @Min(1) limit?: number;
}
