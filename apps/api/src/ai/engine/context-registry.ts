/**
 * FusionOS AI Context Registry
 *
 * Controls which data sources AI can access.
 * Each source defines:
 * - Required permission
 * - Allowed fields
 * - Sensitivity level
 * - Tenant behavior
 */

export interface ContextSource {
  name: string;
  description: string;
  module: string;
  requiredPermission: string;
  allowedFields: string[];
  sensitivityLevel: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  tenantScoped: boolean;
  companyScoped: boolean;
}

/**
 * Registry of all AI-readable data sources.
 * Only sources with actual secure service methods are registered.
 */
export const CONTEXT_REGISTRY: ContextSource[] = [
  // ── Workforce ──────────────────────────────────────────────────────────
  {
    name: 'employee.summary',
    description: 'Employee count and status distribution',
    module: 'People',
    requiredPermission: 'ai:context:read',
    allowedFields: ['totalEmployees', 'activeEmployees', 'departmentDistribution'],
    sensitivityLevel: 'INTERNAL',
    tenantScoped: true,
    companyScoped: true,
  },
  {
    name: 'employee.details',
    description: 'Individual employee details (name, department, status)',
    module: 'People',
    requiredPermission: 'ai:context:read',
    allowedFields: ['name', 'department', 'designation', 'status', 'employmentType'],
    sensitivityLevel: 'CONFIDENTIAL',
    tenantScoped: true,
    companyScoped: true,
  },

  // ── Attendance ─────────────────────────────────────────────────────────
  {
    name: 'attendance.summary',
    description: 'Attendance metrics and trends',
    module: 'People',
    requiredPermission: 'ai:context:read',
    allowedFields: ['totalRecords', 'presentRate', 'lateRecords', 'overtimeRecords'],
    sensitivityLevel: 'INTERNAL',
    tenantScoped: true,
    companyScoped: true,
  },

  // ── Leave ──────────────────────────────────────────────────────────────
  {
    name: 'leave.summary',
    description: 'Leave request statistics',
    module: 'People',
    requiredPermission: 'ai:context:read',
    allowedFields: ['totalRequests', 'approvedRequests', 'pendingRequests', 'approvalRate'],
    sensitivityLevel: 'INTERNAL',
    tenantScoped: true,
    companyScoped: true,
  },

  // ── Payroll ────────────────────────────────────────────────────────────
  {
    name: 'payroll.summary',
    description: 'Payroll totals and averages',
    module: 'People',
    requiredPermission: 'ai:context:read',
    allowedFields: ['totalGross', 'totalNet', 'totalDeductions', 'averageCostPerEmployee'],
    sensitivityLevel: 'CONFIDENTIAL',
    tenantScoped: true,
    companyScoped: true,
  },

  // ── Finance ────────────────────────────────────────────────────────────
  {
    name: 'finance.revenue',
    description: 'Revenue metrics and trends',
    module: 'Finance',
    requiredPermission: 'ai:context:read',
    allowedFields: ['totalRevenue', 'totalExpenses', 'netProfit', 'revenueTrend'],
    sensitivityLevel: 'CONFIDENTIAL',
    tenantScoped: true,
    companyScoped: true,
  },
  {
    name: 'finance.receivables',
    description: 'Accounts receivable status',
    module: 'Finance',
    requiredPermission: 'ai:context:read',
    allowedFields: ['totalAR', 'invoiceCount', 'unpaidInvoiceCount'],
    sensitivityLevel: 'CONFIDENTIAL',
    tenantScoped: true,
    companyScoped: true,
  },
  {
    name: 'finance.payables',
    description: 'Accounts payable status',
    module: 'Finance',
    requiredPermission: 'ai:context:read',
    allowedFields: ['totalAP', 'billCount', 'unpaidBillCount'],
    sensitivityLevel: 'CONFIDENTIAL',
    tenantScoped: true,
    companyScoped: true,
  },

  // ── CRM ────────────────────────────────────────────────────────────────
  {
    name: 'crm.pipeline',
    description: 'Sales pipeline metrics',
    module: 'CRM',
    requiredPermission: 'ai:context:read',
    allowedFields: ['totalLeads', 'qualifiedLeads', 'conversionRate', 'pipelineValue', 'winRate'],
    sensitivityLevel: 'INTERNAL',
    tenantScoped: true,
    companyScoped: true,
  },
  {
    name: 'crm.opportunities',
    description: 'Opportunity details and stages',
    module: 'CRM',
    requiredPermission: 'ai:context:read',
    allowedFields: ['totalOpps', 'openOpps', 'wonOpps', 'lostOpps', 'weightedPipeline'],
    sensitivityLevel: 'INTERNAL',
    tenantScoped: true,
    companyScoped: true,
  },

  // ── Projects ───────────────────────────────────────────────────────────
  {
    name: 'projects.status',
    description: 'Project status distribution',
    module: 'Projects',
    requiredPermission: 'ai:context:read',
    allowedFields: ['totalProjects', 'activeProjects', 'completedProjects', 'overdueMilestones'],
    sensitivityLevel: 'INTERNAL',
    tenantScoped: true,
    companyScoped: true,
  },

  // ── Assets ─────────────────────────────────────────────────────────────
  {
    name: 'assets.status',
    description: 'Asset inventory status',
    module: 'Assets',
    requiredPermission: 'ai:context:read',
    allowedFields: ['totalAssets', 'activeAssets', 'inMaintenanceAssets', 'totalBookValue'],
    sensitivityLevel: 'INTERNAL',
    tenantScoped: true,
    companyScoped: true,
  },

  // ── Automation ─────────────────────────────────────────────────────────
  {
    name: 'automation.workflows',
    description: 'Workflow definitions and status',
    module: 'Automation',
    requiredPermission: 'ai:context:read',
    allowedFields: ['activeWorkflows', 'draftWorkflows', 'pausedWorkflows'],
    sensitivityLevel: 'PUBLIC',
    tenantScoped: true,
    companyScoped: false,
  },
  {
    name: 'automation.executions',
    description: 'Workflow execution history',
    module: 'Automation',
    requiredPermission: 'ai:context:read',
    allowedFields: ['executionsToday', 'successfulExecutions', 'failedExecutions'],
    sensitivityLevel: 'PUBLIC',
    tenantScoped: true,
    companyScoped: false,
  },
];

/**
 * Get a context source by name.
 */
export function getContextSource(name: string): ContextSource | undefined {
  return CONTEXT_REGISTRY.find((s) => s.name === name);
}

/**
 * Get all context sources for a module.
 */
export function getSourcesByModule(module: string): ContextSource[] {
  return CONTEXT_REGISTRY.filter((s) => s.module === module);
}

/**
 * Get all available modules.
 */
export function getModules(): string[] {
  return [...new Set(CONTEXT_REGISTRY.map((s) => s.module))];
}
