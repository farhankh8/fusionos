/**
 * FusionOS AI Agent Risk Engine
 *
 * Classifies the risk level of each planned action.
 * Determines whether approval is required before execution.
 */

export type RiskLevel = 'READ_ONLY' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface StepRiskAssessment {
  stepNumber: number;
  tool: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  reason: string;
}

export interface RiskAssessment {
  overallRisk: RiskLevel;
  requiresApproval: boolean;
  stepRisks: StepRiskAssessment[];
  summary: string;
}

const RISK_ORDER: RiskLevel[] = ['READ_ONLY', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

// Tools that always require approval
const HIGH_RISK_TOOLS = new Set([
  'create_workflow_draft',
  'update_customer',
  'update_employee',
  'create_financial_entry',
  'modify_payroll',
]);

// Tools that are medium risk
const MEDIUM_RISK_TOOLS = new Set([
  'send_notification',
  'create_task',
  'request_approval',
]);

/**
 * Assess the risk level of a plan.
 */
export function assessPlanRisk(steps: Array<{
  stepNumber: number;
  tool: string;
  purpose: string;
  riskLevel?: string;
}>): RiskAssessment {
  const stepRisks: StepRiskAssessment[] = [];

  for (const step of steps) {
    const assessment = assessStepRisk(step);
    stepRisks.push(assessment);
  }

  // Determine overall risk
  let maxRiskIndex = 0;
  for (const risk of stepRisks) {
    const idx = RISK_ORDER.indexOf(risk.riskLevel);
    if (idx > maxRiskIndex) maxRiskIndex = idx;
  }

  const overallRisk = RISK_ORDER[maxRiskIndex];
  const requiresApproval = stepRisks.some((r) => r.requiresApproval);

  const highRiskCount = stepRisks.filter((r) =>
    r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL',
  ).length;
  const mediumRiskCount = stepRisks.filter((r) => r.riskLevel === 'MEDIUM').length;

  const summary = `Overall risk: ${overallRisk}. ` +
    `${stepRisks.length} steps total. ` +
    (highRiskCount > 0 ? `${highRiskCount} high-risk steps. ` : '') +
    (mediumRiskCount > 0 ? `${mediumRiskCount} medium-risk steps. ` : '') +
    (requiresApproval ? 'Approval required.' : 'Auto-approval eligible.');

  return {
    overallRisk,
    requiresApproval,
    stepRisks,
    summary,
  };
}

/**
 * Assess the risk of a single step.
 */
function assessStepRisk(step: {
  stepNumber: number;
  tool: string;
  purpose: string;
  riskLevel?: string;
}): StepRiskAssessment {
  // High-risk tools always require approval
  if (HIGH_RISK_TOOLS.has(step.tool)) {
    return {
      stepNumber: step.stepNumber,
      tool: step.tool,
      riskLevel: 'HIGH',
      requiresApproval: true,
      reason: `Tool "${step.tool}" is classified as high-risk and requires explicit approval.`,
    };
  }

  // Medium-risk tools
  if (MEDIUM_RISK_TOOLS.has(step.tool)) {
    return {
      stepNumber: step.stepNumber,
      tool: step.tool,
      riskLevel: 'MEDIUM',
      requiresApproval: true,
      reason: `Tool "${step.tool}" is classified as medium-risk and requires approval.`,
    };
  }

  // Check if it's a write tool
  if (step.riskLevel === 'WRITE' || step.riskLevel === 'MEDIUM' || step.riskLevel === 'HIGH') {
    return {
      stepNumber: step.stepNumber,
      tool: step.tool,
      riskLevel: (step.riskLevel as RiskLevel) || 'MEDIUM',
      requiresApproval: true,
      reason: `Write operation requires approval.`,
    };
  }

  // Default: read-only tools are low risk
  return {
    stepNumber: step.stepNumber,
    tool: step.tool,
    riskLevel: 'READ_ONLY',
    requiresApproval: false,
    reason: 'Read-only operation.',
  };
}

/**
 * Check if a specific tool requires approval.
 */
export function doesToolRequireApproval(toolName: string): boolean {
  return HIGH_RISK_TOOLS.has(toolName) || MEDIUM_RISK_TOOLS.has(toolName);
}

/**
 * Get the risk level for a specific tool.
 */
export function getToolRiskLevel(toolName: string): RiskLevel {
  if (HIGH_RISK_TOOLS.has(toolName)) return 'HIGH';
  if (MEDIUM_RISK_TOOLS.has(toolName)) return 'MEDIUM';
  return 'READ_ONLY';
}
