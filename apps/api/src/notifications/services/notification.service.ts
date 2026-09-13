/**
 * FusionOS Notification Service
 *
 * Core notification engine handling CRUD, read/unread state, preferences,
 * templates, deliveries, and admin operations.
 *
 * Design principles:
 * - All operations are tenant-scoped
 * - Recipient validation is server-side
 * - Idempotent where applicable
 * - Does not bypass existing auth/RBAC
 * - Finance/payroll notifications are privacy-safe
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import type { TenantContext } from '../../auth/services/tenant-context.service';
import { AuditLogService } from '../../common/services/audit-log.service';
import {
  ListNotificationsDto,
  UpdateNotificationPreferenceDto,
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
  ListDeliveriesDto,
  SendNotificationDto,
} from '../dto/notifications.dto';

// Default notification type → channel defaults
const DEFAULT_CHANNEL_PREFERENCES: Record<string, { IN_APP: boolean; EMAIL: boolean; mandatory: boolean }> = {
  SECURITY: { IN_APP: true, EMAIL: true, mandatory: true },
  LEAVE_SUBMITTED: { IN_APP: true, EMAIL: false, mandatory: false },
  LEAVE_APPROVED: { IN_APP: true, EMAIL: true, mandatory: false },
  LEAVE_REJECTED: { IN_APP: true, EMAIL: true, mandatory: false },
  LEAVE_CANCELLED: { IN_APP: true, EMAIL: false, mandatory: false },
  PAYROLL_READY_FOR_REVIEW: { IN_APP: true, EMAIL: false, mandatory: false },
  PAYROLL_APPROVED: { IN_APP: true, EMAIL: false, mandatory: false },
  PAYROLL_FINALIZED: { IN_APP: true, EMAIL: true, mandatory: false },
  PAYSLIP_GENERATED: { IN_APP: true, EMAIL: true, mandatory: false },
  INVOICE_CREATED: { IN_APP: true, EMAIL: false, mandatory: false },
  INVOICE_OVERDUE: { IN_APP: true, EMAIL: true, mandatory: false },
  PAYMENT_RECEIVED: { IN_APP: true, EMAIL: false, mandatory: false },
  PAYMENT_FAILED: { IN_APP: true, EMAIL: true, mandatory: false },
  OPPORTUNITY_CREATED: { IN_APP: true, EMAIL: false, mandatory: false },
  OPPORTUNITY_STAGE_CHANGED: { IN_APP: true, EMAIL: false, mandatory: false },
  OPPORTUNITY_WON: { IN_APP: true, EMAIL: true, mandatory: false },
  OPPORTUNITY_LOST: { IN_APP: true, EMAIL: false, mandatory: false },
  PROJECT_ASSIGNED: { IN_APP: true, EMAIL: true, mandatory: false },
  PROJECT_TASK_ASSIGNED: { IN_APP: true, EMAIL: false, mandatory: false },
  PROJECT_TASK_COMPLETED: { IN_APP: true, EMAIL: false, mandatory: false },
  DOCUMENT_SHARED: { IN_APP: true, EMAIL: true, mandatory: false },
  DOCUMENT_UPLOADED: { IN_APP: true, EMAIL: false, mandatory: false },
  EMPLOYEE_CREATED: { IN_APP: true, EMAIL: false, mandatory: false },
  EMPLOYEE_STATUS_CHANGED: { IN_APP: true, EMAIL: false, mandatory: false },
  ASSET_CREATED: { IN_APP: true, EMAIL: false, mandatory: false },
  ASSET_ASSIGNED: { IN_APP: true, EMAIL: true, mandatory: false },
  ASSET_TRANSFERRED: { IN_APP: true, EMAIL: false, mandatory: false },
  ASSET_MAINTENANCE_SCHEDULED: { IN_APP: true, EMAIL: false, mandatory: false },
  ASSET_MAINTENANCE_COMPLETED: { IN_APP: true, EMAIL: false, mandatory: false },
  ASSET_INSPECTION_FAILED: { IN_APP: true, EMAIL: true, mandatory: false },
  ASSET_DISPOSED: { IN_APP: true, EMAIL: false, mandatory: false },
  ASSET_RETIRED: { IN_APP: true, EMAIL: false, mandatory: false },
};

// Event type → notification type mapping
export const EVENT_NOTIFICATION_MAP: Record<string, { type: string; category: string; severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CRITICAL' }> = {
  'leave.approved': { type: 'LEAVE_APPROVED', category: 'LEAVE', severity: 'SUCCESS' },
  'leave.rejected': { type: 'LEAVE_REJECTED', category: 'LEAVE', severity: 'WARNING' },
  'leave.submitted': { type: 'LEAVE_SUBMITTED', category: 'LEAVE', severity: 'INFO' },
  'leave.cancelled': { type: 'LEAVE_CANCELLED', category: 'LEAVE', severity: 'INFO' },
  'payroll.finalized': { type: 'PAYROLL_FINALIZED', category: 'PAYROLL', severity: 'SUCCESS' },
  'payroll.approved': { type: 'PAYROLL_APPROVED', category: 'PAYROLL', severity: 'SUCCESS' },
  'payroll.ready_for_review': { type: 'PAYROLL_READY_FOR_REVIEW', category: 'PAYROLL', severity: 'INFO' },
  'payslip.generated': { type: 'PAYSLIP_GENERATED', category: 'PAYROLL', severity: 'INFO' },
  'invoice.created': { type: 'INVOICE_CREATED', category: 'FINANCE', severity: 'INFO' },
  'invoice.overdue': { type: 'INVOICE_OVERDUE', category: 'FINANCE', severity: 'WARNING' },
  'payment.received': { type: 'PAYMENT_RECEIVED', category: 'FINANCE', severity: 'SUCCESS' },
  'payment.failed': { type: 'PAYMENT_FAILED', category: 'FINANCE', severity: 'ERROR' },
  'opportunity.created': { type: 'OPPORTUNITY_CREATED', category: 'CRM', severity: 'INFO' },
  'opportunity.stage_changed': { type: 'OPPORTUNITY_STAGE_CHANGED', category: 'CRM', severity: 'INFO' },
  'opportunity.won': { type: 'OPPORTUNITY_WON', category: 'CRM', severity: 'SUCCESS' },
  'opportunity.lost': { type: 'OPPORTUNITY_LOST', category: 'CRM', severity: 'INFO' },
  'project.created': { type: 'PROJECT_ASSIGNED', category: 'PROJECTS', severity: 'INFO' },
  'project.task.assigned': { type: 'PROJECT_TASK_ASSIGNED', category: 'PROJECTS', severity: 'INFO' },
  'project.task.completed': { type: 'PROJECT_TASK_COMPLETED', category: 'PROJECTS', severity: 'SUCCESS' },
  'project.milestone.completed': { type: 'PROJECT_MILESTONE_COMPLETED', category: 'PROJECTS', severity: 'SUCCESS' },
  'project.milestone.overdue': { type: 'PROJECT_MILESTONE_OVERDUE', category: 'PROJECTS', severity: 'WARNING' },
  'document.created': { type: 'DOCUMENT_UPLOADED', category: 'DOCUMENTS', severity: 'INFO' },
  'document.shared': { type: 'DOCUMENT_SHARED', category: 'DOCUMENTS', severity: 'INFO' },
  'document.version_created': { type: 'DOCUMENT_VERSION_CREATED', category: 'DOCUMENTS', severity: 'INFO' },
  'employee.created': { type: 'EMPLOYEE_CREATED', category: 'PEOPLE', severity: 'INFO' },
  'employee.status_changed': { type: 'EMPLOYEE_STATUS_CHANGED', category: 'PEOPLE', severity: 'INFO' },
  'attendance.exception': { type: 'ATTENDANCE_EXCEPTION', category: 'ATTENDANCE', severity: 'WARNING' },
  'expense.submitted': { type: 'EXPENSE_SUBMITTED', category: 'FINANCE', severity: 'INFO' },
  'expense.approved': { type: 'EXPENSE_APPROVED', category: 'FINANCE', severity: 'SUCCESS' },
  'expense.rejected': { type: 'EXPENSE_REJECTED', category: 'FINANCE', severity: 'WARNING' },
  // Asset events (Phase 14)
  'asset.created': { type: 'ASSET_CREATED', category: 'ASSETS', severity: 'INFO' },
  'asset.assigned': { type: 'ASSET_ASSIGNED', category: 'ASSETS', severity: 'INFO' },
  'asset.transferred': { type: 'ASSET_TRANSFERRED', category: 'ASSETS', severity: 'INFO' },
  'asset.maintenance.scheduled': { type: 'ASSET_MAINTENANCE_SCHEDULED', category: 'ASSETS', severity: 'INFO' },
  'asset.maintenance.completed': { type: 'ASSET_MAINTENANCE_COMPLETED', category: 'ASSETS', severity: 'SUCCESS' },
  'asset.inspection.failed': { type: 'ASSET_INSPECTION_FAILED', category: 'ASSETS', severity: 'WARNING' },
  'asset.disposed': { type: 'ASSET_DISPOSED', category: 'ASSETS', severity: 'INFO' },
  'asset.retired': { type: 'ASSET_RETIRED', category: 'ASSETS', severity: 'INFO' },
};

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLog: AuditLogService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS — CRUD + Read/Unread
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * List notifications for the current user.
   * Supports pagination, filtering by unread/category/type/severity/date range.
   */
  async listNotifications(ctx: TenantContext, dto: ListNotificationsDto) {
    const { page = 1, limit = 20, unreadOnly, category, type, severity, startDate, endDate } = dto;

    const where: Prisma.NotificationWhereInput = {
      tenantId: ctx.tenantId,
      recipientUserId: ctx.userId,
      ...(unreadOnly && { readAt: null }),
      ...(category && { category }),
      ...(type && { type }),
      ...(severity && { severity: severity as any }),
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * Get a single notification by ID. Validates recipient ownership.
   */
  async findOneNotification(ctx: TenantContext, id: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: notification belongs to another tenant');
    }
    if (notification.recipientUserId !== ctx.userId) {
      throw new ForbiddenException('Access denied: you can only view your own notifications');
    }
    return notification;
  }

  /**
   * Mark a single notification as read. Idempotent.
   */
  async markAsRead(ctx: TenantContext, id: string) {
    const notification = await this.findOneNotification(ctx, id);
    // Idempotent: already read → return as-is
    if (notification.readAt) return notification;

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  /**
   * Mark a single notification as unread. Idempotent.
   */
  async markAsUnread(ctx: TenantContext, id: string) {
    const notification = await this.findOneNotification(ctx, id);
    // Idempotent: already unread → return as-is
    if (!notification.readAt) return notification;

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: null },
    });
  }

  /**
   * Mark all notifications as read for the current user. Idempotent.
   */
  async markAllAsRead(ctx: TenantContext) {
    const result = await this.prisma.notification.updateMany({
      where: {
        tenantId: ctx.tenantId,
        recipientUserId: ctx.userId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return { updated: result.count };
  }

  /**
   * Get unread count for the current user.
   */
  async getUnreadCount(ctx: TenantContext) {
    const count = await this.prisma.notification.count({
      where: {
        tenantId: ctx.tenantId,
        recipientUserId: ctx.userId,
        readAt: null,
      },
    });

    return { unreadCount: count };
  }

  /**
   * Get notification dashboard data (recent + unread count).
   */
  async getDashboard(ctx: TenantContext) {
    const [unreadCount, recentNotifications] = await Promise.all([
      this.prisma.notification.count({
        where: {
          tenantId: ctx.tenantId,
          recipientUserId: ctx.userId,
          readAt: null,
        },
      }),
      this.prisma.notification.findMany({
        where: {
          tenantId: ctx.tenantId,
          recipientUserId: ctx.userId,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      unreadCount,
      recentNotifications,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTIFICATION CREATION (Internal — called by processor)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a notification with idempotency.
   * Uses the unique constraint [tenantId, recipientUserId, type, entityId] for dedup.
   */
  async createNotification(params: {
    tenantId: string;
    recipientUserId: string;
    type: string;
    title: string;
    body: string;
    severity?: string;
    category: string;
    entityType?: string;
    entityId?: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
    tx?: Prisma.TransactionClient;
  }) {
    const client = params.tx ?? this.prisma;
    const now = new Date();

    try {
      const notification = await client.notification.upsert({
        where: {
          tenantId_recipientUserId_type_entityId: {
            tenantId: params.tenantId,
            recipientUserId: params.recipientUserId,
            type: params.type,
            entityId: params.entityId ?? '',
          },
        },
        create: {
          tenantId: params.tenantId,
          recipientUserId: params.recipientUserId,
          type: params.type,
          title: params.title,
          body: params.body,
          severity: (params.severity as any) ?? 'INFO',
          category: params.category,
          entityType: params.entityType,
          entityId: params.entityId,
          actionUrl: params.actionUrl,
          metadata: params.metadata as any,
        },
        update: {
          // If already exists, don't overwrite — just return existing
        },
      });

      // Create IN_APP delivery record
      await this.createDeliveryRecord(client, {
        tenantId: params.tenantId,
        notificationId: notification.id,
        channel: 'IN_APP',
        status: 'DELIVERED',
        deliveredAt: now,
      });

      this.logger.debug(`Notification created: type=${params.type} recipient=${params.recipientUserId}`);
      return notification;
    } catch (error) {
      // Non-critical — notification failure must not break business logic
      this.logger.warn(`Failed to create notification: ${params.type}`, error);
      return null;
    }
  }

  /**
   * Create a delivery record with idempotency.
   */
  private async createDeliveryRecord(
    client: Prisma.TransactionClient | PrismaClient,
    params: {
      tenantId: string;
      notificationId: string;
      channel: string;
      status: string;
      deliveredAt?: Date;
      failedAt?: Date;
      failureReason?: string;
      provider?: string;
      providerMessageId?: string;
    },
  ) {
    try {
      return await client.notificationDelivery.upsert({
        where: {
          notificationId_channel: {
            notificationId: params.notificationId,
            channel: params.channel as any,
          },
        },
        create: {
          tenantId: params.tenantId,
          notificationId: params.notificationId,
          channel: params.channel as any,
          status: params.status as any,
          provider: params.provider,
          providerMessageId: params.providerMessageId,
          attemptCount: params.status === 'DELIVERED' ? 1 : 0,
          deliveredAt: params.deliveredAt,
          failedAt: params.failedAt,
          failureReason: params.failureReason,
        },
        update: {},
      });
    } catch (error) {
      this.logger.warn(`Failed to create delivery record`, error);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PREFERENCES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get notification preferences for the current user.
   */
  async getPreferences(ctx: TenantContext) {
    const preferences = await this.prisma.notificationPreference.findMany({
      where: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
      },
      orderBy: [{ notificationType: 'asc' }, { channel: 'asc' }],
    });

    return { data: preferences };
  }

  /**
   * Update a single notification preference. Creates if doesn't exist.
   */
  async updatePreference(ctx: TenantContext, dto: UpdateNotificationPreferenceDto) {
    // Prevent disabling mandatory (security) notifications
    const defaultPref = DEFAULT_CHANNEL_PREFERENCES[dto.notificationType];
    if (defaultPref?.mandatory && !dto.enabled) {
      throw new BadRequestException(
        `Cannot disable mandatory notification type "${dto.notificationType}".`,
      );
    }

    return this.prisma.notificationPreference.upsert({
      where: {
        tenantId_userId_notificationType_channel: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          notificationType: dto.notificationType,
          channel: dto.channel as any,
        },
      },
      create: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        notificationType: dto.notificationType,
        channel: dto.channel as any,
        enabled: dto.enabled,
        isMandatory: defaultPref?.mandatory ?? false,
      },
      update: {
        enabled: dto.enabled,
      },
    });
  }

  /**
   * Bulk update preferences.
   */
  async bulkUpdatePreferences(ctx: TenantContext, dtos: UpdateNotificationPreferenceDto[]) {
    const results = [];
    for (const dto of dtos) {
      const result = await this.updatePreference(ctx, dto);
      results.push(result);
    }
    return { data: results };
  }

  /**
   * Initialize default preferences for a user (idempotent).
   * Called when a new user is first encountered by the notification system.
   */
  async initializeDefaultPreferences(ctx: TenantContext, userId: string) {
    const existingCount = await this.prisma.notificationPreference.count({
      where: { tenantId: ctx.tenantId, userId },
    });

    // Already initialized
    if (existingCount > 0) return;

    const defaults: Prisma.NotificationPreferenceCreateManyInput[] = [];
    for (const [type, config] of Object.entries(DEFAULT_CHANNEL_PREFERENCES)) {
      defaults.push({
        tenantId: ctx.tenantId,
        userId,
        notificationType: type,
        channel: 'IN_APP',
        enabled: config.IN_APP,
        isMandatory: config.mandatory,
      });
      defaults.push({
        tenantId: ctx.tenantId,
        userId,
        notificationType: type,
        channel: 'EMAIL',
        enabled: config.EMAIL,
        isMandatory: config.mandatory,
      });
    }

    await this.prisma.notificationPreference.createMany({
      data: defaults,
      skipDuplicates: true,
    });

    this.logger.log(`Default notification preferences initialized for user=${userId}`);
  }

  /**
   * Check if a user should receive a notification based on preferences.
   */
  async shouldNotify(userId: string, tenantId: string, notificationType: string, channel: string): Promise<boolean> {
    const pref = await this.prisma.notificationPreference.findUnique({
      where: {
        tenantId_userId_notificationType_channel: {
          tenantId,
          userId,
          notificationType,
          channel: channel as any,
        },
      },
    });

    // No preference set → default to enabled
    if (!pref) {
      const defaultConfig = DEFAULT_CHANNEL_PREFERENCES[notificationType];
      if (channel === 'IN_APP') return defaultConfig?.IN_APP ?? true;
      if (channel === 'EMAIL') return defaultConfig?.EMAIL ?? false;
      return true;
    }

    return pref.enabled;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEMPLATES
  // ═══════════════════════════════════════════════════════════════════════════

  async findAllTemplates(ctx: TenantContext) {
    return this.prisma.notificationTemplate.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: [{ notificationType: 'asc' }, { channel: 'asc' }, { version: 'desc' }],
    });
  }

  async findOneTemplate(ctx: TenantContext, id: string) {
    const template = await this.prisma.notificationTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Notification template not found');
    if (template.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: template belongs to another tenant');
    }
    return template;
  }

  async createTemplate(ctx: TenantContext, dto: CreateNotificationTemplateDto) {
    // Determine next version number
    const maxVersion = await this.prisma.notificationTemplate.aggregate({
      where: {
        tenantId: ctx.tenantId,
        notificationType: dto.notificationType,
        channel: dto.channel as any,
      },
      _max: { version: true },
    });

    const nextVersion = (maxVersion._max.version ?? 0) + 1;

    const template = await this.prisma.notificationTemplate.create({
      data: {
        tenantId: ctx.tenantId,
        name: dto.name,
        notificationType: dto.notificationType,
        channel: dto.channel as any,
        subject: dto.subject,
        body: dto.body,
        variables: dto.variables ?? [],
        status: dto.isSystemDefault ? 'ACTIVE' : 'DRAFT',
        version: nextVersion,
        isSystemDefault: dto.isSystemDefault ?? false,
        createdBy: ctx.userId,
      },
    });

    // Create version snapshot
    await this.prisma.notificationTemplateVersion.create({
      data: {
        tenantId: ctx.tenantId,
        templateId: template.id,
        version: nextVersion,
        name: dto.name,
        subject: dto.subject,
        body: dto.body,
        variables: dto.variables ?? [],
        changedBy: ctx.userId,
      },
    });

    // Audit log
    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'NOTIFICATION_TEMPLATE_CREATED',
      entityType: 'NotificationTemplate',
      entityId: template.id,
      newValue: { name: dto.name, notificationType: dto.notificationType, channel: dto.channel },
    });

    this.logger.log(`Template created: type=${dto.notificationType} channel=${dto.channel} version=${nextVersion}`);
    return template;
  }

  async updateTemplate(ctx: TenantContext, id: string, dto: UpdateNotificationTemplateDto) {
    const template = await this.findOneTemplate(ctx, id);

    // Create version snapshot before updating
    await this.prisma.notificationTemplateVersion.create({
      data: {
        tenantId: ctx.tenantId,
        templateId: template.id,
        version: template.version,
        name: template.name,
        subject: template.subject,
        body: template.body,
        variables: template.variables as any,
        changedBy: ctx.userId,
      },
    });

    const data: Prisma.NotificationTemplateUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.subject !== undefined) data.subject = dto.subject;
    if (dto.body !== undefined) data.body = dto.body;
    if (dto.variables !== undefined) data.variables = dto.variables;
    if (dto.status !== undefined) data.status = dto.status;

    const updated = await this.prisma.notificationTemplate.update({
      where: { id },
      data,
    });

    // Audit log
    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'NOTIFICATION_TEMPLATE_UPDATED',
      entityType: 'NotificationTemplate',
      entityId: id,
      previousValue: { version: template.version },
      newValue: { ...dto },
    });

    return updated;
  }

  /**
   * Render a template with given variables. Safe — no script execution.
   */
  renderTemplate(body: string, variables: Record<string, string | number | boolean | null | undefined>): string {
    let rendered = body;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      const safeValue = value != null ? String(value) : '';
      // Only replace exact placeholders, not partial matches
      rendered = rendered.split(placeholder).join(safeValue);
    }
    return rendered;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DELIVERIES
  // ═══════════════════════════════════════════════════════════════════════════

  async findAllDeliveries(ctx: TenantContext, dto: ListDeliveriesDto) {
    const { page = 1, limit = 20, status, channel, notificationId } = dto;

    const where: Prisma.NotificationDeliveryWhereInput = {
      tenantId: ctx.tenantId,
      ...(status && { status: status as any }),
      ...(channel && { channel: channel as any }),
      ...(notificationId && { notificationId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.notificationDelivery.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          notification: {
            select: { id: true, type: true, title: true, recipientUserId: true },
          },
        },
      }),
      this.prisma.notificationDelivery.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1,
      },
    };
  }

  async findOneDelivery(ctx: TenantContext, id: string) {
    const delivery = await this.prisma.notificationDelivery.findUnique({
      where: { id },
      include: {
        notification: {
          select: { id: true, type: true, title: true, recipientUserId: true },
        },
      },
    });
    if (!delivery) throw new NotFoundException('Delivery record not found');
    if (delivery.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: delivery belongs to another tenant');
    }
    return delivery;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN — Manual Send
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Manually send a notification to a specific user.
   * Enforces: RBAC (caller must have notification:send), tenant isolation,
   * recipient authorization, idempotency.
   */
  async sendManualNotification(ctx: TenantContext, dto: SendNotificationDto) {
    // Verify recipient is in the same tenant
    const recipientUserRoles = await this.prisma.userRole.findMany({
      where: {
        userId: dto.recipientUserId,
        tenantId: ctx.tenantId,
      },
    });

    if (recipientUserRoles.length === 0) {
      throw new ForbiddenException('Recipient is not a member of this tenant');
    }

    const result = await this.createNotification({
      tenantId: ctx.tenantId,
      recipientUserId: dto.recipientUserId,
      type: dto.type,
      title: dto.title,
      body: dto.body,
      severity: dto.severity,
      category: dto.category ?? 'SYSTEM',
      entityType: dto.entityType,
      entityId: dto.entityId,
      actionUrl: dto.actionUrl,
      metadata: dto.metadata,
    });

    // Audit log
    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'NOTIFICATION_MANUALLY_SENT',
      entityType: 'Notification',
      entityId: result?.id,
      newValue: { type: dto.type, recipientUserId: dto.recipientUserId },
    });

    return result;
  }
}
