/**
 * FusionOS Project Management DTOs
 * Validation schemas for all Project operations.
 */

import {
  IsString, IsOptional, IsEnum, IsUUID, IsInt, IsDateString,
  IsBoolean, MaxLength, Min, Max,
} from 'class-validator';

// ── Project DTOs ────────────────────────────────────────────────────────

export class CreateProjectDto {
  @IsUUID() companyId!: string;
  @IsString() @MaxLength(50) code!: string;
  @IsString() @MaxLength(255) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() projectManagerId?: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsUUID() opportunityId?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsDateString() plannedStartDate?: string;
  @IsOptional() @IsDateString() plannedEndDate?: string;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsOptional() @IsInt() budgetAmount?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number;
}

export class UpdateProjectDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() projectManagerId?: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsDateString() plannedStartDate?: string;
  @IsOptional() @IsDateString() plannedEndDate?: string;
  @IsOptional() @IsDateString() actualStartDate?: string;
  @IsOptional() @IsDateString() actualEndDate?: string;
  @IsOptional() @IsInt() budgetAmount?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
}

export class TransitionProjectDto {
  @IsEnum(['DRAFT', 'PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'ARCHIVED'] as const)
  status!: string;
}

// ── Project Member DTOs ─────────────────────────────────────────────────

export class AddProjectMemberDto {
  @IsUUID() employeeId!: string;
  @IsOptional() @IsEnum(['PROJECT_MANAGER', 'PROJECT_LEAD', 'DEVELOPER', 'DESIGNER', 'ANALYST', 'QA', 'CONSULTANT', 'VIEWER'] as const) role?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) allocatedPct?: number;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}

export class UpdateProjectMemberDto {
  @IsOptional() @IsEnum(['PROJECT_MANAGER', 'PROJECT_LEAD', 'DEVELOPER', 'DESIGNER', 'ANALYST', 'QA', 'CONSULTANT', 'VIEWER'] as const) role?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) allocatedPct?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsDateString() endDate?: string;
}

// ── Project Task DTOs ───────────────────────────────────────────────────

export class CreateProjectTaskDto {
  @IsString() @MaxLength(255) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() parentTaskId?: string;
  @IsOptional() @IsUUID() assigneeId?: string;
  @IsOptional() @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const) priority?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsInt() estimatedMinutes?: number;
}

export class UpdateProjectTaskDto {
  @IsOptional() @IsString() @MaxLength(255) title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'IN_REVIEW', 'COMPLETED', 'CANCELLED'] as const) status?: string;
  @IsOptional() @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const) priority?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number;
  @IsOptional() @IsUUID() assigneeId?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsInt() estimatedMinutes?: number;
  @IsOptional() @IsInt() actualMinutes?: number;
}

// ── Milestone DTOs ──────────────────────────────────────────────────────

export class CreateMilestoneDto {
  @IsString() @MaxLength(255) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsDateString() targetDate?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class UpdateMilestoneDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsDateString() targetDate?: string;
  @IsOptional() @IsDateString() completedDate?: string;
  @IsOptional() @IsEnum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'] as const) status?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number;
  @IsOptional() @IsInt() sortOrder?: number;
}

// ── Time Entry DTOs ─────────────────────────────────────────────────────

export class CreateTimeEntryDto {
  @IsUUID() employeeId!: string;
  @IsDateString() date!: string;
  @IsInt() @Min(1) durationMinutes!: number;
  @IsOptional() @IsUUID() taskId?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsBoolean() isBillable?: boolean;
}

export class UpdateTimeEntryDto {
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsInt() @Min(1) durationMinutes?: number;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsBoolean() isBillable?: boolean;
  @IsOptional() @IsEnum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const) status?: string;
}

// ── Budget DTOs ─────────────────────────────────────────────────────────

export class CreateBudgetDto {
  @IsInt() @Min(0) budgetAmount!: number;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
}

export class UpdateBudgetDto {
  @IsOptional() @IsInt() @Min(0) budgetAmount?: number;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
}
