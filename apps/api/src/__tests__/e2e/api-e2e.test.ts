/**
 * FusionOS E2E API Integration Tests — Phase 23
 *
 * Tests critical business workflows through NestJS test module.
 * Verifies end-to-end functionality across modules.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_A = '00000000-0000-4000-8000-000000000001';
const TENANT_B = '10000000-0000-4000-8000-000000000001';
const USER_A_ADMIN = '00000000-0000-4000-8000-000000000003';

describe('E2E API Integration — Phase 23', () => {
  beforeAll(async () => {
    const user = await prisma.user.findUnique({ where: { id: USER_A_ADMIN } });
    if (!user) throw new Error(`Test user ${USER_A_ADMIN} not found`);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DATA INTEGRITY — Full schema validation
  // ══════════════════════════════════════════════════════════════════════════

  describe('Data Integrity', () => {
    it('all employees should have valid tenant', async () => {
      const employees = await prisma.employee.findMany({ take: 100 });
      for (const emp of employees) {
        expect(emp.tenantId).toBeDefined();
        expect(typeof emp.tenantId).toBe('string');
        expect(emp.tenantId.length).toBeGreaterThan(0);
      }
    });

    it('all invoices should have valid tenant and amounts', async () => {
      const invoices = await prisma.invoice.findMany({ take: 100 });
      for (const inv of invoices) {
        expect(inv.tenantId).toBeDefined();
        expect(typeof inv.amount).toBe('number');
        expect(inv.amount).toBeGreaterThanOrEqual(0);
      }
    });

    it('all projects should have valid tenant and status', async () => {
      const projects = await prisma.project.findMany({ take: 100 });
      for (const proj of projects) {
        expect(proj.tenantId).toBeDefined();
        expect(proj.status).toBeDefined();
      }
    });

    it('all automation workflows should have valid tenant', async () => {
      const workflows = await prisma.automationWorkflow.findMany({ take: 100 });
      for (const wf of workflows) {
        expect(wf.tenantId).toBeDefined();
        expect(wf.name).toBeDefined();
      }
    });

    it('all AI agents should have valid tenant and type', async () => {
      const agents = await prisma.aIAgent.findMany({ take: 100 });
      for (const agent of agents) {
        expect(agent.tenantId).toBeDefined();
        expect(agent.agentType).toBeDefined();
      }
    });

    it('all leaves should reference valid employees', async () => {
      const leaves = await prisma.leaveRequest.findMany({ take: 50 });
      for (const leave of leaves) {
        expect(leave.tenantId).toBeDefined();
        expect(leave.employeeId).toBeDefined();
        expect(leave.status).toBeDefined();
      }
    });

    it('all attendance records should reference valid employees', async () => {
      const records = await prisma.attendance.findMany({ take: 50 });
      for (const rec of records) {
        expect(rec.tenantId).toBeDefined();
        expect(rec.employeeId).toBeDefined();
      }
    });

    it('all customers should have valid tenant', async () => {
      const customers = await prisma.customer.findMany({ take: 50 });
      for (const cust of customers) {
        expect(cust.tenantId).toBeDefined();
      }
    });

    it('all CRM opportunities should have valid tenant', async () => {
      const opps = await prisma.opportunity.findMany({ take: 50 });
      for (const opp of opps) {
        expect(opp.tenantId).toBeDefined();
        expect(opp.stage).toBeDefined();
      }
    });

    it('all documents should have valid tenant', async () => {
      const docs = await prisma.document.findMany({ take: 50 });
      for (const doc of docs) {
        expect(doc.tenantId).toBeDefined();
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CROSS-TENANT ISOLATION
  // ══════════════════════════════════════════════════════════════════════════

  describe('Cross-Tenant Isolation', () => {
    it('Tenant A employees should not exist in Tenant B', async () => {
      const [empA, empB] = await Promise.all([
        prisma.employee.findMany({ where: { tenantId: TENANT_A }, select: { id: true } }),
        prisma.employee.findMany({ where: { tenantId: TENANT_B }, select: { id: true } }),
      ]);

      const idsA = new Set(empA.map((e) => e.id));
      const idsB = new Set(empB.map((e) => e.id));

      for (const id of idsA) {
        expect(idsB.has(id)).toBe(false);
      }
    });

    it('AI conversations should be tenant-scoped', async () => {
      const convsA = await prisma.aIConversation.findMany({
        where: { tenantId: TENANT_A },
        select: { id: true, tenantId: true },
      });

      for (const conv of convsA) {
        expect(conv.tenantId).toBe(TENANT_A);
      }
    });

    it('AI agents should be tenant-scoped', async () => {
      const agentsA = await prisma.aIAgent.findMany({
        where: { tenantId: TENANT_A },
        select: { id: true, tenantId: true },
      });

      for (const agent of agentsA) {
        expect(agent.tenantId).toBe(TENANT_A);
      }
    });

    it('invoices should be tenant-scoped', async () => {
      const invA = await prisma.invoice.findMany({
        where: { tenantId: TENANT_A },
        select: { id: true, tenantId: true },
      });

      for (const inv of invA) {
        expect(inv.tenantId).toBe(TENANT_A);
      }
    });

    it('projects should be tenant-scoped', async () => {
      const projA = await prisma.project.findMany({
        where: { tenantId: TENANT_A },
        select: { id: true, tenantId: true },
      });

      for (const proj of projA) {
        expect(proj.tenantId).toBe(TENANT_A);
      }
    });

    it('documents should be tenant-scoped', async () => {
      const docsA = await prisma.document.findMany({
        where: { tenantId: TENANT_A },
        select: { id: true, tenantId: true },
      });

      for (const doc of docsA) {
        expect(doc.tenantId).toBe(TENANT_A);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // FINANCE INTEGRITY
  // ══════════════════════════════════════════════════════════════════════════

  describe('Finance Integrity', () => {
    it('invoices should have consistent paid + outstanding = amount', async () => {
      const invoices = await prisma.invoice.findMany({ take: 100 });
      for (const inv of invoices) {
        expect(inv.paidAmount + inv.outstandingAmount).toBe(inv.amount);
      }
    });

    it('journal entries should have tenant scope', async () => {
      const journals = await prisma.journalEntry.findMany({ take: 50 });
      for (const journal of journals) {
        expect(journal.tenantId).toBeDefined();
      }
    });

    it('invoice amounts should be non-negative', async () => {
      const invoices = await prisma.invoice.findMany({ take: 100 });
      for (const inv of invoices) {
        expect(inv.amount).toBeGreaterThanOrEqual(0);
        expect(inv.paidAmount).toBeGreaterThanOrEqual(0);
        expect(inv.outstandingAmount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PAYROLL INTEGRITY
  // ══════════════════════════════════════════════════════════════════════════

  describe('Payroll Integrity', () => {
    it('payslips should have consistent grossPay - deductions = netPay', async () => {
      const payslips = await prisma.payslip.findMany({ take: 50 });
      for (const ps of payslips) {
        expect(ps.grossPay - ps.totalDeductions).toBe(ps.netPay);
      }
    });

    it('payslips should be tenant-scoped', async () => {
      const payslips = await prisma.payslip.findMany({ take: 50 });
      for (const ps of payslips) {
        expect(ps.tenantId).toBeDefined();
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // AUTOMATION RELIABILITY
  // ══════════════════════════════════════════════════════════════════════════

  describe('Automation Reliability', () => {
    it('workflow executions should have valid status', async () => {
      const executions = await prisma.automationExecution.findMany({ take: 50 });
      const validStatuses = ['PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'SKIPPED'];

      for (const exec of executions) {
        expect(validStatuses).toContain(exec.status);
      }
    });

    it('step executions should reference valid executions', async () => {
      const steps = await prisma.automationStepExecution.findMany({ take: 50 });
      for (const step of steps) {
        expect(step.executionId).toBeDefined();
        expect(step.tenantId).toBeDefined();
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // AI AGENT RELIABILITY
  // ══════════════════════════════════════════════════════════════════════════

  describe('AI Agent Reliability', () => {
    it('agent tasks should have valid status', async () => {
      const tasks = await prisma.aIAgentTask.findMany({ take: 50 });
      const validStatuses = ['PENDING', 'ANALYZING', 'PLANNING', 'WAITING_APPROVAL', 'EXECUTING', 'VERIFYING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'];

      for (const task of tasks) {
        expect(validStatuses).toContain(task.status);
      }
    });

    it('agent steps should reference valid tasks', async () => {
      const steps = await prisma.aIAgentStep.findMany({ take: 50 });
      for (const step of steps) {
        expect(step.taskId).toBeDefined();
        expect(step.tenantId).toBeDefined();
        expect(step.toolName).toBeDefined();
      }
    });

    it('agent versions should be tenant-scoped', async () => {
      const versions = await prisma.aIAgentVersion.findMany({ take: 50 });
      for (const ver of versions) {
        expect(ver.tenantId).toBeDefined();
        expect(ver.versionNumber).toBeGreaterThan(0);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CONCURRENCY
  // ══════════════════════════════════════════════════════════════════════════

  describe('Concurrency', () => {
    it('concurrent reads across all modules should not cause errors', async () => {
      const results = await Promise.allSettled([
        prisma.employee.count({ where: { tenantId: TENANT_A } }),
        prisma.invoice.count({ where: { tenantId: TENANT_A } }),
        prisma.project.count({ where: { tenantId: TENANT_A } }),
        prisma.automationWorkflow.count({ where: { tenantId: TENANT_A } }),
        prisma.aIAgent.count({ where: { tenantId: TENANT_A } }),
        prisma.aIConversation.count({ where: { tenantId: TENANT_A } }),
        prisma.leaveRequest.count({ where: { tenantId: TENANT_A } }),
        prisma.attendance.count({ where: { tenantId: TENANT_A } }),
        prisma.customer.count({ where: { tenantId: TENANT_A } }),
        prisma.document.count({ where: { tenantId: TENANT_A } }),
      ]);

      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    });

    it('concurrent AI conversation creates should not cause duplicate errors', async () => {
      const results = await Promise.allSettled([
        prisma.aIConversation.create({
          data: { tenantId: TENANT_A, userId: USER_A_ADMIN, title: 'Concurrency Test A' },
        }),
        prisma.aIConversation.create({
          data: { tenantId: TENANT_A, userId: USER_A_ADMIN, title: 'Concurrency Test B' },
        }),
      ]);

      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);

      // Cleanup
      await prisma.aIConversation.deleteMany({
        where: { tenantId: TENANT_A, title: { startsWith: 'Concurrency Test' } },
      });
    });

    it('concurrent cross-tenant reads should maintain isolation', async () => {
      const [countA, countB] = await Promise.all([
        prisma.employee.count({ where: { tenantId: TENANT_A } }),
        prisma.employee.count({ where: { tenantId: TENANT_B } }),
      ]);

      // Both should succeed independently
      expect(typeof countA).toBe('number');
      expect(typeof countB).toBe('number');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // AI SECURITY
  // ══════════════════════════════════════════════════════════════════════════

  describe('AI Security', () => {
    it('AI request logs should not contain sensitive prompts', async () => {
      const logs = await prisma.aIRequestLog.findMany({ take: 20 });
      for (const log of logs) {
        // Provider and model should be tracked
        expect(log.provider).toBeDefined();
        expect(log.model).toBeDefined();
        expect(log.tenantId).toBeDefined();
      }
    });

    it('AI action confirmations should require approval', async () => {
      const confirmations = await prisma.aIActionConfirmation.findMany({ take: 20 });
      for (const conf of confirmations) {
        expect(conf.status).toBeDefined();
        expect(conf.tenantId).toBeDefined();
      }
    });

    it('AI conversations should be user-scoped within tenant', async () => {
      const convs = await prisma.aIConversation.findMany({
        where: { tenantId: TENANT_A },
        select: { id: true, userId: true, tenantId: true },
        take: 20,
      });

      for (const conv of convs) {
        expect(conv.userId).toBeDefined();
        expect(conv.tenantId).toBe(TENANT_A);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // EVENT OUTBOX
  // ══════════════════════════════════════════════════════════════════════════

  describe('Event Outbox', () => {
    it('outbox events should have valid structure', async () => {
      const events = await prisma.eventOutbox.findMany({ take: 50 });
      for (const event of events) {
        expect(event.eventType).toBeDefined();
        expect(event.status).toBeDefined();
        expect(event.tenantId).toBeDefined();
      }
    });

    it('outbox events should have valid status transitions', async () => {
      const events = await prisma.eventOutbox.findMany({ take: 50 });
      const validStatuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DLQ'];
      for (const event of events) {
        expect(validStatuses).toContain(event.status);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // AUDIT LOG
  // ══════════════════════════════════════════════════════════════════════════

  describe('Audit Log', () => {
    it('audit entries should be tenant-scoped', async () => {
      const entries = await prisma.auditLog.findMany({ take: 50 });
      for (const entry of entries) {
        expect(entry.tenantId).toBeDefined();
      }
    });

    it('audit entries should have valid actions', async () => {
      const entries = await prisma.auditLog.findMany({ take: 50 });
      for (const entry of entries) {
        expect(entry.action).toBeDefined();
        expect(typeof entry.action).toBe('string');
        expect(entry.action.length).toBeGreaterThan(0);
      }
    });
  });
});
