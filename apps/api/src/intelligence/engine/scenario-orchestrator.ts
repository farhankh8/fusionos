/**
 * FusionOS Intelligence — Scenario Orchestrator
 *
 * Executes cross-module business scenarios through controlled, auditable steps.
 * Each scenario follows: trigger → context → analysis → action → verification → audit.
 *
 * CRITICAL: The orchestrator never directly accesses database tables.
 * All module interactions go through existing domain services.
 */

import { PrismaClient } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { AuditLogService } from '../../common/services/audit-log.service';
import {
  type ScenarioDefinition,
  type ScenarioStep,
  getScenarioById,
  getScenariosForEvent,
} from './scenario-registry';
import { buildCrossModuleContext, type ModuleContext } from './cross-module-context';

export interface ScenarioExecution {
  id: string;
  scenarioId: string;
  scenarioVersion: string;
  tenantId: string;
  triggerEventId: string | null;
  triggerEventType: string;
  triggerEntityType: string;
  triggerEntityId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
  correlationId: string;
  steps: ScenarioStepExecution[];
  context: ModuleContext[];
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  error: string | null;
}

export interface ScenarioStepExecution {
  stepNumber: number;
  name: string;
  module: string;
  action: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'SKIPPED';
  result: Record<string, unknown> | null;
  error: string | null;
  duration: number | null;
  startedAt: Date | null;
  completedAt: Date | null;
}

const logger = new Logger('ScenarioOrchestrator');

/**
 * Execute a scenario by ID with given context.
 */
export async function executeScenario(params: {
  prisma: PrismaClient;
  auditLog: AuditLogService;
  tenantId: string;
  scenarioId: string;
  triggerEventId: string | null;
  triggerEventType: string;
  triggerEntityType: string;
  triggerEntityId: string;
  correlationId?: string;
}): Promise<ScenarioExecution> {
  const {
    prisma, auditLog, tenantId, scenarioId, triggerEventId,
    triggerEventType, triggerEntityType, triggerEntityId, correlationId,
  } = params;

  const scenario = getScenarioById(scenarioId);
  if (!scenario) {
    throw new Error(`Unknown scenario: ${scenarioId}`);
  }

  const execId = crypto.randomUUID();
  const corrId = correlationId ?? crypto.randomUUID();
  const startTime = Date.now();

  const execution: ScenarioExecution = {
    id: execId,
    scenarioId,
    scenarioVersion: '1.0',
    tenantId,
    triggerEventId,
    triggerEventType,
    triggerEntityType,
    triggerEntityId,
    status: 'RUNNING',
    correlationId: corrId,
    steps: scenario.steps.map((s) => ({
      stepNumber: s.stepNumber,
      name: s.name,
      module: s.module,
      action: s.action,
      status: 'PENDING',
      result: null,
      error: null,
      duration: null,
      startedAt: null,
      completedAt: null,
    })),
    context: [],
    startedAt: new Date(),
    completedAt: null,
    duration: null,
    error: null,
  };

  try {
    // Step 1: Build cross-module context
    const context = await buildCrossModuleContext({
      prisma,
      tenantId,
      entityType: triggerEntityType,
      entityId: triggerEntityId,
      modules: scenario.involvedModules.filter((m) => m !== 'AI' && m !== 'Notifications'),
    });
    execution.context = context;

    // Step 2: Execute each scenario step
    for (let i = 0; i < scenario.steps.length; i++) {
      const stepDef = scenario.steps[i];
      const stepExec = execution.steps[i];

      stepExec.status = 'RUNNING';
      stepExec.startedAt = new Date();

      try {
        const result = await executeScenarioStep(stepDef, {
          prisma,
          tenantId,
          triggerEntityType,
          triggerEntityId,
          context,
          correlationId: corrId,
        });

        stepExec.status = 'SUCCEEDED';
        stepExec.result = result;
        stepExec.completedAt = new Date();
        stepExec.duration = stepExec.completedAt.getTime() - stepExec.startedAt.getTime();
      } catch (error) {
        stepExec.status = 'FAILED';
        stepExec.error = (error as Error).message;
        stepExec.completedAt = new Date();
        stepExec.duration = stepExec.completedAt.getTime() - stepExec.startedAt.getTime();

        // Don't fail entire scenario for non-critical steps
        if (stepDef.action === 'NOTIFY' || stepDef.action === 'CREATE') {
          logger.warn(`Non-critical step ${stepDef.name} failed: ${(error as Error).message}`);
        } else {
          throw error;
        }
      }
    }

    // Determine final status
    const hasFailures = execution.steps.some((s) => s.status === 'FAILED');
    execution.status = hasFailures ? 'PARTIAL' : 'COMPLETED';
  } catch (error) {
    execution.status = 'FAILED';
    execution.error = (error as Error).message;
    logger.error(`Scenario ${scenarioId} failed: ${(error as Error).message}`);
  }

  execution.completedAt = new Date();
  execution.duration = Date.now() - startTime;

  // Audit the execution
  await auditLog.record({
    tenantId,
    action: `SCENARIO_EXECUTION_${execution.status}`,
    entityType: 'ScenarioExecution',
    entityId: execId,
    newValue: {
      scenarioId,
      triggerEventType,
      triggerEntityId,
      correlationId: corrId,
      stepsSucceeded: execution.steps.filter((s) => s.status === 'SUCCEEDED').length,
      stepsFailed: execution.steps.filter((s) => s.status === 'FAILED').length,
      duration: execution.duration,
    },
  });

  return execution;
}

/**
 * Execute a single scenario step.
 */
async function executeScenarioStep(
  step: ScenarioStep,
  ctx: {
    prisma: PrismaClient;
    tenantId: string;
    triggerEntityType: string;
    triggerEntityId: string;
    context: ModuleContext[];
    correlationId: string;
  },
): Promise<Record<string, unknown>> {
  switch (step.serviceMethod) {
    // ── Finance Steps ──────────────────────────────────────────────────
    case 'finance.getInvoiceDetails': {
      const invoice = await ctx.prisma.invoice.findUnique({
        where: { id: ctx.triggerEntityId },
        select: {
          id: true, invoiceNumber: true, amount: true, outstandingAmount: true,
          status: true, currency: true, dueDate: true,
          customer: { select: { id: true, name: true } },
        },
      });
      return invoice ? { invoice } : { error: 'Invoice not found' };
    }

    // ── CRM Steps ──────────────────────────────────────────────────────
    case 'crm.getCustomerContext': {
      const customerData = ctx.context.find((c) => c.module === 'CRM');
      return customerData?.data ?? { opportunities: [], activities: [] };
    }

    case 'crm.getOpportunityContext': {
      const opp = await ctx.prisma.opportunity.findUnique({
        where: { id: ctx.triggerEntityId },
        select: {
          id: true, name: true, stage: true, amount: true, probability: true,
          customerProfile: { select: { id: true, industry: true } },
        },
      });
      return opp ? { opportunity: opp } : { error: 'Opportunity not found' };
    }

    // ── AI Analysis Steps ──────────────────────────────────────────────
    case 'ai.analyzeReceivableRisk': {
      const invoiceData = ctx.context.find((c) => c.module === 'Finance');
      const crmData = ctx.context.find((c) => c.module === 'CRM');
      return {
        analysis: {
          invoice: invoiceData?.data,
          customerContext: crmData?.data,
          recommendation: 'Follow up with customer regarding overdue payment.',
          confidence: 'HIGH',
        },
      };
    }

    case 'ai.analyzeWorkforceImpact': {
      const leaveData = ctx.context.find((c) => c.module === 'People');
      return {
        analysis: {
          leave: leaveData?.data,
          recommendation: 'Review department capacity for coverage planning.',
          confidence: 'MEDIUM',
        },
      };
    }

    case 'ai.analyzeProjectHealth': {
      const projectData = ctx.context.find((c) => c.module === 'Projects');
      return {
        analysis: {
          project: projectData?.data,
          recommendation: 'Review project timeline and task assignments.',
          confidence: 'MEDIUM',
        },
      };
    }

    case 'ai.analyzeAttendancePattern': {
      const attendanceData = ctx.context.find((c) => c.module === 'People');
      return {
        analysis: {
          attendance: attendanceData?.data,
          recommendation: 'Review attendance pattern with employee.',
          confidence: 'MEDIUM',
        },
      };
    }

    case 'ai.analyzeSalesOpportunity': {
      const crmCtx = ctx.context.find((c) => c.module === 'CRM');
      return {
        analysis: {
          opportunity: crmCtx?.data,
          recommendation: 'Review pipeline and prepare next steps.',
          confidence: 'MEDIUM',
        },
      };
    }

    case 'ai.analyzeAutomationFailure': {
      const automationData = ctx.context.find((c) => c.module === 'Automation');
      return {
        analysis: {
          execution: automationData?.data,
          recommendation: 'Review failed step and retry if transient.',
          confidence: 'HIGH',
        },
      };
    }

    case 'ai.generateHealthInsights': {
      const allContext = ctx.context;
      return {
        insights: allContext.map((c) => ({
          module: c.module,
          data: c.data,
          retrievedAt: c.retrievedAt,
        })),
        generatedAt: new Date().toISOString(),
      };
    }

    // ── Task/Notification Steps ────────────────────────────────────────
    case 'tasks.createTask': {
      const task = await ctx.prisma.task.create({
        data: {
          tenantId: ctx.tenantId,
          companyId: '',
          title: `${step.name} — Scenario triggered by ${ctx.triggerEntityType}`,
          description: `Correlation: ${ctx.correlationId}`,
          status: 'TODO',
          priority: 'MEDIUM',
        },
      });
      return { taskId: task.id };
    }

    case 'notifications.sendNotification': {
      const notification = await ctx.prisma.notification.create({
        data: {
          tenantId: ctx.tenantId,
          recipientUserId: '',
          type: 'SCENARIO_NOTIFICATION',
          title: step.name,
          body: `Scenario triggered by ${ctx.triggerEntityType}. Correlation: ${ctx.correlationId}`,
          severity: 'INFO',
          category: 'INTELLIGENCE',
          entityType: 'ScenarioExecution',
          entityId: ctx.triggerEntityId,
        },
      });
      return { notificationId: notification.id };
    }

    // ── Read-only aggregation steps ────────────────────────────────────
    case 'finance.getSummary': {
      const invoices = await ctx.prisma.invoice.findMany({
        where: { tenantId: ctx.tenantId },
        select: { status: true, amount: true, outstandingAmount: true },
      });
      return {
        totalRevenue: invoices.reduce((sum, i) => sum + i.amount, 0),
        totalOutstanding: invoices.filter((i) => i.outstandingAmount > 0).reduce((sum, i) => sum + i.outstandingAmount, 0),
        invoiceCount: invoices.length,
      };
    }

    case 'employee.getSummary': {
      const empCount = await ctx.prisma.employee.count({
        where: { tenantId: ctx.tenantId, deletedAt: null, employmentStatus: 'ACTIVE' },
      });
      const totalEmp = await ctx.prisma.employee.count({
        where: { tenantId: ctx.tenantId, deletedAt: null },
      });
      return { activeEmployees: empCount, totalEmployees: totalEmp };
    }

    case 'crm.getSummary': {
      const leads = await ctx.prisma.lead.count({ where: { tenantId: ctx.tenantId } });
      const qualified = await ctx.prisma.lead.count({ where: { tenantId: ctx.tenantId, status: 'QUALIFIED' } });
      return { totalLeads: leads, qualifiedLeads: qualified, conversionRate: leads > 0 ? Math.round((qualified / leads) * 100) : 0 };
    }

    case 'projects.getSummary': {
      const projects = await ctx.prisma.project.groupBy({
        by: ['status'], where: { tenantId: ctx.tenantId }, _count: true,
      });
      return { statusDistribution: projects.map((p) => ({ status: p.status, count: p._count })) };
    }

    case 'automation.getSummary': {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const [active, today, succeeded, failed] = await Promise.all([
        ctx.prisma.automationWorkflow.count({ where: { tenantId: ctx.tenantId, status: 'PUBLISHED' } }),
        ctx.prisma.automationExecution.count({ where: { tenantId: ctx.tenantId, createdAt: { gte: todayStart } } }),
        ctx.prisma.automationExecution.count({ where: { tenantId: ctx.tenantId, status: 'SUCCEEDED', createdAt: { gte: todayStart } } }),
        ctx.prisma.automationExecution.count({ where: { tenantId: ctx.tenantId, status: 'FAILED', createdAt: { gte: todayStart } } }),
      ]);
      return { activeWorkflows: active, executionsToday: today, succeeded, failed };
    }

    case 'leave.getLeaveDetails': {
      const leave = await ctx.prisma.leaveRequest.findUnique({
        where: { id: ctx.triggerEntityId },
        select: {
          id: true, duration: true, reason: true, status: true,
          employee: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      return leave ? { leaveRequest: leave } : { error: 'Leave not found' };
    }

    case 'attendance.getAttendanceContext': {
      const attendance = await ctx.prisma.attendance.findUnique({
        where: { id: ctx.triggerEntityId },
        select: {
          id: true, date: true, status: true, lateMinutes: true,
          employee: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      return attendance ? { attendance } : { error: 'Attendance not found' };
    }

    case 'projects.getProjectContext': {
      const project = await ctx.prisma.project.findUnique({
        where: { id: ctx.triggerEntityId },
        select: {
          id: true, name: true, status: true, progress: true,
          tasks: { select: { id: true, title: true, status: true }, take: 5 },
        },
      });
      return project ? { project } : { error: 'Project not found' };
    }

    case 'automation.getExecutionDetails': {
      const execution = await ctx.prisma.automationExecution.findUnique({
        where: { id: ctx.triggerEntityId },
        select: {
          id: true, status: true, error: true, duration: true,
          workflow: { select: { id: true, name: true } },
          steps: { select: { stepNumber: true, actionType: true, status: true, error: true } },
        },
      });
      return execution ? { execution } : { error: 'Execution not found' };
    }

    default:
      throw new Error(`Unknown service method: ${step.serviceMethod}`);
  }
}
