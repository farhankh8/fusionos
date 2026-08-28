/**
 * FusionOS Branch DTOs
 *
 * Validation schemas for Branch create and update operations.
 */

import {
  IsString,
  IsOptional,
  MaxLength,
  IsEmail,
  IsEnum,
  IsObject,
  IsUUID,
  Matches,
} from 'class-validator';

export class CreateBranchDto {
  @IsUUID()
  companyId!: string;

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
  @IsObject()
  address?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;
}

export class UpdateBranchDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE'] as const)
  status?: 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;
}
