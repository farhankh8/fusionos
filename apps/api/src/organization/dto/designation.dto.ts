/**
 * FusionOS Designation DTOs
 *
 * Validation schemas for Designation create and update operations.
 */

import {
  IsString,
  IsOptional,
  MaxLength,
  IsBoolean,
  IsInt,
  IsUUID,
  Matches,
} from 'class-validator';

export class CreateDesignationDto {
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
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsInt()
  level?: number;
}

export class UpdateDesignationDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsInt()
  level?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
