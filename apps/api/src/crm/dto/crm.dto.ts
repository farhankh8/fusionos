/**
 * FusionOS CRM DTOs
 * Validation schemas for all CRM operations.
 */

import {
  IsString, IsOptional, IsEnum, IsUUID, IsInt, IsDateString,
  IsBoolean, IsEmail, MaxLength, Min, Max,
} from 'class-validator';

// ── Customer Profile DTOs ────────────────────────────────────────────────

export class CreateCustomerProfileDto {
  @IsUUID() companyId!: string;
  @IsUUID() customerId!: string;
  @IsOptional() @IsEnum(['WEBSITE', 'REFERRAL', 'COLD_CALL', 'EMAIL_CAMPAIGN', 'SOCIAL_MEDIA', 'TRADE_SHOW', 'PARTNER', 'ORGANIC', 'OTHER'] as const) source?: string;
  @IsOptional() @IsEnum(['INDIVIDUAL', 'BUSINESS', 'ENTERPRISE'] as const) customerType?: string;
  @IsOptional() @IsEnum(['STANDARD', 'PREMIUM', 'ENTERPRISE', 'VIP'] as const) customerSegment?: string;
  @IsOptional() @IsEnum(['LEAD', 'PROSPECT', 'CUSTOMER', 'INACTIVE', 'CHURNED'] as const) lifecycleStage?: string;
  @IsOptional() @IsString() @MaxLength(100) industry?: string;
  @IsOptional() @IsString() @MaxLength(500) website?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() ownerId?: string;
  @IsOptional() @IsInt() annualRevenue?: number;
  @IsOptional() @IsInt() employeeCount?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) rating?: number;
  @IsOptional() @IsString() @MaxLength(500) tags?: string;
}

export class UpdateCustomerProfileDto {
  @IsOptional() @IsEnum(['INDIVIDUAL', 'BUSINESS', 'ENTERPRISE'] as const) customerType?: string;
  @IsOptional() @IsEnum(['STANDARD', 'PREMIUM', 'ENTERPRISE', 'VIP'] as const) customerSegment?: string;
  @IsOptional() @IsEnum(['LEAD', 'PROSPECT', 'CUSTOMER', 'INACTIVE', 'CHURNED'] as const) lifecycleStage?: string;
  @IsOptional() @IsString() @MaxLength(100) industry?: string;
  @IsOptional() @IsString() @MaxLength(500) website?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() ownerId?: string;
  @IsOptional() @IsInt() annualRevenue?: number;
  @IsOptional() @IsInt() employeeCount?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) rating?: number;
  @IsOptional() @IsString() @MaxLength(500) tags?: string;
}

// ── Contact DTOs ─────────────────────────────────────────────────────────

export class CreateContactDto {
  @IsUUID() companyId!: string;
  @IsUUID() customerProfileId!: string;
  @IsString() @MaxLength(255) firstName!: string;
  @IsString() @MaxLength(255) lastName!: string;
  @IsOptional() @IsString() @MaxLength(255) jobTitle?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsString() @MaxLength(50) mobile?: string;
  @IsOptional() @IsString() @MaxLength(100) department?: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateContactDto {
  @IsOptional() @IsString() @MaxLength(255) firstName?: string;
  @IsOptional() @IsString() @MaxLength(255) lastName?: string;
  @IsOptional() @IsString() @MaxLength(255) jobTitle?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsString() @MaxLength(50) mobile?: string;
  @IsOptional() @IsString() @MaxLength(100) department?: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
  @IsOptional() @IsString() notes?: string;
}

// ── Lead DTOs ────────────────────────────────────────────────────────────

export class CreateLeadDto {
  @IsUUID() companyId!: string;
  @IsString() @MaxLength(255) firstName!: string;
  @IsOptional() @IsString() @MaxLength(255) lastName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsString() @MaxLength(255) companyName?: string;
  @IsOptional() @IsEnum(['WEBSITE', 'REFERRAL', 'COLD_CALL', 'EMAIL_CAMPAIGN', 'SOCIAL_MEDIA', 'TRADE_SHOW', 'PARTNER', 'ORGANIC', 'OTHER'] as const) source?: string;
  @IsOptional() @IsUUID() ownerId?: string;
  @IsOptional() @IsInt() @Min(1) @Max(5) rating?: number;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateLeadDto {
  @IsOptional() @IsString() @MaxLength(255) firstName?: string;
  @IsOptional() @IsString() @MaxLength(255) lastName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsString() @MaxLength(255) companyName?: string;
  @IsOptional() @IsEnum(['WEBSITE', 'REFERRAL', 'COLD_CALL', 'EMAIL_CAMPAIGN', 'SOCIAL_MEDIA', 'TRADE_SHOW', 'PARTNER', 'ORGANIC', 'OTHER'] as const) source?: string;
  @IsOptional() @IsUUID() ownerId?: string;
  @IsOptional() @IsInt() @Min(1) @Max(5) rating?: number;
  @IsOptional() @IsString() notes?: string;
}

export class QualifyLeadDto {
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class ConvertLeadDto {
  @IsOptional() @IsUUID() existingCustomerId?: string;
  @IsOptional() @IsString() @MaxLength(255) customerName?: string;
  @IsOptional() @IsString() @MaxLength(50) customerCode?: string;
  @IsOptional() @IsString() @MaxLength(255) customerEmail?: string;
  @IsOptional() @IsString() @MaxLength(50) customerPhone?: string;
  @IsOptional() @IsUUID() companyId?: string;
}

export class DisqualifyLeadDto {
  @IsString() @MaxLength(500) reason!: string;
}

// ── Opportunity DTOs ─────────────────────────────────────────────────────

export class CreateOpportunityDto {
  @IsUUID() companyId!: string;
  @IsUUID() customerProfileId!: string;
  @IsOptional() @IsUUID() contactId?: string;
  @IsOptional() @IsUUID() ownerId?: string;
  @IsString() @MaxLength(255) name!: string;
  @IsOptional() @IsEnum(['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'] as const) stage?: string;
  @IsOptional() @IsInt() amount?: number;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) probability?: number;
  @IsOptional() @IsDateString() expectedCloseDate?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(['WEBSITE', 'REFERRAL', 'COLD_CALL', 'EMAIL_CAMPAIGN', 'SOCIAL_MEDIA', 'TRADE_SHOW', 'PARTNER', 'ORGANIC', 'OTHER'] as const) source?: string;
}

export class UpdateOpportunityDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsEnum(['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'] as const) stage?: string;
  @IsOptional() @IsInt() amount?: number;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) probability?: number;
  @IsOptional() @IsDateString() expectedCloseDate?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() contactId?: string;
  @IsOptional() @IsUUID() ownerId?: string;
}

// ── Activity DTOs ────────────────────────────────────────────────────────

export class CreateActivityDto {
  @IsUUID() companyId!: string;
  @IsUUID() customerProfileId!: string;
  @IsOptional() @IsUUID() contactId?: string;
  @IsOptional() @IsUUID() leadId?: string;
  @IsOptional() @IsUUID() opportunityId?: string;
  @IsEnum(['CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK', 'FOLLOW_UP'] as const) activityType!: string;
  @IsString() @MaxLength(255) subject!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsDateString() completedAt?: string;
}

// ── Task DTOs ────────────────────────────────────────────────────────────

export class CreateTaskDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsUUID() customerProfileId?: string;
  @IsOptional() @IsUUID() contactId?: string;
  @IsOptional() @IsUUID() leadId?: string;
  @IsOptional() @IsUUID() opportunityId?: string;
  @IsString() @MaxLength(255) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() assigneeId?: string;
  @IsOptional() @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const) priority?: string;
  @IsOptional() @IsDateString() dueDate?: string;
}

export class UpdateTaskDto {
  @IsOptional() @IsString() @MaxLength(255) title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() assigneeId?: string;
  @IsOptional() @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const) priority?: string;
  @IsOptional() @IsEnum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const) status?: string;
  @IsOptional() @IsDateString() dueDate?: string;
}

// ── Note DTOs ────────────────────────────────────────────────────────────

export class CreateNoteDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsUUID() customerProfileId?: string;
  @IsOptional() @IsUUID() leadId?: string;
  @IsOptional() @IsUUID() opportunityId?: string;
  @IsString() content!: string;
}

export class UpdateNoteDto {
  @IsString() content!: string;
}

// ── Dashboard DTOs ───────────────────────────────────────────────────────

export class CrmDashboardDto {
  @IsUUID() companyId!: string;
}
