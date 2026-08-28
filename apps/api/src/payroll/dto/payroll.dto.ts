import {
  IsString, IsBoolean, IsOptional, IsInt, IsEnum, IsDateString,
  IsArray, ValidateNested, MaxLength, Min, ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Payroll Policy DTOs ─────────────────────────────────────────────────────

export class CreatePayrollPolicyDto {
  @IsString() @MaxLength(100) name!: string;
  @IsOptional() @IsString() companyId?: string;
  @IsInt() @Min(1) workingDaysPerWeek!: number;
  @IsInt() @Min(1) workingDaysPerMonth!: number;
  @IsEnum(['MONTHLY', 'BIWEEKLY', 'WEEKLY', 'DAILY']) payFrequency!: string;
  @IsEnum(['ATTENDANCE', 'MANUAL', 'HYBRID']) defaultCalcMode!: string;
  @IsBoolean() overtimeEnabled!: boolean;
  @IsInt() @Min(0) overtimeMultiplier!: number;
  @IsOptional() @IsInt() overtimeCapMinutes?: number;
  @IsBoolean() absenceDeduct!: boolean;
  @IsInt() @Min(1) absenceDivisor!: number;
  @IsInt() @Min(0) roundingPrecision!: number;
  @IsOptional() @IsString() roundingMode?: string;
}

export class UpdatePayrollPolicyDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsInt() workingDaysPerWeek?: number;
  @IsOptional() @IsInt() workingDaysPerMonth?: number;
  @IsOptional() @IsEnum(['MONTHLY', 'BIWEEKLY', 'WEEKLY', 'DAILY']) payFrequency?: string;
  @IsOptional() @IsEnum(['ATTENDANCE', 'MANUAL', 'HYBRID']) defaultCalcMode?: string;
  @IsOptional() @IsBoolean() overtimeEnabled?: boolean;
  @IsOptional() @IsInt() overtimeMultiplier?: number;
  @IsOptional() @IsInt() overtimeCapMinutes?: number;
  @IsOptional() @IsBoolean() absenceDeduct?: boolean;
  @IsOptional() @IsInt() absenceDivisor?: number;
  @IsOptional() @IsInt() roundingPrecision?: number;
  @IsOptional() @IsString() roundingMode?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// ── Payroll Component DTOs ──────────────────────────────────────────────────

export class CreatePayrollComponentDto {
  @IsString() @MaxLength(100) name!: string;
  @IsString() @MaxLength(30) code!: string;
  @IsEnum(['EARNING', 'DEDUCTION', 'EMPLOYER_CONTRIBUTION', 'REIMBURSEMENT']) type!: string;
  @IsBoolean() isStatutory!: boolean;
  @IsBoolean() isFixed!: boolean;
  @IsOptional() @IsInt() defaultValue?: number;
  @IsOptional() @IsString() calculationBasis?: string;
}

export class UpdatePayrollComponentDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsBoolean() isStatutory?: boolean;
  @IsOptional() @IsBoolean() isFixed?: boolean;
  @IsOptional() @IsInt() defaultValue?: number;
  @IsOptional() @IsString() calculationBasis?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// ── Salary Structure DTOs ───────────────────────────────────────────────────

export class SalaryStructureComponentDto {
  @IsString() componentId!: string;
  @IsInt() @Min(0) amount!: number;
}

export class CreateSalaryStructureDto {
  @IsString() employeeId!: string;
  @IsOptional() @IsString() companyId?: string;
  @IsOptional() @IsString() currency?: string;
  @IsEnum(['MONTHLY', 'BIWEEKLY', 'WEEKLY', 'DAILY']) payFrequency!: string;
  @IsInt() @Min(0) basicSalary!: number;
  @IsDateString() effectiveFrom!: string;
  @IsOptional() @IsDateString() effectiveTo?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SalaryStructureComponentDto)
  components?: SalaryStructureComponentDto[];
}

export class UpdateSalaryStructureDto {
  @IsOptional() @IsEnum(['MONTHLY', 'BIWEEKLY', 'WEEKLY', 'DAILY']) payFrequency?: string;
  @IsOptional() @IsInt() @Min(0) basicSalary?: number;
  @IsOptional() @IsDateString() effectiveTo?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() notes?: string;
}

// ── Payroll Period DTOs ─────────────────────────────────────────────────────

export class CreatePayrollPeriodDto {
  @IsString() @MaxLength(100) name!: string;
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
  @IsDateString() paymentDate!: string;
}

export class UpdatePayrollPeriodDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsDateString() paymentDate?: string;
}

// ── Payroll Run DTOs ────────────────────────────────────────────────────────

export class CreatePayrollRunDto {
  @IsString() periodId!: string;
  @IsEnum(['ATTENDANCE', 'MANUAL', 'HYBRID']) calculationMode!: string;
  @IsOptional() @IsString() employeeScope?: string;
  @IsOptional() @IsString() currency?: string; // Run-level default currency — overridden per-employee from SalaryStructure
}

// ── Payroll Adjustment DTOs ─────────────────────────────────────────────────

export class CreatePayrollAdjustmentDto {
  @IsString() lineId!: string;
  @IsEnum(['EARNING', 'DEDUCTION']) type!: string;
  @IsString() @MaxLength(30) code!: string;
  @IsString() @MaxLength(100) name!: string;
  @IsInt() @Min(1) amount!: number;
  @IsString() @MaxLength(500) reason!: string;
}

export class ReviewPayrollAdjustmentDto {
  @IsEnum(['APPROVED', 'REJECTED']) status!: string;
  @IsOptional() @IsString() @MaxLength(500) rejectionReason?: string;
}

// ── Payroll Run Action DTOs ─────────────────────────────────────────────────

export class ApprovePayrollRunDto {
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class FinalizePayrollRunDto {
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
