/**
 * FusionOS Automation Service
 *
 * Core service for workflow lifecycle, versioning, execution, and approval management.
 * All operations are tenant-scoped, RBAC-protected, and auditable.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import type { TenantContext } from '../../auth/services/tenant-context.service';
import { AuditLogService } from '../../common/services/audit-log.service';
import { EventPublisherService } from '../../common/services/event-publisher.service';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  ListWorkflowsDto,
  SaveVersionConfigDto,
  ListExecutionsDto,
  ApproveRejectDto,
  type TriggerConfig,
  type ConditionGroup,
  type ActionConfig,
} from '../dto/automation.dto';
import {
  TRIGGER_REGISTRY,
  getTriggerByEventType,
} from '../engine/trigger-registry';
import {
  evaluateConditions,
  validateConditionGroup,
} from '../engine/condition-engine';
import {
  validateActionsConfig,
  ACTION_REGISTRY,
} from '../engine/action-engine';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLog: AuditLogService,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════

  async getDashboard(ctx: TenantContext) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      activeWorkflows,
      draftWorkflows,
      pausedWorkflows,
      executionsToday,
      successfulExecutions,
      failedExecutions,
      pendingApprovals,
    ] = await Promise.all([
      this.prisma.automationWorkflow.count({
        where: { tenantId: ctx.tenantId, status: 'PUBLISHED' },
      }),
      this.prisma.automationWorkflow.count({
        where: { tenantId: ctx.tenantId, status: 'DRAFT' },
      }),
      this.prisma.automationWorkflow.count({
        where: { tenantId: ctx.tenantId, status: 'PAUSED' },
      }),
      this.prisma.automationExecution.count({
        where: { tenantId: ctx.tenantId, createdAt: { gte: todayStart } },
      }),
      this.prisma.automationExecution.count({
        where: { tenantId: ctx.tenantId, status: 'SUCCEEDED', createdAt: { gte: todayStart } },
      }),
      this.prisma.automationExecution.count({
        where: { tenantId: ctx.tenantId, status: 'FAILED', createdAt: { gte: todayStart } },
      }),
      this.prisma.automationApproval.count({
        where: { tenantId: ctx.tenantId, status: 'PENDING' },
      }),
    ]);

    return {
      activeWorkflows,
      draftWorkflows,
      pausedWorkflows,
      executionsToday,
      successfulExecutions,
      failedExecutions,
      pendingApprovals,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKFLOW CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  async listWorkflows(ctx: TenantContext, dto: ListWorkflowsDto) {
    const { page = 1, limit = 20, search, status, triggerType, createdBy } = dto;

    const where: Prisma.AutomationWorkflowWhereInput = {
      tenantId: ctx.tenantId,
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(status && { status: status as any }),
      ...(createdBy && { createdById: createdBy }),
    };

    const [data, total] = await Promise.all([
      this.prisma.automationWorkflow.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          currentVersion: {
            select: { triggerConfig: true, versionNumber: true },
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: { select: { executions: true } },
        },
      }),
      this.prisma.automationWorkflow.count({ where }),
    ]);

    // Enrich with execution stats
    const enriched = await Promise.all(
      data.map(async (workflow) => {
        const [lastExecution, successCount, failCount] = await Promise.all([
          this.prisma.automationExecution.findFirst({
            where: { workflowId: workflow.id },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true, status: true },
          }),
          this.prisma.automationExecution.count({
            where: { workflowId: workflow.id, status: 'SUCCEEDED' },
          }),
          this.prisma.automationExecution.count({
            where: { workflowId: workflow.id, status: 'FAILED' },
          }),
        ]);

        const totalExecutions = successCount + failCount;
        const successRate = totalExecutions > 0
          ? Math.round((successCount / totalExecutions) * 100)
          : null;

        return {
          ...workflow,
          lastExecution: lastExecution?.createdAt ?? null,
          lastExecutionStatus: lastExecution?.status ?? null,
          executionCount: workflow._count.executions,
          successRate,
        };
      }),
    );

    return {
      data: enriched,
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

  async createWorkflow(ctx: TenantContext, dto: CreateWorkflowDto) {
    // Check name uniqueness within tenant
    const existing = await this.prisma.automationWorkflow.findFirst({
      where: { tenantId: ctx.tenantId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`A workflow with name "${dto.name}" already exists.`);
    }

    const workflow = await this.prisma.$transaction(async (tx) => {
      const wf = await tx.automationWorkflow.create({
        data: {
          tenantId: ctx.tenantId,
          companyId: dto.companyId,
          name: dto.name,
          description: dto.description,
          createdById: ctx.userId,
        },
      });

      // Create initial draft version
      await tx.automationWorkflowVersion.create({
        data: {
          tenantId: ctx.tenantId,
          workflowId: wf.id,
          versionNumber: 1,
          status: 'DRAFT',
          triggerConfig: { type: 'DOMAIN_EVENT', entityType: '', eventType: '' },
          conditionConfig: Prisma.JsonNull,
          actionsConfig: [],
        },
      });

      await this.auditLog.record({
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        action: 'AUTOMATION_WORKFLOW_CREATED',
        entityType: 'AutomationWorkflow',
        entityId: wf.id,
        newValue: { name: dto.name },
      });

      return wf;
    });

    return workflow;
  }

  async getWorkflow(ctx: TenantContext, id: string) {
    const workflow = await this.prisma.automationWorkflow.findUnique({
      where: { id },
      include: {
        currentVersion: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
          select: {
            id: true,
            versionNumber: true,
            status: true,
            publishedAt: true,
            createdAt: true,
            triggerConfig: true,
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!workflow) throw new NotFoundException('Workflow not found');
    if (workflow.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: workflow belongs to another tenant');
    }

    return workflow;
  }

  async updateWorkflow(ctx: TenantContext, id: string, dto: UpdateWorkflowDto) {
    const workflow = await this.prisma.automationWorkflow.findUnique({ where: { id } });
    if (!workflow) throw new NotFoundException('Workflow not found');
    if (workflow.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: workflow belongs to another tenant');
    }
    if (workflow.status === 'ARCHIVED') {
      throw new BadRequestException('Cannot edit an archived workflow.');
    }

    // Check name uniqueness if changing name
    if (dto.name && dto.name !== workflow.name) {
      const existing = await this.prisma.automationWorkflow.findFirst({
        where: { tenantId: ctx.tenantId, name: dto.name, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`A workflow with name "${dto.name}" already exists.`);
      }
    }

    const updated = await this.prisma.automationWorkflow.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'AUTOMATION_WORKFLOW_EDITED',
      entityType: 'AutomationWorkflow',
      entityId: id,
      previousValue: { name: workflow.name },
      newValue: { name: updated.name, description: updated.description },
    });

    return updated;
  }

  async deleteWorkflow(ctx: TenantContext, id: string) {
    const workflow = await this.prisma.automationWorkflow.findUnique({
      where: { id },
      include: { _count: { select: { executions: true } } },
    });
    if (!workflow) throw new NotFoundException('Workflow not found');
    if (workflow.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: workflow belongs to another tenant');
    }
    if (workflow.status !== 'DRAFT') {
      throw new BadRequestException('Only draft workflows can be deleted.');
    }
    if (workflow._count.executions > 0) {
      throw new BadRequestException('Cannot delete a workflow with execution history. Use archive instead.');
    }

    await this.prisma.$transaction(async (tx) => {
      // Delete versions first
      await tx.automationWorkflowVersion.deleteMany({ where: { workflowId: id } });
      await tx.automationWorkflow.delete({ where: { id } });
    });

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'AUTOMATION_WORKFLOW_DELETED',
      entityType: 'AutomationWorkflow',
      entityId: id,
      previousValue: { name: workflow.name },
    });

    return { deleted: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VERSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  async saveVersionConfig(ctx: TenantContext, workflowId: string, dto: SaveVersionConfigDto) {
    const workflow = await this.prisma.automationWorkflow.findUnique({ where: { id: workflowId } });
    if (!workflow) throw new NotFoundException('Workflow not found');
    if (workflow.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: workflow belongs to another tenant');
    }
    if (workflow.status === 'ARCHIVED') {
      throw new BadRequestException('Cannot edit an archived workflow.');
    }

    // Find or create the current draft version
    let draftVersion = await this.prisma.automationWorkflowVersion.findFirst({
      where: {
        workflowId,
        status: 'DRAFT',
      },
    });

    if (!draftVersion) {
      // Create new draft version
      const maxVersion = await this.prisma.automationWorkflowVersion.aggregate({
        where: { workflowId },
        _max: { versionNumber: true },
      });
      const nextVersion = (maxVersion._max.versionNumber ?? 0) + 1;

      draftVersion = await this.prisma.automationWorkflowVersion.create({
        data: {
          tenantId: ctx.tenantId,
          workflowId,
          versionNumber: nextVersion,
          status: 'DRAFT',
          triggerConfig: dto.triggerConfig as any,
          conditionConfig: dto.conditionConfig ? (dto.conditionConfig as any) : Prisma.JsonNull,
          actionsConfig: dto.actionsConfig as any,
        },
      });
    } else {
      // Update existing draft
      draftVersion = await this.prisma.automationWorkflowVersion.update({
        where: { id: draftVersion.id },
        data: {
          triggerConfig: dto.triggerConfig as any,
          conditionConfig: dto.conditionConfig ? (dto.conditionConfig as any) : Prisma.JsonNull,
          actionsConfig: dto.actionsConfig as any,
        },
      });
    }

    return draftVersion;
  }

  async getVersions(ctx: TenantContext, workflowId: string) {
    const workflow = await this.prisma.automationWorkflow.findUnique({ where: { id: workflowId } });
    if (!workflow) throw new NotFoundException('Workflow not found');
    if (workflow.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: workflow belongs to another tenant');
    }

    return this.prisma.automationWorkflowVersion.findMany({
      where: { workflowId },
      orderBy: { versionNumber: 'desc' },
      include: {
        publishedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKFLOW LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  async validateWorkflow(ctx: TenantContext, workflowId: string) {
    const workflow = await this.prisma.automationWorkflow.findUnique({ where: { id: workflowId } });
    if (!workflow) throw new NotFoundException('Workflow not found');
    if (workflow.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: workflow belongs to another tenant');
    }

    const draftVersion = await this.prisma.automationWorkflowVersion.findFirst({
      where: { workflowId, status: 'DRAFT' },
    });

    if (!draftVersion) {
      return { valid: true, errors: [], warnings: ['No draft version found to validate.'] };
    }

    return this.validateVersionConfig(draftVersion);
  }

  private async validateVersionConfig(version: {
    triggerConfig: any;
    conditionConfig: any;
    actionsConfig: any;
  }) {
    const errors: string[] = [];

    // Validate trigger
    const trigger = version.triggerConfig as TriggerConfig;
    if (!trigger?.type) {
      errors.push('Trigger type is required.');
    }
    if (!trigger?.eventType) {
      errors.push('Trigger event type is required.');
    } else {
      const triggerDef = getTriggerByEventType(trigger.eventType);
      if (!triggerDef) {
        errors.push(`Event type "${trigger.eventType}" is not supported.`);
      }
    }
    if (!trigger?.entityType) {
      errors.push('Trigger entity type is required.');
    }

    // Validate conditions
    if (version.conditionConfig) {
      const triggerDef = getTriggerByEventType(trigger?.eventType ?? '');
      const availableFields = triggerDef?.availableFields ?? [];
      const conditionErrors = validateConditionGroup(
        version.conditionConfig as ConditionGroup,
        availableFields,
      );
      errors.push(...conditionErrors);
    }

    // Validate actions
    const actions = version.actionsConfig as ActionConfig[];
    const actionErrors = validateActionsConfig(actions);
    errors.push(...actionErrors);

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  async publishWorkflow(ctx: TenantContext, workflowId: string) {
    const workflow = await this.prisma.automationWorkflow.findUnique({ where: { id: workflowId } });
    if (!workflow) throw new NotFoundException('Workflow not found');
    if (workflow.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: workflow belongs to another tenant');
    }
    if (workflow.status === 'ARCHIVED') {
      throw new BadRequestException('Cannot publish an archived workflow.');
    }

    const draftVersion = await this.prisma.automationWorkflowVersion.findFirst({
      where: { workflowId, status: 'DRAFT' },
    });
    if (!draftVersion) {
      throw new BadRequestException('No draft version found. Create or edit a workflow first.');
    }

    // Validate before publishing
    const validation = await this.validateVersionConfig(draftVersion);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Workflow validation failed',
        errors: validation.errors,
      });
    }

    // Publish: mark previous published version as SUPERSEDED, new version as PUBLISHED
    const published = await this.prisma.$transaction(async (tx) => {
      // Supersede previous published version
      await tx.automationWorkflowVersion.updateMany({
        where: { workflowId, status: 'PUBLISHED' },
        data: { status: 'SUPERSEDED' },
      });

      // Publish the draft
      const pub = await tx.automationWorkflowVersion.update({
        where: { id: draftVersion.id },
        data: {
          status: 'PUBLISHED',
          publishedById: ctx.userId,
          publishedAt: new Date(),
          validationErrors: Prisma.JsonNull,
        },
      });

      // Update workflow status and current version
      await tx.automationWorkflow.update({
        where: { id: workflowId },
        data: {
          status: 'PUBLISHED',
          currentVersionId: pub.id,
        },
      });

      return pub;
    });

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'AUTOMATION_WORKFLOW_PUBLISHED',
      entityType: 'AutomationWorkflow',
      entityId: workflowId,
      newValue: { versionNumber: published.versionNumber },
    });

    return published;
  }

  async pauseWorkflow(ctx: TenantContext, workflowId: string) {
    const workflow = await this.prisma.automationWorkflow.findUnique({ where: { id: workflowId } });
    if (!workflow) throw new NotFoundException('Workflow not found');
    if (workflow.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: workflow belongs to another tenant');
    }
    if (workflow.status !== 'PUBLISHED') {
      throw new BadRequestException('Only published workflows can be paused.');
    }

    const updated = await this.prisma.automationWorkflow.update({
      where: { id: workflowId },
      data: { status: 'PAUSED' },
    });

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'AUTOMATION_WORKFLOW_PAUSED',
      entityType: 'AutomationWorkflow',
      entityId: workflowId,
    });

    return updated;
  }

  async resumeWorkflow(ctx: TenantContext, workflowId: string) {
    const workflow = await this.prisma.automationWorkflow.findUnique({ where: { id: workflowId } });
    if (!workflow) throw new NotFoundException('Workflow not found');
    if (workflow.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: workflow belongs to another tenant');
    }
    if (workflow.status !== 'PAUSED') {
      throw new BadRequestException('Only paused workflows can be resumed.');
    }

    const updated = await this.prisma.automationWorkflow.update({
      where: { id: workflowId },
      data: { status: 'PUBLISHED' },
    });

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'AUTOMATION_WORKFLOW_RESUMED',
      entityType: 'AutomationWorkflow',
      entityId: workflowId,
    });

    return updated;
  }

  async archiveWorkflow(ctx: TenantContext, workflowId: string) {
    const workflow = await this.prisma.automationWorkflow.findUnique({ where: { id: workflowId } });
    if (!workflow) throw new NotFoundException('Workflow not found');
    if (workflow.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: workflow belongs to another tenant');
    }
    if (workflow.status === 'DRAFT' && !workflow.currentVersionId) {
      // Draft with no history can be soft-deleted
      throw new BadRequestException('Use delete for drafts without execution history.');
    }

    const updated = await this.prisma.automationWorkflow.update({
      where: { id: workflowId },
      data: { status: 'ARCHIVED' },
    });

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'AUTOMATION_WORKFLOW_ARCHIVED',
      entityType: 'AutomationWorkflow',
      entityId: workflowId,
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXECUTION ENGINE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Process a domain event and trigger matching workflows.
   * This is the main entry point for the automation execution engine.
   */
  async processEvent(params: {
    tenantId: string;
    eventType: string;
    entityType: string;
    entityId: string;
    entityData: Record<string, unknown>;
    actorId?: string;
    correlationId?: string;
    triggerEventId?: string;
  }) {
    const { tenantId, eventType, entityType, entityId, entityData, actorId, correlationId, triggerEventId } = params;

    // Find published workflows that match this event type
    const matchingWorkflows = await this.prisma.automationWorkflow.findMany({
      where: {
        tenantId,
        status: 'PUBLISHED',
        currentVersion: {
          triggerConfig: {
            path: ['eventType'],
            equals: eventType,
          },
        },
      },
      include: {
        currentVersion: true,
      },
    });

    for (const workflow of matchingWorkflows) {
      if (!workflow.currentVersion) continue;

      // Idempotency check: skip if already executed for this event+version
      const existingExecution = await this.prisma.automationExecution.findFirst({
        where: {
          tenantId,
          workflowVersionId: workflow.currentVersionId!,
          triggerEventId: triggerEventId ?? null,
        },
      });

      if (existingExecution) {
        this.logger.debug(`Skipping duplicate execution for workflow ${workflow.id}, event ${triggerEventId}`);
        continue;
      }

      // Create execution
      const execution = await this.prisma.automationExecution.create({
        data: {
          tenantId,
          workflowId: workflow.id,
          workflowVersionId: workflow.currentVersionId!,
          triggerEventId: triggerEventId ?? null,
          triggerEventType: eventType,
          triggerEntityType: entityType,
          triggerEntityId: entityId,
          status: 'PENDING',
          correlationId,
          actorId,
        },
      });

      // Execute asynchronously (fire-and-forget for now, using transaction)
      this.executeWorkflow(execution.id, tenantId, entityData).catch((error) => {
        this.logger.error(`Workflow execution ${execution.id} failed: ${error.message}`);
      });
    }

    return { workflowsTriggered: matchingWorkflows.length };
  }

  /**
   * Execute a workflow execution record.
   */
  private async executeWorkflow(executionId: string, tenantId: string, entityData: Record<string, unknown>) {
    const execution = await this.prisma.automationExecution.findUnique({
      where: { id: executionId },
      include: {
        workflowVersion: true,
        workflow: true,
      },
    });

    if (!execution || execution.tenantId !== tenantId) return;

    const version = execution.workflowVersion;
    const triggerConfig = version.triggerConfig as unknown as TriggerConfig;
    const conditionConfig = version.conditionConfig as unknown as ConditionGroup | null;
    const actionsConfig = ((version.actionsConfig as unknown) as ActionConfig[]) ?? [];

    // Mark as running
    await this.prisma.automationExecution.update({
      where: { id: executionId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    const startTime = Date.now();
    const stepResults: Array<{ stepNumber: number; status: string; error?: string }> = [];

    try {
      // Evaluate conditions
      if (conditionConfig) {
        const conditionResult = evaluateConditions(conditionConfig, entityData);
        if (!conditionResult.matched) {
          await this.prisma.automationExecution.update({
            where: { id: executionId },
            data: {
              status: 'SKIPPED',
              completedAt: new Date(),
              duration: Date.now() - startTime,
              metadata: { reason: 'conditions_not_matched', errors: conditionResult.errors },
            },
          });
          return;
        }
      }

      // Execute actions sequentially
      for (let i = 0; i < actionsConfig.length; i++) {
        const action = actionsConfig[i];
        const stepNumber = i + 1;
        const idempotencyKey = `${executionId}:step:${stepNumber}`;

        // Check idempotency
        const existingStep = await this.prisma.automationStepExecution.findUnique({
          where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
        });

        if (existingStep && existingStep.status === 'SUCCEEDED') {
          stepResults.push({ stepNumber, status: 'SUCCEEDED' });
          continue;
        }

        const stepStart = Date.now();
        const step = await this.prisma.automationStepExecution.create({
          data: {
            tenantId,
            executionId,
            stepNumber,
            actionType: action.type as any,
            actionConfig: action.config as any,
            status: 'RUNNING',
            idempotencyKey,
            startedAt: new Date(),
          },
        });

        try {
          const result = await this.executeAction(action, entityData, execution);
          const stepDuration = Date.now() - stepStart;

          await this.prisma.automationStepExecution.update({
            where: { id: step.id },
            data: {
              status: 'SUCCEEDED',
              result: result as any,
              completedAt: new Date(),
              duration: stepDuration,
            },
          });
          stepResults.push({ stepNumber, status: 'SUCCEEDED' });
        } catch (error) {
          const stepDuration = Date.now() - stepStart;
          const errorMsg = (error as Error).message;

          await this.prisma.automationStepExecution.update({
            where: { id: step.id },
            data: {
              status: 'FAILED',
              error: errorMsg,
              completedAt: new Date(),
              duration: stepDuration,
            },
          });
          stepResults.push({ stepNumber, status: 'FAILED', error: errorMsg });

          // Continue with remaining steps but record failure
        }
      }

      const hasFailures = stepResults.some((s) => s.status === 'FAILED');
      const allSkipped = stepResults.every((s) => s.status === 'SKIPPED');

      let finalStatus: string;
      if (hasFailures) {
        finalStatus = 'FAILED';
      } else if (allSkipped || stepResults.length === 0) {
        finalStatus = 'SKIPPED';
      } else {
        finalStatus = 'SUCCEEDED';
      }

      await this.prisma.automationExecution.update({
        where: { id: executionId },
        data: {
          status: finalStatus as any,
          completedAt: new Date(),
          duration: Date.now() - startTime,
          metadata: { steps: stepResults },
        },
      });

      // Audit
      await this.auditLog.record({
        tenantId,
        action: `AUTOMATION_EXECUTION_${finalStatus}`,
        entityType: 'AutomationExecution',
        entityId: executionId,
        newValue: {
          workflowId: execution.workflowId,
          triggerEventType: execution.triggerEventType,
          stepResults,
        },
      });
    } catch (error) {
      await this.prisma.automationExecution.update({
        where: { id: executionId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          duration: Date.now() - startTime,
          error: (error as Error).message,
          lastError: (error as Error).message,
        },
      });
    }
  }

  /**
   * Execute a single action step.
   */
  private async executeAction(
    action: ActionConfig,
    entityData: Record<string, unknown>,
    execution: { id: string; tenantId: string; workflowId: string; triggerEntityType: string | null; triggerEntityId: string | null },
  ): Promise<Record<string, unknown>> {
    switch (action.type) {
      case 'SEND_NOTIFICATION':
        return this.executeSendNotification(action.config, execution);
      case 'CREATE_TASK':
        return this.executeCreateTask(action.config, entityData, execution);
      case 'REQUEST_APPROVAL':
        return this.executeRequestApproval(action.config, entityData, execution);
      case 'UPDATE_ENTITY':
        return this.executeUpdateEntity(action.config, entityData, execution);
      case 'CREATE_AUDIT_EVENT':
        return this.executeCreateAuditEvent(action.config, entityData, execution);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private async executeSendNotification(
    config: Record<string, unknown>,
    execution: { tenantId: string; id: string },
  ): Promise<Record<string, unknown>> {
    const cfg = config as Record<string, any>;
    const recipientType = cfg['recipientType'] as string;
    let recipientUserId = cfg['recipientUserId'] as string | undefined;

    if (recipientType === 'workflow_owner') {
      const exec = await this.prisma.automationExecution.findUnique({
        where: { id: execution.id },
        select: { workflow: { select: { createdById: true } } },
      });
      recipientUserId = exec?.workflow?.createdById;
    }

    if (!recipientUserId) {
      throw new Error('Could not determine notification recipient.');
    }

    const notification = await this.prisma.notification.create({
      data: {
        tenantId: execution.tenantId,
        recipientUserId,
        type: 'AUTOMATION_NOTIFICATION',
        title: String(cfg['title'] ?? 'Automation Notification'),
        body: String(cfg['message'] ?? ''),
        severity: (cfg['severity'] as any) ?? 'INFO',
        category: 'AUTOMATION',
        entityType: 'AutomationExecution',
        entityId: execution.id,
        metadata: { executionId: execution.id },
      },
    });

    return { notificationId: notification.id };
  }

  private async executeCreateTask(
    config: Record<string, unknown>,
    entityData: Record<string, unknown>,
    execution: { tenantId: string; id: string; triggerEntityType: string | null; triggerEntityId: string | null },
  ): Promise<Record<string, unknown>> {
    const cfg = config as Record<string, any>;
    let assigneeId = cfg['assigneeId'] as string | undefined;

    if (cfg['assigneeType'] === 'workflow_owner') {
      const exec = await this.prisma.automationExecution.findUnique({
        where: { id: execution.id },
        select: { workflow: { select: { createdById: true } } },
      });
      const employee = await this.prisma.employee.findFirst({
        where: { userId: exec?.workflow?.createdById, tenantId: execution.tenantId },
      });
      assigneeId = employee?.id;
    }

    const task = await this.prisma.task.create({
      data: {
        tenantId: execution.tenantId,
        companyId: (entityData['company.id'] as string) ?? '',
        title: String(cfg['title'] ?? 'Automation Task'),
        description: cfg['description'] ? String(cfg['description']) : undefined,
        assigneeId,
        priority: (cfg['priority'] as any) ?? 'MEDIUM',
        status: 'TODO',
        dueDate: cfg['dueDateOffsetDays']
          ? new Date(Date.now() + Number(cfg['dueDateOffsetDays']) * 86400000)
          : undefined,
      },
    });

    return { taskId: task.id };
  }

  private async executeRequestApproval(
    config: Record<string, unknown>,
    entityData: Record<string, unknown>,
    execution: { tenantId: string; id: string; workflowId: string; triggerEntityType: string | null; triggerEntityId: string | null },
  ): Promise<Record<string, unknown>> {
    const cfg = config as Record<string, any>;
    const approval = await this.prisma.automationApproval.create({
      data: {
        tenantId: execution.tenantId,
        workflowId: execution.workflowId,
        executionId: execution.id,
        requestedById: (entityData['actorId'] as string) ?? '',
        approverUserId: String(cfg['approverUserId']),
        entityType: execution.triggerEntityType ?? undefined,
        entityId: execution.triggerEntityId ?? undefined,
        status: 'PENDING',
        reason: String(cfg['reason'] ?? ''),
      },
    });

    return { approvalId: approval.id };
  }

  private async executeUpdateEntity(
    config: Record<string, unknown>,
    entityData: Record<string, unknown>,
    execution: { tenantId: string; id: string; triggerEntityType: string | null; triggerEntityId: string | null },
  ): Promise<Record<string, unknown>> {
    const cfg = config as Record<string, any>;
    const entityType = String(cfg['entityType']);
    const field = String(cfg['field']);
    const value = cfg['value'];

    // Only allow whitelisted entity updates
    const allowedUpdates: Record<string, string[]> = {
      Employee: ['employmentStatus', 'departmentId', 'branchId'],
      Project: ['status', 'progress'],
      ProjectTask: ['status', 'priority'],
    };

    const allowed = allowedUpdates[entityType];
    if (!allowed || !allowed.includes(field)) {
      throw new Error(`Field "${field}" on "${entityType}" is not allowed for automation updates.`);
    }

    const entityIdField = String(cfg['entityIdField'] ?? 'entityId');
    const entityId = entityData[entityIdField] as string ?? execution.triggerEntityId;

    if (!entityId) {
      throw new Error('Could not determine entity ID for update.');
    }

    // Perform the update through Prisma (tenant-scoped)
    const updateData: Record<string, unknown> = { [field]: value };
    let result: any;

    switch (entityType) {
      case 'Employee':
        result = await this.prisma.employee.updateMany({
          where: { id: entityId, tenantId: execution.tenantId },
          data: updateData,
        });
        break;
      case 'Project':
        result = await this.prisma.project.updateMany({
          where: { id: entityId, tenantId: execution.tenantId },
          data: updateData,
        });
        break;
      case 'ProjectTask':
        result = await this.prisma.projectTask.updateMany({
          where: { id: entityId, tenantId: execution.tenantId },
          data: updateData,
        });
        break;
    }

    return { updated: result?.count ?? 0, entityType, field, value };
  }

  private async executeCreateAuditEvent(
    config: Record<string, unknown>,
    entityData: Record<string, unknown>,
    execution: { tenantId: string; id: string; triggerEntityType: string | null; triggerEntityId: string | null },
  ): Promise<Record<string, unknown>> {
    const cfg = config as Record<string, any>;
    await this.auditLog.record({
      tenantId: execution.tenantId,
      action: String(cfg['action'] ?? 'AUTOMATION_CUSTOM_EVENT'),
      entityType: String(cfg['entityType'] ?? execution.triggerEntityType ?? 'Automation'),
      entityId: execution.triggerEntityId ?? execution.id,
      newValue: {
        description: cfg['description'],
        executionId: execution.id,
      },
    });

    return { recorded: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXECUTION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  async listExecutions(ctx: TenantContext, dto: ListExecutionsDto) {
    const { page = 1, limit = 20, workflowId, status, triggerType, entityType, startDate, endDate } = dto;

    const where: Prisma.AutomationExecutionWhereInput = {
      tenantId: ctx.tenantId,
      ...(workflowId && { workflowId }),
      ...(status && { status: status as any }),
      ...(entityType && { triggerEntityType: entityType }),
      ...(startDate && endDate && {
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.automationExecution.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          workflow: { select: { id: true, name: true } },
          workflowVersion: { select: { versionNumber: true } },
          _count: { select: { steps: true } },
        },
      }),
      this.prisma.automationExecution.count({ where }),
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

  async getExecution(ctx: TenantContext, id: string) {
    const execution = await this.prisma.automationExecution.findUnique({
      where: { id },
      include: {
        workflow: { select: { id: true, name: true, status: true } },
        workflowVersion: { select: { versionNumber: true, triggerConfig: true, actionsConfig: true } },
        steps: { orderBy: { stepNumber: 'asc' } },
        approvals: true,
      },
    });

    if (!execution) throw new NotFoundException('Execution not found');
    if (execution.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: execution belongs to another tenant');
    }

    return execution;
  }

  async retryExecution(ctx: TenantContext, id: string) {
    const execution = await this.prisma.automationExecution.findUnique({ where: { id } });
    if (!execution) throw new NotFoundException('Execution not found');
    if (execution.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: execution belongs to another tenant');
    }
    if (execution.status !== 'FAILED') {
      throw new BadRequestException('Only failed executions can be retried.');
    }
    if (execution.attemptCount >= execution.maxAttempts) {
      throw new BadRequestException('Maximum retry attempts reached.');
    }

    const updated = await this.prisma.automationExecution.update({
      where: { id },
      data: {
        status: 'PENDING',
        attemptCount: execution.attemptCount + 1,
        lastError: null,
        error: null,
      },
    });

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'AUTOMATION_EXECUTION_RETRIED',
      entityType: 'AutomationExecution',
      entityId: id,
      newValue: { attemptCount: updated.attemptCount },
    });

    // Re-execute
    await this.executeWorkflow(id, ctx.tenantId, {});

    return updated;
  }

  async cancelExecution(ctx: TenantContext, id: string) {
    const execution = await this.prisma.automationExecution.findUnique({ where: { id } });
    if (!execution) throw new NotFoundException('Execution not found');
    if (execution.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: execution belongs to another tenant');
    }
    if (execution.status !== 'PENDING' && execution.status !== 'RUNNING') {
      throw new BadRequestException('Only pending or running executions can be cancelled.');
    }

    const updated = await this.prisma.automationExecution.update({
      where: { id },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'AUTOMATION_EXECUTION_CANCELLED',
      entityType: 'AutomationExecution',
      entityId: id,
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APPROVALS
  // ═══════════════════════════════════════════════════════════════════════════

  async listPendingApprovals(ctx: TenantContext) {
    return this.prisma.automationApproval.findMany({
      where: {
        tenantId: ctx.tenantId,
        approverUserId: ctx.userId,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        workflow: { select: { id: true, name: true } },
        execution: { select: { id: true, triggerEventType: true } },
      },
    });
  }

  async approveRequest(ctx: TenantContext, id: string, dto: ApproveRejectDto) {
    const approval = await this.prisma.automationApproval.findUnique({ where: { id } });
    if (!approval) throw new NotFoundException('Approval request not found');
    if (approval.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: approval belongs to another tenant');
    }
    if (approval.approverUserId !== ctx.userId) {
      throw new ForbiddenException('Only the designated approver can approve this request.');
    }
    if (approval.status !== 'PENDING') {
      throw new BadRequestException('This approval request has already been processed.');
    }

    const updated = await this.prisma.automationApproval.update({
      where: { id },
      data: {
        status: 'APPROVED',
        decisionAt: new Date(),
        comment: dto.comment,
      },
    });

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'AUTOMATION_APPROVAL_APPROVED',
      entityType: 'AutomationApproval',
      entityId: id,
    });

    return updated;
  }

  async rejectRequest(ctx: TenantContext, id: string, dto: ApproveRejectDto) {
    const approval = await this.prisma.automationApproval.findUnique({ where: { id } });
    if (!approval) throw new NotFoundException('Approval request not found');
    if (approval.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: approval belongs to another tenant');
    }
    if (approval.approverUserId !== ctx.userId) {
      throw new ForbiddenException('Only the designated approver can reject this request.');
    }
    if (approval.status !== 'PENDING') {
      throw new BadRequestException('This approval request has already been processed.');
    }

    const updated = await this.prisma.automationApproval.update({
      where: { id },
      data: {
        status: 'REJECTED',
        decisionAt: new Date(),
        comment: dto.comment,
      },
    });

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'AUTOMATION_APPROVAL_REJECTED',
      entityType: 'AutomationApproval',
      entityId: id,
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRIGGER REGISTRY (read-only)
  // ═══════════════════════════════════════════════════════════════════════════

  getTriggerRegistry() {
    return TRIGGER_REGISTRY;
  }

  getActionTypes() {
    return ACTION_REGISTRY;
  }
}
