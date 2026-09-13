/**
 * FusionOS Automation DTOs
 *
 * Input validation for all automation API endpoints.
 * Uses class-validator for whitelist-based validation.
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
  IsInt,
  Min,
  Max,
  ValidateNested,
  IsObject,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Workflow CRUD ───────────────────────────────────────────────────────────

export class CreateWorkflowDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;
}

export class UpdateWorkflowDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

// ── Workflow List/Filter ────────────────────────────────────────────────────

export class ListWorkflowsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED'] as const)
  status?: string;

  @IsOptional()
  @IsString()
  triggerType?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;
}

// ── Version Config ──────────────────────────────────────────────────────────

export interface TriggerConfig {
  type: 'DOMAIN_EVENT';
  entityType: string;
  eventType: string;
}

export interface ConditionField {
  entity: string;
  field: string;
  operator: string;
  value: unknown;
}

export interface ConditionGroup {
  logic: 'AND' | 'OR';
  conditions: ConditionField[];
  groups?: ConditionGroup[];
}

export interface ActionConfig {
  type: string;
  config: Record<string, unknown>;
}

export class SaveVersionConfigDto {
  @IsObject()
  triggerConfig!: TriggerConfig;

  @IsOptional()
  @IsObject()
  conditionConfig?: ConditionGroup;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  actionsConfig!: ActionConfig[];
}

// ── Execution ───────────────────────────────────────────────────────────────

export class ListExecutionsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsUUID()
  workflowId?: string;

  @IsOptional()
  @IsEnum(['PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'SKIPPED'] as const)
  status?: string;

  @IsOptional()
  @IsString()
  triggerType?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

// ── Approval ────────────────────────────────────────────────────────────────

export class ApproveRejectDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

// ── Validate Workflow ───────────────────────────────────────────────────────

export class ValidateWorkflowDto {
  @IsOptional()
  @IsObject()
  versionConfig?: SaveVersionConfigDto;
}

// ── Dashboard KPIs ──────────────────────────────────────────────────────────

export interface AutomationDashboardKPIs {
  activeWorkflows: number;
  draftWorkflows: number;
  pausedWorkflows: number;
  executionsToday: number;
  successfulExecutions: number;
  failedExecutions: number;
  pendingApprovals: number;
}
