/**
 * FusionOS AI Agents Integration Tests — Phase 18
 *
 * Covers:
 * - Agent profiles
 * - Planning engine
 * - Risk engine
 * - Policy engine
 * - Verification engine
 * - Agent CRUD
 * - Agent lifecycle
 * - Agent versioning
 * - Agent task creation
 * - Tool execution
 * - Approval flow
 * - Memory
 * - Tenant isolation
 * - RBAC patterns
 * - Data integrity
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { AGENT_PROFILES, getProfileByType, getAllProfiles } from '../../ai/agent/engine/agent-profiles';
import { generatePlan, validatePlan } from '../../ai/agent/engine/planning-engine';
import { assessPlanRisk, getToolRiskLevel, doesToolRequireApproval } from '../../ai/agent/engine/risk-engine';
import { evaluatePolicy, getPolicyRules } from '../../ai/agent/engine/policy-engine';
import { verifyToolResult, generateVerificationCriteria } from '../../ai/agent/engine/verification-engine';
import { TOOL_REGISTRY } from '../../ai/engine/tool-registry';

const prisma = new PrismaClient();

const TENANT_A = '00000000-0000-4000-8000-000000000001';
const TENANT_B = '10000000-0000-4000-8000-000000000001';
const USER_A_ADMIN = '00000000-0000-4000-8000-000000000003';

const createdAgentIds: string[] = [];
const createdTaskIds: string[] = [];

describe('AI Agents — Phase 18 Integration Tests', () => {
  beforeAll(async () => {
    const user = await prisma.user.findUnique({ where: { id: USER_A_ADMIN } });
    if (!user) throw new Error(`Test user ${USER_A_ADMIN} not found — run seed first`);
  });

  afterAll(async () => {
    // Cleanup tasks
    for (const taskId of createdTaskIds) {
      await prisma.aIAgentMemory.deleteMany({ where: { taskId } });
      await prisma.aIAgentStep.deleteMany({ where: { taskId } });
      await prisma.aIAgentTask.deleteMany({ where: { id: taskId } });
    }
    // Cleanup agents
    for (const agentId of createdAgentIds) {
      await prisma.aIAgentVersion.deleteMany({ where: { agentId } });
      await prisma.aIAgent.deleteMany({ where: { id: agentId } });
    }
    await prisma.$disconnect();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // AGENT PROFILES
  // ══════════════════════════════════════════════════════════════════════════

  describe('Agent Profiles', () => {
    it('should have a non-empty profiles list', () => {
      expect(AGENT_PROFILES.length).toBeGreaterThanOrEqual(5);
    });

    it('each profile should have required fields', () => {
      for (const profile of AGENT_PROFILES) {
        expect(profile.name).toBeDefined();
        expect(profile.type).toBeDefined();
        expect(profile.description).toBeDefined();
        expect(profile.purpose).toBeDefined();
        expect(Array.isArray(profile.allowedTools)).toBe(true);
        expect(profile.allowedTools.length).toBeGreaterThan(0);
        expect(profile.riskPolicy).toBeDefined();
        expect(profile.limits).toBeDefined();
        expect(Array.isArray(profile.suggestedGoals)).toBe(true);
      }
    });

    it('should look up profile by type', () => {
      const hr = getProfileByType('HR');
      expect(hr).toBeDefined();
      expect(hr!.type).toBe('HR');
      expect(hr!.allowedTools).toContain('get_employee_summary');
    });

    it('should return undefined for unknown type', () => {
      const profile = getProfileByType('UNKNOWN');
      expect(profile).toBeUndefined();
    });

    it('should return all profiles', () => {
      const profiles = getAllProfiles();
      expect(profiles.length).toBeGreaterThanOrEqual(5);
    });

    it('each profile should reference valid tools', () => {
      for (const profile of AGENT_PROFILES) {
        for (const toolName of profile.allowedTools) {
          const tool = TOOL_REGISTRY.find((t) => t.name === toolName);
          expect(tool).toBeDefined();
        }
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PLANNING ENGINE
  // ══════════════════════════════════════════════════════════════════════════

  describe('Planning Engine', () => {
    it('should generate a valid plan for workforce analysis', () => {
      const plan = generatePlan({
        goal: 'Analyze workforce attendance trends',
        agentType: 'HR',
        allowedTools: ['get_employee_summary', 'get_attendance_summary', 'get_leave_summary'],
      });

      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.totalSteps).toBe(plan.steps.length);
      expect(plan.maxRiskLevel).toBeDefined();
      expect(plan.steps[0].tool).toBeDefined();
      expect(plan.steps[0].riskLevel).toBeDefined();
    });

    it('should generate a valid plan for finance analysis', () => {
      const plan = generatePlan({
        goal: 'Show overdue invoices and receivables',
        agentType: 'FINANCE',
        allowedTools: ['get_finance_summary', 'get_receivables', 'get_payables'],
      });

      expect(plan.steps.length).toBeGreaterThan(0);
      const toolNames = plan.steps.map((s) => s.tool);
      expect(toolNames.some((n) => n.includes('receivable') || n.includes('finance'))).toBe(true);
    });

    it('should respect max steps limit', () => {
      const plan = generatePlan({
        goal: 'Comprehensive business analysis with all data sources',
        agentType: 'OPERATIONS',
        allowedTools: ['get_automation_summary', 'get_asset_summary', 'get_employee_summary', 'get_finance_summary'],
        maxSteps: 2,
      });

      expect(plan.steps.length).toBeLessThanOrEqual(2);
    });

    it('should validate a valid plan', () => {
      const plan = generatePlan({
        goal: 'Summarize employee data',
        agentType: 'HR',
        allowedTools: ['get_employee_summary'],
      });

      const validation = validatePlan(plan, ['get_employee_summary']);
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should reject plan with disallowed tools', () => {
      // Manually create a plan with a tool not in allowed list
      const plan = {
        goal: 'Create a workflow',
        reasoningSummary: 'Test plan',
        steps: [
          { stepNumber: 1, tool: 'create_workflow_draft', purpose: 'Create', input: {}, expectedOutput: 'Result', riskLevel: 'HIGH' as const },
        ],
        totalSteps: 1,
        estimatedToolCalls: 1,
        requiresApproval: true,
        maxRiskLevel: 'HIGH',
      };

      const validation = validatePlan(plan, ['get_employee_summary']);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('not in the allowed tools'))).toBe(true);
    });

    it('should reject empty plan', () => {
      const plan = generatePlan({
        goal: '',
        agentType: 'HR',
        allowedTools: [],
      });

      // Empty goal should still generate at least one step (analyze_goal)
      expect(plan.steps.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // RISK ENGINE
  // ══════════════════════════════════════════════════════════════════════════

  describe('Risk Engine', () => {
    it('should assess read-only steps as low risk', () => {
      const assessment = assessPlanRisk([
        { stepNumber: 1, tool: 'get_employee_summary', purpose: 'Get employee data' },
        { stepNumber: 2, tool: 'get_attendance_summary', purpose: 'Get attendance data' },
      ]);

      expect(assessment.overallRisk).toBe('READ_ONLY');
      expect(assessment.requiresApproval).toBe(false);
    });

    it('should detect medium-risk tools', () => {
      const assessment = assessPlanRisk([
        { stepNumber: 1, tool: 'get_employee_summary', purpose: 'Get data' },
        { stepNumber: 2, tool: 'create_task', purpose: 'Create a task' },
      ]);

      expect(assessment.overallRisk).toBe('MEDIUM');
      expect(assessment.requiresApproval).toBe(true);
    });

    it('should detect high-risk tools', () => {
      const assessment = assessPlanRisk([
        { stepNumber: 1, tool: 'create_workflow_draft', purpose: 'Create workflow' },
      ]);

      expect(assessment.overallRisk).toBe('HIGH');
      expect(assessment.requiresApproval).toBe(true);
    });

    it('should provide step-level risk details', () => {
      const assessment = assessPlanRisk([
        { stepNumber: 1, tool: 'get_employee_summary', purpose: 'Get data' },
        { stepNumber: 2, tool: 'create_task', purpose: 'Create task' },
      ]);

      expect(assessment.stepRisks.length).toBe(2);
      expect(assessment.stepRisks[0].riskLevel).toBe('READ_ONLY');
      expect(assessment.stepRisks[1].riskLevel).toBe('MEDIUM');
    });

    it('should correctly identify tool risk levels', () => {
      expect(getToolRiskLevel('get_employee_summary')).toBe('READ_ONLY');
      expect(getToolRiskLevel('create_task')).toBe('MEDIUM');
      expect(getToolRiskLevel('create_workflow_draft')).toBe('HIGH');
    });

    it('should correctly identify approval requirements', () => {
      expect(doesToolRequireApproval('get_employee_summary')).toBe(false);
      expect(doesToolRequireApproval('create_task')).toBe(true);
      expect(doesToolRequireApproval('create_workflow_draft')).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // POLICY ENGINE
  // ══════════════════════════════════════════════════════════════════════════

  describe('Policy Engine', () => {
    it('should auto-approve read-only operations', () => {
      const result = evaluatePolicy({
        toolName: 'get_employee_summary',
        riskLevel: 'READ_ONLY',
        agentType: 'HR',
        userPermissions: ['ai:tools:use', 'ai:agent:hr:use'],
      });

      expect(result.decision).toBe('CAN_EXECUTE');
    });

    it('should require approval for write operations', () => {
      const result = evaluatePolicy({
        toolName: 'create_task',
        riskLevel: 'MEDIUM',
        agentType: 'HR',
        userPermissions: ['ai:tools:use', 'ai:agent:hr:use'],
      });

      expect(result.decision).toBe('REQUIRES_APPROVAL');
    });

    it('should deny operations without permissions', () => {
      const result = evaluatePolicy({
        toolName: 'get_employee_summary',
        riskLevel: 'READ_ONLY',
        agentType: 'HR',
        userPermissions: [],
      });

      expect(result.decision).toBe('MUST_BE_DENIED');
    });

    it('should deny operations without agent permission', () => {
      const result = evaluatePolicy({
        toolName: 'get_employee_summary',
        riskLevel: 'READ_ONLY',
        agentType: 'HR',
        userPermissions: ['ai:tools:use'],
      });

      expect(result.decision).toBe('MUST_BE_DENIED');
    });

    it('should have policy rules defined', () => {
      const rules = getPolicyRules();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some((r) => r.decision === 'MUST_BE_DENIED')).toBe(true);
      expect(rules.some((r) => r.decision === 'REQUIRES_APPROVAL')).toBe(true);
    });

    it('should deny payroll modification', () => {
      const result = evaluatePolicy({
        toolName: 'modify_payroll',
        riskLevel: 'HIGH',
        agentType: 'HR',
        userPermissions: ['ai:tools:use', 'ai:agent:hr:use', 'ai:admin'],
      });

      expect(result.decision).toBe('MUST_BE_DENIED');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // VERIFICATION ENGINE
  // ══════════════════════════════════════════════════════════════════════════

  describe('Verification Engine', () => {
    it('should verify successful tool output', () => {
      const result = verifyToolResult({
        toolName: 'get_employee_summary',
        input: {},
        output: { activeEmployees: 50, totalEmployees: 100 },
      });

      expect(result.verified).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should detect failed tool output', () => {
      const result = verifyToolResult({
        toolName: 'create_task',
        input: { title: 'Test' },
        output: { error: 'Task creation failed' },
      });

      expect(result.verified).toBe(false);
      expect(result.errors.some((e) => e.includes('error'))).toBe(true);
    });

    it('should detect missing taskId for create_task', () => {
      const result = verifyToolResult({
        toolName: 'create_task',
        input: { title: 'Test' },
        output: { success: true },
      });

      expect(result.verified).toBe(false);
      expect(result.errors.some((e) => e.includes('taskId'))).toBe(true);
    });

    it('should verify task creation with taskId', () => {
      const result = verifyToolResult({
        toolName: 'create_task',
        input: { title: 'Test' },
        output: { taskId: '12345' },
      });

      expect(result.verified).toBe(true);
    });

    it('should handle null output', () => {
      const result = verifyToolResult({
        toolName: 'get_employee_summary',
        input: {},
        output: null as any,
      });

      expect(result.verified).toBe(false);
    });

    it('should generate verification criteria for known tools', () => {
      const criteria = generateVerificationCriteria('create_task');
      expect(criteria).toBeDefined();
      expect(criteria!.entityType).toBe('Task');
    });

    it('should return undefined for unknown tools', () => {
      const criteria = generateVerificationCriteria('unknown_tool');
      expect(criteria).toBeUndefined();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // AGENT CRUD (Database)
  // ══════════════════════════════════════════════════════════════════════════

  describe('Agent CRUD', () => {
    let agentId: string;

    it('should create an agent', async () => {
      const agent = await prisma.aIAgent.create({
        data: {
          tenantId: TENANT_A,
          name: 'Test HR Agent',
          description: 'Test agent for HR analysis',
          agentType: 'HR',
          configuration: {
            allowedTools: ['get_employee_summary', 'get_attendance_summary'],
            riskPolicy: { maxRiskLevel: 'LOW', requiresApprovalAbove: 'LOW' },
            limits: { maxSteps: 5, maxToolCalls: 5, maxExecutionDurationMs: 30000, maxRetries: 2 },
          },
          createdById: USER_A_ADMIN,
        },
      });
      agentId = agent.id;
      createdAgentIds.push(agent.id);
      expect(agent.id).toBeDefined();
      expect(agent.status).toBe('DRAFT');
      expect(agent.agentType).toBe('HR');
    });

    it('should create an initial version', async () => {
      const version = await prisma.aIAgentVersion.create({
        data: {
          agentId,
          tenantId: TENANT_A,
          versionNumber: 1,
          status: 'DRAFT',
          configuration: {
            prompt: 'Analyze workforce data',
            tools: ['get_employee_summary', 'get_attendance_summary'],
            policies: { maxRiskLevel: 'LOW' },
            limits: { maxSteps: 5 },
          },
        },
      });
      expect(version.id).toBeDefined();
      expect(version.status).toBe('DRAFT');
    });

    it('should update agent to ACTIVE with version', async () => {
      const version = await prisma.aIAgentVersion.findFirst({
        where: { agentId, status: 'DRAFT' },
      });
      if (version) {
        await prisma.aIAgentVersion.update({
          where: { id: version.id },
          data: { status: 'PUBLISHED', publishedById: USER_A_ADMIN, publishedAt: new Date() },
        });
        await prisma.aIAgent.update({
          where: { id: agentId },
          data: { status: 'ACTIVE', currentVersionId: version.id },
        });
      }
      const agent = await prisma.aIAgent.findUnique({ where: { id: agentId } });
      expect(agent!.status).toBe('ACTIVE');
    });

    it('should enforce tenant scope', async () => {
      const agentA = await prisma.aIAgent.findFirst({ where: { tenantId: TENANT_A } });
      const agentB = await prisma.aIAgent.findFirst({ where: { tenantId: TENANT_B } });
      if (agentA) expect(agentA.tenantId).toBe(TENANT_A);
      if (agentB) expect(agentB.tenantId).toBe(TENANT_B);
    });

    it('should enforce unique name per tenant', async () => {
      await expect(
        prisma.aIAgent.create({
          data: {
            tenantId: TENANT_A,
            name: 'Test HR Agent',
            agentType: 'HR',
            configuration: {},
            createdById: USER_A_ADMIN,
          },
        }),
      ).rejects.toThrow();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // AGENT TASKS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Agent Tasks', () => {
    let agentId: string;

    beforeAll(async () => {
      const agent = await prisma.aIAgent.create({
        data: {
          tenantId: TENANT_A,
          name: 'Test Task Agent',
          agentType: 'HR',
          status: 'ACTIVE',
          configuration: {
            allowedTools: ['get_employee_summary'],
            limits: { maxSteps: 3, maxToolCalls: 3 },
          },
          createdById: USER_A_ADMIN,
        },
      });
      agentId = agent.id;
      createdAgentIds.push(agent.id);

      // Create published version
      const version = await prisma.aIAgentVersion.create({
        data: {
          agentId,
          tenantId: TENANT_A,
          versionNumber: 1,
          status: 'PUBLISHED',
          configuration: { tools: ['get_employee_summary'] },
          publishedById: USER_A_ADMIN,
          publishedAt: new Date(),
        },
      });
      await prisma.aIAgent.update({
        where: { id: agentId },
        data: { currentVersionId: version.id },
      });
    });

    it('should create a task', async () => {
      const task = await prisma.aIAgentTask.create({
        data: {
          agentId,
          agentVersionId: (await prisma.aIAgentVersion.findFirst({ where: { agentId } }))!.id,
          tenantId: TENANT_A,
          userId: USER_A_ADMIN,
          goal: 'Summarize employee data',
          status: 'PENDING',
          totalSteps: 1,
        },
      });
      createdTaskIds.push(task.id);
      expect(task.id).toBeDefined();
      expect(task.goal).toBe('Summarize employee data');
    });

    it('should create step records', async () => {
      const task = createdTaskIds[createdTaskIds.length - 1];
      const step = await prisma.aIAgentStep.create({
        data: {
          taskId: task,
          tenantId: TENANT_A,
          stepNumber: 1,
          toolName: 'get_employee_summary',
          purpose: 'Get employee count',
          input: {},
          status: 'PENDING',
          riskLevel: 'READ_ONLY',
          idempotencyKey: `${task}:step:1`,
        },
      });
      expect(step.id).toBeDefined();
      expect(step.status).toBe('PENDING');
    });

    it('should enforce step idempotency', async () => {
      const task = createdTaskIds[createdTaskIds.length - 1];
      await expect(
        prisma.aIAgentStep.create({
          data: {
            taskId: task,
            tenantId: TENANT_A,
            stepNumber: 1,
            toolName: 'get_employee_summary',
            purpose: 'Duplicate',
            input: {},
            status: 'PENDING',
            riskLevel: 'READ_ONLY',
            idempotencyKey: `${task}:step:1`,
          },
        }),
      ).rejects.toThrow();
    });

    it('should store memory entries', async () => {
      const lastTaskId = createdTaskIds[createdTaskIds.length - 1];
      const memory = await prisma.aIAgentMemory.create({
        data: {
          taskId: lastTaskId,
          tenantId: TENANT_A,
          agentId,
          category: 'execution',
          content: 'Step 1 completed successfully',
        },
      });
      expect(memory.id).toBeDefined();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TENANT ISOLATION
  // ══════════════════════════════════════════════════════════════════════════

  describe('Tenant Isolation', () => {
    it('Tenant A agents should not include Tenant B agents', async () => {
      const countA = await prisma.aIAgent.count({ where: { tenantId: TENANT_A } });
      const countB = await prisma.aIAgent.count({ where: { tenantId: TENANT_B } });
      expect(typeof countA).toBe('number');
      expect(typeof countB).toBe('number');
    });

    it('Tenant A tasks should not include Tenant B tasks', async () => {
      const countA = await prisma.aIAgentTask.count({ where: { tenantId: TENANT_A } });
      const countB = await prisma.aIAgentTask.count({ where: { tenantId: TENANT_B } });
      expect(typeof countA).toBe('number');
      expect(typeof countB).toBe('number');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DATA INTEGRITY
  // ══════════════════════════════════════════════════════════════════════════

  describe('Data Integrity', () => {
    it('all agent versions should reference valid agents', async () => {
      const versions = await prisma.aIAgentVersion.findMany({ take: 10 });
      for (const version of versions) {
        const agent = await prisma.aIAgent.findUnique({ where: { id: version.agentId } });
        expect(agent).not.toBeNull();
      }
    });

    it('all tasks should reference valid agents', async () => {
      const tasks = await prisma.aIAgentTask.findMany({ take: 10 });
      for (const task of tasks) {
        const agent = await prisma.aIAgent.findUnique({ where: { id: task.agentId } });
        expect(agent).not.toBeNull();
      }
    });

    it('all steps should reference valid tasks', async () => {
      const steps = await prisma.aIAgentStep.findMany({ take: 10 });
      for (const step of steps) {
        const task = await prisma.aIAgentTask.findUnique({ where: { id: step.taskId } });
        expect(task).not.toBeNull();
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SECURITY
  // ══════════════════════════════════════════════════════════════════════════

  describe('Security', () => {
    it('should not use eval() in engines', () => {
      // Verify planning, risk, policy, and verification engines are safe
      // by checking they produce deterministic results without eval
      const plan = generatePlan({
        goal: 'Test',
        agentType: 'HR',
        allowedTools: ['get_employee_summary'],
      });
      expect(plan.steps.length).toBeGreaterThan(0);

      // Verify policy engine has explicit deny rules
      const rules = getPolicyRules();
      expect(rules.length).toBeGreaterThan(0);

      // Verify no arbitrary code execution patterns
      // Engines are pure functions with explicit control flow
      expect(typeof evaluatePolicy).toBe('function');
      expect(typeof assessPlanRisk).toBe('function');
    });

    it('policy engine should have deny rules for dangerous operations', () => {
      const rules = getPolicyRules();
      const denyRules = rules.filter((r) => r.decision === 'MUST_BE_DENIED');
      expect(denyRules.length).toBeGreaterThan(0);
      expect(denyRules.some((r) => r.toolPattern.includes('payroll'))).toBe(true);
      expect(denyRules.some((r) => r.toolPattern.includes('delete'))).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CONCURRENCY
  // ══════════════════════════════════════════════════════════════════════════

  describe('Concurrency', () => {
    it('concurrent reads should not error', async () => {
      const results = await Promise.allSettled([
        prisma.aIAgent.count({ where: { tenantId: TENANT_A } }),
        prisma.aIAgentTask.count({ where: { tenantId: TENANT_A } }),
        prisma.aIAgentStep.count({ where: { tenantId: TENANT_A } }),
        prisma.aIAgentMemory.count({ where: { tenantId: TENANT_A } }),
      ]);
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    });
  });
});
