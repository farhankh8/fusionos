/**
 * FusionOS Team DTOs
 *
 * Validation schemas for Team create and update operations.
 */

import {
  IsString,
  IsOptional,
  MaxLength,
  IsEnum,
  IsUUID,
  Matches,
} from 'class-validator';

export class CreateTeamDto {
  @IsUUID()
  companyId!: string;

  @IsUUID()
  departmentId!: string;

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
  managerId?: string;
}

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE'] as const)
  status?: 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  @IsUUID()
  managerId?: string | null;
}
