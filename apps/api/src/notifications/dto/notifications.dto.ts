/**
 * FusionOS Notification DTOs
 *
 * Request/response validation for the notification API.
 * Follows existing FusionOS DTO conventions with class-validator.
 */

import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  IsUUID,
  MaxLength,
  MinLength,
  IsInt,
  Min,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Query DTOs ──────────────────────────────────────────────────────────────

export class ListNotificationsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  unreadOnly?: boolean;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  severity?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

// ── Read/Unread DTOs ────────────────────────────────────────────────────────

export class MarkReadDto {
  @IsOptional()
  @IsBoolean()
  read?: boolean = true;
}

export class MarkAllReadDto {
  // No body needed — marks all as read
}

// ── Preference DTOs ─────────────────────────────────────────────────────────

export class UpdateNotificationPreferenceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  notificationType!: string;

  @IsEnum(['IN_APP', 'EMAIL'] as const)
  channel!: 'IN_APP' | 'EMAIL';

  @IsBoolean()
  enabled!: boolean;
}

export class BulkUpdatePreferencesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateNotificationPreferenceDto)
  preferences!: UpdateNotificationPreferenceDto[];
}

// ── Template DTOs ───────────────────────────────────────────────────────────

export class CreateNotificationTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  notificationType!: string;

  @IsEnum(['IN_APP', 'EMAIL'] as const)
  channel!: 'IN_APP' | 'EMAIL';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  subject?: string;

  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @IsOptional()
  @IsBoolean()
  isSystemDefault?: boolean;
}

export class UpdateNotificationTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  subject?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  body?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @IsOptional()
  @IsEnum(['DRAFT', 'ACTIVE', 'ARCHIVED'] as const)
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
}

// ── Delivery DTOs ───────────────────────────────────────────────────────────

export class ListDeliveriesDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  notificationId?: string;
}

// ── Manual Send DTO ─────────────────────────────────────────────────────────

export class SendNotificationDto {
  @IsUUID()
  recipientUserId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  type!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title!: string;

  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsEnum(['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'CRITICAL'] as const)
  severity?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CRITICAL' = 'INFO';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  actionUrl?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

// ── Dashboard DTO ───────────────────────────────────────────────────────────

export class NotificationDashboardDto {
  unreadCount: number = 0;
  totalCount: number = 0;
  recentNotifications: any[] = [];
}
