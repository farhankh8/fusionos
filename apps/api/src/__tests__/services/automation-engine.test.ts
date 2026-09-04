/**
 * Automation Engine Unit Tests — Phase 25 Coverage Engineering
 *
 * Covers: TriggerRegistry, ConditionEngine (all operators), ActionRegistry
 * Tests: evaluation logic, safety guarantees, no eval/dynamic code execution
 */

import { describe, it, expect } from 'vitest';
import { TRIGGER_REGISTRY } from '../../automation/engine/trigger-registry';
import { evaluateConditions } from '../../automation/engine/condition-engine';
import { ACTION_REGISTRY } from '../../automation/engine/action-engine';

// ── Trigger Registry Tests ────────────────────────────────────────────────

describe('Trigger Registry', () => {
  it('has at least 8 trigger definitions', () => {
    expect(TRIGGER_REGISTRY.length).toBeGreaterThanOrEqual(8);
  });

  it('every trigger has required fields', () => {
    for (const trigger of TRIGGER_REGISTRY) {
      expect(trigger.eventType).toBeTruthy();
      expect(trigger.entityType).toBeTruthy();
      expect(trigger.module).toBeTruthy();
      expect(Array.isArray(trigger.availableFields)).toBe(true);
    }
  });

  it('every trigger field has required properties', () => {
    for (const trigger of TRIGGER_REGISTRY) {
      for (const field of trigger.availableFields) {
        expect(field.entity).toBeTruthy();
        expect(field.field).toBeTruthy();
        expect(field.label).toBeTruthy();
        expect(['STRING', 'NUMBER', 'BOOLEAN', 'ENUM', 'DATE', 'NULL']).toContain(field.type);
        expect(typeof field.allowed).toBe('boolean');
      }
    }
  });

  it('does not contain eval or Function in any trigger definition', () => {
    const serialized = JSON.stringify(TRIGGER_REGISTRY);
    expect(serialized).not.toContain('eval(');
    expect(serialized).not.toContain('new Function');
    expect(serialized).not.toContain('child_process');
    expect(serialized).not.toContain('require(');
  });

  it('has unique event types', () => {
    const types = TRIGGER_REGISTRY.map((t) => t.eventType);
    expect(new Set(types).size).toBe(types.length);
  });

  it('includes employee triggers', () => {
    const employeeTriggers = TRIGGER_REGISTRY.filter((t) => t.entityType === 'Employee');
    expect(employeeTriggers.length).toBeGreaterThanOrEqual(2);
  });

  it('includes leave triggers', () => {
    const leaveTriggers = TRIGGER_REGISTRY.filter((t) => t.entityType === 'LeaveRequest');
    expect(leaveTriggers.length).toBeGreaterThanOrEqual(1);
  });
});

// ── Condition Engine Tests ────────────────────────────────────────────────
// NOTE: evaluateConditions takes (ConditionGroup, Record<string, unknown>)
// Entity data keys use dotted notation: "entity.field"
// getFieldType always returns 'STRING', so all operators resolve to string comparisons.

describe('Condition Engine', () => {
  // Using dotted keys matching entity.field convention
  const baseEntityData: Record<string, unknown> = {
    'employee.status': 'ACTIVE',
    'employee.department': 'Engineering',
    'employee.employmentType': 'FULL_TIME',
    'leave.days': '15',
  };

  describe('STRING operators (default for all field types)', () => {
    it('equals: matches', () => {
      const result = evaluateConditions(
        {
          logic: 'AND',
          conditions: [
            { entity: 'employee', field: 'department', operator: 'equals', value: 'Engineering' },
          ],
        },
        baseEntityData,
      );
      expect(result.matched).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('equals: does not match', () => {
      const result = evaluateConditions(
        {
          logic: 'AND',
          conditions: [
            { entity: 'employee', field: 'department', operator: 'equals', value: 'Sales' },
          ],
        },
        baseEntityData,
      );
      expect(result.matched).toBe(false);
    });

    it('notEquals: works', () => {
      const result = evaluateConditions(
        {
          logic: 'AND',
          conditions: [
            { entity: 'employee', field: 'department', operator: 'notEquals', value: 'Sales' },
          ],
        },
        baseEntityData,
      );
      expect(result.matched).toBe(true);
    });

    it('contains: works', () => {
      const result = evaluateConditions(
        {
          logic: 'AND',
          conditions: [
            { entity: 'employee', field: 'department', operator: 'contains', value: 'Engine' },
          ],
        },
        baseEntityData,
      );
      expect(result.matched).toBe(true);
    });

    it('startsWith: works', () => {
      const result = evaluateConditions(
        {
          logic: 'AND',
          conditions: [
            { entity: 'employee', field: 'department', operator: 'startsWith', value: 'Engi' },
          ],
        },
        baseEntityData,
      );
      expect(result.matched).toBe(true);
    });

    it('endsWith: works', () => {
      const result = evaluateConditions(
        {
          logic: 'AND',
          conditions: [
            { entity: 'employee', field: 'department', operator: 'endsWith', value: 'neering' },
          ],
        },
        baseEntityData,
      );
      expect(result.matched).toBe(true);
    });

    it('isEmpty: works', () => {
      const entityData: Record<string, unknown> = { 'employee.department': '' };
      const result = evaluateConditions(
        {
          logic: 'AND',
          conditions: [
            { entity: 'employee', field: 'department', operator: 'isEmpty', value: '' },
          ],
        },
        entityData,
      );
      expect(result.matched).toBe(true);
    });

    it('isNotEmpty: works', () => {
      const result = evaluateConditions(
        {
          logic: 'AND',
          conditions: [
            { entity: 'employee', field: 'department', operator: 'isNotEmpty', value: '' },
          ],
        },
        baseEntityData,
      );
      expect(result.matched).toBe(true);
    });
  });

  describe('ENUM operators (resolved as STRING by getFieldType)', () => {
    it('equals: matches string value', () => {
      const result = evaluateConditions(
        {
          logic: 'AND',
          conditions: [
            { entity: 'employee', field: 'status', operator: 'equals', value: 'ACTIVE' },
          ],
        },
        baseEntityData,
      );
      expect(result.matched).toBe(true);
    });

    it('notEquals: works', () => {
      const result = evaluateConditions(
        {
          logic: 'AND',
          conditions: [
            { entity: 'employee', field: 'status', operator: 'notEquals', value: 'TERMINATED' },
          ],
        },
        baseEntityData,
      );
      expect(result.matched).toBe(true);
    });
  });

  describe('Group logic', () => {
    it('AND: all conditions must match', () => {
      const result = evaluateConditions(
        {
          logic: 'AND',
          conditions: [
            { entity: 'employee', field: 'department', operator: 'equals', value: 'Engineering' },
            { entity: 'employee', field: 'status', operator: 'equals', value: 'ACTIVE' },
          ],
        },
        baseEntityData,
      );
      expect(result.matched).toBe(true);
    });

    it('AND: fails if any condition does not match', () => {
      const result = evaluateConditions(
        {
          logic: 'AND',
          conditions: [
            { entity: 'employee', field: 'department', operator: 'equals', value: 'Engineering' },
            { entity: 'employee', field: 'status', operator: 'equals', value: 'TERMINATED' },
          ],
        },
        baseEntityData,
      );
      expect(result.matched).toBe(false);
    });

    it('OR: at least one condition must match', () => {
      const result = evaluateConditions(
        {
          logic: 'OR',
          conditions: [
            { entity: 'employee', field: 'department', operator: 'equals', value: 'Sales' },
            { entity: 'employee', field: 'department', operator: 'equals', value: 'Engineering' },
          ],
        },
        baseEntityData,
      );
      expect(result.matched).toBe(true);
    });

    it('OR: fails if no conditions match', () => {
      const result = evaluateConditions(
        {
          logic: 'OR',
          conditions: [
            { entity: 'employee', field: 'department', operator: 'equals', value: 'Sales' },
            { entity: 'employee', field: 'department', operator: 'equals', value: 'Marketing' },
          ],
        },
        baseEntityData,
      );
      expect(result.matched).toBe(false);
    });
  });

  describe('Safety', () => {
    it('null/undefined config always matches', () => {
      expect(evaluateConditions(null, baseEntityData).matched).toBe(true);
      expect(evaluateConditions(undefined, baseEntityData).matched).toBe(true);
    });

    it('empty conditions always match', () => {
      const result = evaluateConditions({ logic: 'AND', conditions: [] }, baseEntityData);
      expect(result.matched).toBe(true);
    });

    it('missing field in entity data: condition fails (null actual)', () => {
      const result = evaluateConditions(
        {
          logic: 'AND',
          conditions: [
            { entity: 'employee', field: 'nonExistentField', operator: 'equals', value: 'test' },
          ],
        },
        baseEntityData,
      );
      // Field not in data → actual is undefined → returns false (null/undefined guard)
      expect(result.matched).toBe(false);
    });

    it('unknown operator returns false for the condition', () => {
      const result = evaluateConditions(
        {
          logic: 'AND',
          conditions: [
            { entity: 'employee', field: 'status', operator: 'hacker', value: 'test' },
          ],
        },
        baseEntityData,
      );
      expect(result.matched).toBe(false);
    });
  });
});

// ── Action Registry Tests ─────────────────────────────────────────────────

describe('Action Registry', () => {
  it('has at least 5 action definitions', () => {
    expect(ACTION_REGISTRY.length).toBeGreaterThanOrEqual(5);
  });

  it('every action has required fields', () => {
    for (const action of ACTION_REGISTRY) {
      expect(action.type).toBeTruthy();
      expect(action.label).toBeTruthy();
      expect(action.description).toBeTruthy();
      expect(action.configSchema).toBeDefined();
      expect(typeof action.supported).toBe('boolean');
    }
  });

  it('all current actions are supported', () => {
    for (const action of ACTION_REGISTRY) {
      expect(action.supported).toBe(true);
    }
  });

  it('does not contain eval or Function', () => {
    const serialized = JSON.stringify(ACTION_REGISTRY);
    expect(serialized).not.toContain('eval(');
    expect(serialized).not.toContain('new Function');
    expect(serialized).not.toContain('child_process');
  });

  it('has unique action types', () => {
    const types = ACTION_REGISTRY.map((a) => a.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it('every action configSchema is a valid JSON schema object', () => {
    for (const action of ACTION_REGISTRY) {
      expect(action.configSchema['type']).toBe('object');
      expect(action.configSchema['properties']).toBeDefined();
    }
  });
});
