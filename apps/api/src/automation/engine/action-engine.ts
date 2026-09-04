/**
 * FusionOS Action Engine
 *
 * Validates and executes workflow actions. Each action type has:
 * - A validation schema
 * - An execution handler
 * - Idempotency behavior
 *
 * Actions operate on existing FusionOS infrastructure and never
 * create arbitrary side effects.
 */

import { AutomationActionType } from '@prisma/client';

// ── Types ───────────────────────────────────────────────────────────────────

export interface ActionDefinition {
  type: AutomationActionType;
  label: string;
  description: string;
  /** JSON schema for action config validation */
  configSchema: Record<string, unknown>;
  /** Whether this action type is currently supported (vs coming soon) */
  supported: boolean;
}

export interface ActionResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// ── Action Registry ──────────────────────────────────────────────────────────

export const ACTION_REGISTRY: ActionDefinition[] = [
  {
    type: 'SEND_NOTIFICATION',
    label: 'Send Notification',
    description: 'Send an in-app notification to specified recipients',
    configSchema: {
      type: 'object',
      required: ['recipientType', 'title', 'message'],
      properties: {
        recipientType: { type: 'string', enum: ['specific_user', 'workflow_owner', 'manager'] },
        recipientUserId: { type: 'string', format: 'uuid', description: 'Required if recipientType is specific_user' },
        title: { type: 'string', maxLength: 500 },
        message: { type: 'string', maxLength: 2000 },
        severity: { type: 'string', enum: ['INFO', 'SUCCESS', 'WARNING', 'ERROR'] },
      },
    },
    supported: true,
  },
  {
    type: 'CREATE_TASK',
    label: 'Create Task',
    description: 'Create a CRM task assigned to a user',
    configSchema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string', maxLength: 255 },
        description: { type: 'string', maxLength: 2000 },
        assigneeType: { type: 'string', enum: ['specific_user', 'workflow_owner', 'manager'] },
        assigneeId: { type: 'string', format: 'uuid' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
        dueDateOffsetDays: { type: 'number', minimum: 0, maximum: 365 },
      },
    },
    supported: true,
  },
  {
    type: 'REQUEST_APPROVAL',
    label: 'Request Approval',
    description: 'Create an approval request for a designated approver',
    configSchema: {
      type: 'object',
      required: ['approverUserId', 'reason'],
      properties: {
        approverUserId: { type: 'string', format: 'uuid' },
        reason: { type: 'string', maxLength: 1000 },
        entityType: { type: 'string' },
      },
    },
    supported: true,
  },
  {
    type: 'UPDATE_ENTITY',
    label: 'Update Entity',
    description: 'Update a whitelisted field on a supported entity',
    configSchema: {
      type: 'object',
      required: ['entityType', 'entityIdField', 'field', 'value'],
      properties: {
        entityType: { type: 'string', enum: ['Employee', 'Project', 'ProjectTask'] },
        entityIdField: { type: 'string', description: 'Field from trigger payload containing entity ID' },
        field: { type: 'string', description: 'Field name to update' },
        value: { description: 'New value' },
      },
    },
    supported: true,
  },
  {
    type: 'CREATE_AUDIT_EVENT',
    label: 'Create Audit Event',
    description: 'Record a custom audit log entry',
    configSchema: {
      type: 'object',
      required: ['action', 'entityType'],
      properties: {
        action: { type: 'string', maxLength: 100 },
        entityType: { type: 'string', maxLength: 100 },
        description: { type: 'string', maxLength: 500 },
      },
    },
    supported: true,
  },
];

// ── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate an action configuration against its schema.
 * Returns validation errors or empty array if valid.
 */
export function validateActionConfig(
  actionType: string,
  config: Record<string, unknown>,
): string[] {
  const definition = ACTION_REGISTRY.find((a) => a.type === actionType);
  const errors: string[] = [];

  if (!definition) {
    errors.push(`Unknown action type: "${actionType}".`);
    return errors;
  }

  if (!definition.supported) {
    errors.push(`Action type "${actionType}" is not yet supported.`);
    return errors;
  }

  const schema = definition.configSchema as Record<string, any>;
  const cfg = config as Record<string, any>;

  // Check required fields
  for (const requiredField of schema['required'] ?? []) {
    if (cfg[requiredField] === undefined || cfg[requiredField] === null) {
      errors.push(`Action "${actionType}" requires field "${requiredField}".`);
    }
  }

  // Validate specific action configs
  switch (actionType) {
    case 'SEND_NOTIFICATION': {
      if (cfg['recipientType'] === 'specific_user' && !cfg['recipientUserId']) {
        errors.push('Action "SEND_NOTIFICATION" with recipientType "specific_user" requires "recipientUserId".');
      }
      if (cfg['title'] && typeof cfg['title'] === 'string' && cfg['title'].length > 500) {
        errors.push('Notification title must be 500 characters or fewer.');
      }
      if (cfg['message'] && typeof cfg['message'] === 'string' && cfg['message'].length > 2000) {
        errors.push('Notification message must be 2000 characters or fewer.');
      }
      break;
    }
    case 'CREATE_TASK': {
      if (cfg['assigneeType'] === 'specific_user' && !cfg['assigneeId']) {
        errors.push('Action "CREATE_TASK" with assigneeType "specific_user" requires "assigneeId".');
      }
      if (cfg['title'] && typeof cfg['title'] === 'string' && cfg['title'].length > 255) {
        errors.push('Task title must be 255 characters or fewer.');
      }
      break;
    }
    case 'REQUEST_APPROVAL': {
      if (!cfg['approverUserId']) {
        errors.push('Action "REQUEST_APPROVAL" requires "approverUserId".');
      }
      if (!cfg['reason'] || typeof cfg['reason'] !== 'string') {
        errors.push('Action "REQUEST_APPROVAL" requires "reason".');
      }
      break;
    }
    case 'UPDATE_ENTITY': {
      const allowedEntities = ['Employee', 'Project', 'ProjectTask'];
      if (cfg['entityType'] && !allowedEntities.includes(String(cfg['entityType']))) {
        errors.push(`Entity type "${cfg['entityType']}" is not supported for UPDATE_ENTITY. Allowed: ${allowedEntities.join(', ')}`);
      }
      break;
    }
    case 'CREATE_AUDIT_EVENT': {
      if (cfg['action'] && typeof cfg['action'] === 'string' && cfg['action'].length > 100) {
        errors.push('Audit action must be 100 characters or fewer.');
      }
      break;
    }
  }

  return errors;
}

/**
 * Validate all actions in a workflow configuration.
 */
export function validateActionsConfig(
  actionsConfig: Array<{ type: string; config: Record<string, unknown> }>,
): string[] {
  const errors: string[] = [];

  if (!Array.isArray(actionsConfig) || actionsConfig.length === 0) {
    errors.push('Workflow must have at least one action.');
    return errors;
  }

  for (let i = 0; i < actionsConfig.length; i++) {
    const action = actionsConfig[i];
    const actionErrors = validateActionConfig(action.type, action.config);
    for (const error of actionErrors) {
      errors.push(`Action ${i + 1} (${action.type}): ${error}`);
    }
  }

  return errors;
}
