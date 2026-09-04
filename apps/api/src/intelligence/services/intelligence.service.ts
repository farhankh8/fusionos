/**
 * FusionOS Intelligence Service
 *
 * Core service for cross-module business intelligence, scenarios,
 * and business health metrics. All operations are tenant-scoped
 * and RBAC-protected.
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { TenantContext } from '../../auth/services/tenant-context.service';
import { AuditLogService } from '../../common/services/audit-log.service';
import { OllamaProvider } from '../../ai/providers/ollama.provider';
import {
  SCENARIO_REGISTRY,
  getScenarioById,
  getScenariosForEvent,
  getScenarioCategories,
} from '../engine/scenario-registry';
import { executeScenario, type ScenarioExecution } from '../engine/scenario-orchestrator';

@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);
  private readonly executions = new Map<string, ScenarioExecution>();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLog: AuditLogService,
    private readonly ollamaProvider: OllamaProvider,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // BUSINESS HEALTH
  // ═══════════════════════════════════════════════════════════════════════════

  async getBusinessHealth(ctx: TenantContext) {
    const [
      financeData,
      workforceData,
      crmData,
      projectData,
      automationData,
    ] = await Promise.all([
      this.getFinanceHealth(ctx.tenantId),
      this.getWorkforceHealth(ctx.tenantId),
      this.getCRMHealth(ctx.tenantId),
      this.getProjectHealth(ctx.tenantId),
      this.getAutomationHealth(ctx.tenantId),
    ]);

    const sections = [
      { module: 'Finance', ...financeData },
      { module: 'Workforce', ...workforceData },
      { module: 'CRM', ...crmData },
      { module: 'Projects', ...projectData },
      { module: 'Automation', ...automationData },
    ];

    // Generate AI executive summary if Ollama is available
    let aiSummary: string | null = null;
    try {
      const available = await this.ollamaProvider.isAvailable();
      if (available) {
        const allIssues = sections.flatMap((s) => s.issues.map((i) => `${s.module}: ${i}`));
        const kpiSummary = sections.map((s) => {
          const kpis = Object.entries(s.kpi).map(([k, v]) => `${k}=${v}`).join(', ');
          return `${s.module}(${s.status}): ${kpis}`;
        }).join('; ');

        const prompt = [
          { role: 'system' as const, content: 'You are a business intelligence assistant. Provide a concise executive summary of the business health. Be factual — only reference data provided. If data is insufficient, say so. Max 3 sentences.' },
          { role: 'user' as const, content: `Business health data:\n${kpiSummary}\n\nIssues: ${allIssues.length > 0 ? allIssues.join('; ') : 'None detected'}\n\nProvide a brief executive summary.` },
        ];

        const response = await this.ollamaProvider.generateText(prompt, { temperature: 0.3, maxTokens: 300 });
        aiSummary = response.content;
      }
    } catch {
      // AI failure must not break business health
      this.logger.warn('AI summary generation failed — returning metrics only');
    }

    const overallStatus = sections.every((s) => s.status === 'HEALTHY') ? 'HEALTHY' : 'ATTENTION';

    return {
      overallStatus,
      sections,
      aiSummary,
      generatedAt: new Date().toISOString(),
    };
  }

  private async getFinanceHealth(tenantId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId },
      select: { amount: true, outstandingAmount: true, status: true, dueDate: true },
    });

    const totalRevenue = invoices.reduce((sum, i) => sum + i.amount, 0);
    const totalOutstanding = invoices.filter((i) => i.outstandingAmount > 0).reduce((sum, i) => sum + i.outstandingAmount, 0);
    const overdueInvoices = invoices.filter((i) => i.outstandingAmount > 0 && new Date(i.dueDate) < new Date());

    const issues: string[] = [];
    if (overdueInvoices.length > 0) {
      issues.push(`${overdueInvoices.length} overdue invoices`);
    }

    return {
      kpi: { totalRevenue, totalOutstanding, invoiceCount: invoices.length, overdueCount: overdueInvoices.length },
      issues,
      status: issues.length > 0 ? 'ATTENTION' : 'HEALTHY',
    };
  }

  private async getWorkforceHealth(tenantId: string) {
    const [active, total, lateToday] = await Promise.all([
      this.prisma.employee.count({ where: { tenantId, deletedAt: null, employmentStatus: 'ACTIVE' } }),
      this.prisma.employee.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.attendance.count({ where: { tenantId, status: 'LATE' } }),
    ]);

    const pendingLeave = await this.prisma.leaveRequest.count({
      where: { tenantId, status: 'PENDING' },
    });

    const issues: string[] = [];
    if (pendingLeave > 5) issues.push(`${pendingLeave} pending leave requests`);
    if (lateToday > 10) issues.push(`${lateToday} late arrivals today`);

    return {
      kpi: { activeEmployees: active, totalEmployees: total, pendingLeave, lateToday },
      issues,
      status: issues.length > 0 ? 'ATTENTION' : 'HEALTHY',
    };
  }

  private async getCRMHealth(tenantId: string) {
    const [leads, qualified, opportunities] = await Promise.all([
      this.prisma.lead.count({ where: { tenantId } }),
      this.prisma.lead.count({ where: { tenantId, status: 'QUALIFIED' } }),
      this.prisma.opportunity.findMany({
        where: { tenantId },
        select: { stage: true, amount: true },
      }),
    ]);

    const pipelineValue = opportunities.filter((o) => !['CLOSED_WON', 'CLOSED_LOST'].includes(o.stage)).reduce((sum, o) => sum + (o.amount ?? 0), 0);
    const conversionRate = leads > 0 ? Math.round((qualified / leads) * 100) : 0;

    const issues: string[] = [];
    if (leads > 0 && conversionRate < 20) issues.push(`Low conversion rate: ${conversionRate}%`);

    return {
      kpi: { totalLeads: leads, qualifiedLeads: qualified, pipelineValue, conversionRate },
      issues,
      status: issues.length > 0 ? 'ATTENTION' : 'HEALTHY',
    };
  }

  private async getProjectHealth(tenantId: string) {
    const projects = await this.prisma.project.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: true,
    });

    const statusMap = new Map(projects.map((p) => [p.status, p._count]));
    const activeProjects = statusMap.get('ACTIVE') ?? 0;
    const completedProjects = statusMap.get('COMPLETED') ?? 0;
    const totalProjects = projects.reduce((sum, p) => sum + p._count, 0);

    const issues: string[] = [];
    if (activeProjects > 10) issues.push(`${activeProjects} active projects — consider workload`);

    return {
      kpi: { totalProjects, activeProjects, completedProjects },
      issues,
      status: issues.length > 0 ? 'ATTENTION' : 'HEALTHY',
    };
  }

  private async getAutomationHealth(tenantId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [activeWorkflows, todayExecs, succeeded, failed] = await Promise.all([
      this.prisma.automationWorkflow.count({ where: { tenantId, status: 'PUBLISHED' } }),
      this.prisma.automationExecution.count({ where: { tenantId, createdAt: { gte: todayStart } } }),
      this.prisma.automationExecution.count({ where: { tenantId, status: 'SUCCEEDED', createdAt: { gte: todayStart } } }),
      this.prisma.automationExecution.count({ where: { tenantId, status: 'FAILED', createdAt: { gte: todayStart } } }),
    ]);

    const issues: string[] = [];
    if (failed > 0) issues.push(`${failed} failed executions today`);

    return {
      kpi: { activeWorkflows, executionsToday: todayExecs, succeeded, failed },
      issues,
      status: issues.length > 0 ? 'ATTENTION' : 'HEALTHY',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENARIOS
  // ═══════════════════════════════════════════════════════════════════════════

  getScenarios() {
    return SCENARIO_REGISTRY.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      category: s.category,
      trigger: s.trigger,
      overallRisk: s.overallRisk,
      requiresApproval: s.requiresApproval,
      involvedModules: s.involvedModules,
      stepCount: s.steps.length,
    }));
  }

  getScenarioCategories() {
    return getScenarioCategories();
  }

  getScenarioById(id: string) {
    const scenario = getScenarioById(id);
    if (!scenario) throw new NotFoundException(`Scenario "${id}" not found`);
    return scenario;
  }

  getScenariosForEvent(eventType: string) {
    return getScenariosForEvent(eventType);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENARIO EXECUTION
  // ═══════════════════════════════════════════════════════════════════════════

  async executeScenarioManually(ctx: TenantContext, scenarioId: string, entityType: string, entityId: string) {
    const scenario = getScenarioById(scenarioId);
    if (!scenario) throw new NotFoundException(`Scenario "${scenarioId}" not found`);

    const execution = await executeScenario({
      prisma: this.prisma,
      auditLog: this.auditLog,
      tenantId: ctx.tenantId,
      scenarioId,
      triggerEventId: null,
      triggerEventType: `manual.${scenarioId}`,
      triggerEntityType: entityType,
      triggerEntityId: entityId,
    });

    this.executions.set(execution.id, execution);
    return execution;
  }

  async getExecution(executionId: string) {
    const execution = this.executions.get(executionId);
    if (!execution) throw new NotFoundException(`Execution "${executionId}" not found`);
    return execution;
  }

  listExecutions(tenantId: string) {
    return Array.from(this.executions.values())
      .filter((e) => e.tenantId === tenantId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INSIGHTS
  // ═══════════════════════════════════════════════════════════════════════════

  async getInsights(ctx: TenantContext) {
    const insights: Array<{
      category: string;
      title: string;
      description: string;
      confidence: 'HIGH' | 'MEDIUM' | 'LOW';
      sources: string[];
      modules: string[];
    }> = [];

    // Finance insights
    const overdueInvoices = await this.prisma.invoice.count({
      where: { tenantId: ctx.tenantId, outstandingAmount: { gt: 0 }, dueDate: { lt: new Date() } },
    });
    if (overdueInvoices > 0) {
      insights.push({
        category: 'Finance',
        title: 'Overdue Receivables',
        description: `${overdueInvoices} invoices are overdue and require follow-up.`,
        confidence: 'HIGH',
        sources: ['Finance', 'CRM'],
        modules: ['Finance', 'CRM'],
      });
    }

    // Workforce insights
    const pendingLeave = await this.prisma.leaveRequest.count({
      where: { tenantId: ctx.tenantId, status: 'PENDING' },
    });
    if (pendingLeave > 5) {
      insights.push({
        category: 'Workforce',
        title: 'Pending Leave Requests',
        description: `${pendingLeave} leave requests are awaiting approval.`,
        confidence: 'HIGH',
        sources: ['People'],
        modules: ['People'],
      });
    }

    // CRM insights
    const openLeads = await this.prisma.lead.count({
      where: { tenantId: ctx.tenantId, status: { in: ['NEW', 'CONTACTED'] } },
    });
    if (openLeads > 0) {
      insights.push({
        category: 'CRM',
        title: 'Open Leads Need Attention',
        description: `${openLeads} leads are in early stages and may need follow-up.`,
        confidence: 'MEDIUM',
        sources: ['CRM'],
        modules: ['CRM'],
      });
    }

    // Automation insights
    const failedExecutions = await this.prisma.automationExecution.count({
      where: { tenantId: ctx.tenantId, status: 'FAILED' },
    });
    if (failedExecutions > 0) {
      insights.push({
        category: 'Automation',
        title: 'Failed Automation Executions',
        description: `${failedExecutions} automation executions have failed and may need review.`,
        confidence: 'HIGH',
        sources: ['Automation'],
        modules: ['Automation'],
      });
    }

    return { insights, generatedAt: new Date().toISOString() };
  }
}
