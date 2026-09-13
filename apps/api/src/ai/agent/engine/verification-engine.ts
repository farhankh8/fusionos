/**
 * FusionOS AI Agent Verification Engine
 *
 * Verifies that tool execution results match expectations.
 * Ensures agents don't silently succeed when side effects didn't occur.
 */

export interface VerificationCriteria {
  entityType: string;
  entityId?: string;
  expectedState?: Record<string, unknown>;
  existenceCheck?: boolean;
}

export interface VerificationResult {
  verified: boolean;
  criteria: VerificationCriteria;
  actualResult: Record<string, unknown>;
  errors: string[];
}

/**
 * Verify the result of a tool execution.
 */
export function verifyToolResult(params: {
  toolName: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  expectedCriteria?: VerificationCriteria;
}): VerificationResult {
  const { toolName, output, expectedCriteria } = params;

  const errors: string[] = [];

  // Basic output validation
  if (output === null || output === undefined) {
    return {
      verified: false,
      criteria: expectedCriteria ?? { entityType: 'unknown' },
      actualResult: {},
      errors: ['Tool returned null or undefined output.'],
    };
  }

  // Check if tool reported success
  if ('success' in output && output['success'] === false) {
    errors.push('Tool reported failure in output.');
  }

  // Check for error in output
  if ('error' in output && output['error']) {
    errors.push(`Tool returned error: ${String(output['error'])}`);
  }

  // Tool-specific verifications
  switch (toolName) {
    case 'create_task':
      if (!('taskId' in output) || !output['taskId']) {
        errors.push('Expected taskId in output but not found.');
      }
      break;
    case 'send_notification':
      if (!('notificationId' in output) || !output['notificationId']) {
        errors.push('Expected notificationId in output but not found.');
      }
      break;
    case 'create_workflow_draft':
      if (!('workflowId' in output) || !output['workflowId']) {
        errors.push('Expected workflowId in output but not found.');
      }
      break;
  }

  // Check expected state if criteria provided
  if (expectedCriteria) {
    if (expectedCriteria.existenceCheck) {
      if (!output || Object.keys(output).length === 0) {
        errors.push('Existence check failed: no data returned.');
      }
    }

    if (expectedCriteria.expectedState) {
      for (const [key, expectedValue] of Object.entries(expectedCriteria.expectedState)) {
        if (output[key] !== expectedValue) {
          errors.push(
            `State check failed for "${key}": expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(output[key])}`,
          );
        }
      }
    }
  }

  return {
    verified: errors.length === 0,
    criteria: expectedCriteria ?? { entityType: 'unknown' },
    actualResult: output as Record<string, unknown>,
    errors,
  };
}

/**
 * Generate verification criteria for a tool call.
 */
export function generateVerificationCriteria(toolName: string): VerificationCriteria | undefined {
  const criteriaMap: Record<string, VerificationCriteria> = {
    create_task: {
      entityType: 'Task',
      existenceCheck: true,
    },
    send_notification: {
      entityType: 'Notification',
      existenceCheck: true,
    },
    create_workflow_draft: {
      entityType: 'AutomationWorkflow',
      existenceCheck: true,
    },
    get_employee_summary: {
      entityType: 'Employee',
      existenceCheck: false,
    },
    get_finance_summary: {
      entityType: 'Finance',
      existenceCheck: false,
    },
  };

  return criteriaMap[toolName];
}
