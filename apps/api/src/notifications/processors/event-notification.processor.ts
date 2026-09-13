/**
 * FusionOS Event-to-Notification Processor
 *
 * Processes events from EventOutbox and creates notifications for authorized recipients.
 * Follows the architecture:
 *   EventOutbox → EventProcessor → NotificationRuleResolver → RecipientResolver
 *   → PreferenceResolver → TemplateResolver → NotificationCreator → DeliveryDispatcher
 *
 * This processor does NOT create duplicate notifications (idempotency via unique constraint).
 * It does NOT modify business transactions (fire-and-forget after EventOutbox).
 * It does NOT log provider credentials or sensitive data.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  NotificationService,
  EVENT_NOTIFICATION_MAP,
} from '../services/notification.service';

export interface ProcessEventParams {
  tenantId: string;
  eventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class EventNotificationProcessor {
  private readonly logger = new Logger(EventNotificationProcessor.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Process a single domain event and create notifications for relevant recipients.
   * Called by the EventOutbox dispatcher or directly from services.
   */
  async processEvent(params: ProcessEventParams): Promise<void> {
    const { tenantId, eventType, aggregateId, payload } = params;

    // 1. Check if this event type should generate notifications
    const mapping = EVENT_NOTIFICATION_MAP[eventType];
    if (!mapping) {
      this.logger.debug(`No notification mapping for event type: ${eventType}`);
      return;
    }

    // 2. Resolve recipients based on event type and payload
    const recipients = await this.resolveRecipients(tenantId, eventType, payload);
    if (recipients.length === 0) {
      this.logger.debug(`No recipients for event: ${eventType}`);
      return;
    }

    // 3. Resolve title/body based on event type and payload
    const { title, body, actionUrl } = this.resolveContent(eventType, payload);

    // 4. Create notifications for each recipient
    for (const recipientUserId of recipients) {
      // Check preferences
      const shouldNotifyInApp = await this.notificationService.shouldNotify(
        recipientUserId, tenantId, mapping.type, 'IN_APP',
      );

      if (shouldNotifyInApp) {
        await this.notificationService.createNotification({
          tenantId,
          recipientUserId,
          type: mapping.type,
          title,
          body,
          severity: mapping.severity,
          category: mapping.category,
          entityType: this.resolveEntityType(eventType),
          entityId: aggregateId,
          actionUrl,
          metadata: {
            eventType,
            aggregateType: params.aggregateType,
            aggregateId,
            ...params.metadata,
          },
        });
      }

      // Check email preference (for future email delivery)
      const shouldNotifyEmail = await this.notificationService.shouldNotify(
        recipientUserId, tenantId, mapping.type, 'EMAIL',
      );

      if (shouldNotifyEmail) {
        // Create a PENDING email delivery record
        // The actual email send happens via the email channel dispatcher
        this.logger.debug(
          `Email delivery queued: type=${mapping.type} recipient=${recipientUserId}`,
        );
      }
    }

    this.logger.log(
      `Event processed for notifications: ${eventType} → ${recipients.length} recipient(s)`,
    );
  }

  /**
   * Resolve recipients for a given event type.
   * Server-side resolution — never trusts client-supplied recipient IDs.
   */
  private async resolveRecipients(
    tenantId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<string[]> {
    const recipients: string[] = [];

    switch (eventType) {
      // ── Leave Events ────────────────────────────────────────────────
      case 'leave.approved':
      case 'leave.rejected': {
        // Notify the employee who submitted the request
        const empId = payload['employeeId'] as string | undefined;
        if (empId) {
          const employee = await this.prisma.employee.findUnique({
            where: { id: empId },
            select: { userId: true, tenantId: true },
          });
          if (employee?.userId && employee.tenantId === tenantId) {
            recipients.push(employee.userId);
          }
        }
        break;
      }

      case 'leave.submitted': {
        // Notify HR managers
        const hrUsers = await this.findUsersWithPermission(tenantId, 'leave:manage');
        recipients.push(...hrUsers);

        // Also notify the employee's manager
        const leaveEmpId = payload['employeeId'] as string | undefined;
        if (leaveEmpId) {
          const employee = await this.prisma.employee.findUnique({
            where: { id: leaveEmpId },
            select: { managerId: true, tenantId: true },
          });
          if (employee?.managerId && employee.tenantId === tenantId) {
            const manager = await this.prisma.employee.findUnique({
              where: { id: employee.managerId },
              select: { userId: true },
            });
            if (manager?.userId) recipients.push(manager.userId);
          }
        }
        break;
      }

      // ── Payroll Events ──────────────────────────────────────────────
      case 'payroll.finalized': {
        // Notify all employees in the tenant (payslip availability)
        const employees = await this.prisma.employee.findMany({
          where: { tenantId, deletedAt: null, employmentStatus: 'ACTIVE' },
          select: { userId: true },
        });
        recipients.push(...employees.map((e) => e.userId).filter((id): id is string => id !== null));
        break;
      }

      case 'payroll.approved': {
        // Notify HR managers
        const hrUsers = await this.findUsersWithPermission(tenantId, 'payroll:manage');
        recipients.push(...hrUsers);
        break;
      }

      case 'payroll.ready_for_review': {
        const reviewers = await this.findUsersWithPermission(tenantId, 'payroll:approve');
        recipients.push(...reviewers);
        break;
      }

      // ── Project Events ──────────────────────────────────────────────
      case 'project.created': {
        // Notify project manager if set
        const projMgrId = payload['managerId'] as string | undefined;
        if (projMgrId) {
          const manager = await this.prisma.employee.findUnique({
            where: { id: projMgrId },
            select: { userId: true },
          });
          if (manager?.userId) recipients.push(manager.userId);
        }
        break;
      }

      case 'project.task.assigned': {
        // Notify the assigned employee
        const assigneeId = payload['assigneeId'] as string | undefined;
        if (assigneeId) {
          const assignee = await this.prisma.employee.findUnique({
            where: { id: assigneeId },
            select: { userId: true },
          });
          if (assignee?.userId) recipients.push(assignee.userId);
        }
        break;
      }

      case 'project.task.completed':
      case 'project.milestone.completed':
      case 'project.milestone.overdue': {
        // Notify project manager
        const taskMgrId = payload['managerId'] as string | undefined;
        if (taskMgrId) {
          const manager = await this.prisma.employee.findUnique({
            where: { id: taskMgrId },
            select: { userId: true },
          });
          if (manager?.userId) recipients.push(manager.userId);
        }
        break;
      }

      // ── Document Events ─────────────────────────────────────────────
      case 'document.created':
      case 'document.shared': {
        // Notify document owner
        const ownerId = payload['ownerId'] as string | undefined;
        if (ownerId) {
          const owner = await this.prisma.employee.findUnique({
            where: { id: ownerId },
            select: { userId: true },
          });
          if (owner?.userId) recipients.push(owner.userId);
        }
        break;
      }

      // ── Employee Events ─────────────────────────────────────────────
      case 'employee.created':
      case 'employee.status_changed': {
        // Notify HR managers
        const hrUsers = await this.findUsersWithPermission(tenantId, 'employee:manage');
        recipients.push(...hrUsers);
        break;
      }

      // ── Asset Events ─────────────────────────────────────────────────
      case 'asset.assigned': {
        // Notify the assigned employee
        const assigneeId = payload['employeeId'] as string | undefined;
        if (assigneeId) {
          const employee = await this.prisma.employee.findUnique({
            where: { id: assigneeId },
            select: { userId: true },
          });
          if (employee?.userId) recipients.push(employee.userId);
        }
        break;
      }

      case 'asset.maintenance.scheduled':
      case 'asset.maintenance.completed':
      case 'asset.inspection.failed': {
        // Notify asset managers
        const assetManagers = await this.findUsersWithPermission(tenantId, 'asset:manage');
        recipients.push(...assetManagers);
        break;
      }

      // ── Default: no recipients ──────────────────────────────────────
      default:
        this.logger.debug(`No recipient resolution for event: ${eventType}`);
    }

    // Deduplicate recipients
    return [...new Set(recipients)];
  }

  /**
   * Resolve notification content (title, body, actionUrl) based on event type and payload.
   * Uses privacy-safe templates — never exposes sensitive payroll/financial data.
   */
  private resolveContent(
    eventType: string,
    payload: Record<string, unknown>,
  ): { title: string; body: string; actionUrl?: string } {
    const startDate = payload['startDate'] ? new Date(payload['startDate'] as string).toLocaleDateString() : '';
    const endDate = payload['endDate'] ? new Date(payload['endDate'] as string).toLocaleDateString() : '';
    const projectName = (payload['projectName'] as string) || 'a project';
    const taskTitle = (payload['taskTitle'] as string) || 'a task';
    const documentName = (payload['documentName'] as string) || 'a document';
    const periodName = (payload['periodName'] as string) || 'the current period';

    switch (eventType) {
      case 'leave.approved':
        return {
          title: 'Leave request approved',
          body: `Your leave request from ${startDate} to ${endDate} has been approved.`,
          actionUrl: '/people/leave',
        };
      case 'leave.rejected':
        return {
          title: 'Leave request rejected',
          body: `Your leave request from ${startDate} to ${endDate} has been rejected.`,
          actionUrl: '/people/leave',
        };
      case 'leave.submitted':
        return {
          title: 'Leave request submitted',
          body: `A new leave request has been submitted for review (${startDate} to ${endDate}).`,
          actionUrl: '/people/leave',
        };
      case 'leave.cancelled':
        return {
          title: 'Leave request cancelled',
          body: `A leave request from ${startDate} to ${endDate} has been cancelled.`,
          actionUrl: '/people/leave',
        };
      case 'payroll.finalized':
        return {
          title: 'Payroll finalized',
          body: `Payroll for ${periodName} has been finalized. Your payslip is available.`,
          actionUrl: '/people/payslips',
        };
      case 'payroll.approved':
        return {
          title: 'Payroll approved',
          body: `Payroll for ${periodName} has been approved.`,
          actionUrl: '/people/payroll',
        };
      case 'payroll.ready_for_review':
        return {
          title: 'Payroll ready for review',
          body: `Payroll calculations for ${periodName} are ready for review.`,
          actionUrl: '/people/payroll',
        };
      case 'project.created':
        return {
          title: 'Project assigned',
          body: `You have been assigned to ${projectName}.`,
          actionUrl: '/projects',
        };
      case 'project.task.assigned':
        return {
          title: 'Task assigned',
          body: `You have been assigned a task: ${taskTitle}.`,
          actionUrl: '/projects',
        };
      case 'project.task.completed':
        return {
          title: 'Task completed',
          body: `Task "${taskTitle}" has been marked as completed.`,
          actionUrl: '/projects',
        };
      case 'project.milestone.completed':
        return {
          title: 'Milestone completed',
          body: `A milestone in ${projectName} has been completed.`,
          actionUrl: '/projects',
        };
      case 'project.milestone.overdue':
        return {
          title: 'Milestone overdue',
          body: `A milestone in ${projectName} is now overdue.`,
          actionUrl: '/projects',
        };
      case 'document.created':
        return {
          title: 'Document uploaded',
          body: `Document "${documentName}" has been uploaded.`,
          actionUrl: '/documents',
        };
      case 'document.shared':
        return {
          title: 'Document shared',
          body: `Document "${documentName}" has been shared with you.`,
          actionUrl: '/documents',
        };
      case 'employee.created':
        return {
          title: 'New employee added',
          body: 'A new employee has been added to the organization.',
          actionUrl: '/people/employees',
        };
      case 'employee.status_changed':
        return {
          title: 'Employee status changed',
          body: 'An employee status has been updated.',
          actionUrl: '/people/employees',
        };
      case 'asset.assigned': {
        const assetName = (payload['assetName'] as string) || 'an asset';
        return {
          title: 'Asset assigned',
          body: `${assetName} has been assigned to you.`,
          actionUrl: '/assets',
        };
      }
      case 'asset.maintenance.scheduled':
        return {
          title: 'Maintenance scheduled',
          body: 'Maintenance has been scheduled for an asset.',
          actionUrl: '/assets',
        };
      case 'asset.maintenance.completed':
        return {
          title: 'Maintenance completed',
          body: 'Asset maintenance has been completed.',
          actionUrl: '/assets',
        };
      case 'asset.inspection.failed':
        return {
          title: 'Inspection failed',
          body: 'An asset inspection has failed. Review required.',
          actionUrl: '/assets',
        };
      default:
        return {
          title: 'System notification',
          body: 'You have a new notification.',
        };
    }
  }

  /**
   * Map event type to entity type for the notification.
   */
  private resolveEntityType(eventType: string): string {
    if (eventType.startsWith('leave.')) return 'LeaveRequest';
    if (eventType.startsWith('payroll.') || eventType.startsWith('payslip.')) return 'PayrollRun';
    if (eventType.startsWith('project.')) return 'Project';
    if (eventType.startsWith('document.')) return 'Document';
    if (eventType.startsWith('employee.')) return 'Employee';
    if (eventType.startsWith('asset.')) return 'Asset';
    if (eventType.startsWith('invoice.')) return 'Invoice';
    if (eventType.startsWith('payment.')) return 'Payment';
    if (eventType.startsWith('opportunity.')) return 'Opportunity';
    if (eventType.startsWith('expense.')) return 'Expense';
    return 'System';
  }

  /**
   * Find user IDs that have a specific permission in a tenant.
   */
  private async findUsersWithPermission(tenantId: string, permissionName: string): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        tenantId,
        role: {
          rolePermissions: {
            some: {
              permission: { name: permissionName },
            },
          },
        },
      },
      select: { userId: true },
    });

    return userRoles.map((ur) => ur.userId);
  }
}
