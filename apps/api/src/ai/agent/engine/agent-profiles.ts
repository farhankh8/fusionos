/**
 * FusionOS AI Agent Profiles
 *
 * Pre-defined agent configurations for common business domains.
 * Each profile defines the agent's purpose, allowed tools, and policies.
 */

export interface AgentProfile {
  name: string;
  type: 'HR' | 'FINANCE' | 'CRM' | 'PROJECTS' | 'OPERATIONS';
  description: string;
  purpose: string;
  allowedTools: string[];
  contextSources: string[];
  riskPolicy: {
    maxRiskLevel: string;
    requiresApprovalAbove: string;
  };
  limits: {
    maxSteps: number;
    maxToolCalls: number;
    maxExecutionDurationMs: number;
    maxRetries: number;
  };
  suggestedGoals: string[];
}

export const AGENT_PROFILES: AgentProfile[] = [
  {
    name: 'HR / Workforce Agent',
    type: 'HR',
    description: 'Analyzes workforce data including employees, attendance, leave, and payroll.',
    purpose: 'Provide insights and analysis on workforce metrics. Help HR teams understand attendance patterns, leave trends, and workforce composition.',
    allowedTools: [
      'get_employee_summary',
      'get_attendance_summary',
      'get_leave_summary',
      'get_payroll_summary',
    ],
    contextSources: [
      'employee.summary',
      'attendance.summary',
      'leave.summary',
      'payroll.summary',
    ],
    riskPolicy: {
      maxRiskLevel: 'LOW',
      requiresApprovalAbove: 'LOW',
    },
    limits: {
      maxSteps: 5,
      maxToolCalls: 5,
      maxExecutionDurationMs: 30000,
      maxRetries: 2,
    },
    suggestedGoals: [
      'Summarize current workforce composition and active employee count.',
      'Analyze attendance trends over the past month.',
      'Show leave request statistics and approval rates.',
      'Identify departments with high absence rates.',
    ],
  },
  {
    name: 'Finance Intelligence Agent',
    type: 'FINANCE',
    description: 'Analyzes financial data including revenue, expenses, receivables, and payables.',
    purpose: 'Provide financial insights and analysis. Help finance teams understand cash flow, receivables status, and expense patterns.',
    allowedTools: [
      'get_finance_summary',
      'get_receivables',
      'get_payables',
      'get_payroll_summary',
    ],
    contextSources: [
      'finance.revenue',
      'finance.receivables',
      'finance.payables',
      'payroll.summary',
    ],
    riskPolicy: {
      maxRiskLevel: 'READ_ONLY',
      requiresApprovalAbove: 'READ_ONLY',
    },
    limits: {
      maxSteps: 5,
      maxToolCalls: 5,
      maxExecutionDurationMs: 30000,
      maxRetries: 2,
    },
    suggestedGoals: [
      'Summarize current financial position including revenue and expenses.',
      'Show outstanding receivables and overdue invoices.',
      'Analyze accounts payable status.',
      'Compare financial metrics across periods.',
    ],
  },
  {
    name: 'Sales / CRM Agent',
    type: 'CRM',
    description: 'Analyzes CRM pipeline, leads, and sales opportunities.',
    purpose: 'Provide insights on the sales pipeline. Help sales teams understand lead conversion, opportunity stages, and pipeline health.',
    allowedTools: [
      'get_crm_pipeline',
    ],
    contextSources: [
      'crm.pipeline',
      'crm.opportunities',
    ],
    riskPolicy: {
      maxRiskLevel: 'LOW',
      requiresApprovalAbove: 'LOW',
    },
    limits: {
      maxSteps: 3,
      maxToolCalls: 3,
      maxExecutionDurationMs: 20000,
      maxRetries: 2,
    },
    suggestedGoals: [
      'Summarize the current sales pipeline and conversion rates.',
      'Analyze lead stages and identify bottlenecks.',
      'Show pipeline value and opportunity distribution.',
    ],
  },
  {
    name: 'Project Operations Agent',
    type: 'PROJECTS',
    description: 'Analyzes project status, tasks, and milestones.',
    purpose: 'Provide project management insights. Help teams understand project health, overdue tasks, and milestone progress.',
    allowedTools: [
      'get_project_summary',
    ],
    contextSources: [
      'projects.status',
    ],
    riskPolicy: {
      maxRiskLevel: 'LOW',
      requiresApprovalAbove: 'LOW',
    },
    limits: {
      maxSteps: 3,
      maxToolCalls: 3,
      maxExecutionDurationMs: 20000,
      maxRetries: 2,
    },
    suggestedGoals: [
      'Summarize project status distribution and active projects.',
      'Identify projects with overdue milestones.',
      'Analyze project completion rates.',
    ],
  },
  {
    name: 'Business Operations Agent',
    type: 'OPERATIONS',
    description: 'Provides cross-module operational insights including automation status and asset management.',
    purpose: 'Provide operational insights across the business. Help operations teams understand workflow health, asset status, and cross-module performance.',
    allowedTools: [
      'get_automation_summary',
      'get_automation_execution',
      'get_asset_summary',
    ],
    contextSources: [
      'automation.workflows',
      'automation.executions',
      'assets.status',
    ],
    riskPolicy: {
      maxRiskLevel: 'LOW',
      requiresApprovalAbove: 'LOW',
    },
    limits: {
      maxSteps: 4,
      maxToolCalls: 4,
      maxExecutionDurationMs: 25000,
      maxRetries: 2,
    },
    suggestedGoals: [
      'Summarize automation workflow status and recent executions.',
      'Identify failed automation executions that need attention.',
      'Show asset inventory status and values.',
    ],
  },
];

/**
 * Get a profile by agent type.
 */
export function getProfileByType(type: string): AgentProfile | undefined {
  return AGENT_PROFILES.find((p) => p.type === type);
}

/**
 * Get all available profiles.
 */
export function getAllProfiles(): AgentProfile[] {
  return [...AGENT_PROFILES];
}
