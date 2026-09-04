/**
 * FusionOS Notification Controller
 *
 * REST API for the notification system.
 * Every endpoint enforces: authentication, tenant isolation, RBAC.
 *
 * Endpoints:
 *   GET    /notifications                    — List notifications
 *   GET    /notifications/dashboard          — Dashboard data (unread + recent)
 *   GET    /notifications/unread-count       — Unread count
 *   GET    /notifications/:id                — Single notification
 *   PATCH  /notifications/:id/read           — Mark as read
 *   PATCH  /notifications/:id/unread         — Mark as unread
 *   POST   /notifications/read-all           — Mark all as read
 *   POST   /notifications/send               — Manual send (admin)
 *
 *   GET    /notifications/preferences        — List preferences
 *   PATCH  /notifications/preferences        — Update preferences
 *
 *   GET    /notifications/templates          — List templates
 *   POST   /notifications/templates          — Create template
 *   GET    /notifications/templates/:id      — Get template
 *   PATCH  /notifications/templates/:id      — Update template
 *
 *   GET    /notifications/deliveries         — List delivery records
 *   GET    /notifications/deliveries/:id     — Get delivery record
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CurrentTenant, RequirePermission } from '../common/decorators';
import type { TenantContext } from '../auth/services/tenant-context.service';
import { NotificationService } from './services/notification.service';
import {
  ListNotificationsDto,
  UpdateNotificationPreferenceDto,
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
  ListDeliveriesDto,
  SendNotificationDto,
} from './dto/notifications.dto';

@Controller('notifications') // global prefix 'api/v1' applies — do NOT repeat it here
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  // ── Notifications ──────────────────────────────────────────────────────────

  @Get()
  @RequirePermission('notification:read')
  async listNotifications(
    @CurrentTenant() ctx: TenantContext,
    @Query() dto: ListNotificationsDto,
  ) {
    return this.notificationService.listNotifications(ctx, dto);
  }

  @Get('dashboard')
  @RequirePermission('notification:read')
  async getDashboard(@CurrentTenant() ctx: TenantContext) {
    return this.notificationService.getDashboard(ctx);
  }

  @Get('unread-count')
  @RequirePermission('notification:read')
  async getUnreadCount(@CurrentTenant() ctx: TenantContext) {
    return this.notificationService.getUnreadCount(ctx);
  }

  @Get(':id')
  @RequirePermission('notification:read')
  async findOne(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationService.findOneNotification(ctx, id);
  }

  @Patch(':id/read')
  @RequirePermission('notification:read')
  async markAsRead(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationService.markAsRead(ctx, id);
  }

  @Patch(':id/unread')
  @RequirePermission('notification:read')
  async markAsUnread(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationService.markAsUnread(ctx, id);
  }

  @Post('read-all')
  @RequirePermission('notification:read')
  async markAllAsRead(@CurrentTenant() ctx: TenantContext) {
    return this.notificationService.markAllAsRead(ctx);
  }

  @Post('send')
  @RequirePermission('notification:send')
  async sendNotification(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: SendNotificationDto,
  ) {
    return this.notificationService.sendManualNotification(ctx, dto);
  }

  // ── Preferences ────────────────────────────────────────────────────────────

  @Get('preferences/list')
  @RequirePermission('notification:preference:read')
  async listPreferences(@CurrentTenant() ctx: TenantContext) {
    return this.notificationService.getPreferences(ctx);
  }

  @Patch('preferences')
  @RequirePermission('notification:preference:update')
  async updatePreference(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    return this.notificationService.updatePreference(ctx, dto);
  }

  // ── Templates ──────────────────────────────────────────────────────────────

  @Get('templates/list')
  @RequirePermission('notification:template:read')
  async listTemplates(@CurrentTenant() ctx: TenantContext) {
    return this.notificationService.findAllTemplates(ctx);
  }

  @Post('templates')
  @RequirePermission('notification:template:create')
  async createTemplate(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: CreateNotificationTemplateDto,
  ) {
    return this.notificationService.createTemplate(ctx, dto);
  }

  @Get('templates/:id')
  @RequirePermission('notification:template:read')
  async findOneTemplate(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationService.findOneTemplate(ctx, id);
  }

  @Patch('templates/:id')
  @RequirePermission('notification:template:update')
  async updateTemplate(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNotificationTemplateDto,
  ) {
    return this.notificationService.updateTemplate(ctx, id, dto);
  }

  // ── Deliveries ─────────────────────────────────────────────────────────────

  @Get('deliveries/list')
  @RequirePermission('notification:delivery:read')
  async listDeliveries(
    @CurrentTenant() ctx: TenantContext,
    @Query() dto: ListDeliveriesDto,
  ) {
    return this.notificationService.findAllDeliveries(ctx, dto);
  }

  @Get('deliveries/:id')
  @RequirePermission('notification:delivery:read')
  async findOneDelivery(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationService.findOneDelivery(ctx, id);
  }
}
