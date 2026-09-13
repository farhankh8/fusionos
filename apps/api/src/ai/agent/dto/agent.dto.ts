/**
 * FusionOS AI Agent DTOs
 *
 * Request/response DTOs for AI Agent endpoints.
 * All DTOs use whitelist validation.
 */

import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsObject,
} from 'class-validator';

// ── Agent CRUD ──────────────────────────────────────────────────────────

export class CreateAgentDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(['HR', 'FINANCE', 'CRM', 'PROJECTS', 'OPERATIONS'] as const)
  agentType!: 'HR' | 'FINANCE' | 'CRM' | 'PROJECTS' | 'OPERATIONS';

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsObject()
  configuration!: Record<string, unknown>;
}

export class UpdateAgentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsObject()
  configuration?: Record<string, unknown>;
}

export class ListAgentsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['HR', 'FINANCE', 'CRM', 'PROJECTS', 'OPERATIONS'] as const)
  agentType?: string;

  @IsOptional()
  @IsEnum(['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'] as const)
  status?: string;
}

// ── Version Management ──────────────────────────────────────────────────

export class SaveAgentVersionDto {
  @IsObject()
  configuration!: Record<string, unknown>;
}

// ── Agent Task ──────────────────────────────────────────────────────────

export class CreateAgentTaskDto {
  @IsString()
  @MaxLength(2000)
  goal!: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;
}

// ── Task Management ─────────────────────────────────────────────────────

export class ListAgentTasksDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsEnum(['PENDING', 'ANALYZING', 'PLANNING', 'WAITING_APPROVAL', 'EXECUTING', 'VERIFYING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'] as const)
  status?: string;
}

// ── Approval ────────────────────────────────────────────────────────────

export class ApproveAgentStepDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

// ── Response DTOs ───────────────────────────────────────────────────────

export interface AgentResponse {
  id: string;
  name: string;
  description: string | null;
  agentType: string;
  status: string;
  configuration: Record<string, unknown>;
  currentVersion: {
    id: string;
    versionNumber: number;
    status: string;
  } | null;
  createdBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentTaskResponse {
  id: string;
  goal: string;
  status: string;
  plan: Record<string, unknown> | null;
  riskAssessment: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  currentStep: number;
  totalSteps: number;
  toolCallCount: number;
  startedAt: Date | null;
  completedAt: Date | null;
  duration: number | null;
}
