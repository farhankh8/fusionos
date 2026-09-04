/**
 * FusionOS Intelligence — Scenario Registry
 *
 * Defines all supported cross-module orchestration scenarios.
 * Each scenario maps a business trigger to a sequence of controlled actions
 * across multiple FusionOS modules.
 *
 * CRITICAL: Scenarios are the ONLY way cross-module orchestration occurs.
 * No arbitrary cross-module actions are permitted.
 */

export type ScenarioRiskLevel = 'READ_ONLY' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ScenarioTrigger {
  eventType: string;
  entityType: string;
  module: string;
}

export interface ScenarioStep {
  stepNumber: number;
  name: string;
  module: string;
  action: 'READ' | 'ANALYZE' | 'CREATE' | 'UPDATE' | 'NOTIFY' | 'APPROVE' | 'VERIFY';
  description: string;
  riskLevel: ScenarioRiskLevel;
  requiresApproval: boolean;
  /** Service method to call — must be a known, safe method */
  serviceMethod: string;
  /** Expected output shape for verification */
  expectedOutput: string;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  category: 'FINANCE' | 'WORKFORCE' | 'CRM' | 'PROJECTS' | 'OPERATIONS' | 'CROSS_MODULE';
  trigger: ScenarioTrigger;
  steps: ScenarioStep[];
  overallRisk: ScenarioRiskLevel;
  requiresApproval: boolean;
  /** Modules involved in this scenario */
  involvedModules: string[];
  /** Required permissions to execute */
  requiredPermissions: string[];
}

/**
 * Registry of all supported orchestration scenarios.
 * ONLY scenarios defined here may be executed by the orchestration layer.
 */
export const SCENARIO_REGISTRY: ScenarioDefinition[] = [
  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO 1 — OVERDUE RECEIVABLES
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'overdue_receivables',
    name: 'Overdue Receivables Follow-up',
    description: 'When an invoice becomes overdue, analyze the customer context and prepare follow-up actions.',
    category: 'CROSS_MODULE',
    trigger: { eventType: 'invoice.overdue', entityType: 'Invoice', module: 'Finance' },
    steps: [
      { stepNumber: 1, name: 'Retrieve Invoice', module: 'Finance', action: 'READ', description: 'Fetch invoice details and customer info', riskLevel: 'READ_ONLY', requiresApproval: false, serviceMethod: 'finance.getInvoiceDetails', expectedOutput: 'Invoice with customer reference' },
      { stepNumber: 2, name: 'Retrieve Customer CRM Context', module: 'CRM', action: 'READ', description: 'Get customer relationship context and recent activities', riskLevel: 'READ_ONLY', requiresApproval: false, serviceMethod: 'crm.getCustomerContext', expectedOutput: 'Customer CRM summary' },
      { stepNumber: 3, name: 'Analyze Receivable Risk', module: 'AI', action: 'ANALYZE', description: 'AI analyzes overdue pattern and recommends follow-up', riskLevel: 'READ_ONLY', requiresApproval: false, serviceMethod: 'ai.analyzeReceivableRisk', expectedOutput: 'Risk analysis with recommendation' },
      { stepNumber: 4, name: 'Create Follow-up Task', module: 'CRM', action: 'CREATE', description: 'Create CRM task for follow-up', riskLevel: 'LOW', requiresApproval: false, serviceMethod: 'tasks.createTask', expectedOutput: 'Created task ID' },
      { stepNumber: 5, name: 'Notify Finance Team', module: 'Notifications', action: 'NOTIFY', description: 'Send notification about overdue invoice', riskLevel: 'LOW', requiresApproval: false, serviceMethod: 'notifications.sendNotification', expectedOutput: 'Notification sent' },
    ],
    overallRisk: 'LOW',
    requiresApproval: false,
    involvedModules: ['Finance', 'CRM', 'AI', 'Notifications'],
    requiredPermissions: ['finance:read', 'crm:read', 'ai:tools:use', 'notifications:send'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO 2 — LEAVE ESCALATION
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'leave_escalation',
    name: 'Extended Leave Escalation',
    description: 'When extended leave is submitted, analyze workforce impact and escalate if needed.',
    category: 'WORKFORCE',
    trigger: { eventType: 'leave.submitted', entityType: 'LeaveRequest', module: 'People' },
    steps: [
      { stepNumber: 1, name: 'Retrieve Leave Request', module: 'People', action: 'READ', description: 'Fetch leave request details and employee info', riskLevel: 'READ_ONLY', requiresApproval: false, serviceMethod: 'leave.getLeaveDetails', expectedOutput: 'Leave request with employee context' },
      { stepNumber: 2, name: 'Analyze Workforce Impact', module: 'AI', action: 'ANALYZE', description: 'Analyze department capacity and overlapping leave', riskLevel: 'READ_ONLY', requiresApproval: false, serviceMethod: 'ai.analyzeWorkforceImpact', expectedOutput: 'Workforce impact analysis' },
      { stepNumber: 3, name: 'Create Manager Task', module: 'Notifications', action: 'CREATE', description: 'Create notification/task for department manager', riskLevel: 'LOW', requiresApproval: false, serviceMethod: 'tasks.createTask', expectedOutput: 'Created task ID' },
    ],
    overallRisk: 'LOW',
    requiresApproval: false,
    involvedModules: ['People', 'AI', 'Notifications'],
    requiredPermissions: ['leave:read', 'ai:tools:use', 'notifications:send'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO 3 — PROJECT DELAY
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'project_delay',
    name: 'Project Delay Analysis',
    description: 'When a project milestone is overdue, analyze project health and recommend actions.',
    category: 'PROJECTS',
    trigger: { eventType: 'project.status_changed', entityType: 'Project', module: 'Projects' },
    steps: [
      { stepNumber: 1, name: 'Retrieve Project Context', module: 'Projects', action: 'READ', description: 'Fetch project details, tasks, and milestones', riskLevel: 'READ_ONLY', requiresApproval: false, serviceMethod: 'projects.getProjectContext', expectedOutput: 'Project context with tasks' },
      { stepNumber: 2, name: 'Analyze Project Health', module: 'AI', action: 'ANALYZE', description: 'AI analyzes project delay patterns and risks', riskLevel: 'READ_ONLY', requiresApproval: false, serviceMethod: 'ai.analyzeProjectHealth', expectedOutput: 'Project health analysis' },
      { stepNumber: 3, name: 'Create Project Alert', module: 'Notifications', action: 'NOTIFY', description: 'Notify project stakeholders', riskLevel: 'LOW', requiresApproval: false, serviceMethod: 'notifications.sendNotification', expectedOutput: 'Notification sent' },
    ],
    overallRisk: 'LOW',
    requiresApproval: false,
    involvedModules: ['Projects', 'AI', 'Notifications'],
    requiredPermissions: ['projects:read', 'ai:tools:use', 'notifications:send'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO 4 — ATTENDANCE ANOMALY
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'attendance_anomaly',
    name: 'Attendance Anomaly Detection',
    description: 'When attendance exceptions are detected, analyze patterns and generate insights.',
    category: 'WORKFORCE',
    trigger: { eventType: 'attendance.exception', entityType: 'Attendance', module: 'People' },
    steps: [
      { stepNumber: 1, name: 'Retrieve Attendance Data', module: 'People', action: 'READ', description: 'Fetch attendance records and employee context', riskLevel: 'READ_ONLY', requiresApproval: false, serviceMethod: 'attendance.getAttendanceContext', expectedOutput: 'Attendance data with employee info' },
      { stepNumber: 2, name: 'Analyze Attendance Pattern', module: 'AI', action: 'ANALYZE', description: 'AI analyzes attendance anomaly patterns', riskLevel: 'READ_ONLY', requiresApproval: false, serviceMethod: 'ai.analyzeAttendancePattern', expectedOutput: 'Attendance pattern analysis' },
      { stepNumber: 3, name: 'Generate Insight', module: 'Notifications', action: 'NOTIFY', description: 'Send HR team notification about anomaly', riskLevel: 'LOW', requiresApproval: false, serviceMethod: 'notifications.sendNotification', expectedOutput: 'Notification sent' },
    ],
    overallRisk: 'READ_ONLY',
    requiresApproval: false,
    involvedModules: ['People', 'AI', 'Notifications'],
    requiredPermissions: ['attendance:read', 'ai:tools:use', 'notifications:send'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO 5 — SALES OPPORTUNITY
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'sales_opportunity',
    name: 'Sales Opportunity Analysis',
    description: 'When an opportunity reaches a meaningful stage, analyze and prepare follow-up.',
    category: 'CRM',
    trigger: { eventType: 'opportunity.stage_changed', entityType: 'Opportunity', module: 'CRM' },
    steps: [
      { stepNumber: 1, name: 'Retrieve Opportunity', module: 'CRM', action: 'READ', description: 'Fetch opportunity details and customer context', riskLevel: 'READ_ONLY', requiresApproval: false, serviceMethod: 'crm.getOpportunityContext', expectedOutput: 'Opportunity with customer data' },
      { stepNumber: 2, name: 'Analyze Sales Pipeline', module: 'AI', action: 'ANALYZE', description: 'AI analyzes opportunity and pipeline context', riskLevel: 'READ_ONLY', requiresApproval: false, serviceMethod: 'ai.analyzeSalesOpportunity', expectedOutput: 'Sales analysis' },
      { stepNumber: 3, name: 'Create Follow-up Task', module: 'CRM', action: 'CREATE', description: 'Create CRM task for follow-up', riskLevel: 'LOW', requiresApproval: false, serviceMethod: 'tasks.createTask', expectedOutput: 'Created task ID' },
    ],
    overallRisk: 'LOW',
    requiresApproval: false,
    involvedModules: ['CRM', 'AI'],
    requiredPermissions: ['crm:read', 'crm:write', 'ai:tools:use'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO 6 — AUTOMATION FAILURE
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'automation_failure',
    name: 'Automation Failure Analysis',
    description: 'When an automation execution fails, analyze the failure and recommend actions.',
    category: 'OPERATIONS',
    trigger: { eventType: 'automation.execution_failed', entityType: 'AutomationExecution', module: 'Automation' },
    steps: [
      { stepNumber: 1, name: 'Retrieve Execution Context', module: 'Automation', action: 'READ', description: 'Fetch execution details, workflow, and step results', riskLevel: 'READ_ONLY', requiresApproval: false, serviceMethod: 'automation.getExecutionDetails', expectedOutput: 'Execution context with steps' },
      { stepNumber: 2, name: 'Analyze Failure', module: 'AI', action: 'ANALYZE', description: 'AI analyzes failure pattern and root cause', riskLevel: 'READ_ONLY', requiresApproval: false, serviceMethod: 'ai.analyzeAutomationFailure', expectedOutput: 'Failure analysis' },
      { stepNumber: 3, name: 'Notify Operator', module: 'Notifications', action: 'NOTIFY', description: 'Send operator notification with analysis', riskLevel: 'LOW', requiresApproval: false, serviceMethod: 'notifications.sendNotification', expectedOutput: 'Notification sent' },
    ],
    overallRisk: 'READ_ONLY',
    requiresApproval: false,
    involvedModules: ['Automation', 'AI', 'Notifications'],
    requiredPermissions: ['automation:read', 'ai:tools:use', 'notifications:send'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO 7 — BUSINESS HEALTH
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'business_health',
    name: 'Business Health Summary',
    description: 'Generate a cross-module business health summary from real data.',
    category: 'CROSS_MODULE',
    trigger: { eventType: 'manual.trigger', entityType: 'System', module: 'Intelligence' },
    steps: [
      { stepNumber: 1, name: 'Gather Finance Data', module: 'Finance', action: 'READ', description: 'Fetch finance metrics', riskLevel: 'READ_ONLY', requiresApproval: false, serviceMethod: 'finance.getSummary', expectedOutput: 'Finance metrics' },
      { stepNumber: 2, name: 'Gather Workforce Data', module: 'People', action: 'READ', description: 'Fetch workforce metrics', riskLevel: 'READ_ONLY', requiresApproval: false, serviceMethod: 'employee.getSummary', expectedOutput: 'Workforce metrics' },
      { stepNumber: 3, name: 'Gather CRM Data', module: 'CRM', action: 'READ', description: 'Fetch CRM metrics', riskLevel: 'READ_ONLY', requiresApproval: false, serviceMethod: 'crm.getSummary', expectedOutput: 'CRM metrics' },
      { stepNumber: 4, name: 'Gather Project Data', module: 'Projects', action: 'READ', description: 'Fetch project metrics', riskLevel: 'READ_ONLY', requiresApproval: false, serviceMethod: 'projects.getSummary', expectedOutput: 'Project metrics' },
      { stepNumber: 5, name: 'Gather Automation Data', module: 'Automation', action: 'READ', description: 'Fetch automation metrics', riskLevel: 'READ_ONLY', requiresApproval: false, serviceMethod: 'automation.getSummary', expectedOutput: 'Automation metrics' },
      { stepNumber: 6, name: 'Generate AI Insights', module: 'AI', action: 'ANALYZE', description: 'AI synthesizes cross-module data into insights', riskLevel: 'READ_ONLY', requiresApproval: false, serviceMethod: 'ai.generateHealthInsights', expectedOutput: 'Cross-module insights' },
    ],
    overallRisk: 'READ_ONLY',
    requiresApproval: false,
    involvedModules: ['Finance', 'People', 'CRM', 'Projects', 'Automation', 'AI'],
    requiredPermissions: ['finance:read', 'employees:read', 'crm:read', 'projects:read', 'automation:read', 'ai:tools:use'],
  },
];

/**
 * Get a scenario by ID.
 */
export function getScenarioById(id: string): ScenarioDefinition | undefined {
  return SCENARIO_REGISTRY.find((s) => s.id === id);
}

/**
 * Get scenarios by category.
 */
export function getScenariosByCategory(category: string): ScenarioDefinition[] {
  return SCENARIO_REGISTRY.filter((s) => s.category === category);
}

/**
 * Get scenarios that match a given event type.
 */
export function getScenariosForEvent(eventType: string): ScenarioDefinition[] {
  return SCENARIO_REGISTRY.filter((s) => s.trigger.eventType === eventType);
}

/**
 * Get all available scenario categories.
 */
export function getScenarioCategories(): string[] {
  return [...new Set(SCENARIO_REGISTRY.map((s) => s.category))];
}
