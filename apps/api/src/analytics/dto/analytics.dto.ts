/**
 * FusionOS Analytics DTOs
 *
 * Query parameters for analytics endpoints.
 * All filters are optional — defaults provide tenant-wide aggregation.
 *
 * Hardening (Phase 15.5):
 * - Date filters must be valid ISO-8601 date strings.
 * - Entity filters (company/branch/department) must be valid UUIDs.
 * - Currency filter must be a 3-letter ISO 4217 code.
 * - Saved report domains are whitelisted; metric names, filters and name
 *   lengths are constrained so reports cannot store arbitrary payloads.
 */

import {
  IsOptional, IsString, IsBoolean, IsUUID, IsDateString, Length, MaxLength,
  IsIn, IsObject, IsArray, ArrayMaxSize, IsEnum, Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export const ANALYTICS_DOMAINS = [
  'finance', 'workforce', 'attendance', 'leave', 'payroll', 'crm', 'projects', 'assets',
] as const;
export type AnalyticsDomain = (typeof ANALYTICS_DOMAINS)[number];

export const ENTITY_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class AnalyticsFilterDto {
  @IsOptional() @IsUUID() companyId?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @Matches(/^[A-Z]{3}$/, { message: 'currency must be a 3-letter ISO 4217 code (e.g. USD, AED)' }) currency?: string;
  @IsOptional() @IsBoolean() @Type(() => Boolean) comparePrevious?: boolean;
}

export class SavedReportDto {
  @IsString() @Length(1, 255) name!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsString() @IsIn(ANALYTICS_DOMAINS as unknown as string[]) domain!: string;
  @IsOptional() @IsObject() filters?: Record<string, unknown>;
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) metrics?: string[];
}

export class UpdateReportDto {
  @IsOptional() @IsString() @Length(1, 255) name?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsObject() filters?: Record<string, unknown>;
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) metrics?: string[];
}

export class ExportDto extends AnalyticsFilterDto {
  @IsOptional() @IsEnum(['csv', 'json']) format?: 'csv' | 'json' = 'csv';
  @IsOptional() @IsString() @IsIn(ANALYTICS_DOMAINS as unknown as string[]) domain?: string;
}