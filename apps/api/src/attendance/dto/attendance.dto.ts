/**
 * FusionOS Attendance DTOs
 *
 * Validation schemas for attendance operations.
 * Uses class-validator for NestJS ValidationPipe integration.
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  MaxLength,
  IsObject,
} from 'class-validator';

// ── Clock In / Clock Out ───────────────────────────────────────────────────

export class ClockInDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string; // Optional: HR can clock in for employee

  @IsOptional()
  @IsDateString()
  eventTime?: string; // Optional: defaults to server time

  @IsOptional()
  @IsEnum(['WEB', 'DESKTOP', 'MOBILE', 'ADMIN', 'API'] as const)
  source?: 'WEB' | 'DESKTOP' | 'MOBILE' | 'ADMIN' | 'API';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sourceRef?: string;
}

export class ClockOutDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsDateString()
  eventTime?: string;

  @IsOptional()
  @IsEnum(['WEB', 'DESKTOP', 'MOBILE', 'ADMIN', 'API'] as const)
  source?: 'WEB' | 'DESKTOP' | 'MOBILE' | 'ADMIN' | 'API';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

// ── Breaks ────────────────────────────────────────────────────────────────

export class BreakStartDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsDateString()
  eventTime?: string;

  @IsOptional()
  @IsEnum(['WEB', 'DESKTOP', 'MOBILE', 'ADMIN'] as const)
  source?: 'WEB' | 'DESKTOP' | 'MOBILE' | 'ADMIN';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  idempotencyKey?: string;
}

export class BreakEndDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsDateString()
  eventTime?: string;

  @IsOptional()
  @IsEnum(['WEB', 'DESKTOP', 'MOBILE', 'ADMIN'] as const)
  source?: 'WEB' | 'DESKTOP' | 'MOBILE' | 'ADMIN';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  idempotencyKey?: string;
}

// ── Corrections ───────────────────────────────────────────────────────────

export class CreateCorrectionDto {
  @IsUUID()
  attendanceId!: string;

  @IsString()
  @MaxLength(50)
  correctionType!: string; // e.g., "clock_in_adjustment", "clock_out_add", "break_adjustment"

  @IsOptional()
  @IsObject()
  originalValue?: Record<string, unknown>;

  @IsObject()
  newValue!: Record<string, unknown>;

  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class ReviewCorrectionDto {
  @IsEnum(['APPROVED', 'REJECTED'] as const)
  status!: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewNotes?: string;
}

// ── Query DTOs ────────────────────────────────────────────────────────────

export class AttendanceQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsEnum(['PRESENT', 'ABSENT', 'HALF_DAY', 'LATE', 'EARLY_DEPARTURE', 'OVERTIME', 'ON_LEAVE', 'HOLIDAY', 'WEEK_OFF', 'INCOMPLETE'] as const)
  status?: string;

  @IsOptional()
  @IsEnum(['DRAFT', 'CONFIRMED', 'LOCKED'] as const)
  recordStatus?: string;

  @IsOptional()
  page?: string;

  @IsOptional()
  limit?: string;

  @IsOptional()
  sortBy?: string;

  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
