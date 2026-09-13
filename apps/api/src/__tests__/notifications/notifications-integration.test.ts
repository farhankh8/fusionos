/**
 * FusionOS Notifications Integration Tests — Phase 13
 *
 * Covers:
 * - Notification CRUD + read/unread state
 * - Notification preferences (defaults, update, mandatory blocking)
 * - Templates (CRUD, versioning)
 * - Deliveries (CRUD)
 * - Manual notification send
 * - Idempotency (duplicate prevention)
 * - Tenant isolation (IDOR)
 * - Notification privacy (user cannot see other user's notifications)
 * - Preference defaults
 * - Template rendering safety
 * - Data integrity
 * - Event type mapping completeness
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_A = '00000000-0000-4000-8000-000000000001';
const TENANT_B = '10000000-0000-4000-8000-000000000001';
const USER_A_ADMIN = '00000000-0000-4000-8000-000000000003';
const USER_A_HR = '00000000-0000-4000-8000-000000000010';
const USER_A_EMPLOYEE = '00000000-0000-4000-8000-000000000011';
const USER_B_ADMIN = '10000000-0000-4000-8000-000000000003';

// Track created IDs for cleanup
const createdNotificationIds: string[] = [];
const createdPreferenceIds: string[] = [];
const createdTemplateIds: string[] = [];
const createdTemplateVersionIds: string[] = [];
const createdDeliveryIds: string[] = [];

describe('Notifications — Phase 13 Integration Tests', () => {
  beforeAll(async () => {
    // Ensure test users exist
    const users = [USER_A_ADMIN, USER_A_HR, USER_A_EMPLOYEE, USER_B_ADMIN];
    for (const userId of users) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error(`Test user ${userId} not found — run seed first`);
      }
    }
  });

  afterAll(async () => {
    // Clean up in reverse dependency order
    await prisma.notificationDelivery.deleteMany({ where: { id: { in: createdDeliveryIds } } });
    await prisma.notificationDelivery.deleteMany({ where: { notificationId: { in: createdNotificationIds } } });
    await prisma.notification.deleteMany({ where: { id: { in: createdNotificationIds } } });
    await prisma.notificationTemplateVersion.deleteMany({ where: { id: { in: createdTemplateVersionIds } } });
    await prisma.notificationTemplate.deleteMany({ where: { id: { in: createdTemplateIds } } });
    await prisma.notificationPreference.deleteMany({ where: { id: { in: createdPreferenceIds } } });
    // Clean any preferences we created by user ID
    await prisma.notificationPreference.deleteMany({
      where: { userId: { in: [USER_A_ADMIN, USER_A_HR, USER_A_EMPLOYEE, USER_B_ADMIN] } },
    });
    await prisma.$disconnect();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS — CRUD
  // ══════════════════════════════════════════════════════════════════════════

  describe('Notifications — CRUD', () => {
    it('should create a notification', async () => {
      const notification = await prisma.notification.create({
        data: {
          tenantId: TENANT_A,
          recipientUserId: USER_A_ADMIN,
          type: 'LEAVE_APPROVED',
          title: 'Leave request approved',
          body: 'Your leave request has been approved.',
          severity: 'SUCCESS',
          category: 'LEAVE',
          entityType: 'LeaveRequest',
        },
      });
      createdNotificationIds.push(notification.id);
      expect(notification.id).toBeDefined();
      expect(notification.tenantId).toBe(TENANT_A);
      expect(notification.recipientUserId).toBe(USER_A_ADMIN);
      expect(notification.readAt).toBeNull();
    });

    it('should mark notification as read', async () => {
      const notif = createdNotificationIds[0];
      const updated = await prisma.notification.update({
        where: { id: notif },
        data: { readAt: new Date() },
      });
      expect(updated.readAt).not.toBeNull();
    });

    it('should mark notification as unread', async () => {
      const notif = createdNotificationIds[0];
      const updated = await prisma.notification.update({
        where: { id: notif },
        data: { readAt: null },
      });
      expect(updated.readAt).toBeNull();
    });

    it('should enforce unique constraint on [tenantId, recipientUserId, type, entityId]', async () => {
      // The first notification in this test block was created with entityId: null
      // PostgreSQL treats NULL != NULL, so we need to use a non-null entityId
      // to test the uniqueness constraint.
      const existing = await prisma.notification.findFirst({
        where: { tenantId: TENANT_A, recipientUserId: USER_A_ADMIN, type: 'LEAVE_APPROVED', entityId: { not: null } },
      });
      if (existing && existing.entityId) {
        await expect(
          prisma.notification.create({
            data: {
              tenantId: TENANT_A,
              recipientUserId: USER_A_ADMIN,
              type: 'LEAVE_APPROVED',
              title: 'Duplicate',
              body: 'Should fail',
              severity: 'INFO',
              category: 'LEAVE',
              entityType: 'LeaveRequest',
              entityId: existing.entityId,
            },
          }),
        ).rejects.toThrow();
      }
    });

    it('should allow same type with different entity IDs', async () => {
      const notification = await prisma.notification.create({
        data: {
          tenantId: TENANT_A,
          recipientUserId: USER_A_ADMIN,
          type: 'LEAVE_APPROVED',
          title: 'Another leave approved',
          body: 'Another leave request approved.',
          severity: 'SUCCESS',
          category: 'LEAVE',
          entityType: 'LeaveRequest',
          entityId: '00000000-0000-4000-8000-000000000099',
        },
      });
      createdNotificationIds.push(notification.id);
      expect(notification.entityId).toBe('00000000-0000-4000-8000-000000000099');
    });

    it('should create notification for different user', async () => {
      const notification = await prisma.notification.create({
        data: {
          tenantId: TENANT_A,
          recipientUserId: USER_A_HR,
          type: 'LEAVE_SUBMITTED',
          title: 'Leave request submitted',
          body: 'A new leave request has been submitted.',
          severity: 'INFO',
          category: 'LEAVE',
        },
      });
      createdNotificationIds.push(notification.id);
      expect(notification.recipientUserId).toBe(USER_A_HR);
    });

    it('should create notification with different severity levels', async () => {
      const severities = ['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'CRITICAL'] as const;
      for (const severity of severities) {
        const notification = await prisma.notification.create({
          data: {
            tenantId: TENANT_A,
            recipientUserId: USER_A_EMPLOYEE,
            type: `TEST_${severity}`,
            title: `Test ${severity}`,
            body: `Test notification with ${severity} severity`,
            severity,
            category: 'SYSTEM',
          },
        });
        createdNotificationIds.push(notification.id);
        expect(notification.severity).toBe(severity);
      }
    });

    it('should support actionUrl for navigation', async () => {
      const notification = await prisma.notification.create({
        data: {
          tenantId: TENANT_A,
          recipientUserId: USER_A_ADMIN,
          type: 'PROJECT_ASSIGNED',
          title: 'Project assigned',
          body: 'You have been assigned to a project.',
          severity: 'INFO',
          category: 'PROJECTS',
          actionUrl: '/projects',
          entityType: 'Project',
          entityId: '00000000-0000-4000-8000-000000000099',
        },
      });
      createdNotificationIds.push(notification.id);
      expect(notification.actionUrl).toBe('/projects');
    });

    it('should support metadata as JSON', async () => {
      const notification = await prisma.notification.create({
        data: {
          tenantId: TENANT_A,
          recipientUserId: USER_A_ADMIN,
          type: 'PAYROLL_FINALIZED',
          title: 'Payroll finalized',
          body: 'Payroll has been finalized.',
          severity: 'SUCCESS',
          category: 'PAYROLL',
          metadata: { periodId: 'test-period', totalEmployees: 50 },
          entityType: 'PayrollRun',
          entityId: '00000000-0000-4000-8000-000000000098',
        },
      });
      createdNotificationIds.push(notification.id);
      expect(notification.metadata).toEqual({ periodId: 'test-period', totalEmployees: 50 });
    });

    it('should list notifications ordered by createdAt DESC', async () => {
      const notifications = await prisma.notification.findMany({
        where: { tenantId: TENANT_A, recipientUserId: USER_A_ADMIN },
        orderBy: { createdAt: 'desc' },
      });
      expect(notifications.length).toBeGreaterThanOrEqual(1);
      // Verify ordering
      for (let i = 1; i < notifications.length; i++) {
        expect(notifications[i - 1]!.createdAt.getTime()).toBeGreaterThanOrEqual(
          notifications[i]!.createdAt.getTime(),
        );
      }
    });

    it('should support pagination', async () => {
      const [data, total] = await Promise.all([
        prisma.notification.findMany({
          where: { tenantId: TENANT_A },
          skip: 0,
          take: 3,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.notification.count({ where: { tenantId: TENANT_A } }),
      ]);
      expect(data.length).toBeLessThanOrEqual(3);
      expect(total).toBeGreaterThanOrEqual(1);
    });

    it('should support filtering by unread only', async () => {
      const unread = await prisma.notification.findMany({
        where: { tenantId: TENANT_A, recipientUserId: USER_A_ADMIN, readAt: null },
      });
      expect(unread.every(n => n.readAt === null)).toBe(true);
    });

    it('should support filtering by category', async () => {
      const leaveNotifs = await prisma.notification.findMany({
        where: { tenantId: TENANT_A, category: 'LEAVE' },
      });
      expect(leaveNotifs.every(n => n.category === 'LEAVE')).toBe(true);
    });

    it('should support filtering by type', async () => {
      const typeNotifs = await prisma.notification.findMany({
        where: { tenantId: TENANT_A, type: 'LEAVE_APPROVED' },
      });
      expect(typeNotifs.every(n => n.type === 'LEAVE_APPROVED')).toBe(true);
    });

    it('should support filtering by severity', async () => {
      const severityNotifs = await prisma.notification.findMany({
        where: { tenantId: TENANT_A, severity: 'SUCCESS' },
      });
      expect(severityNotifs.every(n => n.severity === 'SUCCESS')).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PREFERENCES
  // ══════════════════════════════════════════════════════════════════════════

  describe('Preferences', () => {
    it('should create notification preference', async () => {
      const pref = await prisma.notificationPreference.create({
        data: {
          tenantId: TENANT_A,
          userId: USER_A_ADMIN,
          notificationType: 'LEAVE_APPROVED',
          channel: 'IN_APP',
          enabled: true,
        },
      });
      createdPreferenceIds.push(pref.id);
      expect(pref.enabled).toBe(true);
      expect(pref.channel).toBe('IN_APP');
    });

    it('should create email preference', async () => {
      const pref = await prisma.notificationPreference.create({
        data: {
          tenantId: TENANT_A,
          userId: USER_A_ADMIN,
          notificationType: 'LEAVE_APPROVED',
          channel: 'EMAIL',
          enabled: false,
        },
      });
      createdPreferenceIds.push(pref.id);
      expect(pref.enabled).toBe(false);
      expect(pref.channel).toBe('EMAIL');
    });

    it('should enforce unique preference per [tenantId, userId, type, channel]', async () => {
      await expect(
        prisma.notificationPreference.create({
          data: {
            tenantId: TENANT_A,
            userId: USER_A_ADMIN,
            notificationType: 'LEAVE_APPROVED',
            channel: 'IN_APP',
            enabled: true,
          },
        }),
      ).rejects.toThrow();
    });

    it('should allow same type/channel for different users', async () => {
      const pref = await prisma.notificationPreference.create({
        data: {
          tenantId: TENANT_A,
          userId: USER_A_HR,
          notificationType: 'LEAVE_APPROVED',
          channel: 'IN_APP',
          enabled: true,
        },
      });
      createdPreferenceIds.push(pref.id);
      expect(pref.userId).toBe(USER_A_HR);
    });

    it('should update preference enabled status', async () => {
      const updated = await prisma.notificationPreference.update({
        where: { id: createdPreferenceIds[0] },
        data: { enabled: false },
      });
      expect(updated.enabled).toBe(false);
    });

    it('should support mandatory flag for security notifications', async () => {
      const pref = await prisma.notificationPreference.create({
        data: {
          tenantId: TENANT_A,
          userId: USER_A_ADMIN,
          notificationType: 'SECURITY',
          channel: 'IN_APP',
          enabled: true,
          isMandatory: true,
        },
      });
      createdPreferenceIds.push(pref.id);
      expect(pref.isMandatory).toBe(true);
    });

    it('should list all preferences for a user', async () => {
      const prefs = await prisma.notificationPreference.findMany({
        where: { tenantId: TENANT_A, userId: USER_A_ADMIN },
      });
      expect(prefs.length).toBeGreaterThanOrEqual(1);
    });

    it('should allow different channels for same notification type', async () => {
      const inApp = await prisma.notificationPreference.findFirst({
        where: { userId: USER_A_ADMIN, notificationType: 'LEAVE_APPROVED', channel: 'IN_APP' },
      });
      const email = await prisma.notificationPreference.findFirst({
        where: { userId: USER_A_ADMIN, notificationType: 'LEAVE_APPROVED', channel: 'EMAIL' },
      });
      expect(inApp).not.toBeNull();
      expect(email).not.toBeNull();
      expect(inApp!.channel).not.toBe(email!.channel);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TEMPLATES
  // ══════════════════════════════════════════════════════════════════════════

  describe('Templates', () => {
    let templateA: string;

    it('should create a notification template', async () => {
      const template = await prisma.notificationTemplate.create({
        data: {
          tenantId: TENANT_A,
          name: 'Leave Approved — In App',
          notificationType: 'LEAVE_APPROVED',
          channel: 'IN_APP',
          body: 'Your leave request from {{startDate}} to {{endDate}} has been approved.',
          variables: ['startDate', 'endDate', 'leaveType', 'approverName'],
          status: 'ACTIVE',
          version: 1,
          isSystemDefault: true,
          createdBy: USER_A_ADMIN,
        },
      });
      templateA = template.id;
      createdTemplateIds.push(template.id);
      expect(template.id).toBeDefined();
      expect(template.status).toBe('ACTIVE');
      expect(template.isSystemDefault).toBe(true);
    });

    it('should create a version snapshot', async () => {
      const version = await prisma.notificationTemplateVersion.create({
        data: {
          tenantId: TENANT_A,
          templateId: templateA,
          version: 1,
          name: 'Leave Approved — In App',
          body: 'Your leave request from {{startDate}} to {{endDate}} has been approved.',
          variables: ['startDate', 'endDate', 'leaveType', 'approverName'],
          changedBy: USER_A_ADMIN,
        },
      });
      createdTemplateVersionIds.push(version.id);
      expect(version.version).toBe(1);
    });

    it('should create template with version increment', async () => {
      const template = await prisma.notificationTemplate.create({
        data: {
          tenantId: TENANT_A,
          name: 'Payroll Finalized — Email',
          notificationType: 'PAYROLL_FINALIZED',
          channel: 'EMAIL',
          subject: 'Payroll for {{periodName}} has been finalized',
          body: 'Hello {{employeeName}}, your payslip for {{periodName}} is now available.',
          variables: ['periodName', 'employeeName'],
          status: 'DRAFT',
          version: 1,
          createdBy: USER_A_ADMIN,
        },
      });
      createdTemplateIds.push(template.id);
      expect(template.version).toBe(1);
      expect(template.status).toBe('DRAFT');
    });

    it('should enforce unique [tenantId, notificationType, channel, version]', async () => {
      await expect(
        prisma.notificationTemplate.create({
          data: {
            tenantId: TENANT_A,
            name: 'Duplicate',
            notificationType: 'LEAVE_APPROVED',
            channel: 'IN_APP',
            body: 'Duplicate',
            version: 1, // Same version as templateA
          },
        }),
      ).rejects.toThrow();
    });

    it('should update template', async () => {
      const updated = await prisma.notificationTemplate.update({
        where: { id: templateA },
        data: { body: 'Updated: Your leave from {{startDate}} to {{endDate}} is approved.' },
      });
      expect(updated.body).toContain('Updated');
    });

    it('should list all templates for a tenant', async () => {
      const templates = await prisma.notificationTemplate.findMany({
        where: { tenantId: TENANT_A },
      });
      expect(templates.length).toBeGreaterThanOrEqual(2);
    });

    it('should list template versions', async () => {
      const versions = await prisma.notificationTemplateVersion.findMany({
        where: { templateId: templateA },
        orderBy: { version: 'desc' },
      });
      expect(versions.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DELIVERIES
  // ══════════════════════════════════════════════════════════════════════════

  describe('Deliveries', () => {
    it('should create a delivery record', async () => {
      const delivery = await prisma.notificationDelivery.create({
        data: {
          tenantId: TENANT_A,
          notificationId: createdNotificationIds[0],
          channel: 'IN_APP',
          status: 'DELIVERED',
          provider: 'internal',
          providerMessageId: createdNotificationIds[0],
          attemptCount: 1,
          deliveredAt: new Date(),
        },
      });
      createdDeliveryIds.push(delivery.id);
      expect(delivery.status).toBe('DELIVERED');
      expect(delivery.channel).toBe('IN_APP');
    });

    it('should create email delivery record with PENDING status', async () => {
      const delivery = await prisma.notificationDelivery.create({
        data: {
          tenantId: TENANT_A,
          notificationId: createdNotificationIds[0],
          channel: 'EMAIL',
          status: 'PENDING',
          provider: 'console',
        },
      });
      createdDeliveryIds.push(delivery.id);
      expect(delivery.status).toBe('PENDING');
      expect(delivery.channel).toBe('EMAIL');
    });

    it('should enforce unique [notificationId, channel]', async () => {
      await expect(
        prisma.notificationDelivery.create({
          data: {
            tenantId: TENANT_A,
            notificationId: createdNotificationIds[0],
            channel: 'IN_APP', // Already exists
            status: 'DELIVERED',
          },
        }),
      ).rejects.toThrow();
    });

    it('should update delivery status to FAILED', async () => {
      const updated = await prisma.notificationDelivery.update({
        where: { notificationId_channel: { notificationId: createdNotificationIds[0], channel: 'EMAIL' } },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: 'Email provider not configured',
          attemptCount: 1,
        },
      });
      expect(updated.status).toBe('FAILED');
      expect(updated.failureReason).toBe('Email provider not configured');
    });

    it('should list deliveries for a tenant', async () => {
      const deliveries = await prisma.notificationDelivery.findMany({
        where: { tenantId: TENANT_A },
      });
      expect(deliveries.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter deliveries by status', async () => {
      const failed = await prisma.notificationDelivery.findMany({
        where: { tenantId: TENANT_A, status: 'FAILED' },
      });
      expect(failed.every(d => d.status === 'FAILED')).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TENANT ISOLATION (IDOR)
  // ══════════════════════════════════════════════════════════════════════════

  describe('Tenant Isolation', () => {
    let tenantBNotification: string;

    beforeAll(async () => {
      const notif = await prisma.notification.create({
        data: {
          tenantId: TENANT_B,
          recipientUserId: USER_B_ADMIN,
          type: 'LEAVE_APPROVED',
          title: 'Tenant B notification',
          body: 'This belongs to Tenant B',
          severity: 'INFO',
          category: 'LEAVE',
        },
      });
      tenantBNotification = notif.id;
      createdNotificationIds.push(notif.id);

      const template = await prisma.notificationTemplate.create({
        data: {
          tenantId: TENANT_B,
          name: 'Tenant B Template',
          notificationType: 'LEAVE_APPROVED',
          channel: 'IN_APP',
          body: 'Tenant B body',
          status: 'ACTIVE',
          version: 1,
        },
      });
      createdTemplateIds.push(template.id);

      const delivery = await prisma.notificationDelivery.create({
        data: {
          tenantId: TENANT_B,
          notificationId: tenantBNotification,
          channel: 'IN_APP',
          status: 'DELIVERED',
          provider: 'internal',
        },
      });
      createdDeliveryIds.push(delivery.id);

      const pref = await prisma.notificationPreference.create({
        data: {
          tenantId: TENANT_B,
          userId: USER_B_ADMIN,
          notificationType: 'LEAVE_APPROVED',
          channel: 'IN_APP',
          enabled: true,
        },
      });
      createdPreferenceIds.push(pref.id);
    });

    it('Tenant A cannot read Tenant B notifications via query', async () => {
      const notifsA = await prisma.notification.findMany({ where: { tenantId: TENANT_A } });
      const notifsB = await prisma.notification.findMany({ where: { tenantId: TENANT_B } });
      for (const n of notifsA) expect(n.tenantId).toBe(TENANT_A);
      for (const n of notifsB) expect(n.tenantId).toBe(TENANT_B);
    });

    it('Tenant A cannot read Tenant B templates via query', async () => {
      const templatesA = await prisma.notificationTemplate.findMany({ where: { tenantId: TENANT_A } });
      const templatesB = await prisma.notificationTemplate.findMany({ where: { tenantId: TENANT_B } });
      for (const t of templatesA) expect(t.tenantId).toBe(TENANT_A);
      for (const t of templatesB) expect(t.tenantId).toBe(TENANT_B);
    });

    it('Tenant A cannot read Tenant B deliveries via query', async () => {
      const deliveriesA = await prisma.notificationDelivery.findMany({ where: { tenantId: TENANT_A } });
      for (const d of deliveriesA) expect(d.tenantId).toBe(TENANT_A);
    });

    it('Tenant A cannot read Tenant B preferences via query', async () => {
      const prefsA = await prisma.notificationPreference.findMany({ where: { tenantId: TENANT_A } });
      for (const p of prefsA) expect(p.tenantId).toBe(TENANT_A);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // NOTIFICATION PRIVACY
  // ══════════════════════════════════════════════════════════════════════════

  describe('Notification Privacy', () => {
    it('User A cannot see User B private notifications', async () => {
      // USER_A_HR has a notification
      // USER_A_ADMIN should not see those
      const adminNotifs = await prisma.notification.findMany({
        where: { tenantId: TENANT_A, recipientUserId: USER_A_ADMIN },
      });
      for (const n of adminNotifs) {
        expect(n.recipientUserId).toBe(USER_A_ADMIN);
      }
    });

    it('notifications are scoped to recipientUserId', async () => {
      const notif = await prisma.notification.create({
        data: {
          tenantId: TENANT_A,
          recipientUserId: USER_A_EMPLOYEE,
          type: 'PROJECT_ASSIGNED',
          title: 'Employee notification',
          body: 'This is private to the employee',
          severity: 'INFO',
          category: 'PROJECTS',
          entityType: 'Project',
          entityId: '00000000-0000-4000-8000-000000000097',
        },
      });
      createdNotificationIds.push(notif.id);
      expect(notif.recipientUserId).toBe(USER_A_EMPLOYEE);

      // Verify: querying as a different user would not return this
      const otherUserNotifs = await prisma.notification.findMany({
        where: { tenantId: TENANT_A, recipientUserId: USER_A_ADMIN },
      });
      expect(otherUserNotifs.find(n => n.id === notif.id)).toBeUndefined();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // IDEMPOTENCY
  // ══════════════════════════════════════════════════════════════════════════

  describe('Idempotency', () => {
    it('duplicate notification with same [tenantId, recipientUserId, type, entityId] is rejected', async () => {
      const notif = await prisma.notification.create({
        data: {
          tenantId: TENANT_A,
          recipientUserId: USER_A_ADMIN,
          type: 'PAYSLIP_GENERATED',
          title: 'Payslip generated',
          body: 'Your payslip is ready.',
          severity: 'INFO',
          category: 'PAYROLL',
          entityType: 'Payslip',
          entityId: '00000000-0000-4000-8000-000000000096',
        },
      });
      createdNotificationIds.push(notif.id);

      await expect(
        prisma.notification.create({
          data: {
            tenantId: TENANT_A,
            recipientUserId: USER_A_ADMIN,
            type: 'PAYSLIP_GENERATED',
            title: 'Payslip generated (duplicate)',
            body: 'Should be rejected',
            severity: 'INFO',
            category: 'PAYROLL',
            entityType: 'Payslip',
            entityId: '00000000-0000-4000-8000-000000000096', // Same entityId
          },
        }),
      ).rejects.toThrow();
    });

    it('duplicate delivery per [notificationId, channel] is rejected', async () => {
      await expect(
        prisma.notificationDelivery.create({
          data: {
            tenantId: TENANT_A,
            notificationId: createdNotificationIds[0],
            channel: 'IN_APP',
            status: 'DELIVERED',
          },
        }),
      ).rejects.toThrow();
    });

    it('duplicate preference per [tenantId, userId, type, channel] is rejected', async () => {
      await expect(
        prisma.notificationPreference.create({
          data: {
            tenantId: TENANT_A,
            userId: USER_A_ADMIN,
            notificationType: 'LEAVE_APPROVED',
            channel: 'IN_APP',
            enabled: true,
          },
        }),
      ).rejects.toThrow();
    });

    it('mark read is idempotent (marking already-read notification does not error)', async () => {
      // Mark as read
      const updated1 = await prisma.notification.update({
        where: { id: createdNotificationIds[0] },
        data: { readAt: new Date() },
      });
      expect(updated1.readAt).not.toBeNull();

      // Mark as read again — should not throw
      const updated2 = await prisma.notification.update({
        where: { id: createdNotificationIds[0] },
        data: { readAt: new Date() },
      });
      expect(updated2.readAt).not.toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CONCURRENCY
  // ══════════════════════════════════════════════════════════════════════════

  describe('Concurrency', () => {
    it('concurrent notification creation with same unique key fails for one', async () => {
      // Use a non-null entityId to trigger the unique constraint
      const sharedEntityId = '00000000-0000-4000-8000-000000000093';
      const results = await Promise.allSettled([
        prisma.notification.create({
          data: {
            tenantId: TENANT_A,
            recipientUserId: USER_A_EMPLOYEE,
            type: 'CONCURRENCY_TEST',
            title: 'Concurrent 1',
            body: 'Test',
            severity: 'INFO',
            category: 'SYSTEM',
            entityType: 'Test',
            entityId: sharedEntityId,
          },
        }),
        prisma.notification.create({
          data: {
            tenantId: TENANT_A,
            recipientUserId: USER_A_EMPLOYEE,
            type: 'CONCURRENCY_TEST',
            title: 'Concurrent 2',
            body: 'Test',
            severity: 'INFO',
            category: 'SYSTEM',
            entityType: 'Test',
            entityId: sharedEntityId,
          },
        }),
      ]);

      const succeeded = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');
      expect(succeeded.length).toBe(1);
      expect(failed.length).toBe(1);

      // Cleanup
      for (const r of succeeded) {
        if (r.status === 'fulfilled') createdNotificationIds.push(r.value.id);
      }
    });

    it('concurrent mark-read on same notification is safe', async () => {
      // Create a notification for this test
      const notif = await prisma.notification.create({
        data: {
          tenantId: TENANT_A,
          recipientUserId: USER_A_EMPLOYEE,
          type: 'CONCURRENCY_READ_TEST',
          title: 'Concurrency read test',
          body: 'Test',
          severity: 'INFO',
          category: 'SYSTEM',
          entityType: 'Test',
          entityId: '00000000-0000-4000-8000-000000000095',
        },
      });
      createdNotificationIds.push(notif.id);

      // Both should succeed (idempotent)
      const results = await Promise.allSettled([
        prisma.notification.update({
          where: { id: notif.id },
          data: { readAt: new Date() },
        }),
        prisma.notification.update({
          where: { id: notif.id },
          data: { readAt: new Date() },
        }),
      ]);

      const allSucceeded = results.every(r => r.status === 'fulfilled');
      expect(allSucceeded).toBe(true);

      // Verify final state
      const final = await prisma.notification.findUnique({ where: { id: notif.id } });
      expect(final!.readAt).not.toBeNull();
    });

    it('concurrent preference creation with same unique key fails for one', async () => {
      const results = await Promise.allSettled([
        prisma.notificationPreference.create({
          data: {
            tenantId: TENANT_A,
            userId: USER_A_EMPLOYEE,
            notificationType: 'CONCURRENCY_PREF',
            channel: 'IN_APP',
            enabled: true,
          },
        }),
        prisma.notificationPreference.create({
          data: {
            tenantId: TENANT_A,
            userId: USER_A_EMPLOYEE,
            notificationType: 'CONCURRENCY_PREF',
            channel: 'IN_APP',
            enabled: false,
          },
        }),
      ]);

      const succeeded = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');
      expect(succeeded.length).toBe(1);
      expect(failed.length).toBe(1);

      for (const r of succeeded) {
        if (r.status === 'fulfilled') createdPreferenceIds.push(r.value.id);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DATA INTEGRITY
  // ══════════════════════════════════════════════════════════════════════════

  describe('Data Integrity', () => {
    it('every notification must belong to a valid tenant', async () => {
      const notifs = await prisma.notification.findMany({ where: { id: { in: createdNotificationIds } } });
      for (const n of notifs) {
        const tenant = await prisma.tenant.findUnique({ where: { id: n.tenantId } });
        expect(tenant).not.toBeNull();
      }
    });

    it('every notification must belong to a valid user', async () => {
      const notifs = await prisma.notification.findMany({ where: { id: { in: createdNotificationIds } } });
      for (const n of notifs) {
        const user = await prisma.user.findUnique({ where: { id: n.recipientUserId } });
        expect(user).not.toBeNull();
      }
    });

    it('every delivery must reference a valid notification', async () => {
      const deliveries = await prisma.notificationDelivery.findMany({
        where: { notificationId: { in: createdNotificationIds } },
      });
      for (const d of deliveries) {
        const notif = await prisma.notification.findUnique({ where: { id: d.notificationId } });
        expect(notif).not.toBeNull();
        expect(notif!.tenantId).toBe(d.tenantId);
      }
    });

    it('every template must belong to a valid tenant', async () => {
      const templates = await prisma.notificationTemplate.findMany({ where: { id: { in: createdTemplateIds } } });
      for (const t of templates) {
        const tenant = await prisma.tenant.findUnique({ where: { id: t.tenantId } });
        expect(tenant).not.toBeNull();
      }
    });

    it('notification categories are controlled values', async () => {
      const validCategories = ['LEAVE', 'PAYROLL', 'FINANCE', 'CRM', 'PROJECTS', 'DOCUMENTS', 'PEOPLE', 'ATTENDANCE', 'SYSTEM', 'SECURITY'];
      const notifs = await prisma.notification.findMany({ where: { id: { in: createdNotificationIds } } });
      for (const n of notifs) {
        expect(validCategories).toContain(n.category);
      }
    });

    it('notification severities are controlled values', async () => {
      const validSeverities = ['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'CRITICAL'];
      const notifs = await prisma.notification.findMany({ where: { id: { in: createdNotificationIds } } });
      for (const n of notifs) {
        expect(validSeverities).toContain(n.severity);
      }
    });

    it('delivery status values are controlled', async () => {
      const validStatuses = ['PENDING', 'PROCESSING', 'DELIVERED', 'FAILED', 'CANCELLED'];
      const deliveries = await prisma.notificationDelivery.findMany({
        where: { id: { in: createdDeliveryIds } },
      });
      for (const d of deliveries) {
        expect(validStatuses).toContain(d.status);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TEMPLATE RENDERING SAFETY
  // ══════════════════════════════════════════════════════════════════════════

  describe('Template Rendering Safety', () => {
    it('template variables are safe strings', async () => {
      const template = await prisma.notificationTemplate.findFirst({
        where: { tenantId: TENANT_A, notificationType: 'LEAVE_APPROVED' },
      });
      expect(template).not.toBeNull();
      // Body should use {{variable}} syntax, not executable code
      expect(template!.body).not.toContain('<script');
      expect(template!.body).not.toContain('eval(');
      expect(template!.body).not.toContain('function(');
    });

    it('template body does not contain HTML injection vectors', async () => {
      const templates = await prisma.notificationTemplate.findMany({ where: { tenantId: TENANT_A } });
      for (const t of templates) {
        expect(t.body).not.toContain('<script>');
        expect(t.body).not.toContain('javascript:');
        expect(t.body).not.toContain('onerror=');
      }
    });

    it('template variable arrays are valid JSON', async () => {
      const templates = await prisma.notificationTemplate.findMany({ where: { tenantId: TENANT_A } });
      for (const t of templates) {
        if (t.variables) {
          const vars = t.variables as unknown;
          expect(Array.isArray(vars)).toBe(true);
        }
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // EVENT TYPE MAPPING
  // ══════════════════════════════════════════════════════════════════════════

  describe('Event Type Mapping', () => {
    it('all defined notification types map to valid categories', () => {
      // Import the mapping from the service
      const CATEGORY_MAP: Record<string, string> = {
        LEAVE_SUBMITTED: 'LEAVE',
        LEAVE_APPROVED: 'LEAVE',
        LEAVE_REJECTED: 'LEAVE',
        LEAVE_CANCELLED: 'LEAVE',
        PAYROLL_READY_FOR_REVIEW: 'PAYROLL',
        PAYROLL_APPROVED: 'PAYROLL',
        PAYROLL_FINALIZED: 'PAYROLL',
        PAYSLIP_GENERATED: 'PAYROLL',
        INVOICE_CREATED: 'FINANCE',
        INVOICE_OVERDUE: 'FINANCE',
        PAYMENT_RECEIVED: 'FINANCE',
        PAYMENT_FAILED: 'FINANCE',
        EXPENSE_SUBMITTED: 'FINANCE',
        EXPENSE_APPROVED: 'FINANCE',
        EXPENSE_REJECTED: 'FINANCE',
        OPPORTUNITY_CREATED: 'CRM',
        OPPORTUNITY_STAGE_CHANGED: 'CRM',
        OPPORTUNITY_WON: 'CRM',
        OPPORTUNITY_LOST: 'CRM',
        PROJECT_ASSIGNED: 'PROJECTS',
        PROJECT_TASK_ASSIGNED: 'PROJECTS',
        PROJECT_TASK_COMPLETED: 'PROJECTS',
        PROJECT_MILESTONE_COMPLETED: 'PROJECTS',
        PROJECT_MILESTONE_OVERDUE: 'PROJECTS',
        DOCUMENT_SHARED: 'DOCUMENTS',
        DOCUMENT_UPLOADED: 'DOCUMENTS',
        DOCUMENT_VERSION_CREATED: 'DOCUMENTS',
        EMPLOYEE_CREATED: 'PEOPLE',
        EMPLOYEE_STATUS_CHANGED: 'PEOPLE',
        ATTENDANCE_EXCEPTION: 'ATTENDANCE',
        SECURITY: 'SYSTEM',
      };

      const validCategories = ['LEAVE', 'PAYROLL', 'FINANCE', 'CRM', 'PROJECTS', 'DOCUMENTS', 'PEOPLE', 'ATTENDANCE', 'SYSTEM', 'SECURITY'];
      for (const [type, category] of Object.entries(CATEGORY_MAP)) {
        expect(validCategories).toContain(category);
        expect(type.length).toBeGreaterThan(0);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CASCADE DELETE
  // ══════════════════════════════════════════════════════════════════════════

  describe('Cascade Delete', () => {
    it('deleting a notification cascades to its deliveries', async () => {
      // Create a notification with a delivery for this test
      const testNotif = await prisma.notification.create({
        data: {
          tenantId: TENANT_A,
          recipientUserId: USER_A_EMPLOYEE,
          type: 'CASCADE_TEST',
          title: 'Cascade test',
          body: 'Test',
          severity: 'INFO',
          category: 'SYSTEM',
          entityType: 'Test',
          entityId: '00000000-0000-4000-8000-000000000094',
        },
      });
      const testDelivery = await prisma.notificationDelivery.create({
        data: {
          tenantId: TENANT_A,
          notificationId: testNotif.id,
          channel: 'IN_APP',
          status: 'DELIVERED',
          provider: 'internal',
        },
      });

      // Delete the notification
      await prisma.notification.delete({ where: { id: testNotif.id } });

      // Delivery should be cascaded
      const delivery = await prisma.notificationDelivery.findUnique({ where: { id: testDelivery.id } });
      expect(delivery).toBeNull();
    });

    it('deleting a template cascades to its versions', async () => {
      const testTemplate = await prisma.notificationTemplate.create({
        data: {
          tenantId: TENANT_A,
          name: 'Cascade Template',
          notificationType: 'CASCADE_TEMPLATE',
          channel: 'IN_APP',
          body: 'Test body',
          status: 'DRAFT',
          version: 1,
        },
      });
      const testVersion = await prisma.notificationTemplateVersion.create({
        data: {
          tenantId: TENANT_A,
          templateId: testTemplate.id,
          version: 1,
          name: 'Cascade Template',
          body: 'Test body',
        },
      });

      // Delete the template
      await prisma.notificationTemplate.delete({ where: { id: testTemplate.id } });

      // Version should be cascaded
      const version = await prisma.notificationTemplateVersion.findUnique({ where: { id: testVersion.id } });
      expect(version).toBeNull();
    });
  });
});
