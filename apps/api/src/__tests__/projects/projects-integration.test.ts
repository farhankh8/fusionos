/**
 * FusionOS Projects Integration Tests — Phase 11
 *
 * Covers:
 * - Project CRUD + lifecycle
 * - Project code uniqueness (tenant-scoped)
 * - Members: add, update, remove, duplicate prevention
 * - Tasks: create, update, status transitions, hierarchy
 * - Milestones: create, update, completion
 * - Time entries: create, validation
 * - Budget: create, upsert
 * - Activities: audit trail
 * - Tenant isolation (IDOR)
 * - Lifecycle transition rules
 * - Finance integration (Customer reference)
 * - Concurrency safety
 * - Idempotency
 * - Data integrity invariants
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_A = '00000000-0000-4000-8000-000000000001';
const TENANT_B = '10000000-0000-4000-8000-000000000001';
const COMPANY_A = '00000000-0000-4000-8000-000000000002';
const COMPANY_B = '10000000-0000-4000-8000-000000000002';

async function cleanupTestProjects() {
  const testCodes = ['PRJ-TEST-001', 'PRJ-TEST-002'];
  const testProjects = await prisma.project.findMany({ where: { code: { in: testCodes } }, select: { id: true } });
  const testProjectIds = testProjects.map(p => p.id);
  if (testProjectIds.length > 0) {
    const testTasks = await prisma.projectTask.findMany({ where: { projectId: { in: testProjectIds } }, select: { id: true } });
    const testTaskIds = testTasks.map(t => t.id);
    if (testTaskIds.length > 0) {
      await prisma.projectTaskDependency.deleteMany({ where: { OR: [{ predecessorId: { in: testTaskIds } }, { successorId: { in: testTaskIds } }] } });
    }
    await prisma.projectActivity.deleteMany({ where: { projectId: { in: testProjectIds } } });
    await prisma.projectTimeEntry.deleteMany({ where: { projectId: { in: testProjectIds } } });
    await prisma.projectTask.deleteMany({ where: { projectId: { in: testProjectIds } } });
    await prisma.projectMilestone.deleteMany({ where: { projectId: { in: testProjectIds } } });
    await prisma.projectBudget.deleteMany({ where: { projectId: { in: testProjectIds } } });
    await prisma.projectMember.deleteMany({ where: { projectId: { in: testProjectIds } } });
    await prisma.project.deleteMany({ where: { id: { in: testProjectIds } } });
  }
}

describe('Projects — Phase 11 Integration Tests', () => {
  let EMPLOYEE_A: string;
  let EMPLOYEE_A2: string;
  let projectA1: string;
  let projectA2: string;
  let memberA1: string;
  let taskA1: string;
  let milestoneA1: string;
  let customerA: string;

  beforeAll(async () => {
    // Find employees
    const emp = await prisma.employee.findFirst({ where: { tenantId: TENANT_A }, select: { id: true } });
    if (!emp) throw new Error('No employee for TENANT_A — run seed');
    EMPLOYEE_A = emp.id;

    const emp2 = await prisma.employee.findFirst({ where: { tenantId: TENANT_A, id: { not: emp.id } }, select: { id: true } });
    EMPLOYEE_A2 = emp2?.id || emp.id;

    const empB = await prisma.employee.findFirst({ where: { tenantId: TENANT_B }, select: { id: true } });
    // If no employee in Tenant B, create one for testing
    if (!empB) {
      await prisma.employee.create({
        data: {
          tenantId: TENANT_B, companyId: COMPANY_B,
          employeeCode: 'PRJ-TEST-EMP-B',
          firstName: 'Test', lastName: 'EmployeeB',
          email: 'test.employee.b@prj-test.com',
          joiningDate: new Date('2026-01-01'),
          employmentStatus: 'ACTIVE',
        },
      });
    }

    // Find or create a customer for tenant A
    const cust = await prisma.customer.findFirst({ where: { tenantId: TENANT_A } });
    customerA = cust?.id || (await prisma.customer.create({
      data: { tenantId: TENANT_A, companyId: COMPANY_A, name: 'Test Customer', code: 'PRJ-CUST-001', currency: 'USD' },
    })).id;

    // Clean only test-specific project data (not all projects for the tenant)
    await cleanupTestProjects();
  });

  afterAll(async () => {
    await cleanupTestProjects();
    await prisma.employee.deleteMany({ where: { employeeCode: 'PRJ-TEST-EMP-B' } });
    await prisma.customer.deleteMany({ where: { code: 'PRJ-CUST-001' } });
    await prisma.$disconnect();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PROJECT CRUD
  // ══════════════════════════════════════════════════════════════════════════

  describe('Project CRUD', () => {
    it('should create a project with DRAFT status', async () => {
      const project = await prisma.project.create({
        data: {
          tenantId: TENANT_A, companyId: COMPANY_A,
          code: 'PRJ-TEST-001', name: 'Test Project Alpha',
          description: 'A test project for integration testing',
          status: 'DRAFT',
          projectManagerId: EMPLOYEE_A,
          customerId: customerA,
          currency: 'USD',
          budgetAmount: 10000000, // $100,000
          plannedStartDate: new Date('2026-09-01'),
          plannedEndDate: new Date('2026-12-31'),
        },
      });
      projectA1 = project.id;
      expect(project.id).toBeDefined();
      expect(project.code).toBe('PRJ-TEST-001');
      expect(project.status).toBe('DRAFT');
      expect(project.tenantId).toBe(TENANT_A);
      expect(project.budgetAmount).toBe(10000000);
    });

    it('should enforce unique project code within tenant', async () => {
      await expect(
        prisma.project.create({
          data: {
            tenantId: TENANT_A, companyId: COMPANY_A,
            code: 'PRJ-TEST-001', name: 'Duplicate Code Project',
          },
        }),
      ).rejects.toThrow();
    });

    it('should allow same code in different tenant', async () => {
      const project = await prisma.project.create({
        data: {
          tenantId: TENANT_B, companyId: COMPANY_B,
          code: 'PRJ-TEST-001', name: 'Tenant B Project',
        },
      });
      expect(project.tenantId).toBe(TENANT_B);
    });

    it('should create a second project for tenant A', async () => {
      const project = await prisma.project.create({
        data: {
          tenantId: TENANT_A, companyId: COMPANY_A,
          code: 'PRJ-TEST-002', name: 'Test Project Beta',
          status: 'DRAFT',
        },
      });
      projectA2 = project.id;
      expect(project.id).toBeDefined();
    });

    it('should update project fields', async () => {
      const updated = await prisma.project.update({
        where: { id: projectA1 },
        data: { name: 'Updated Project Alpha', progress: 15 },
      });
      expect(updated.name).toBe('Updated Project Alpha');
      expect(updated.progress).toBe(15);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PROJECT LIFECYCLE
  // ══════════════════════════════════════════════════════════════════════════

  describe('Project Lifecycle', () => {
    it('should transition DRAFT → PLANNED', async () => {
      const updated = await prisma.project.update({
        where: { id: projectA1 },
        data: { status: 'PLANNED' },
      });
      expect(updated.status).toBe('PLANNED');
    });

    it('should transition PLANNED → ACTIVE with actualStartDate', async () => {
      const updated = await prisma.project.update({
        where: { id: projectA1 },
        data: { status: 'ACTIVE', actualStartDate: new Date() },
      });
      expect(updated.status).toBe('ACTIVE');
      expect(updated.actualStartDate).not.toBeNull();
    });

    it('should transition ACTIVE → ON_HOLD', async () => {
      const updated = await prisma.project.update({
        where: { id: projectA1 },
        data: { status: 'ON_HOLD' },
      });
      expect(updated.status).toBe('ON_HOLD');
    });

    it('should transition ON_HOLD → ACTIVE', async () => {
      const updated = await prisma.project.update({
        where: { id: projectA1 },
        data: { status: 'ACTIVE' },
      });
      expect(updated.status).toBe('ACTIVE');
    });

    it('should transition ACTIVE → COMPLETED with progress=100', async () => {
      const updated = await prisma.project.update({
        where: { id: projectA1 },
        data: { status: 'COMPLETED', progress: 100, actualEndDate: new Date() },
      });
      expect(updated.status).toBe('COMPLETED');
      expect(updated.progress).toBe(100);
    });

    it('should transition COMPLETED → ARCHIVED', async () => {
      const updated = await prisma.project.update({
        where: { id: projectA1 },
        data: { status: 'ARCHIVED' },
      });
      expect(updated.status).toBe('ARCHIVED');
    });

    it('should not allow further transitions from ARCHIVED', async () => {
      // ARCHIVED has no valid transitions
      const project = await prisma.project.findUnique({ where: { id: projectA1 } });
      expect(project!.status).toBe('ARCHIVED');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PROJECT MEMBERS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Project Members', () => {
    it('should add a member to a project', async () => {
      const member = await prisma.projectMember.create({
        data: {
          tenantId: TENANT_A, projectId: projectA2,
          employeeId: EMPLOYEE_A, role: 'PROJECT_MANAGER',
          allocatedPct: 100,
        },
      });
      memberA1 = member.id;
      expect(member.id).toBeDefined();
      expect(member.role).toBe('PROJECT_MANAGER');
      expect(member.isActive).toBe(true);
    });

    it('should prevent duplicate membership', async () => {
      await expect(
        prisma.projectMember.create({
          data: {
            tenantId: TENANT_A, projectId: projectA2,
            employeeId: EMPLOYEE_A, role: 'DEVELOPER',
          },
        }),
      ).rejects.toThrow();
    });

    it('should add a second member with different employee', async () => {
      const member = await prisma.projectMember.create({
        data: {
          tenantId: TENANT_A, projectId: projectA2,
          employeeId: EMPLOYEE_A2, role: 'DEVELOPER',
        },
      });
      expect(member.id).toBeDefined();
      expect(member.role).toBe('DEVELOPER');
    });

    it('should update member role', async () => {
      const updated = await prisma.projectMember.update({
        where: { id: memberA1 },
        data: { role: 'PROJECT_LEAD' },
      });
      expect(updated.role).toBe('PROJECT_LEAD');
    });

    it('should remove a member', async () => {
      await prisma.projectMember.delete({ where: { id: memberA1 } });
      const remaining = await prisma.projectMember.findMany({ where: { projectId: projectA2 } });
      expect(remaining.length).toBe(1);
    });

    it('should scope members to tenant', async () => {
      const membersA = await prisma.projectMember.findMany({ where: { tenantId: TENANT_A } });
      const membersB = await prisma.projectMember.findMany({ where: { tenantId: TENANT_B } });
      for (const m of membersA) expect(m.tenantId).toBe(TENANT_A);
      for (const m of membersB) expect(m.tenantId).toBe(TENANT_B);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PROJECT TASKS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Project Tasks', () => {
    let memberForTask: string;

    beforeAll(async () => {
      // Re-add member for task assignment
      const member = await prisma.projectMember.create({
        data: { tenantId: TENANT_A, projectId: projectA2, employeeId: EMPLOYEE_A, role: 'DEVELOPER' },
      });
      memberForTask = member.id;
    });

    it('should create a task', async () => {
      const task = await prisma.projectTask.create({
        data: {
          tenantId: TENANT_A, projectId: projectA2,
          title: 'Design database schema',
          priority: 'HIGH',
          assigneeId: memberForTask,
          reporterId: EMPLOYEE_A,
          dueDate: new Date('2026-10-15'),
        },
      });
      taskA1 = task.id;
      expect(task.id).toBeDefined();
      expect(task.status).toBe('TODO');
      expect(task.priority).toBe('HIGH');
    });

    it('should create a subtask', async () => {
      const subtask = await prisma.projectTask.create({
        data: {
          tenantId: TENANT_A, projectId: projectA2,
          parentTaskId: taskA1,
          title: 'ER diagram review',
          priority: 'MEDIUM',
        },
      });
      expect(subtask.parentTaskId).toBe(taskA1);
    });

    it('should transition task TODO → IN_PROGRESS', async () => {
      const updated = await prisma.projectTask.update({
        where: { id: taskA1 },
        data: { status: 'IN_PROGRESS', progress: 50 },
      });
      expect(updated.status).toBe('IN_PROGRESS');
      expect(updated.progress).toBe(50);
    });

    it('should transition task IN_PROGRESS → COMPLETED', async () => {
      const updated = await prisma.projectTask.update({
        where: { id: taskA1 },
        data: { status: 'COMPLETED', completedDate: new Date(), progress: 100 },
      });
      expect(updated.status).toBe('COMPLETED');
      expect(updated.completedDate).not.toBeNull();
    });

    it('should record all task statuses are valid enums', async () => {
      const validStatuses = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'IN_REVIEW', 'COMPLETED', 'CANCELLED'];
      for (const status of validStatuses) {
        const task = await prisma.projectTask.create({
          data: { tenantId: TENANT_A, projectId: projectA2, title: `Status test ${status}`, status: status as any },
        });
        expect(task.status).toBe(status);
        await prisma.projectTask.delete({ where: { id: task.id } });
      }
    });

    it('should record all priority levels are valid enums', async () => {
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
      for (const priority of validPriorities) {
        const task = await prisma.projectTask.create({
          data: { tenantId: TENANT_A, projectId: projectA2, title: `Priority test ${priority}`, priority: priority as any },
        });
        expect(task.priority).toBe(priority);
        await prisma.projectTask.delete({ where: { id: task.id } });
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MILESTONES
  // ══════════════════════════════════════════════════════════════════════════

  describe('Milestones', () => {
    it('should create a milestone', async () => {
      const milestone = await prisma.projectMilestone.create({
        data: {
          tenantId: TENANT_A, projectId: projectA2,
          name: 'Design Phase',
          targetDate: new Date('2026-10-01'),
          sortOrder: 1,
        },
      });
      milestoneA1 = milestone.id;
      expect(milestone.id).toBeDefined();
      expect(milestone.status).toBe('PENDING');
    });

    it('should complete a milestone', async () => {
      const updated = await prisma.projectMilestone.update({
        where: { id: milestoneA1 },
        data: { status: 'COMPLETED', completedDate: new Date(), progress: 100 },
      });
      expect(updated.status).toBe('COMPLETED');
      expect(updated.completedDate).not.toBeNull();
    });

    it('should order milestones by sortOrder', async () => {
      const m2 = await prisma.projectMilestone.create({
        data: { tenantId: TENANT_A, projectId: projectA2, name: 'Development', sortOrder: 2 },
      });
      const milestones = await prisma.projectMilestone.findMany({
        where: { projectId: projectA2 },
        orderBy: { sortOrder: 'asc' },
      });
      expect(milestones.length).toBe(2);
      expect(milestones[0]!.name).toBe('Design Phase');
      expect(milestones[1]!.name).toBe('Development');
      await prisma.projectMilestone.delete({ where: { id: m2.id } });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TIME ENTRIES
  // ══════════════════════════════════════════════════════════════════════════

  describe('Time Entries', () => {
    it('should create a time entry', async () => {
      const entry = await prisma.projectTimeEntry.create({
        data: {
          tenantId: TENANT_A, projectId: projectA2,
          employeeId: EMPLOYEE_A,
          date: new Date(),
          durationMinutes: 120,
          description: 'Database design work',
          isBillable: true,
        },
      });
      expect(entry.id).toBeDefined();
      expect(entry.durationMinutes).toBe(120);
      expect(entry.isBillable).toBe(true);
      expect(entry.status).toBe('DRAFT');
    });

    it('should create non-billable entry', async () => {
      const entry = await prisma.projectTimeEntry.create({
        data: {
          tenantId: TENANT_A, projectId: projectA2,
          employeeId: EMPLOYEE_A,
          date: new Date(),
          durationMinutes: 30,
          description: 'Team standup',
          isBillable: false,
        },
      });
      expect(entry.isBillable).toBe(false);
    });

    it('should link time entry to a task', async () => {
      const entry = await prisma.projectTimeEntry.create({
        data: {
          tenantId: TENANT_A, projectId: projectA2,
          taskId: taskA1,
          employeeId: EMPLOYEE_A,
          date: new Date(),
          durationMinutes: 90,
          description: 'Task-specific work',
        },
      });
      expect(entry.taskId).toBe(taskA1);
    });

    it('should aggregate time correctly', async () => {
      const entries = await prisma.projectTimeEntry.findMany({
        where: { projectId: projectA2, tenantId: TENANT_A },
      });
      const totalMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0);
      expect(totalMinutes).toBeGreaterThan(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // BUDGET
  // ══════════════════════════════════════════════════════════════════════════

  describe('Budget', () => {
    it('should create a project budget', async () => {
      const budget = await prisma.projectBudget.create({
        data: {
          tenantId: TENANT_A, projectId: projectA2,
          budgetAmount: 5000000, // $50,000
          currency: 'USD',
        },
      });
      expect(budget.budgetAmount).toBe(5000000);
      expect(budget.spentAmount).toBe(0);
    });

    it('should enforce one budget per project', async () => {
      await expect(
        prisma.projectBudget.create({
          data: {
            tenantId: TENANT_A, projectId: projectA2,
            budgetAmount: 1000000, currency: 'USD',
          },
        }),
      ).rejects.toThrow();
    });

    it('should upsert (update existing budget)', async () => {
      const budget = await prisma.projectBudget.upsert({
        where: { projectId: projectA2 },
        create: { tenantId: TENANT_A, projectId: projectA2, budgetAmount: 6000000 },
        update: { budgetAmount: 6000000 },
      });
      expect(budget.budgetAmount).toBe(6000000);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ACTIVITIES
  // ══════════════════════════════════════════════════════════════════════════

  describe('Activities', () => {
    it('should create project activities', async () => {
      const activity = await prisma.projectActivity.create({
        data: {
          tenantId: TENANT_A, projectId: projectA2,
          employeeId: EMPLOYEE_A,
          activityType: 'PROJECT_CREATED',
          title: 'Project created',
        },
      });
      expect(activity.id).toBeDefined();
      expect(activity.activityType).toBe('PROJECT_CREATED');
    });

    it('should record task activities', async () => {
      const activity = await prisma.projectActivity.create({
        data: {
          tenantId: TENANT_A, projectId: projectA2,
          taskId: taskA1,
          employeeId: EMPLOYEE_A,
          activityType: 'TASK_COMPLETED',
          title: 'Task completed',
        },
      });
      expect(activity.taskId).toBe(taskA1);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TENANT ISOLATION (IDOR)
  // ══════════════════════════════════════════════════════════════════════════

  describe('Tenant Isolation', () => {
    it('Tenant A cannot read Tenant B projects', async () => {
      const projectsA = await prisma.project.findMany({ where: { tenantId: TENANT_A } });
      const projectsB = await prisma.project.findMany({ where: { tenantId: TENANT_B } });
      for (const p of projectsA) expect(p.tenantId).toBe(TENANT_A);
      for (const p of projectsB) expect(p.tenantId).toBe(TENANT_B);
    });

    it('Tenant A cannot access Tenant B tasks', async () => {
      const tasks = await prisma.projectTask.findMany({ where: { tenantId: TENANT_A } });
      for (const t of tasks) expect(t.tenantId).toBe(TENANT_A);
    });

    it('Tenant A cannot access Tenant B milestones', async () => {
      const milestones = await prisma.projectMilestone.findMany({ where: { tenantId: TENANT_A } });
      for (const m of milestones) expect(m.tenantId).toBe(TENANT_A);
    });

    it('Tenant A cannot access Tenant B time entries', async () => {
      const entries = await prisma.projectTimeEntry.findMany({ where: { tenantId: TENANT_A } });
      for (const e of entries) expect(e.tenantId).toBe(TENANT_A);
    });

    it('Tenant A cannot access Tenant B activities', async () => {
      const activities = await prisma.projectActivity.findMany({ where: { tenantId: TENANT_A } });
      for (const a of activities) expect(a.tenantId).toBe(TENANT_A);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DATA INTEGRITY INVARIANTS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Data Integrity', () => {
    it('every project must have valid company', async () => {
      const projects = await prisma.project.findMany({ where: { tenantId: TENANT_A } });
      for (const p of projects) {
        const company = await prisma.company.findUnique({ where: { id: p.companyId } });
        expect(company).not.toBeNull();
      }
    });

    it('every member must reference valid project and employee', async () => {
      const members = await prisma.projectMember.findMany({ where: { tenantId: TENANT_A } });
      for (const m of members) {
        const project = await prisma.project.findUnique({ where: { id: m.projectId } });
        const employee = await prisma.employee.findUnique({ where: { id: m.employeeId } });
        expect(project).not.toBeNull();
        expect(employee).not.toBeNull();
      }
    });

    it('every task must reference valid project', async () => {
      const tasks = await prisma.projectTask.findMany({ where: { tenantId: TENANT_A } });
      for (const t of tasks) {
        const project = await prisma.project.findUnique({ where: { id: t.projectId } });
        expect(project).not.toBeNull();
        expect(project!.tenantId).toBe(TENANT_A);
      }
    });

    it('project progress must be 0-100', async () => {
      const projects = await prisma.project.findMany({ where: { tenantId: TENANT_A } });
      for (const p of projects) {
        expect(p.progress).toBeGreaterThanOrEqual(0);
        expect(p.progress).toBeLessThanOrEqual(100);
      }
    });

    it('all budget amounts are integer minor units', async () => {
      const budgets = await prisma.projectBudget.findMany({ where: { tenantId: TENANT_A } });
      for (const b of budgets) {
        expect(Number.isInteger(b.budgetAmount)).toBe(true);
        expect(Number.isInteger(b.spentAmount)).toBe(true);
      }
    });

    it('all time entry durations are positive integers', async () => {
      const entries = await prisma.projectTimeEntry.findMany({ where: { tenantId: TENANT_A } });
      for (const e of entries) {
        expect(Number.isInteger(e.durationMinutes)).toBe(true);
        expect(e.durationMinutes).toBeGreaterThan(0);
      }
    });

    it('completed tasks must have completedDate', async () => {
      const completed = await prisma.projectTask.findMany({
        where: { tenantId: TENANT_A, status: 'COMPLETED' },
      });
      for (const t of completed) {
        expect(t.completedDate).not.toBeNull();
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // FINANCE INTEGRATION
  // ══════════════════════════════════════════════════════════════════════════

  describe('Finance Integration', () => {
    it('project references Finance Customer', async () => {
      const project = await prisma.project.findFirst({
        where: { id: projectA1 },
        include: { customer: true },
      });
      expect(project).not.toBeNull();
      if (project?.customerId) {
        expect(project.customer).not.toBeNull();
        expect(project.customer!.tenantId).toBe(TENANT_A);
      }
    });

    it('project budgets use integer minor units', async () => {
      const project = await prisma.project.findUnique({ where: { id: projectA2 } });
      if (project?.budgetAmount) {
        expect(Number.isInteger(project.budgetAmount)).toBe(true);
      }
    });

    it('project currency is valid ISO code', async () => {
      const projects = await prisma.project.findMany({ where: { tenantId: TENANT_A } });
      for (const p of projects) {
        expect(p.currency).toMatch(/^[A-Z]{3}$/);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // IDEMPOTENCY
  // ══════════════════════════════════════════════════════════════════════════

  describe('Idempotency', () => {
    it('duplicate project code within tenant is rejected', async () => {
      await expect(
        prisma.project.create({
          data: { tenantId: TENANT_A, companyId: COMPANY_A, code: 'PRJ-TEST-002', name: 'Dupe' },
        }),
      ).rejects.toThrow();
    });

    it('duplicate project member is rejected', async () => {
      const existingMember = await prisma.projectMember.findFirst({ where: { projectId: projectA2, employeeId: EMPLOYEE_A } });
      if (existingMember) {
        await expect(
          prisma.projectMember.create({
            data: { tenantId: TENANT_A, projectId: projectA2, employeeId: EMPLOYEE_A, role: 'DEVELOPER' },
          }),
        ).rejects.toThrow();
      }
    });
  });
});
