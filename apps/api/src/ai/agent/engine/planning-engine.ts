/**
 * FusionOS AI Agent Planning Engine
 *
 * Generates structured execution plans from agent goals.
 * Plans are validated, typed, and support structured output.
 */

import { TOOL_REGISTRY, type AIToolDefinition } from '../../engine/tool-registry';

export interface PlanStep {
  stepNumber: number;
  tool: string;
  purpose: string;
  input: Record<string, unknown>;
  expectedOutput: string;
  riskLevel: 'READ_ONLY' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ExecutionPlan {
  goal: string;
  reasoningSummary: string;
  steps: PlanStep[];
  totalSteps: number;
  estimatedToolCalls: number;
  requiresApproval: boolean;
  maxRiskLevel: string;
}

/**
 * Generate a structured execution plan for an agent goal.
 * This creates a deterministic plan that the execution engine follows.
 */
export function generatePlan(params: {
  goal: string;
  agentType: string;
  allowedTools: string[];
  maxSteps?: number;
}): ExecutionPlan {
  const { goal, agentType, allowedTools, maxSteps = 10 } = params;
  const goalLower = goal.toLowerCase();

  // Determine which tools are relevant based on goal analysis
  const relevantTools = identifyRelevantTools(goalLower, agentType, allowedTools);

  // Build plan steps
  const steps: PlanStep[] = [];
  let stepNumber = 1;

  for (const tool of relevantTools) {
    if (steps.length >= maxSteps) break;

    const step = buildPlanStep(stepNumber, tool, goalLower);
    steps.push(step);
    stepNumber++;
  }

  // If no tools identified, create a default analysis step
  if (steps.length === 0) {
    steps.push({
      stepNumber: 1,
      tool: 'analyze_goal',
      purpose: `Analyze the goal: ${goal}`,
      input: { goal, agentType },
      expectedOutput: 'Analysis result with recommendations',
      riskLevel: 'READ_ONLY',
    });
  }

  // Determine max risk level
  const riskOrder = ['READ_ONLY', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  let maxRiskIndex = 0;
  for (const step of steps) {
    const idx = riskOrder.indexOf(step.riskLevel);
    if (idx > maxRiskIndex) maxRiskIndex = idx;
  }

  const requiresApproval = steps.some(
    (s) => s.riskLevel === 'HIGH' || s.riskLevel === 'CRITICAL' || s.riskLevel === 'MEDIUM',
  );

  return {
    goal,
    reasoningSummary: `Plan to achieve: ${goal} using ${steps.length} steps`,
    steps,
    totalSteps: steps.length,
    estimatedToolCalls: steps.filter((s) => s.tool !== 'analyze_goal').length,
    requiresApproval,
    maxRiskLevel: riskOrder[maxRiskIndex],
  };
}

/**
 * Identify which tools are relevant for a given goal.
 */
function identifyRelevantTools(
  goalLower: string,
  agentType: string,
  allowedTools: string[],
): AIToolDefinition[] {
  const allTools = TOOL_REGISTRY.filter(
    (t) => allowedTools.includes(t.name) && t.classification === 'READ',
  );

  // Keyword-based relevance matching
  const keywordMap: Record<string, string[]> = {
    employee: ['get_employee_summary'],
    workforce: ['get_employee_summary', 'get_attendance_summary'],
    attendance: ['get_attendance_summary'],
    leave: ['get_leave_summary'],
    payroll: ['get_payroll_summary'],
    finance: ['get_finance_summary'],
    revenue: ['get_finance_summary'],
    receivable: ['get_receivables', 'get_finance_summary'],
    invoice: ['get_receivables', 'get_finance_summary'],
    overdue: ['get_receivables', 'get_payables'],
    payable: ['get_payables', 'get_finance_summary'],
    crm: ['get_crm_pipeline'],
    lead: ['get_crm_pipeline'],
    pipeline: ['get_crm_pipeline'],
    opportunity: ['get_crm_pipeline'],
    project: ['get_project_summary'],
    task: ['get_project_summary'],
    asset: ['get_asset_summary'],
    automation: ['get_automation_summary'],
    workflow: ['get_automation_summary', 'get_automation_execution'],
  };

  const matchedNames = new Set<string>();
  for (const [keyword, toolNames] of Object.entries(keywordMap)) {
    if (goalLower.includes(keyword)) {
      for (const name of toolNames) {
        if (allowedTools.includes(name)) {
          matchedNames.add(name);
        }
      }
    }
  }

  // Also include default tools for the agent type
  const agentDefaults: Record<string, string[]> = {
    HR: ['get_employee_summary', 'get_attendance_summary', 'get_leave_summary'],
    FINANCE: ['get_finance_summary', 'get_receivables', 'get_payables'],
    CRM: ['get_crm_pipeline'],
    PROJECTS: ['get_project_summary'],
    OPERATIONS: ['get_automation_summary', 'get_asset_summary'],
  };

  const defaults = agentDefaults[agentType] ?? [];
  for (const name of defaults) {
    if (allowedTools.includes(name)) {
      matchedNames.add(name);
    }
  }

  return allTools.filter((t) => matchedNames.has(t.name)).slice(0, 10);
}

/**
 * Build a single plan step for a tool.
 */
function buildPlanStep(
  stepNumber: number,
  tool: AIToolDefinition,
  goalLower: string,
): PlanStep {
  // Determine risk level based on tool classification
  const riskLevel = tool.classification === 'WRITE' ? 'MEDIUM' : 'READ_ONLY';

  // Build purpose description
  const purpose = `Retrieve ${tool.description.toLowerCase()} to analyze the goal`;

  // Build input based on goal context and tool schema
  const input: Record<string, unknown> = {};
  const properties = (tool.inputSchema as { properties?: Record<string, unknown> }).properties;
  if (properties) {
    for (const [key, schema] of Object.entries(properties)) {
      const s = schema as { type?: string; description?: string };
      if (s.type === 'string' && s.description) {
        // Try to extract relevant values from the goal
        if (goalLower.includes('overdue') && key.toLowerCase().includes('date')) {
          input[key] = undefined; // Let the tool use defaults
        }
      }
    }
  }

  return {
    stepNumber,
    tool: tool.name,
    purpose,
    input,
    expectedOutput: `Structured data from ${tool.category}`,
    riskLevel: riskLevel as PlanStep['riskLevel'],
  };
}

/**
 * Validate a plan against allowed tools and constraints.
 */
export function validatePlan(
  plan: ExecutionPlan,
  allowedTools: string[],
  maxSteps: number = 10,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (plan.steps.length === 0) {
    errors.push('Plan must contain at least one step.');
  }

  if (plan.steps.length > maxSteps) {
    errors.push(`Plan exceeds maximum steps (${maxSteps}).`);
  }

  for (const step of plan.steps) {
    if (!allowedTools.includes(step.tool) && step.tool !== 'analyze_goal') {
      errors.push(`Step ${step.stepNumber}: Tool "${step.tool}" is not in the allowed tools list.`);
    }

    const toolDef = TOOL_REGISTRY.find((t) => t.name === step.tool);
    if (!toolDef && step.tool !== 'analyze_goal') {
      errors.push(`Step ${step.stepNumber}: Tool "${step.tool}" is not a registered tool.`);
    }
  }

  return { valid: errors.length === 0, errors };
}
