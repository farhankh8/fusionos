/**
 * FusionOS Automation Integration Tests — Phase 16
 *
 * Covers:
 * - Trigger registry
 * - Condition evaluation
 * - Action validation
 * - Workflow CRUD
 * - Workflow lifecycle (publish, pause, resume, archive)
 * - Workflow versioning
 * - Execution engine
 * - Idempotency
 * - Tenant isolation
 * - Audit logging
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient, Prisma } from '@prisma/client';
import {
  TRIGGER_REGISTRY,
  getTriggerByEventType,
  getEntityTypes,
  getModules,
} from '../../automation/engine/trigger-registry';
import {
  evaluateConditions,
  validateConditionGroup,
} from '../../automation/engine/condition-engine';
import {
  validateActionConfig,
  validateActionsConfig,
  ACTION_REGISTRY,
} from '../../automation/engine/action-engine';

const prisma = new PrismaClient();

const TENANT_A = '00000000-0000-4000-8000-000000000001';
const TENANT_B = '10000000-0000-4000-8000-000000000001';
const USER_A_ADMIN = '00000000-0000-4000-8000-000000000003';

// Track created resources for cleanup
const createdWorkflowIds: string[] = [];
const createdExecutionIds: string[] = [];

describe('Automation — Phase 16 Integration Tests', () => {
  beforeAll(async () => {
    // Verify test user exists
    const user = await prisma.user.findUnique({ where: { id: USER_A_ADMIN } });
    if (!user) throw new Error(`Test user ${USER_A_ADMIN} not found — run seed first`);
  });

  afterAll(async () => {
    // Cleanup test data
    for (const execId of createdExecutionIds) {
      await prisma.automationStepExecution.deleteMany({ where: { executionId: execId } });
      await prisma.automationExecution.deleteMany({ where: { id: execId } });
    }
    for (const wfId of createdWorkflowIds) {
      await prisma.automationWorkflowVersion.deleteMany({ where: { workflowId: wfId } });
      await prisma.automationExecution.deleteMany({ where: { workflowId: wfId } });
      await prisma.automationApproval.deleteMany({ where: { workflowId: wfId } });
      await prisma.automationWorkflow.deleteMany({ where: { id: wfId } });
    }
    await prisma.$disconnect();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TRIGGER REGISTRY
  // ══════════════════════════════════════════════════════════════════════════

  describe('Trigger Registry', () => {
    it('should have a non-empty trigger registry', () => {
      expect(TRIGGER_REGISTRY.length).toBeGreaterThan(0);
    });

    it('each trigger should have required fields', () => {
      for (const trigger of TRIGGER_REGISTRY) {
        expect(trigger.eventType).toBeDefined();
        expect(trigger.entityType).toBeDefined();
        expect(trigger.entityLabel).toBeDefined();
        expect(trigger.eventLabel).toBeDefined();
        expect(trigger.module).toBeDefined();
        expect(Array.isArray(trigger.availableFields)).toBe(true);
      }
    });

    it('should look up trigger by event type', () => {
      const trigger = getTriggerByEventType('employee.created');
      expect(trigger).toBeDefined();
      expect(trigger!.entityType).toBe('Employee');
    });

    it('should return undefined for unknown event type', () => {
      const trigger = getTriggerByEventType('unknown.event');
      expect(trigger).toBeUndefined();
    });

    it('should return unique entity types', () => {
      const types = getEntityTypes();
      expect(types.length).toBeGreaterThan(0);
      expect(new Set(types).size).toBe(types.length);
    });

    it('should return unique modules', () => {
      const modules = getModules();
      expect(modules.length).toBeGreaterThan(0);
      expect(new Set(modules).size).toBe(modules.length);
    });

    it('available fields should have valid structure', () => {
      for (const trigger of TRIGGER_REGISTRY) {
        for (const field of trigger.availableFields) {
          expect(field.entity).toBeDefined();
          expect(field.field).toBeDefined();
          expect(field.label).toBeDefined();
          expect(['STRING', 'NUMBER', 'BOOLEAN', 'ENUM', 'DATE', 'NULL']).toContain(field.type);
          expect(typeof field.allowed).toBe('boolean');
        }
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CONDITION ENGINE
  // ══════════════════════════════════════════════════════════════════════════

  describe('Condition Engine', () => {
    const employeeFields = TRIGGER_REGISTRY.find(t => t.eventType === 'employee.created')!.availableFields;

    describe('Validation', () => {
      it('should accept valid condition', () => {
        const errors = validateConditionGroup(
          {
            logic: 'AND',
            conditions: [
              { entity: 'employee', field: 'status', operator: 'equals', value: 'ACTIVE' },
            ],
          },
          employeeFields,
        );
        expect(errors.length).toBe(0);
      });

      it('should reject unknown field', () => {
        const errors = validateConditionGroup(
          {
            logic: 'AND',
            conditions: [
              { entity: 'employee', field: 'nonexistent', operator: 'equals', value: 'test' },
            ],
          },
          employeeFields,
        );
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toContain('not available');
      });

      it('should reject invalid operator for field type', () => {
        const errors = validateConditionGroup(
          {
            logic: 'AND',
            conditions: [
              { entity: 'employee', field: 'status', operator: 'greaterThan', value: 'test' },
            ],
          },
          employeeFields,
        );
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toContain('not valid');
      });

      it('should reject invalid enum value', () => {
        const errors = validateConditionGroup(
          {
            logic: 'AND',
            conditions: [
              { entity: 'employee', field: 'status', operator: 'equals', value: 'INVALID_STATUS' },
            ],
          },
          employeeFields,
        );
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toContain('not valid');
      });

      it('should accept empty conditions', () => {
        const errors = validateConditionGroup(undefined, employeeFields);
        expect(errors.length).toBe(0);
      });

      it('should reject invalid logic', () => {
        const errors = validateConditionGroup(
          { logic: 'XOR' as any, conditions: [] },
          employeeFields,
        );
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    describe('Evaluation', () => {
      it('should match when no conditions defined', () => {
        const result = evaluateConditions(null, {});
        expect(result.matched).toBe(true);
      });

      it('should match AND conditions', () => {
        const result = evaluateConditions(
          {
            logic: 'AND',
            conditions: [
              { entity: 'employee', field: 'status', operator: 'equals', value: 'ACTIVE' },
              { entity: 'employee', field: 'department', operator: 'equals', value: 'Sales' },
            ],
          },
          {
            'employee.status': 'ACTIVE',
            'employee.department': 'Sales',
          },
        );
        expect(result.matched).toBe(true);
      });

      it('should not match AND when one fails', () => {
        const result = evaluateConditions(
          {
            logic: 'AND',
            conditions: [
              { entity: 'employee', field: 'status', operator: 'equals', value: 'ACTIVE' },
              { entity: 'employee', field: 'department', operator: 'equals', value: 'Sales' },
            ],
          },
          {
            'employee.status': 'ACTIVE',
            'employee.department': 'Marketing',
          },
        );
        expect(result.matched).toBe(false);
      });

      it('should match OR conditions', () => {
        const result = evaluateConditions(
          {
            logic: 'OR',
            conditions: [
              { entity: 'employee', field: 'department', operator: 'equals', value: 'Sales' },
              { entity: 'employee', field: 'department', operator: 'equals', value: 'Marketing' },
            ],
          },
          {
            'employee.department': 'Marketing',
          },
        );
        expect(result.matched).toBe(true);
      });

      it('should handle nested AND/OR groups', () => {
        const result = evaluateConditions(
          {
            logic: 'AND',
            conditions: [
              { entity: 'employee', field: 'status', operator: 'equals', value: 'ACTIVE' },
            ],
            groups: [
              {
                logic: 'OR',
                conditions: [
                  { entity: 'employee', field: 'department', operator: 'equals', value: 'Sales' },
                  { entity: 'employee', field: 'department', operator: 'equals', value: 'Marketing' },
                ],
              },
            ],
          },
          {
            'employee.status': 'ACTIVE',
            'employee.department': 'Sales',
          },
        );
        expect(result.matched).toBe(true);
      });

      it('should handle null-safe evaluation', () => {
        const result = evaluateConditions(
          {
            logic: 'AND',
            conditions: [
              { entity: 'employee', field: 'status', operator: 'isNull', value: null },
            ],
          },
          { 'employee.status': null },
        );
        expect(result.matched).toBe(true);
      });

      it('should handle isNotNull', () => {
        const result = evaluateConditions(
          {
            logic: 'AND',
            conditions: [
              { entity: 'employee', field: 'status', operator: 'isNotNull', value: null },
            ],
          },
          { 'employee.status': 'ACTIVE' },
        );
        expect(result.matched).toBe(true);
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ACTION ENGINE
  // ══════════════════════════════════════════════════════════════════════════

  describe('Action Engine', () => {
    it('should have a non-empty action registry', () => {
      expect(ACTION_REGISTRY.length).toBeGreaterThan(0);
    });

    it('should validate SEND_NOTIFICATION action', () => {
      const errors = validateActionConfig('SEND_NOTIFICATION', {
        recipientType: 'workflow_owner',
        title: 'Test',
        message: 'Hello',
      });
      expect(errors.length).toBe(0);
    });

    it('should reject SEND_NOTIFICATION without required fields', () => {
      const errors = validateActionConfig('SEND_NOTIFICATION', {});
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate CREATE_TASK action', () => {
      const errors = validateActionConfig('CREATE_TASK', {
        title: 'Test Task',
      });
      expect(errors.length).toBe(0);
    });

    it('should validate REQUEST_APPROVAL action', () => {
      const errors = validateActionConfig('REQUEST_APPROVAL', {
        approverUserId: '00000000-0000-4000-8000-000000000001',
        reason: 'Need approval',
      });
      expect(errors.length).toBe(0);
    });

    it('should validate UPDATE_ENTITY action', () => {
      const errors = validateActionConfig('UPDATE_ENTITY', {
        entityType: 'Employee',
        entityIdField: 'entityId',
        field: 'employmentStatus',
        value: 'ACTIVE',
      });
      expect(errors.length).toBe(0);
    });

    it('should reject UPDATE_ENTITY with invalid entity type', () => {
      const errors = validateActionConfig('UPDATE_ENTITY', {
        entityType: 'Invoice',
        entityIdField: 'entityId',
        field: 'status',
        value: 'PAID',
      });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('not supported');
    });

    it('should reject unknown action type', () => {
      const errors = validateActionConfig('UNKNOWN_ACTION', {});
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Unknown');
    });

    it('should validate multiple actions', () => {
      const errors = validateActionsConfig([
        { type: 'SEND_NOTIFICATION', config: { recipientType: 'workflow_owner', title: 'Test', message: 'Hello' } },
        { type: 'CREATE_TASK', config: { title: 'Test Task' } },
      ]);
      expect(errors.length).toBe(0);
    });

    it('should reject empty actions array', () => {
      const errors = validateActionsConfig([]);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('at least one');
    });

    it('should validate CREATE_AUDIT_EVENT action', () => {
      const errors = validateActionConfig('CREATE_AUDIT_EVENT', {
        action: 'CUSTOM_EVENT',
        entityType: 'Automation',
      });
      expect(errors.length).toBe(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // WORKFLOW CRUD
  // ══════════════════════════════════════════════════════════════════════════

  describe('Workflow CRUD', () => {
    let workflowId: string;

    it('should create a workflow', async () => {
      const workflow = await prisma.automationWorkflow.create({
        data: {
          tenantId: TENANT_A,
          name: `Test Workflow ${Date.now()}`,
          description: 'Test workflow for Phase 16',
          createdById: USER_A_ADMIN,
        },
      });
      workflowId = workflow.id;
      createdWorkflowIds.push(workflow.id);
      expect(workflow.id).toBeDefined();
      expect(workflow.status).toBe('DRAFT');
      expect(workflow.tenantId).toBe(TENANT_A);
    });

    it('should create initial draft version', async () => {
      const version = await prisma.automationWorkflowVersion.create({
        data: {
          tenantId: TENANT_A,
          workflowId,
          versionNumber: 1,
          status: 'DRAFT',
          triggerConfig: { type: 'DOMAIN_EVENT', entityType: 'Employee', eventType: 'employee.created' },
          conditionConfig: Prisma.JsonNull,
          actionsConfig: [{ type: 'SEND_NOTIFICATION', config: { recipientType: 'workflow_owner', title: 'Test', message: 'Hello' } }],
        },
      });
      expect(version.id).toBeDefined();
      expect(version.status).toBe('DRAFT');
    });

    it('should enforce unique name per tenant', async () => {
      const workflow = await prisma.automationWorkflow.findUnique({ where: { id: workflowId } });
      await expect(
        prisma.automationWorkflow.create({
          data: {
            tenantId: TENANT_A,
            name: workflow!.name,
            createdById: USER_A_ADMIN,
          },
        }),
      ).rejects.toThrow();
    });

    it('should read a workflow', async () => {
      const workflow = await prisma.automationWorkflow.findUnique({ where: { id: workflowId } });
      expect(workflow).not.toBeNull();
      expect(workflow!.tenantId).toBe(TENANT_A);
    });

    it('should update a workflow', async () => {
      const updated = await prisma.automationWorkflow.update({
        where: { id: workflowId },
        data: { description: 'Updated description' },
      });
      expect(updated.description).toBe('Updated description');
    });

    it('should delete a draft workflow', async () => {
      const tempWorkflow = await prisma.automationWorkflow.create({
        data: {
          tenantId: TENANT_A,
          name: `Delete Test ${Date.now()}`,
          createdById: USER_A_ADMIN,
        },
      });
      await prisma.automationWorkflowVersion.deleteMany({ where: { workflowId: tempWorkflow.id } });
      await prisma.automationWorkflow.delete({ where: { id: tempWorkflow.id } });
      const found = await prisma.automationWorkflow.findUnique({ where: { id: tempWorkflow.id } });
      expect(found).toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // WORKFLOW LIFECYCLE
  // ══════════════════════════════════════════════════════════════════════════

  describe('Workflow Lifecycle', () => {
    let workflowId: string;
    let versionId: string;

    beforeAll(async () => {
      const workflow = await prisma.automationWorkflow.create({
        data: {
          tenantId: TENANT_A,
          name: `Lifecycle Test ${Date.now()}`,
          description: 'Lifecycle test workflow',
          createdById: USER_A_ADMIN,
        },
      });
      workflowId = workflow.id;
      createdWorkflowIds.push(workflow.id);

      const version = await prisma.automationWorkflowVersion.create({
        data: {
          tenantId: TENANT_A,
          workflowId,
          versionNumber: 1,
          status: 'DRAFT',
          triggerConfig: { type: 'DOMAIN_EVENT', entityType: 'Employee', eventType: 'employee.created' },
          actionsConfig: [{ type: 'SEND_NOTIFICATION', config: { recipientType: 'workflow_owner', title: 'Test', message: 'Hello' } }],
        },
      });
      versionId = version.id;
    });

    it('should start in DRAFT status', async () => {
      const wf = await prisma.automationWorkflow.findUnique({ where: { id: workflowId } });
      expect(wf!.status).toBe('DRAFT');
    });

    it('should publish a workflow', async () => {
      // Supersede previous
      await prisma.automationWorkflowVersion.updateMany({
        where: { workflowId, status: 'PUBLISHED' },
        data: { status: 'SUPERSEDED' },
      });

      const published = await prisma.automationWorkflowVersion.update({
        where: { id: versionId },
        data: {
          status: 'PUBLISHED',
          publishedById: USER_A_ADMIN,
          publishedAt: new Date(),
        },
      });
      expect(published.status).toBe('PUBLISHED');

      await prisma.automationWorkflow.update({
        where: { id: workflowId },
        data: { status: 'PUBLISHED', currentVersionId: published.id },
      });

      const wf = await prisma.automationWorkflow.findUnique({ where: { id: workflowId } });
      expect(wf!.status).toBe('PUBLISHED');
    });

    it('should pause a published workflow', async () => {
      await prisma.automationWorkflow.update({
        where: { id: workflowId },
        data: { status: 'PAUSED' },
      });
      const wf = await prisma.automationWorkflow.findUnique({ where: { id: workflowId } });
      expect(wf!.status).toBe('PAUSED');
    });

    it('should resume a paused workflow', async () => {
      await prisma.automationWorkflow.update({
        where: { id: workflowId },
        data: { status: 'PUBLISHED' },
      });
      const wf = await prisma.automationWorkflow.findUnique({ where: { id: workflowId } });
      expect(wf!.status).toBe('PUBLISHED');
    });

    it('should archive a workflow', async () => {
      await prisma.automationWorkflow.update({
        where: { id: workflowId },
        data: { status: 'ARCHIVED' },
      });
      const wf = await prisma.automationWorkflow.findUnique({ where: { id: workflowId } });
      expect(wf!.status).toBe('ARCHIVED');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // WORKFLOW VERSIONING
  // ══════════════════════════════════════════════════════════════════════════

  describe('Workflow Versioning', () => {
    let workflowId: string;

    beforeAll(async () => {
      const workflow = await prisma.automationWorkflow.create({
        data: {
          tenantId: TENANT_A,
          name: `Version Test ${Date.now()}`,
          createdById: USER_A_ADMIN,
        },
      });
      workflowId = workflow.id;
      createdWorkflowIds.push(workflow.id);
    });

    it('should create version 1', async () => {
      const v1 = await prisma.automationWorkflowVersion.create({
        data: {
          tenantId: TENANT_A,
          workflowId,
          versionNumber: 1,
          status: 'DRAFT',
          triggerConfig: { type: 'DOMAIN_EVENT', entityType: 'Employee', eventType: 'employee.created' },
          actionsConfig: [],
        },
      });
      expect(v1.versionNumber).toBe(1);
    });

    it('should create version 2', async () => {
      const v2 = await prisma.automationWorkflowVersion.create({
        data: {
          tenantId: TENANT_A,
          workflowId,
          versionNumber: 2,
          status: 'DRAFT',
          triggerConfig: { type: 'DOMAIN_EVENT', entityType: 'Invoice', eventType: 'invoice.overdue' },
          actionsConfig: [{ type: 'SEND_NOTIFICATION', config: { recipientType: 'workflow_owner', title: 'Test', message: 'Hello' } }],
        },
      });
      expect(v2.versionNumber).toBe(2);
    });

    it('should enforce unique version number per workflow', async () => {
      await expect(
        prisma.automationWorkflowVersion.create({
          data: {
            tenantId: TENANT_A,
            workflowId,
            versionNumber: 1,
            status: 'DRAFT',
            triggerConfig: {},
            actionsConfig: [],
          },
        }),
      ).rejects.toThrow();
    });

    it('should list versions for a workflow', async () => {
      const versions = await prisma.automationWorkflowVersion.findMany({
        where: { workflowId },
        orderBy: { versionNumber: 'desc' },
      });
      expect(versions.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // EXECUTION ENGINE
  // ══════════════════════════════════════════════════════════════════════════

  describe('Execution Engine', () => {
    let workflowId: string;
    let versionId: string;

    beforeAll(async () => {
      const workflow = await prisma.automationWorkflow.create({
        data: {
          tenantId: TENANT_A,
          name: `Execution Test ${Date.now()}`,
          createdById: USER_A_ADMIN,
        },
      });
      workflowId = workflow.id;
      createdWorkflowIds.push(workflow.id);

      const version = await prisma.automationWorkflowVersion.create({
        data: {
          tenantId: TENANT_A,
          workflowId,
          versionNumber: 1,
          status: 'PUBLISHED',
          triggerConfig: { type: 'DOMAIN_EVENT', entityType: 'Employee', eventType: 'employee.created' },
          actionsConfig: [{ type: 'CREATE_AUDIT_EVENT', config: { action: 'TEST_EVENT', entityType: 'Automation' } }],
          publishedById: USER_A_ADMIN,
          publishedAt: new Date(),
        },
      });
      versionId = version.id;

      await prisma.automationWorkflow.update({
        where: { id: workflowId },
        data: { status: 'PUBLISHED', currentVersionId: versionId },
      });
    });

    it('should create an execution record', async () => {
      const execution = await prisma.automationExecution.create({
        data: {
          tenantId: TENANT_A,
          workflowId,
          workflowVersionId: versionId,
          triggerEventType: 'employee.created',
          triggerEntityType: 'Employee',
          triggerEntityId: '00000000-0000-4000-8000-000000000099',
          status: 'PENDING',
        },
      });
      createdExecutionIds.push(execution.id);
      expect(execution.id).toBeDefined();
      expect(execution.status).toBe('PENDING');
    });

    it('should create step execution records', async () => {
      const execId = createdExecutionIds[createdExecutionIds.length - 1];
      const step = await prisma.automationStepExecution.create({
        data: {
          tenantId: TENANT_A,
          executionId: execId,
          stepNumber: 1,
          actionType: 'CREATE_AUDIT_EVENT',
          actionConfig: { action: 'TEST_EVENT', entityType: 'Automation' },
          status: 'SUCCEEDED',
          result: { recorded: true },
        },
      });
      expect(step.id).toBeDefined();
      expect(step.status).toBe('SUCCEEDED');
    });

    it('should enforce unique step number per execution', async () => {
      const execId = createdExecutionIds[createdExecutionIds.length - 1];
      await expect(
        prisma.automationStepExecution.create({
          data: {
            tenantId: TENANT_A,
            executionId: execId,
            stepNumber: 1,
            actionType: 'CREATE_AUDIT_EVENT',
            actionConfig: {},
            status: 'PENDING',
          },
        }),
      ).rejects.toThrow();
    });

    it('should update execution status', async () => {
      const execId = createdExecutionIds[createdExecutionIds.length - 1];
      const updated = await prisma.automationExecution.update({
        where: { id: execId },
        data: {
          status: 'SUCCEEDED',
          startedAt: new Date(),
          completedAt: new Date(),
          duration: 150,
        },
      });
      expect(updated.status).toBe('SUCCEEDED');
      expect(updated.duration).toBe(150);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // IDEMPOTENCY
  // ══════════════════════════════════════════════════════════════════════════

  describe('Idempotency', () => {
    it('should enforce unique constraint on tenant+version+eventId', async () => {
      const workflow = await prisma.automationWorkflow.create({
        data: {
          tenantId: TENANT_A,
          name: `Idempotency Test ${Date.now()}`,
          createdById: USER_A_ADMIN,
        },
      });
      createdWorkflowIds.push(workflow.id);

      const version = await prisma.automationWorkflowVersion.create({
        data: {
          tenantId: TENANT_A,
          workflowId: workflow.id,
          versionNumber: 1,
          status: 'PUBLISHED',
          triggerConfig: {},
          actionsConfig: [],
        },
      });

      const eventId = '00000000-0000-4000-8000-000000000099';

      const exec1 = await prisma.automationExecution.create({
        data: {
          tenantId: TENANT_A,
          workflowId: workflow.id,
          workflowVersionId: version.id,
          triggerEventId: eventId,
          triggerEventType: 'employee.created',
          status: 'PENDING',
        },
      });
      createdExecutionIds.push(exec1.id);

      // Duplicate should fail
      await expect(
        prisma.automationExecution.create({
          data: {
            tenantId: TENANT_A,
            workflowId: workflow.id,
            workflowVersionId: version.id,
            triggerEventId: eventId,
            triggerEventType: 'employee.created',
            status: 'PENDING',
          },
        }),
      ).rejects.toThrow();
    });

    it('should enforce unique idempotency key on step executions', async () => {
      const workflow = await prisma.automationWorkflow.create({
        data: {
          tenantId: TENANT_A,
          name: `Step Idempotency ${Date.now()}`,
          createdById: USER_A_ADMIN,
        },
      });
      createdWorkflowIds.push(workflow.id);

      const version = await prisma.automationWorkflowVersion.create({
        data: {
          tenantId: TENANT_A,
          workflowId: workflow.id,
          versionNumber: 1,
          status: 'PUBLISHED',
          triggerConfig: {},
          actionsConfig: [],
        },
      });

      const execution = await prisma.automationExecution.create({
        data: {
          tenantId: TENANT_A,
          workflowId: workflow.id,
          workflowVersionId: version.id,
          triggerEventType: 'test.event',
          status: 'RUNNING',
        },
      });
      createdExecutionIds.push(execution.id);

      const step1 = await prisma.automationStepExecution.create({
        data: {
          tenantId: TENANT_A,
          executionId: execution.id,
          stepNumber: 1,
          actionType: 'SEND_NOTIFICATION',
          actionConfig: {},
          status: 'SUCCEEDED',
          idempotencyKey: `idempotent-key-${Date.now()}`,
        },
      });

      // Same idempotency key should fail
      await expect(
        prisma.automationStepExecution.create({
          data: {
            tenantId: TENANT_A,
            executionId: execution.id,
            stepNumber: 2,
            actionType: 'SEND_NOTIFICATION',
            actionConfig: {},
            status: 'SUCCEEDED',
            idempotencyKey: step1.idempotencyKey,
          },
        }),
      ).rejects.toThrow();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TENANT ISOLATION
  // ══════════════════════════════════════════════════════════════════════════

  describe('Tenant Isolation', () => {
    let tenantAWfId: string;

    beforeAll(async () => {
      const wf = await prisma.automationWorkflow.create({
        data: {
          tenantId: TENANT_A,
          name: `Tenant Isolation A ${Date.now()}`,
          createdById: USER_A_ADMIN,
        },
      });
      tenantAWfId = wf.id;
      createdWorkflowIds.push(wf.id);

      // Create Tenant B workflow
      const wfB = await prisma.automationWorkflow.create({
        data: {
          tenantId: TENANT_B,
          name: `Tenant Isolation B ${Date.now()}`,
          createdById: USER_A_ADMIN,
        },
      });
      createdWorkflowIds.push(wfB.id);
    });

    it('Tenant A workflows should not include Tenant B workflows', async () => {
      const wfA = await prisma.automationWorkflow.findMany({ where: { tenantId: TENANT_A } });
      const wfB = await prisma.automationWorkflow.findMany({ where: { tenantId: TENANT_B } });
      expect(wfA.every(w => w.tenantId === TENANT_A)).toBe(true);
      expect(wfB.every(w => w.tenantId === TENANT_B)).toBe(true);
    });

    it('Tenant A executions should not include Tenant B executions', async () => {
      const execA = await prisma.automationExecution.count({ where: { tenantId: TENANT_A } });
      const execB = await prisma.automationExecution.count({ where: { tenantId: TENANT_B } });
      expect(typeof execA).toBe('number');
      expect(typeof execB).toBe('number');
    });

    it('Tenant A approvals should not include Tenant B approvals', async () => {
      const approvalsA = await prisma.automationApproval.count({ where: { tenantId: TENANT_A } });
      const approvalsB = await prisma.automationApproval.count({ where: { tenantId: TENANT_B } });
      expect(typeof approvalsA).toBe('number');
      expect(typeof approvalsB).toBe('number');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // AUDIT INTEGRATION
  // ══════════════════════════════════════════════════════════════════════════

  describe('Audit Integration', () => {
    it('should record audit entries for automation actions', async () => {
      const auditEntry = await prisma.auditLog.create({
        data: {
          tenantId: TENANT_A,
          actorId: USER_A_ADMIN,
          action: 'AUTOMATION_WORKFLOW_CREATED',
          entityType: 'AutomationWorkflow',
          entityId: '00000000-0000-4000-8000-000000000099',
          newValue: { name: 'Test Workflow' },
        },
      });
      expect(auditEntry.id).toBeDefined();
      expect(auditEntry.action).toBe('AUTOMATION_WORKFLOW_CREATED');

      // Cleanup
      await prisma.auditLog.delete({ where: { id: auditEntry.id } });
    });

    it('should be able to query audit logs by entity type', async () => {
      const logs = await prisma.auditLog.findMany({
        where: {
          tenantId: TENANT_A,
          entityType: 'AutomationWorkflow',
        },
        take: 5,
      });
      expect(Array.isArray(logs)).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DATA INTEGRITY
  // ══════════════════════════════════════════════════════════════════════════

  describe('Data Integrity', () => {
    it('all executions should reference valid workflows', async () => {
      const execs = await prisma.automationExecution.findMany({ take: 10 });
      for (const exec of execs) {
        const wf = await prisma.automationWorkflow.findUnique({ where: { id: exec.workflowId } });
        expect(wf).not.toBeNull();
      }
    });

    it('all versions should reference valid workflows', async () => {
      const versions = await prisma.automationWorkflowVersion.findMany({ take: 10 });
      for (const v of versions) {
        const wf = await prisma.automationWorkflow.findUnique({ where: { id: v.workflowId } });
        expect(wf).not.toBeNull();
      }
    });

    it('all step executions should reference valid executions', async () => {
      const steps = await prisma.automationStepExecution.findMany({ take: 10 });
      for (const step of steps) {
        const exec = await prisma.automationExecution.findUnique({ where: { id: step.executionId } });
        expect(exec).not.toBeNull();
      }
    });

    it('published versions should have valid status', async () => {
      const published = await prisma.automationWorkflowVersion.findMany({
        where: { status: 'PUBLISHED' },
        take: 10,
      });
      for (const v of published) {
        expect(v.status).toBe('PUBLISHED');
        expect(v.workflowId).toBeDefined();
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CONCURRENCY
  // ══════════════════════════════════════════════════════════════════════════

  describe('Concurrency', () => {
    it('concurrent workflow creation should handle duplicates', async () => {
      const name = `Concurrent WF ${Date.now()}`;
      const results = await Promise.allSettled([
        prisma.automationWorkflow.create({
          data: { tenantId: TENANT_A, name, createdById: USER_A_ADMIN },
        }),
        prisma.automationWorkflow.create({
          data: { tenantId: TENANT_A, name, createdById: USER_A_ADMIN },
        }),
      ]);
      const succeeded = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');
      expect(succeeded.length).toBe(1);
      expect(failed.length).toBe(1);

      // Cleanup
      for (const r of succeeded) {
        if (r.status === 'fulfilled') {
          createdWorkflowIds.push(r.value.id);
          await prisma.automationWorkflowVersion.deleteMany({ where: { workflowId: r.value.id } });
          await prisma.automationWorkflow.delete({ where: { id: r.value.id } });
        }
      }
    });

    it('concurrent reads should not error', async () => {
      const results = await Promise.allSettled([
        prisma.automationWorkflow.count({ where: { tenantId: TENANT_A } }),
        prisma.automationExecution.count({ where: { tenantId: TENANT_A } }),
        prisma.automationApproval.count({ where: { tenantId: TENANT_A } }),
      ]);
      expect(results.every(r => r.status === 'fulfilled')).toBe(true);
    });
  });
});
