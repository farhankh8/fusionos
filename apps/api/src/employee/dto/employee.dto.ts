/**
 * FusionOS Employee DTOs
 *
 * Validation schemas for Employee create, update, and status change operations.
 * Comprehensive validation ensures data integrity at the API boundary.
 */

import {
  IsString,
  IsOptional,
  MaxLength,
  IsEmail,
  IsEnum,
  IsUUID,
  IsDateString,
  IsObject,
  IsInt,
  Matches,
} from 'class-validator';

export class CreateEmployeeDto {
  @IsUUID()
  companyId!: string;

  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'Employee code must be uppercase alphanumeric with hyphens or underscores',
  })
  employeeCode!: string;

  @IsString()
  @MaxLength(255)
  firstName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  middleName?: string;

  @IsString()
  @MaxLength(255)
  lastName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  preferredName?: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] as const)
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

  @IsOptional()
  @IsEnum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'OTHER'] as const)
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | 'OTHER';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationality?: string;

  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>;

  // Employment
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsOptional()
  @IsUUID()
  designationId?: string;

  @IsOptional()
  @IsUUID()
  managerId?: string;

  @IsDateString()
  joiningDate!: string;

  @IsOptional()
  @IsDateString()
  probationEndDate?: string;

  @IsOptional()
  @IsDateString()
  confirmationDate?: string;

  @IsOptional()
  @IsEnum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'TEMPORARY'] as const)
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN' | 'TEMPORARY';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  workLocation?: string;

  // Salary
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsInt()
  basicSalary?: number;

  // Emergency Contact
  @IsOptional()
  @IsString()
  @MaxLength(255)
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  emergencyContactRelation?: string;

  // Additional
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // User linkage
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  middleName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  preferredName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] as const)
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

  @IsOptional()
  @IsEnum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'OTHER'] as const)
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | 'OTHER';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationality?: string;

  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>;

  // Employment
  @IsOptional()
  @IsUUID()
  branchId?: string | null;

  @IsOptional()
  @IsUUID()
  departmentId?: string | null;

  @IsOptional()
  @IsUUID()
  teamId?: string | null;

  @IsOptional()
  @IsUUID()
  designationId?: string | null;

  @IsOptional()
  @IsUUID()
  managerId?: string | null;

  @IsOptional()
  @IsDateString()
  probationEndDate?: string;

  @IsOptional()
  @IsDateString()
  confirmationDate?: string;

  @IsOptional()
  @IsEnum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'TEMPORARY'] as const)
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN' | 'TEMPORARY';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  workLocation?: string;

  // Salary
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsInt()
  basicSalary?: number;

  // Emergency Contact
  @IsOptional()
  @IsString()
  @MaxLength(255)
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  emergencyContactRelation?: string;

  // Additional
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // User linkage
  @IsOptional()
  @IsUUID()
  userId?: string | null;
}

export class UpdateEmployeeStatusDto {
  @IsEnum(['DRAFT', 'ACTIVE', 'PROBATION', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED', 'RETIRED', 'INACTIVE'] as const)
  status!:
    | 'DRAFT'
    | 'ACTIVE'
    | 'PROBATION'
    | 'ON_LEAVE'
    | 'SUSPENDED'
    | 'TERMINATED'
    | 'RESIGNED'
    | 'RETIRED'
    | 'INACTIVE';

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
