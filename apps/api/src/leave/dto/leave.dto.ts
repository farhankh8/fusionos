import { IsString, IsBoolean, IsOptional, IsInt, IsEnum, IsDateString, MaxLength, Min } from 'class-validator';

// ── Leave Type DTOs ──────────────────────────────────────────────────────────

export class CreateLeaveTypeDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @MaxLength(20)
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsBoolean()
  isPaid!: boolean;

  @IsBoolean()
  requiresApproval!: boolean;

  @IsBoolean()
  requiresDocument!: boolean;

  @IsBoolean()
  allowHalfDay!: boolean;

  @IsBoolean()
  allowHourly!: boolean;

  @IsOptional()
  @IsInt()
  maxAccrualDays?: number;
}

export class UpdateLeaveTypeDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresDocument?: boolean;

  @IsOptional()
  @IsBoolean()
  allowHalfDay?: boolean;

  @IsOptional()
  @IsBoolean()
  allowHourly?: boolean;

  @IsOptional()
  @IsInt()
  maxAccrualDays?: number;

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE'])
  status?: string;
}

// ── Leave Policy DTOs ────────────────────────────────────────────────────────

export class CreateLeavePolicyDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  leaveTypeId!: string;

  @IsInt()
  @Min(0)
  entitlementDays!: number;

  @IsEnum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME'])
  accrualFrequency!: string;

  @IsInt()
  @Min(0)
  accrualAmount!: number;

  @IsBoolean()
  carryForward!: boolean;

  @IsOptional()
  @IsInt()
  carryForwardLimit?: number;

  @IsInt()
  @Min(0)
  minNoticeDays!: number;

  @IsOptional()
  @IsInt()
  maxConsecutiveDays?: number;
}

export class UpdateLeavePolicyDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  entitlementDays?: number;

  @IsOptional()
  @IsEnum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME'])
  accrualFrequency?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  accrualAmount?: number;

  @IsOptional()
  @IsBoolean()
  carryForward?: boolean;

  @IsOptional()
  @IsInt()
  carryForwardLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minNoticeDays?: number;

  @IsOptional()
  @IsInt()
  maxConsecutiveDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ── Leave Request DTOs ───────────────────────────────────────────────────────

export class CreateLeaveRequestDto {
  @IsString()
  leaveTypeId!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsEnum(['FULL_DAY', 'HALF_DAY', 'HOURS'])
  unit!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  attachmentUrl?: string;
}

export class ReviewLeaveRequestDto {
  @IsEnum(['APPROVED', 'REJECTED'])
  status!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewNotes?: string;
}

export class CancelLeaveRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancellationReason?: string;
}

// ── Holiday DTOs ─────────────────────────────────────────────────────────────

export class CreateHolidayDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}

export class UpdateHolidayDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ── Balance Adjustment DTO ───────────────────────────────────────────────────

export class AdjustBalanceDto {
  @IsString()
  employeeId!: string;

  @IsString()
  leaveTypeId!: string;

  @IsInt()
  amount!: number;

  @IsString()
  @MaxLength(500)
  reason!: string;
}