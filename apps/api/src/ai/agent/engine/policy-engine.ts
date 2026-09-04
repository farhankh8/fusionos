/**
 * FusionOS AI Agent Policy Engine
 *
 * Determines whether an agent action CAN_EXECUTE, REQUIRES_APPROVAL, or MUST_BE_DENIED.
 * Enforces safety policies for AI agents.
 */

export type PolicyDecision = 'CAN_EXECUTE' | 'REQUIRES_APPROVAL' | 'MUST_BE_DENIED';

export interface PolicyRule {
  /** Tool name pattern (exact match or wildcard) */
  toolPattern: string;
  /** Decision when rule matches */
  decision: PolicyDecision;
  /** Optional: specific risk levels that trigger this rule */
  riskLevels?: string[];
  /** Reason for this policy rule */
  reason: string;
}

export interface PolicyEvaluation {
  decision: PolicyDecision;
  rule: PolicyRule | null;
  reason: string;
}

// Default policy rules for FusionOS agents
const DEFAULT_POLICY_RULES: PolicyRule[] = [
  // Deny rules — dangerous operations
  {
    toolPattern: 'modify_payroll',
    decision: 'MUST_BE_DENIED',
    reason: 'AI agents are not authorized to modify payroll directly.',
  },
  {
    toolPattern: 'create_financial_entry',
    decision: 'MUST_BE_DENIED',
    reason: 'AI agents must not create arbitrary financial entries.',
  },
  {
    toolPattern: 'modify_account_balance',
    decision: 'MUST_BE_DENIED',
    reason: 'AI agents must not modify account balances.',
  },
  {
    toolPattern: 'delete_*',
    decision: 'MUST_BE_DENIED',
    reason: 'AI agents are not authorized to delete records.',
  },

  // Approval-required rules
  {
    toolPattern: 'create_workflow_draft',
    decision: 'REQUIRES_APPROVAL',
    riskLevels: ['HIGH', 'CRITICAL'],
    reason: 'Creating automation workflows requires user confirmation.',
  },
  {
    toolPattern: 'update_*',
    decision: 'REQUIRES_APPROVAL',
    riskLevels: ['MEDIUM', 'HIGH', 'CRITICAL'],
    reason: 'Entity updates require user approval.',
  },
  {
    toolPattern: 'create_task',
    decision: 'REQUIRES_APPROVAL',
    reason: 'Creating tasks requires user approval.',
  },
  {
    toolPattern: 'send_notification',
    decision: 'REQUIRES_APPROVAL',
    reason: 'Sending notifications requires user approval.',
  },
  {
    toolPattern: 'request_approval',
    decision: 'REQUIRES_APPROVAL',
    reason: 'Approval requests require user approval.',
  },
];

/**
 * Evaluate a policy decision for a tool execution.
 */
export function evaluatePolicy(params: {
  toolName: string;
  riskLevel: string;
  agentType: string;
  userPermissions: string[];
}): PolicyEvaluation {
  const { toolName, riskLevel, agentType, userPermissions } = params;

  // Check user permissions first
  if (!userPermissions.includes('ai:tools:use')) {
    return {
      decision: 'MUST_BE_DENIED',
      rule: null,
      reason: 'User does not have the ai:tools:use permission.',
    };
  }

  // Check agent-specific permissions
  const agentPermission = `ai:agent:${agentType.toLowerCase()}:use`;
  if (!userPermissions.includes(agentPermission) && !userPermissions.includes('ai:admin')) {
    return {
      decision: 'MUST_BE_DENIED',
      rule: null,
      reason: `User does not have the ${agentPermission} permission.`,
    };
  }

  // Evaluate against policy rules
  for (const rule of DEFAULT_POLICY_RULES) {
    if (matchesPattern(toolName, rule.toolPattern)) {
      // If rule has risk level constraints, check if current risk matches
      if (rule.riskLevels && rule.riskLevels.length > 0) {
        if (!rule.riskLevels.includes(riskLevel)) {
          continue;
        }
      }

      return {
        decision: rule.decision,
        rule,
        reason: rule.reason,
      };
    }
  }

  // Default: read-only operations can execute
  if (riskLevel === 'READ_ONLY') {
    return {
      decision: 'CAN_EXECUTE',
      rule: null,
      reason: 'Read-only operations are auto-approved.',
    };
  }

  // Unknown tool with non-read risk: require approval as safety net
  if (riskLevel !== 'READ_ONLY') {
    return {
      decision: 'REQUIRES_APPROVAL',
      rule: null,
      reason: 'Unclassified write operation requires approval.',
    };
  }

  return {
    decision: 'CAN_EXECUTE',
    rule: null,
    reason: 'No policy rule matched; defaulting to auto-approve for read-only.',
  };
}

/**
 * Check if a tool name matches a pattern (supports * wildcards).
 */
function matchesPattern(toolName: string, pattern: string): boolean {
  if (pattern === '*') return true;
  if (pattern.endsWith('*')) {
    return toolName.startsWith(pattern.slice(0, -1));
  }
  if (pattern.startsWith('*')) {
    return toolName.endsWith(pattern.slice(1));
  }
  return toolName === pattern;
}

/**
 * Get all policy rules.
 */
export function getPolicyRules(): PolicyRule[] {
  return [...DEFAULT_POLICY_RULES];
}
