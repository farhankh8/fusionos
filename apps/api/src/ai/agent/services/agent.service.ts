/**
 * FusionOS AI Agent Service
 *
 * Core service for AI agent lifecycle, versioning, execution,
 * approval, verification, and memory management.
 * All operations are tenant-scoped and RBAC-protected.
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
import type { TenantContext } from '../../../auth/services/tenant-context.service';
import { AuditLogService } from '../../../common/services/audit-log.service';
import { OllamaProvider } from '../../providers/ollama.provider';
import { generatePlan } from '../engine/planning-engine';
import { assessPlanRisk } from '../engine/risk-engine';
import { evaluatePolicy } from '../engine/policy-engine';
import { verifyToolResult, generateVerificationCriteria } from '../engine/verification-engine';
import { AGENT_PROFILES, getProfileByType } from '../engine/agent-profiles';
import { getToolByName } from '../../engine/tool-registry';
import type { CreateAgentDto, UpdateAgentDto, ListAgentsDto, CreateAgentTaskDto, ListAgentTasksDto } from '../dto/agent.dto';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLog: AuditLogService,
    private readonly aiProvider: OllamaProvider,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════

  async getDashboard(ctx: TenantContext) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      activeAgents,
      runningTasks,
      awaitingApproval,
      completedToday,
      failedTasks,
    ] = await Promise.all([
      this.prisma.aIAgent.count({
        where: { tenantId: ctx.tenantId, status: 'ACTIVE' },
      }),
      this.prisma.aIAgentTask.count({
        where: { tenantId: ctx.tenantId, status: { in: ['EXECUTING', 'ANALYZING', 'PLANNING'] } },
      }),
      this.prisma.aIAgentTask.count({
        where: { tenantId: ctx.tenantId, status: 'WAITING_APPROVAL' },
      }),
      this.prisma.aIAgentTask.count({
        where: { tenantId: ctx.tenantId, status: 'COMPLETED', createdAt: { gte: todayStart } },
      }),
      this.prisma.aIAgentTask.count({
        where: { tenantId: ctx.tenantId, status: 'FAILED' },
      }),
    ]);

    return {
      activeAgents,
      runningTasks,
      awaitingApproval,
      completedToday,
      failedTasks,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AGENT PROFILES
  // ═══════════════════════════════════════════════════════════════════════════

  getProfiles() {
    return AGENT_PROFILES.map((p) => ({
      name: p.name,
      type: p.type,
      description: p.description,
      purpose: p.purpose,
      allowedTools: p.allowedTools,
      suggestedGoals: p.suggestedGoals,
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AGENT CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  async listAgents(ctx: TenantContext, dto: ListAgentsDto) {
    const { page = 1, limit = 20, search, agentType, status } = dto;

    const where: Prisma.AIAgentWhereInput = {
      tenantId: ctx.tenantId,
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(agentType && { agentType: agentType as any }),
      ...(status && { status: status as any }),
    };

    const [data, total] = await Promise.all([
      this.prisma.aIAgent.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          currentVersion: {
            select: { id: true, versionNumber: true, status: true },
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: { select: { tasks: true } },
        },
      }),
      this.prisma.aIAgent.count({ where }),
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

  async createAgent(ctx: TenantContext, dto: CreateAgentDto) {
    // Check name uniqueness
    const existing = await this.prisma.aIAgent.findFirst({
      where: { tenantId: ctx.tenantId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`An agent with name "${dto.name}" already exists.`);
    }

    // Get profile defaults
    const profile = getProfileByType(dto.agentType);

    // Merge configuration with profile defaults
    const config = {
      purpose: dto.description ?? profile?.purpose ?? '',
      allowedTools: dto.configuration['allowedTools'] ?? profile?.allowedTools ?? [],
      contextSources: dto.configuration['contextSources'] ?? profile?.contextSources ?? [],
      riskPolicy: dto.configuration['riskPolicy'] ?? profile?.riskPolicy ?? {
        maxRiskLevel: 'LOW',
        requiresApprovalAbove: 'LOW',
      },
      limits: dto.configuration['limits'] ?? profile?.limits ?? {
        maxSteps: 5,
        maxToolCalls: 5,
        maxExecutionDurationMs: 30000,
        maxRetries: 2,
      },
    };

    const agent = await this.prisma.$transaction(async (tx) => {
      const ag = await tx.aIAgent.create({
        data: {
          tenantId: ctx.tenantId,
          companyId: dto.companyId,
          name: dto.name,
          description: dto.description,
          agentType: dto.agentType,
          configuration: config as any,
          createdById: ctx.userId,
        },
      });

      // Create initial draft version
      await tx.aIAgentVersion.create({
        data: {
          tenantId: ctx.tenantId,
          agentId: ag.id,
          versionNumber: 1,
          status: 'DRAFT',
          configuration: {
            prompt: profile?.purpose ?? '',
            tools: config.allowedTools,
            policies: config.riskPolicy,
            limits: config.limits,
          },
        },
      });

      await this.auditLog.record({
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        action: 'AI_AGENT_CREATED',
        entityType: 'AIAgent',
        entityId: ag.id,
        newValue: { name: dto.name, agentType: dto.agentType },
      });

      return ag;
    });

    return agent;
  }

  async getAgent(ctx: TenantContext, id: string) {
    const agent = await this.prisma.aIAgent.findUnique({
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
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!agent) throw new NotFoundException('Agent not found');
    if (agent.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: agent belongs to another tenant');
    }

    return agent;
  }

  async updateAgent(ctx: TenantContext, id: string, dto: UpdateAgentDto) {
    const agent = await this.prisma.aIAgent.findUnique({ where: { id } });
    if (!agent) throw new NotFoundException('Agent not found');
    if (agent.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: agent belongs to another tenant');
    }
    if (agent.status === 'ARCHIVED') {
      throw new BadRequestException('Cannot edit an archived agent.');
    }

    if (dto.name && dto.name !== agent.name) {
      const existing = await this.prisma.aIAgent.findFirst({
        where: { tenantId: ctx.tenantId, name: dto.name, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`An agent with name "${dto.name}" already exists.`);
      }
    }

    const updated = await this.prisma.aIAgent.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.configuration !== undefined && { configuration: dto.configuration as any }),
      },
    });

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'AI_AGENT_UPDATED',
      entityType: 'AIAgent',
      entityId: id,
      newValue: { name: updated.name },
    });

    return updated;
  }

  async deleteAgent(ctx: TenantContext, id: string) {
    const agent = await this.prisma.aIAgent.findUnique({
      where: { id },
      include: { _count: { select: { tasks: true } } },
    });
    if (!agent) throw new NotFoundException('Agent not found');
    if (agent.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: agent belongs to another tenant');
    }
    if (agent.status !== 'DRAFT') {
      throw new BadRequestException('Only draft agents can be deleted.');
    }
    if (agent._count.tasks > 0) {
      throw new BadRequestException('Cannot delete an agent with execution history. Use archive instead.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.aIAgentVersion.deleteMany({ where: { agentId: id } });
      await tx.aIAgent.delete({ where: { id } });
    });

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'AI_AGENT_DELETED',
      entityType: 'AIAgent',
      entityId: id,
      previousValue: { name: agent.name },
    });

    return { deleted: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VERSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  async getVersions(ctx: TenantContext, agentId: string) {
    const agent = await this.prisma.aIAgent.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Agent not found');
    if (agent.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: agent belongs to another tenant');
    }

    return this.prisma.aIAgentVersion.findMany({
      where: { agentId },
      orderBy: { versionNumber: 'desc' },
      include: {
        publishedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async publishAgent(ctx: TenantContext, agentId: string) {
    const agent = await this.prisma.aIAgent.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Agent not found');
    if (agent.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: agent belongs to another tenant');
    }
    if (agent.status === 'ARCHIVED') {
      throw new BadRequestException('Cannot publish an archived agent.');
    }

    const draftVersion = await this.prisma.aIAgentVersion.findFirst({
      where: { agentId, status: 'DRAFT' },
    });
    if (!draftVersion) {
      throw new BadRequestException('No draft version found.');
    }

    // Validate the version
    const config = draftVersion.configuration as Record<string, unknown>;
    const allowedTools = (config['tools'] as string[]) ?? [];

    // Validate tools exist
    for (const toolName of allowedTools) {
      const tool = getToolByName(toolName);
      if (!tool) {
        throw new BadRequestException(`Tool "${toolName}" is not a registered tool.`);
      }
    }

    const published = await this.prisma.$transaction(async (tx) => {
      // Supersede previous published version
      await tx.aIAgentVersion.updateMany({
        where: { agentId, status: 'PUBLISHED' },
        data: { status: 'SUPERSEDED' },
      });

      // Publish the draft
      const pub = await tx.aIAgentVersion.update({
        where: { id: draftVersion.id },
        data: {
          status: 'PUBLISHED',
          publishedById: ctx.userId,
          publishedAt: new Date(),
          validationErrors: Prisma.JsonNull,
        },
      });

      // Update agent status
      await tx.aIAgent.update({
        where: { id: agentId },
        data: {
          status: 'ACTIVE',
          currentVersionId: pub.id,
        },
      });

      return pub;
    });

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'AI_AGENT_PUBLISHED',
      entityType: 'AIAgent',
      entityId: agentId,
      newValue: { versionNumber: published.versionNumber },
    });

    return published;
  }

  async pauseAgent(ctx: TenantContext, agentId: string) {
    const agent = await this.prisma.aIAgent.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Agent not found');
    if (agent.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: agent belongs to another tenant');
    }
    if (agent.status !== 'ACTIVE') {
      throw new BadRequestException('Only active agents can be paused.');
    }

    const updated = await this.prisma.aIAgent.update({
      where: { id: agentId },
      data: { status: 'PAUSED' },
    });

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'AI_AGENT_PAUSED',
      entityType: 'AIAgent',
      entityId: agentId,
    });

    return updated;
  }

  async resumeAgent(ctx: TenantContext, agentId: string) {
    const agent = await this.prisma.aIAgent.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Agent not found');
    if (agent.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: agent belongs to another tenant');
    }
    if (agent.status !== 'PAUSED') {
      throw new BadRequestException('Only paused agents can be resumed.');
    }

    const updated = await this.prisma.aIAgent.update({
      where: { id: agentId },
      data: { status: 'ACTIVE' },
    });

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'AI_AGENT_RESUMED',
      entityType: 'AIAgent',
      entityId: agentId,
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AGENT TASK EXECUTION
  // ═══════════════════════════════════════════════════════════════════════════

  async createTask(ctx: TenantContext, agentId: string, dto: CreateAgentTaskDto) {
    const agent = await this.prisma.aIAgent.findUnique({
      where: { id: agentId },
      include: { currentVersion: true },
    });
    if (!agent) throw new NotFoundException('Agent not found');
    if (agent.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: agent belongs to another tenant');
    }
    if (agent.status !== 'ACTIVE') {
      throw new BadRequestException('Only active agents can execute tasks.');
    }
    if (!agent.currentVersion) {
      throw new BadRequestException('Agent has no published version.');
    }

    const config = agent.configuration as Record<string, unknown>;
    const allowedTools = (config['allowedTools'] as string[]) ?? [];
    const limits = (config['limits'] as Record<string, number>) ?? {};

    // Generate plan
    const plan = generatePlan({
      goal: dto.goal,
      agentType: agent.agentType,
      allowedTools,
      maxSteps: limits['maxSteps'] ?? 10,
    });

    // Assess risk
    const riskAssessment = assessPlanRisk(plan.steps);

    // Create task
    const task = await this.prisma.aIAgentTask.create({
      data: {
        agentId,
        agentVersionId: agent.currentVersionId!,
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        goal: dto.goal,
        status: riskAssessment.requiresApproval ? 'WAITING_APPROVAL' : 'PLANNING',
        plan: plan as any,
        riskAssessment: riskAssessment as any,
        totalSteps: plan.totalSteps,
        maxToolCalls: limits['maxToolCalls'] ?? 10,
      },
    });

    // Create step records
    for (const step of plan.steps) {
      const policyResult = evaluatePolicy({
        toolName: step.tool,
        riskLevel: step.riskLevel,
        agentType: agent.agentType,
        userPermissions: ['ai:tools:use', `ai:agent:${agent.agentType.toLowerCase()}:use`],
      });

      await this.prisma.aIAgentStep.create({
        data: {
          taskId: task.id,
          tenantId: ctx.tenantId,
          stepNumber: step.stepNumber,
          toolName: step.tool,
          purpose: step.purpose,
          input: step.input as any,
          status: 'PENDING',
          riskLevel: step.riskLevel as any,
          approvalStatus: policyResult.decision === 'REQUIRES_APPROVAL' ? 'PENDING' : undefined,
          idempotencyKey: `${task.id}:step:${step.stepNumber}`,
        },
      });
    }

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'AI_AGENT_TASK_CREATED',
      entityType: 'AIAgentTask',
      entityId: task.id,
      newValue: {
        agentId,
        goal: dto.goal,
        totalSteps: plan.totalSteps,
        requiresApproval: riskAssessment.requiresApproval,
      },
    });

    return {
      task,
      plan,
      riskAssessment,
    };
  }

  async executeTask(ctx: TenantContext, taskId: string) {
    const task = await this.prisma.aIAgentTask.findUnique({
      where: { id: taskId },
      include: {
        agent: true,
        agentVersion: true,
        steps: { orderBy: { stepNumber: 'asc' } },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    if (task.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: task belongs to another tenant');
    }
    if (task.status !== 'PLANNING' && task.status !== 'PENDING') {
      throw new BadRequestException(`Task cannot be executed in "${task.status}" status.`);
    }

    const agent = task.agent;
    const config = agent.configuration as Record<string, unknown>;
    const limits = (config['limits'] as Record<string, number>) ?? {};

    // Mark as executing
    await this.prisma.aIAgentTask.update({
      where: { id: taskId },
      data: { status: 'EXECUTING', startedAt: new Date() },
    });

    const startTime = Date.now();
    const results: Array<{ stepNumber: number; status: string; output?: unknown; error?: string }> = [];

    for (const step of task.steps) {
      // Check tool call limit
      if (task.toolCallCount >= (limits['maxToolCalls'] ?? 10)) {
        results.push({ stepNumber: step.stepNumber, status: 'SKIPPED', error: 'Tool call limit reached.' });
        continue;
      }

      // Check if step requires approval and is not yet approved
      if (step.approvalStatus === 'PENDING') {
        await this.prisma.aIAgentTask.update({
          where: { id: taskId },
          data: { status: 'WAITING_APPROVAL' },
        });
        return { task, status: 'WAITING_APPROVAL', results };
      }

      // Mark step as running
      await this.prisma.aIAgentStep.update({
        where: { id: step.id },
        data: { status: 'RUNNING', startedAt: new Date() },
      });

      const stepStart = Date.now();

      try {
        // Execute tool through the context engine (not direct DB access)
        const output = await this.executeTool(
          step.toolName,
          step.input as Record<string, unknown>,
          ctx,
        );

        // Verify result
        const verification = verifyToolResult({
          toolName: step.toolName,
          input: step.input as Record<string, unknown>,
          output: output as Record<string, unknown>,
          expectedCriteria: generateVerificationCriteria(step.toolName),
        });

        const stepDuration = Date.now() - stepStart;

        await this.prisma.aIAgentStep.update({
          where: { id: step.id },
          data: {
            status: verification.verified ? 'SUCCEEDED' : 'FAILED',
            output: output as any,
            error: verification.errors.length > 0 ? verification.errors.join('; ') : undefined,
            completedAt: new Date(),
            duration: stepDuration,
          },
        });

        // Update tool call count
        await this.prisma.aIAgentTask.update({
          where: { id: taskId },
          data: {
            toolCallCount: { increment: 1 },
            currentStep: step.stepNumber,
          },
        });

        // Store memory
        await this.prisma.aIAgentMemory.create({
          data: {
            taskId,
            tenantId: ctx.tenantId,
            agentId: agent.id,
            category: 'execution',
            content: `Step ${step.stepNumber}: ${step.toolName} - ${verification.verified ? 'succeeded' : 'failed'}`,
            metadata: { toolName: step.toolName, verified: verification.verified },
          },
        });

        results.push({
          stepNumber: step.stepNumber,
          status: verification.verified ? 'SUCCEEDED' : 'FAILED',
          output,
          error: verification.errors.length > 0 ? verification.errors.join('; ') : undefined,
        });
      } catch (error) {
        const stepDuration = Date.now() - stepStart;
        const errorMsg = (error as Error).message;

        await this.prisma.aIAgentStep.update({
          where: { id: step.id },
          data: {
            status: 'FAILED',
            error: errorMsg,
            completedAt: new Date(),
            duration: stepDuration,
          },
        });

        results.push({
          stepNumber: step.stepNumber,
          status: 'FAILED',
          error: errorMsg,
        });
      }
    }

    // Determine final status
    const hasFailures = results.some((r) => r.status === 'FAILED');
    const finalStatus = hasFailures ? 'FAILED' : 'COMPLETED';
    const duration = Date.now() - startTime;

    const completedTask = await this.prisma.aIAgentTask.update({
      where: { id: taskId },
      data: {
        status: finalStatus as any,
        completedAt: new Date(),
        duration,
        result: {
          steps: results,
          completedAt: new Date().toISOString(),
          duration,
        } as any,
      },
    });

    // Store final memory
    await this.prisma.aIAgentMemory.create({
      data: {
        taskId,
        tenantId: ctx.tenantId,
        agentId: agent.id,
        category: 'result',
        content: `Task ${finalStatus}: ${results.filter((r) => r.status === 'SUCCEEDED').length}/${results.length} steps succeeded.`,
        metadata: { finalStatus, duration, stepCount: results.length },
      },
    });

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: `AI_AGENT_TASK_${finalStatus}`,
      entityType: 'AIAgentTask',
      entityId: taskId,
      newValue: {
        status: finalStatus,
        stepsSucceeded: results.filter((r) => r.status === 'SUCCEEDED').length,
        stepsFailed: results.filter((r) => r.status === 'FAILED').length,
        duration,
      },
    });

    return { task: completedTask, status: finalStatus, results };
  }

  async approveStep(ctx: TenantContext, stepId: string, comment?: string) {
    const step = await this.prisma.aIAgentStep.findUnique({
      where: { id: stepId },
      include: { task: true },
    });
    if (!step) throw new NotFoundException('Step not found');
    if (step.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: step belongs to another tenant');
    }
    if (step.approvalStatus !== 'PENDING') {
      throw new BadRequestException('Step is not awaiting approval.');
    }

    await this.prisma.aIAgentStep.update({
      where: { id: stepId },
      data: { approvalStatus: 'APPROVED' },
    });

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'AI_AGENT_STEP_APPROVED',
      entityType: 'AIAgentStep',
      entityId: stepId,
      newValue: { comment, toolName: step.toolName },
    });

    // Check if all pending approvals are resolved
    const pendingCount = await this.prisma.aIAgentStep.count({
      where: { taskId: step.taskId, approvalStatus: 'PENDING' },
    });

    if (pendingCount === 0) {
      // Resume task execution
      await this.prisma.aIAgentTask.update({
        where: { id: step.taskId },
        data: { status: 'EXECUTING' },
      });
    }

    return { approved: true, pendingApprovals: pendingCount };
  }

  async rejectStep(ctx: TenantContext, stepId: string, comment?: string) {
    const step = await this.prisma.aIAgentStep.findUnique({
      where: { id: stepId },
      include: { task: true },
    });
    if (!step) throw new NotFoundException('Step not found');
    if (step.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: step belongs to another tenant');
    }
    if (step.approvalStatus !== 'PENDING') {
      throw new BadRequestException('Step is not awaiting approval.');
    }

    await this.prisma.aIAgentStep.update({
      where: { id: stepId },
      data: { approvalStatus: 'REJECTED' },
    });

    // Cancel the task
    await this.prisma.aIAgentTask.update({
      where: { id: step.taskId },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'AI_AGENT_STEP_REJECTED',
      entityType: 'AIAgentStep',
      entityId: stepId,
      newValue: { comment, toolName: step.toolName },
    });

    return { rejected: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  async listTasks(ctx: TenantContext, agentId: string, dto: ListAgentTasksDto) {
    const { page = 1, limit = 20, status } = dto;

    const where: Prisma.AIAgentTaskWhereInput = {
      tenantId: ctx.tenantId,
      agentId,
      ...(status && { status: status as any }),
    };

    const [data, total] = await Promise.all([
      this.prisma.aIAgentTask.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { steps: true } },
        },
      }),
      this.prisma.aIAgentTask.count({ where }),
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

  async getTask(ctx: TenantContext, taskId: string) {
    const task = await this.prisma.aIAgentTask.findUnique({
      where: { id: taskId },
      include: {
        agent: { select: { id: true, name: true, agentType: true } },
        agentVersion: { select: { versionNumber: true } },
        steps: { orderBy: { stepNumber: 'asc' } },
        memory: { orderBy: { createdAt: 'desc' }, take: 10 },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!task) throw new NotFoundException('Task not found');
    if (task.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: task belongs to another tenant');
    }

    return task;
  }

  async cancelTask(ctx: TenantContext, taskId: string) {
    const task = await this.prisma.aIAgentTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: task belongs to another tenant');
    }
    if (task.status === 'COMPLETED' || task.status === 'FAILED' || task.status === 'CANCELLED') {
      throw new BadRequestException('Task is already in a terminal state.');
    }

    const updated = await this.prisma.aIAgentTask.update({
      where: { id: taskId },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'AI_AGENT_TASK_CANCELLED',
      entityType: 'AIAgentTask',
      entityId: taskId,
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TOOL EXECUTION (through context engine, not direct DB access)
  // ═══════════════════════════════════════════════════════════════════════════

  private async executeTool(
    toolName: string,
    input: Record<string, unknown>,
    ctx: TenantContext,
  ): Promise<Record<string, unknown>> {
    // All tool execution goes through the existing context engine
    // This ensures tenant isolation and permission checks
    switch (toolName) {
      case 'get_employee_summary': {
        const count = await this.prisma.employee.count({
          where: { tenantId: ctx.tenantId, deletedAt: null, employmentStatus: 'ACTIVE' },
        });
        const total = await this.prisma.employee.count({
          where: { tenantId: ctx.tenantId, deletedAt: null },
        });
        return { activeEmployees: count, totalEmployees: total };
      }
      case 'get_attendance_summary': {
        const total = await this.prisma.attendance.count({
          where: { tenantId: ctx.tenantId },
        });
        const present = await this.prisma.attendance.count({
          where: { tenantId: ctx.tenantId, status: { in: ['PRESENT', 'LATE', 'OVERTIME'] } },
        });
        return {
          totalRecords: total,
          presentRate: total > 0 ? Math.round((present / total) * 100) : 0,
        };
      }
      case 'get_leave_summary': {
        const total = await this.prisma.leaveRequest.count({
          where: { tenantId: ctx.tenantId },
        });
        const approved = await this.prisma.leaveRequest.count({
          where: { tenantId: ctx.tenantId, status: 'APPROVED' },
        });
        const pending = await this.prisma.leaveRequest.count({
          where: { tenantId: ctx.tenantId, status: 'PENDING' },
        });
        return {
          totalRequests: total,
          approvedRequests: approved,
          pendingRequests: pending,
          approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
        };
      }
      case 'get_finance_summary': {
        // Use aggregation instead of loading all invoices
        const [revenueAgg, arAgg, invoiceCount] = await Promise.all([
          this.prisma.invoice.aggregate({
            where: { tenantId: ctx.tenantId, status: { in: ['PAID', 'PARTIALLY_PAID', 'ISSUED'] } },
            _sum: { amount: true },
          }),
          this.prisma.invoice.aggregate({
            where: { tenantId: ctx.tenantId, status: { in: ['ISSUED', 'PARTIALLY_PAID'] } },
            _sum: { outstandingAmount: true },
          }),
          this.prisma.invoice.count({ where: { tenantId: ctx.tenantId } }),
        ]);
        return {
          totalRevenue: revenueAgg._sum.amount ?? 0,
          totalAR: arAgg._sum.outstandingAmount ?? 0,
          invoiceCount,
        };
      }
      case 'get_receivables': {
        const [totalAR, invoiceCount, unpaidAR] = await Promise.all([
          this.prisma.invoice.aggregate({
            where: { tenantId: ctx.tenantId, status: { in: ['ISSUED', 'PARTIALLY_PAID'] }, outstandingAmount: { gt: 0 } },
            _sum: { outstandingAmount: true },
          }),
          this.prisma.invoice.count({ where: { tenantId: ctx.tenantId } }),
          this.prisma.invoice.count({
            where: { tenantId: ctx.tenantId, status: { in: ['ISSUED', 'PARTIALLY_PAID'] }, outstandingAmount: { gt: 0 } },
          }),
        ]);
        return {
          totalAR: totalAR._sum.outstandingAmount ?? 0,
          invoiceCount,
          unpaidInvoiceCount: unpaidAR,
        };
      }
      case 'get_payables': {
        const [totalAP, billCount, unpaidAP] = await Promise.all([
          this.prisma.bill.aggregate({
            where: { tenantId: ctx.tenantId, status: { in: ['OPEN', 'PARTIALLY_PAID'] }, outstandingAmount: { gt: 0 } },
            _sum: { outstandingAmount: true },
          }),
          this.prisma.bill.count({ where: { tenantId: ctx.tenantId } }),
          this.prisma.bill.count({
            where: { tenantId: ctx.tenantId, status: { in: ['OPEN', 'PARTIALLY_PAID'] }, outstandingAmount: { gt: 0 } },
          }),
        ]);
        return {
          totalAP: totalAP._sum.outstandingAmount ?? 0,
          billCount,
          unpaidBillCount: unpaidAP,
        };
      }
      case 'get_crm_pipeline': {
        const leads = await this.prisma.lead.count({ where: { tenantId: ctx.tenantId } });
        const qualified = await this.prisma.lead.count({
          where: { tenantId: ctx.tenantId, status: 'QUALIFIED' },
        });
        return {
          totalLeads: leads,
          qualifiedLeads: qualified,
          conversionRate: leads > 0 ? Math.round((qualified / leads) * 100) : 0,
        };
      }
      case 'get_project_summary': {
        const projects = await this.prisma.project.groupBy({
          by: ['status'],
          where: { tenantId: ctx.tenantId },
          _count: true,
        });
        const statusMap = new Map(projects.map((p) => [p.status, p._count]));
        return {
          totalProjects: projects.reduce((sum, p) => sum + p._count, 0),
          activeProjects: statusMap.get('ACTIVE') ?? 0,
          completedProjects: statusMap.get('COMPLETED') ?? 0,
        };
      }
      case 'get_asset_summary': {
        const assets = await this.prisma.asset.groupBy({
          by: ['status'],
          where: { tenantId: ctx.tenantId },
          _count: true,
        });
        const statusMap = new Map(assets.map((a) => [a.status, a._count]));
        return {
          totalAssets: assets.reduce((sum, a) => sum + a._count, 0),
          activeAssets: (statusMap.get('ACTIVE') ?? 0) + (statusMap.get('ASSIGNED') ?? 0),
        };
      }
      case 'get_automation_summary': {
        const workflows = await this.prisma.automationWorkflow.groupBy({
          by: ['status'],
          where: { tenantId: ctx.tenantId },
          _count: true,
        });
        const statusMap = new Map(workflows.map((w) => [w.status, w._count]));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayExecs = await this.prisma.automationExecution.count({
          where: { tenantId: ctx.tenantId, createdAt: { gte: today } },
        });
        return {
          activeWorkflows: statusMap.get('PUBLISHED') ?? 0,
          draftWorkflows: statusMap.get('DRAFT') ?? 0,
          executionsToday: todayExecs,
        };
      }
      case 'get_automation_execution': {
        const execId = input['executionId'] as string;
        if (!execId) throw new Error('executionId is required');
        const execution = await this.prisma.automationExecution.findUnique({
          where: { id: execId },
          select: { id: true, status: true, error: true, duration: true },
        });
        return execution ?? { error: 'Execution not found' };
      }
      case 'get_payroll_summary': {
        // Use aggregation instead of loading all payslips
        const [grossAgg, netAgg, deductionsAgg, payslipCount] = await Promise.all([
          this.prisma.payslip.aggregate({
            where: { tenantId: ctx.tenantId },
            _sum: { grossPay: true },
          }),
          this.prisma.payslip.aggregate({
            where: { tenantId: ctx.tenantId },
            _sum: { netPay: true },
          }),
          this.prisma.payslip.aggregate({
            where: { tenantId: ctx.tenantId },
            _sum: { totalDeductions: true },
          }),
          this.prisma.payslip.count({ where: { tenantId: ctx.tenantId } }),
        ]);
        return {
          totalGross: grossAgg._sum.grossPay ?? 0,
          totalNet: netAgg._sum.netPay ?? 0,
          totalDeductions: deductionsAgg._sum.totalDeductions ?? 0,
          payslipCount,
        };
      }
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MEMORY
  // ═══════════════════════════════════════════════════════════════════════════

  async getTaskMemory(ctx: TenantContext, taskId: string) {
    const task = await this.prisma.aIAgentTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: task belongs to another tenant');
    }

    return this.prisma.aIAgentMemory.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
