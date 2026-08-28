/**
 * FusionOS Department DTOs
 *
 * Validation schemas for Department create and update operations.
 */

import {
  IsString,
  IsOptional,
  MaxLength,
  IsEnum,
  IsUUID,
  Matches,
} from 'class-validator';

export class CreateDepartmentDto {
  @IsUUID()
  companyId!: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'Code must be uppercase alphanumeric with hyphens or underscores',
  })
  code!: string;

  @IsOptional()
  @IsUUID()
  headId?: string;
}

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE'] as const)
  status?: 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  @IsUUID()
  branchId?: string | null;

  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @IsUUID()
  headId?: string | null;
}
