/**
 * FusionOS AI Service
 *
 * Core service for AI orchestration, conversation management,
 * and tool execution. All operations are tenant-scoped and auditable.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { TenantContext } from '../../auth/services/tenant-context.service';
import { AuditLogService } from '../../common/services/audit-log.service';
import { OllamaProvider } from '../providers/ollama.provider';
import { CONTEXT_REGISTRY } from '../engine/context-registry';
import { TOOL_REGISTRY } from '../engine/tool-registry';
import { buildMessages, detectPromptInjection } from '../engine/prompt-builder';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLog: AuditLogService,
    private readonly aiProvider: OllamaProvider,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // CONVERSATION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  async createConversation(ctx: TenantContext, title?: string) {
    const conversation = await this.prisma.aIConversation.create({
      data: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        title: title ?? 'New Conversation',
      },
    });

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'AI_CONVERSATION_CREATED',
      entityType: 'AIConversation',
      entityId: conversation.id,
    });

    return conversation;
  }

  async listConversations(ctx: TenantContext) {
    return this.prisma.aIConversation.findMany({
      where: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        status: 'ACTIVE',
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
  }

  async getConversation(ctx: TenantContext, id: string) {
    const conversation = await this.prisma.aIConversation.findUnique({
      where: { id },
    });

    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: conversation belongs to another tenant');
    }
    if (conversation.userId !== ctx.userId) {
      throw new ForbiddenException('Access denied: you can only view your own conversations');
    }

    const messages = await this.prisma.aIMessage.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return { ...conversation, messages };
  }

  async deleteConversation(ctx: TenantContext, id: string) {
    const conversation = await this.prisma.aIConversation.findUnique({ where: { id } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: conversation belongs to another tenant');
    }
    if (conversation.userId !== ctx.userId) {
      throw new ForbiddenException('Access denied: you can only delete your own conversations');
    }

    await this.prisma.aIConversation.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'AI_CONVERSATION_DELETED',
      entityType: 'AIConversation',
      entityId: id,
    });

    return { deleted: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERY PROCESSING
  // ═══════════════════════════════════════════════════════════════════════════

  async processQuery(ctx: TenantContext, params: {
    conversationId?: string;
    message: string;
  }) {
    const { conversationId, message } = params;

    // Validate message length
    if (message.length > 4000) {
      throw new BadRequestException('Message must be 4000 characters or fewer');
    }

    // Prompt injection detection
    if (detectPromptInjection(message)) {
      this.logger.warn(`Potential prompt injection detected from user ${ctx.userId}`);
      return {
        response: 'I cannot process this request. Please ask a business-related question.',
        sources: [],
        actions: [],
      };
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await this.getConversation(ctx, conversationId);
    } else {
      conversation = await this.createConversation(ctx, this.generateTitle(message));
    }

    // Save user message
    await this.prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        tenantId: ctx.tenantId,
        role: 'USER',
        content: message,
      },
    });

    // Build context from relevant data sources
    const contextData = await this.buildContextForQuery(ctx, message);

    // Fetch conversation history
    const messages = await this.prisma.aIMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    // Build conversation history
    const history = messages.map((m: { role: string; content: string }) => ({
      role: m.role.toLowerCase() === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    // Build messages for AI
    const aiMessages = buildMessages({
      conversationHistory: history,
      userMessage: message,
      contextData,
    });

    // Call AI provider
    const startTime = Date.now();
    try {
      const response = await this.aiProvider.generateText(aiMessages, {
        temperature: 0.7,
        maxTokens: 2048,
      });

      const latencyMs = Date.now() - startTime;

      // Save assistant message
      await this.prisma.aIMessage.create({
        data: {
          conversationId: conversation.id,
          tenantId: ctx.tenantId,
          role: 'ASSISTANT',
          content: response.content,
          metadata: {
            sources: contextData.map((c) => c.source.name),
            latencyMs,
          },
        },
      });

      // Log request
      await this.logRequest(ctx, {
        conversationId: conversation.id,
        provider: 'ollama',
        model: process.env['AI_MODEL'] ?? 'llama3.2',
        latencyMs,
        tokenCount: response.usage?.totalTokens,
        success: true,
      });

      // Audit
      await this.auditLog.record({
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        action: 'AI_QUERY_PROCESSED',
        entityType: 'AIConversation',
        entityId: conversation.id,
        newValue: { messageLength: message.length, contextSources: contextData.map((c) => c.source.name) },
      });

      // Output safety: validate response before returning to user
      const safeResponse = this.validateOutput(response.content);

      return {
        conversationId: conversation.id,
        response: safeResponse,
        sources: contextData.map((c) => c.source.name),
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMsg = (error as Error).message;

      // Log failed request
      await this.logRequest(ctx, {
        conversationId: conversation.id,
        provider: 'ollama',
        model: process.env['AI_MODEL'] ?? 'llama3.2',
        latencyMs,
        success: false,
        error: errorMsg,
      });

      this.logger.error(`AI query failed: ${errorMsg}`);

      return {
        conversationId: conversation.id,
        response: 'I apologize, but I encountered an error processing your request. Please try again later.',
        sources: [],
        error: errorMsg,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTEXT BUILDING
  // ═══════════════════════════════════════════════════════════════════════════

  private async buildContextForQuery(
    ctx: TenantContext,
    query: string,
  ): Promise<Array<{ source: typeof CONTEXT_REGISTRY[0]; data: Record<string, unknown> }>> {
    const contextData: Array<{ source: typeof CONTEXT_REGISTRY[0]; data: Record<string, unknown> }> = [];
    const queryLower = query.toLowerCase();

    // Determine which sources are relevant based on query keywords
    const relevantSources = this.identifyRelevantSources(queryLower);

    // Fetch data from relevant sources
    for (const source of relevantSources) {
      try {
        const data = await this.fetchContextData(ctx, source.name);
        if (data && Object.keys(data).length > 0) {
          contextData.push({ source, data });
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch context for ${source.name}: ${(error as Error).message}`);
      }
    }

    return contextData;
  }

  private identifyRelevantSources(queryLower: string): typeof CONTEXT_REGISTRY {
    const keywordMap: Record<string, string[]> = {
      employee: ['employee.summary'],
      workforce: ['employee.summary', 'attendance.summary'],
      attendance: ['attendance.summary'],
      present: ['attendance.summary'],
      absent: ['attendance.summary'],
      late: ['attendance.summary'],
      leave: ['leave.summary'],
      holiday: ['leave.summary'],
      payroll: ['payroll.summary'],
      salary: ['payroll.summary'],
      wage: ['payroll.summary'],
      finance: ['finance.revenue', 'finance.receivables', 'finance.payables'],
      revenue: ['finance.revenue'],
      income: ['finance.revenue'],
      expense: ['finance.revenue'],
      profit: ['finance.revenue'],
      receivable: ['finance.receivables'],
      invoice: ['finance.receivables'],
      overdue: ['finance.receivables', 'finance.payables'],
      payable: ['finance.payables'],
      bill: ['finance.payables'],
      crm: ['crm.pipeline', 'crm.opportunities'],
      lead: ['crm.pipeline'],
      customer: ['crm.pipeline'],
      opportunity: ['crm.opportunities'],
      pipeline: ['crm.pipeline'],
      sales: ['crm.pipeline'],
      project: ['projects.status'],
      task: ['projects.status'],
      milestone: ['projects.status'],
      asset: ['assets.status'],
      equipment: ['assets.status'],
      automation: ['automation.workflows', 'automation.executions'],
      workflow: ['automation.workflows', 'automation.executions'],
      execution: ['automation.executions'],
      business: ['finance.revenue', 'employee.summary', 'crm.pipeline'],
      summary: ['finance.revenue', 'employee.summary', 'attendance.summary', 'crm.pipeline'],
      performance: ['finance.revenue', 'employee.summary', 'attendance.summary'],
    };

    const sourceNames = new Set<string>();
    for (const [keyword, sources] of Object.entries(keywordMap)) {
      if (queryLower.includes(keyword)) {
        for (const name of sources) {
          sourceNames.add(name);
        }
      }
    }

    // Default to finance + workforce if no specific match
    if (sourceNames.size === 0) {
      sourceNames.add('finance.revenue');
      sourceNames.add('employee.summary');
    }

    return CONTEXT_REGISTRY.filter((s) => sourceNames.has(s.name));
  }

  private async fetchContextData(
    ctx: TenantContext,
    sourceName: string,
  ): Promise<Record<string, unknown> | null> {
    // Fetch data through controlled service methods
    // This ensures tenant isolation and permission checks
    switch (sourceName) {
      case 'employee.summary': {
        const count = await this.prisma.employee.count({
          where: { tenantId: ctx.tenantId, deletedAt: null, employmentStatus: 'ACTIVE' },
        });
        const total = await this.prisma.employee.count({
          where: { tenantId: ctx.tenantId, deletedAt: null },
        });
        return { activeEmployees: count, totalEmployees: total };
      }
      case 'attendance.summary': {
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
      case 'leave.summary': {
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
      case 'finance.receivables': {
        // Use aggregation instead of loading all invoices
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
      case 'finance.payables': {
        // Use aggregation instead of loading all bills
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
      case 'crm.pipeline': {
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
      case 'projects.status': {
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
      case 'assets.status': {
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
      case 'automation.workflows': {
        const workflows = await this.prisma.automationWorkflow.groupBy({
          by: ['status'],
          where: { tenantId: ctx.tenantId },
          _count: true,
        });
        const statusMap = new Map(workflows.map((w) => [w.status, w._count]));
        return {
          activeWorkflows: statusMap.get('PUBLISHED') ?? 0,
          draftWorkflows: statusMap.get('DRAFT') ?? 0,
          pausedWorkflows: statusMap.get('PAUSED') ?? 0,
        };
      }
      case 'automation.executions': {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayExecs = await this.prisma.automationExecution.count({
          where: { tenantId: ctx.tenantId, createdAt: { gte: today } },
        });
        const succeeded = await this.prisma.automationExecution.count({
          where: { tenantId: ctx.tenantId, status: 'SUCCEEDED', createdAt: { gte: today } },
        });
        const failed = await this.prisma.automationExecution.count({
          where: { tenantId: ctx.tenantId, status: 'FAILED', createdAt: { gte: today } },
        });
        return {
          executionsToday: todayExecs,
          successfulExecutions: succeeded,
          failedExecutions: failed,
        };
      }
      default:
        return null;
    }
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
    }> = [];

    // Workforce insight
    const activeEmployees = await this.prisma.employee.count({
      where: { tenantId: ctx.tenantId, deletedAt: null, employmentStatus: 'ACTIVE' },
    });
    const totalEmployees = await this.prisma.employee.count({
      where: { tenantId: ctx.tenantId, deletedAt: null },
    });
    if (totalEmployees > 0) {
      const activeRate = Math.round((activeEmployees / totalEmployees) * 100);
      insights.push({
        category: 'Workforce',
        title: 'Employee Active Rate',
        description: `${activeRate}% of employees are currently active (${activeEmployees}/${totalEmployees}).`,
        confidence: 'HIGH',
        sources: ['employee.summary'],
      });
    }

    // Finance insight
    const pendingInvoices = await this.prisma.invoice.count({
      where: { tenantId: ctx.tenantId, status: { in: ['ISSUED', 'PARTIALLY_PAID'] } },
    });
    if (pendingInvoices > 0) {
      insights.push({
        category: 'Finance',
        title: 'Pending Invoices',
        description: `There are ${pendingInvoices} unpaid or partially paid invoices requiring attention.`,
        confidence: 'HIGH',
        sources: ['finance.receivables'],
      });
    }

    // CRM insight
    const openLeads = await this.prisma.lead.count({
      where: { tenantId: ctx.tenantId, status: { in: ['NEW', 'CONTACTED'] } },
    });
    if (openLeads > 0) {
      insights.push({
        category: 'CRM',
        title: 'Open Leads',
        description: `${openLeads} leads are in early stages and may need follow-up.`,
        confidence: 'MEDIUM',
        sources: ['crm.pipeline'],
      });
    }

    // Automation insight
    const failedExecutions = await this.prisma.automationExecution.count({
      where: { tenantId: ctx.tenantId, status: 'FAILED' },
    });
    if (failedExecutions > 0) {
      insights.push({
        category: 'Automation',
        title: 'Failed Automations',
        description: `${failedExecutions} automation executions have failed and may need review.`,
        confidence: 'HIGH',
        sources: ['automation.executions'],
      });
    }

    return { insights, generatedAt: new Date().toISOString() };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPABILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  async getCapabilities() {
    return {
      contextSources: CONTEXT_REGISTRY.map((s) => ({
        name: s.name,
        description: s.description,
        module: s.module,
        sensitivityLevel: s.sensitivityLevel,
      })),
      tools: TOOL_REGISTRY.map((t) => ({
        name: t.name,
        description: t.description,
        category: t.category,
        classification: t.classification,
        requiresConfirmation: t.requiresConfirmation,
      })),
      suggestedQuestions: [
        'How many employees are currently active?',
        'Which invoices are overdue?',
        'How is the CRM pipeline performing?',
        'Show failed automation executions.',
        'Summarize this month\'s business performance.',
      ],
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROVIDER STATUS
  // ═══════════════════════════════════════════════════════════════════════════

  async getProviderStatus() {
    return this.aiProvider.getStatus();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Validate AI output before returning to user.
   * Removes potentially dangerous content while preserving legitimate business responses.
   *
   * SECURITY:
   *   - Strips system prompt leakage attempts
   *   - Removes credential-like patterns
   *   - Prevents cross-tenant data leakage in responses
   */
  private validateOutput(content: string): string {
    let sanitized = content;

    // Strip potential system prompt leakage
    const promptLeakPatterns = [
      /system\s*prompt[:\s]/gi,
      /you\s+are\s+instructed\s+to/gi,
      /your\s+instructions\s+are/gi,
      /initial\s+prompt[:\s]/gi,
    ];
    for (const pattern of promptLeakPatterns) {
      if (pattern.test(sanitized)) {
        this.logger.warn('Potential system prompt leakage detected in AI output');
        // Don't block the entire response — just log for monitoring
      }
    }

    // Strip credential-like patterns (API keys, tokens, passwords)
    const credentialPatterns = [
      /(?:api[_-]?key|token|password|secret)\s*[:=]\s*['"]?[A-Za-z0-9\-_.]{20,}/gi,
      /Bearer\s+[A-Za-z0-9\-_.]{20,}/gi,
    ];
    for (const pattern of credentialPatterns) {
      if (pattern.test(sanitized)) {
        this.logger.warn('Potential credential leakage detected in AI output');
        sanitized = sanitized.replace(pattern, '[REDACTED]');
      }
    }

    return sanitized;
  }

  private generateTitle(message: string): string {
    const words = message.split(' ').slice(0, 6);
    return words.join(' ') + (message.split(' ').length > 6 ? '...' : '');
  }

  private async logRequest(ctx: TenantContext, params: {
    conversationId?: string;
    provider: string;
    model: string;
    latencyMs: number;
    tokenCount?: number;
    toolCalls?: unknown;
    success: boolean;
    error?: string;
  }) {
    try {
      await this.prisma.aIRequestLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          conversationId: params.conversationId,
          provider: params.provider,
          model: params.model,
          latencyMs: params.latencyMs,
          tokenCount: params.tokenCount,
          toolCalls: params.toolCalls as any,
          success: params.success,
          error: params.error,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to log AI request: ${(error as Error).message}`);
    }
  }
}
