/**
 * FusionOS AI Tool Registry
 *
 * Controls which tools AI can invoke.
 * Each tool has:
 * - Input/output schemas
 * - Required permission
 * - Tenant rules
 * - Read/write classification
 */

export interface AIToolDefinition {
  name: string;
  description: string;
  category: string;
  classification: 'READ' | 'WRITE';
  requiredPermission: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  /** Whether this tool requires user confirmation before execution */
  requiresConfirmation: boolean;
}

/**
 * Registry of all AI tools.
 * Tools are the ONLY way AI interacts with FusionOS data.
 */
export const TOOL_REGISTRY: AIToolDefinition[] = [
  // ── Read-Only Tools ──────────────────────────────────────────────────
  {
    name: 'get_employee_summary',
    description: 'Get employee count and status distribution for the tenant',
    category: 'Workforce',
    classification: 'READ',
    requiredPermission: 'ai:tools:use',
    inputSchema: {
      type: 'object',
      properties: {
        companyId: { type: 'string', description: 'Optional company ID to filter by' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        totalEmployees: { type: 'number' },
        activeEmployees: { type: 'number' },
        departmentDistribution: { type: 'array' },
      },
    },
    requiresConfirmation: false,
  },
  {
    name: 'get_attendance_summary',
    description: 'Get attendance metrics and trends',
    category: 'Workforce',
    classification: 'READ',
    requiredPermission: 'ai:tools:use',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        totalRecords: { type: 'number' },
        presentRate: { type: 'number' },
        lateRecords: { type: 'number' },
      },
    },
    requiresConfirmation: false,
  },
  {
    name: 'get_leave_summary',
    description: 'Get leave request statistics',
    category: 'Workforce',
    classification: 'READ',
    requiredPermission: 'ai:tools:use',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: { type: 'string' },
        endDate: { type: 'string' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        totalRequests: { type: 'number' },
        approvedRequests: { type: 'number' },
        pendingRequests: { type: 'number' },
        approvalRate: { type: 'number' },
      },
    },
    requiresConfirmation: false,
  },
  {
    name: 'get_payroll_summary',
    description: 'Get payroll totals and averages',
    category: 'Finance',
    classification: 'READ',
    requiredPermission: 'ai:tools:use',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: { type: 'string' },
        endDate: { type: 'string' },
        currency: { type: 'string' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        totalGross: { type: 'number' },
        totalNet: { type: 'number' },
        totalDeductions: { type: 'number' },
        averageCostPerEmployee: { type: 'number' },
      },
    },
    requiresConfirmation: false,
  },
  {
    name: 'get_finance_summary',
    description: 'Get finance metrics including revenue, expenses, and profit',
    category: 'Finance',
    classification: 'READ',
    requiredPermission: 'ai:tools:use',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: { type: 'string' },
        endDate: { type: 'string' },
        companyId: { type: 'string' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        totalRevenue: { type: 'number' },
        totalExpenses: { type: 'number' },
        netProfit: { type: 'number' },
        totalAR: { type: 'number' },
        totalAP: { type: 'number' },
      },
    },
    requiresConfirmation: false,
  },
  {
    name: 'get_receivables',
    description: 'Get accounts receivable status and overdue invoices',
    category: 'Finance',
    classification: 'READ',
    requiredPermission: 'ai:tools:use',
    inputSchema: {
      type: 'object',
      properties: {
        companyId: { type: 'string' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        totalAR: { type: 'number' },
        invoiceCount: { type: 'number' },
        unpaidInvoiceCount: { type: 'number' },
      },
    },
    requiresConfirmation: false,
  },
  {
    name: 'get_payables',
    description: 'Get accounts payable status and unpaid bills',
    category: 'Finance',
    classification: 'READ',
    requiredPermission: 'ai:tools:use',
    inputSchema: {
      type: 'object',
      properties: {
        companyId: { type: 'string' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        totalAP: { type: 'number' },
        billCount: { type: 'number' },
        unpaidBillCount: { type: 'number' },
      },
    },
    requiresConfirmation: false,
  },
  {
    name: 'get_crm_pipeline',
    description: 'Get CRM sales pipeline metrics',
    category: 'CRM',
    classification: 'READ',
    requiredPermission: 'ai:tools:use',
    inputSchema: {
      type: 'object',
      properties: {
        companyId: { type: 'string' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        totalLeads: { type: 'number' },
        qualifiedLeads: { type: 'number' },
        conversionRate: { type: 'number' },
        pipelineValue: { type: 'number' },
        winRate: { type: 'number' },
      },
    },
    requiresConfirmation: false,
  },
  {
    name: 'get_project_summary',
    description: 'Get project status distribution and metrics',
    category: 'Projects',
    classification: 'READ',
    requiredPermission: 'ai:tools:use',
    inputSchema: {
      type: 'object',
      properties: {
        companyId: { type: 'string' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        totalProjects: { type: 'number' },
        activeProjects: { type: 'number' },
        completedProjects: { type: 'number' },
        overdueMilestones: { type: 'number' },
      },
    },
    requiresConfirmation: false,
  },
  {
    name: 'get_asset_summary',
    description: 'Get asset inventory status and values',
    category: 'Assets',
    classification: 'READ',
    requiredPermission: 'ai:tools:use',
    inputSchema: {
      type: 'object',
      properties: {
        companyId: { type: 'string' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        totalAssets: { type: 'number' },
        activeAssets: { type: 'number' },
        inMaintenanceAssets: { type: 'number' },
        totalBookValue: { type: 'number' },
      },
    },
    requiresConfirmation: false,
  },
  {
    name: 'get_automation_summary',
    description: 'Get automation workflow statistics',
    category: 'Automation',
    classification: 'READ',
    requiredPermission: 'ai:tools:use',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    outputSchema: {
      type: 'object',
      properties: {
        activeWorkflows: { type: 'number' },
        draftWorkflows: { type: 'number' },
        executionsToday: { type: 'number' },
        successfulExecutions: { type: 'number' },
        failedExecutions: { type: 'number' },
      },
    },
    requiresConfirmation: false,
  },
  {
    name: 'get_automation_execution',
    description: 'Get details of a specific automation execution',
    category: 'Automation',
    classification: 'READ',
    requiredPermission: 'ai:tools:use',
    inputSchema: {
      type: 'object',
      properties: {
        executionId: { type: 'string', description: 'Execution ID' },
      },
      required: ['executionId'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        status: { type: 'string' },
        workflow: { type: 'object' },
        steps: { type: 'array' },
        error: { type: 'string' },
      },
    },
    requiresConfirmation: false,
  },

  // ── Write Tools (require confirmation) ───────────────────────────────
  {
    name: 'create_workflow_draft',
    description: 'Create a new automation workflow draft (requires confirmation)',
    category: 'Automation',
    classification: 'WRITE',
    requiredPermission: 'automation:create',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Workflow name' },
        description: { type: 'string', description: 'Workflow description' },
        triggerConfig: { type: 'object', description: 'Trigger configuration' },
        conditionConfig: { type: 'object', description: 'Condition tree' },
        actionsConfig: { type: 'array', description: 'Action configurations' },
      },
      required: ['name', 'triggerConfig', 'actionsConfig'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        workflowId: { type: 'string' },
        status: { type: 'string' },
      },
    },
    requiresConfirmation: true,
  },
];

/**
 * Get a tool by name.
 */
export function getToolByName(name: string): AIToolDefinition | undefined {
  return TOOL_REGISTRY.find((t) => t.name === name);
}

/**
 * Get all tools for a category.
 */
export function getToolsByCategory(category: string): AIToolDefinition[] {
  return TOOL_REGISTRY.filter((t) => t.category === category);
}

/**
 * Get all available categories.
 */
export function getToolCategories(): string[] {
  return [...new Set(TOOL_REGISTRY.map((t) => t.category))];
}

/**
 * Get tool definitions formatted for AI provider consumption.
 */
export function getToolDefinitionsForAI(): Array<{
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}> {
  return TOOL_REGISTRY.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }));
}
