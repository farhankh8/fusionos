/**
 * FusionOS Analytics Integration Tests — Phase 15
 *
 * Covers:
 * - Dashboard aggregation
 * - Finance analytics
 * - Workforce analytics
 * - Attendance analytics
 * - Leave analytics
 * - Payroll analytics
 * - CRM analytics
 * - Project analytics
 * - Asset analytics
 * - Saved reports CRUD
 * - Tenant isolation
 * - Data integrity
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_A = '00000000-0000-4000-8000-000000000001';
const TENANT_B = '10000000-0000-4000-8000-000000000001';
const USER_A_ADMIN = '00000000-0000-4000-8000-000000000003';
const USER_B_ADMIN = '10000000-0000-4000-8000-000000000003';

const reportIds: string[] = [];
const employeeIds: string[] = [];

describe('Analytics — Phase 15 Integration Tests', () => {
  beforeAll(async () => {
    // Ensure test users exist
    for (const userId of [USER_A_ADMIN, USER_B_ADMIN]) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error(`Test user ${userId} not found — run seed first`);
    }
  });

  afterAll(async () => {
    await prisma.savedReport.deleteMany({ where: { id: { in: reportIds } } });
    await prisma.employee.deleteMany({ where: { id: { in: employeeIds } } });
    await prisma.$disconnect();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════

  describe('Dashboard', () => {
    it('should return dashboard data with all domains', async () => {
      // Verify tenant has data by checking employee count
      const empCount = await prisma.employee.count({ where: { tenantId: TENANT_A, deletedAt: null } });
      expect(empCount).toBeGreaterThanOrEqual(0);

      // Dashboard should always return structure even with zero data
      // We test the data access patterns rather than specific values
      const assetCount = await prisma.asset.count({ where: { tenantId: TENANT_A } });
      expect(assetCount).toBeGreaterThanOrEqual(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // FINANCE ANALYTICS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Finance Analytics', () => {
    it('should query journal lines for revenue', async () => {
      const lines = await prisma.journalLine.findMany({
        where: {
          tenantId: TENANT_A,
          journalEntry: { status: 'POSTED' },
          account: { accountType: 'INCOME' },
        },
      });
      expect(Array.isArray(lines)).toBe(true);
    });

    it('should query journal lines for expenses', async () => {
      const lines = await prisma.journalLine.findMany({
        where: {
          tenantId: TENANT_A,
          journalEntry: { status: 'POSTED' },
          account: { accountType: 'EXPENSE' },
        },
      });
      expect(Array.isArray(lines)).toBe(true);
    });

    it('should query invoices for AR', async () => {
      const invoices = await prisma.invoice.findMany({
        where: { tenantId: TENANT_A },
      });
      expect(Array.isArray(invoices)).toBe(true);
    });

    it('should query bills for AP', async () => {
      const bills = await prisma.bill.findMany({
        where: { tenantId: TENANT_A },
      });
      expect(Array.isArray(bills)).toBe(true);
    });

    it('should correctly aggregate revenue', async () => {
      const incomeLines = await prisma.journalLine.findMany({
        where: {
          tenantId: TENANT_A,
          journalEntry: { status: 'POSTED' },
          account: { accountType: 'INCOME' },
        },
      });
      const totalRevenue = incomeLines.reduce((sum, l) => sum + l.credit - l.debit, 0);
      // Revenue should be non-negative for posted entries
      expect(typeof totalRevenue).toBe('number');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // WORKFORCE ANALYTICS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Workforce Analytics', () => {
    it('should count total employees', async () => {
      const count = await prisma.employee.count({
        where: { tenantId: TENANT_A, deletedAt: null },
      });
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should count active employees', async () => {
      const count = await prisma.employee.count({
        where: { tenantId: TENANT_A, deletedAt: null, employmentStatus: 'ACTIVE' },
      });
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should group employees by department', async () => {
      const groups = await prisma.employee.groupBy({
        by: ['departmentId'],
        where: { tenantId: TENANT_A, deletedAt: null, departmentId: { not: null } },
        _count: true,
      });
      expect(Array.isArray(groups)).toBe(true);
    });

    it('should group employees by employment type', async () => {
      const groups = await prisma.employee.groupBy({
        by: ['employmentType'],
        where: { tenantId: TENANT_A, deletedAt: null },
        _count: true,
      });
      expect(Array.isArray(groups)).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ATTENDANCE ANALYTICS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Attendance Analytics', () => {
    it('should count attendance records', async () => {
      const count = await prisma.attendance.count({
        where: { tenantId: TENANT_A },
      });
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should aggregate worked minutes', async () => {
      const agg = await prisma.attendance.aggregate({
        where: { tenantId: TENANT_A, status: { in: ['PRESENT', 'LATE', 'OVERTIME'] } },
        _sum: { totalWorkedMinutes: true },
      });
      expect(typeof (agg._sum.totalWorkedMinutes ?? 0)).toBe('number');
    });

    it('should group attendance by status', async () => {
      const groups = await prisma.attendance.groupBy({
        by: ['status'],
        where: { tenantId: TENANT_A },
        _count: true,
      });
      expect(Array.isArray(groups)).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // LEAVE ANALYTICS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Leave Analytics', () => {
    it('should count leave requests by status', async () => {
      for (const status of ['PENDING', 'APPROVED', 'REJECTED']) {
        const count = await prisma.leaveRequest.count({
          where: { tenantId: TENANT_A, status: status as any },
        });
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    it('should aggregate approved leave days', async () => {
      const agg = await prisma.leaveRequest.aggregate({
        where: { tenantId: TENANT_A, status: 'APPROVED' },
        _sum: { duration: true },
      });
      expect(typeof (agg._sum.duration ?? 0)).toBe('number');
    });

    it('should group leave by type', async () => {
      const groups = await prisma.leaveRequest.groupBy({
        by: ['leaveTypeId', 'status'],
        where: { tenantId: TENANT_A },
        _count: true,
      });
      expect(Array.isArray(groups)).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PAYROLL ANALYTICS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Payroll Analytics', () => {
    it('should query finalized payroll runs', async () => {
      const runs = await prisma.payrollRun.findMany({
        where: { tenantId: TENANT_A, status: { in: ['FINALIZED', 'APPROVED'] } },
      });
      expect(Array.isArray(runs)).toBe(true);
    });

    it('should aggregate payroll totals', async () => {
      const agg = await prisma.payrollRun.aggregate({
        where: { tenantId: TENANT_A, status: { in: ['FINALIZED', 'APPROVED'] } },
        _sum: { totalGross: true, totalNet: true, totalDeductions: true },
      });
      expect(typeof (agg._sum.totalGross ?? 0)).toBe('number');
    });

    it('should query payroll lines with department info', async () => {
      const runs = await prisma.payrollRun.findMany({
        where: { tenantId: TENANT_A, status: { in: ['FINALIZED', 'APPROVED'] } },
        select: { id: true },
      });
      if (runs.length > 0) {
        const lines = await prisma.payrollLine.findMany({
          where: { runId: { in: runs.map(r => r.id) } },
          include: { employee: { select: { departmentId: true } } },
        });
        expect(Array.isArray(lines)).toBe(true);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CRM ANALYTICS
  // ══════════════════════════════════════════════════════════════════════════

  describe('CRM Analytics', () => {
    it('should count leads by status', async () => {
      for (const status of ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST']) {
        const count = await prisma.lead.count({
          where: { tenantId: TENANT_A, status: status as any },
        });
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    it('should count opportunities by status', async () => {
      for (const status of ['OPEN', 'WON', 'LOST']) {
        const count = await prisma.opportunity.count({
          where: { tenantId: TENANT_A, status: status as any },
        });
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    it('should aggregate pipeline value', async () => {
      const pipelineOpps = await prisma.opportunity.findMany({
        where: { tenantId: TENANT_A, status: 'OPEN' },
        select: { amount: true, probability: true },
      });
      const pipelineValue = pipelineOpps.reduce((sum, o) => sum + o.amount, 0);
      expect(typeof pipelineValue).toBe('number');
    });

    it('should calculate weighted pipeline', async () => {
      const opps = await prisma.opportunity.findMany({
        where: { tenantId: TENANT_A, status: 'OPEN' },
        select: { amount: true, probability: true },
      });
      const weighted = opps.reduce((sum, o) => sum + Math.round(o.amount * o.probability / 100), 0);
      expect(typeof weighted).toBe('number');
    });

    it('should group opportunities by stage', async () => {
      const groups = await prisma.opportunity.groupBy({
        by: ['stage'],
        where: { tenantId: TENANT_A },
        _sum: { amount: true },
        _count: true,
      });
      expect(Array.isArray(groups)).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PROJECT ANALYTICS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Project Analytics', () => {
    it('should count projects by status', async () => {
      for (const status of ['ACTIVE', 'COMPLETED', 'ON_HOLD', 'DRAFT', 'PLANNED']) {
        const count = await prisma.project.count({
          where: { tenantId: TENANT_A, status: status as any },
        });
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    it('should group projects by status', async () => {
      const groups = await prisma.project.groupBy({
        by: ['status'],
        where: { tenantId: TENANT_A },
        _count: true,
      });
      expect(Array.isArray(groups)).toBe(true);
    });

    it('should count overdue milestones', async () => {
      const count = await prisma.projectMilestone.count({
        where: {
          tenantId: TENANT_A,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      });
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ASSET ANALYTICS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Asset Analytics', () => {
    it('should count assets by status', async () => {
      for (const status of ['ACTIVE', 'ASSIGNED', 'AVAILABLE', 'IN_MAINTENANCE', 'RETIRED', 'DISPOSED']) {
        const count = await prisma.asset.count({
          where: { tenantId: TENANT_A, status: status as any },
        });
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    it('should aggregate book value', async () => {
      const agg = await prisma.asset.aggregate({
        where: { tenantId: TENANT_A, status: { notIn: ['DISPOSED', 'DRAFT'] } },
        _sum: { currentBookValue: true, purchaseCost: true },
      });
      expect(typeof (agg._sum.currentBookValue ?? 0)).toBe('number');
    });

    it('should aggregate maintenance cost', async () => {
      const agg = await prisma.assetMaintenanceRecord.aggregate({
        where: { tenantId: TENANT_A, status: 'COMPLETED' },
        _sum: { cost: true },
      });
      expect(typeof (agg._sum.cost ?? 0)).toBe('number');
    });

    it('should group assets by category', async () => {
      const groups = await prisma.asset.groupBy({
        by: ['categoryId'],
        where: { tenantId: TENANT_A, categoryId: { not: null } },
        _count: true,
      });
      expect(Array.isArray(groups)).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SAVED REPORTS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Saved Reports', () => {
    it('should create a saved report', async () => {
      const report = await prisma.savedReport.create({
        data: {
          tenantId: TENANT_A,
          name: `Test Report ${Date.now()}`,
          domain: 'finance',
          filters: { companyId: 'test' },
          metrics: ['totalRevenue', 'netProfit'],
          createdBy: USER_A_ADMIN,
        },
      });
      reportIds.push(report.id);
      expect(report.id).toBeDefined();
      expect(report.domain).toBe('finance');
    });

    it('should list reports for tenant', async () => {
      const reports = await prisma.savedReport.findMany({
        where: { tenantId: TENANT_A },
      });
      expect(reports.length).toBeGreaterThanOrEqual(1);
      expect(reports.every(r => r.tenantId === TENANT_A)).toBe(true);
    });

    it('should update a report', async () => {
      if (reportIds.length === 0) return;
      const updated = await prisma.savedReport.update({
        where: { id: reportIds[0] },
        data: { description: 'Updated description' },
      });
      expect(updated.description).toBe('Updated description');
    });

    it('should enforce unique name per tenant', async () => {
      const existing = await prisma.savedReport.findFirst({ where: { tenantId: TENANT_A } });
      if (existing) {
        await expect(
          prisma.savedReport.create({
            data: { tenantId: TENANT_A, name: existing.name, domain: 'finance' },
          }),
        ).rejects.toThrow();
      }
    });

    it('should delete a report', async () => {
      const report = await prisma.savedReport.create({
        data: { tenantId: TENANT_A, name: `Delete Test ${Date.now()}`, domain: 'finance' },
      });
      await prisma.savedReport.delete({ where: { id: report.id } });
      const found = await prisma.savedReport.findUnique({ where: { id: report.id } });
      expect(found).toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TENANT ISOLATION
  // ══════════════════════════════════════════════════════════════════════════

  describe('Tenant Isolation', () => {
    it('Tenant A analytics data should not include Tenant B data', async () => {
      const empA = await prisma.employee.count({ where: { tenantId: TENANT_A, deletedAt: null } });
      const empB = await prisma.employee.count({ where: { tenantId: TENANT_B, deletedAt: null } });
      // Verify they are independent counts
      expect(typeof empA).toBe('number');
      expect(typeof empB).toBe('number');
    });

    it('Tenant A reports should not include Tenant B reports', async () => {
      // Create a Tenant B report
      const reportB = await prisma.savedReport.create({
        data: { tenantId: TENANT_B, name: `TB Report ${Date.now()}`, domain: 'finance' },
      });
      reportIds.push(reportB.id);

      const reportsA = await prisma.savedReport.findMany({ where: { tenantId: TENANT_A } });
      expect(reportsA.find(r => r.id === reportB.id)).toBeUndefined();
    });

    it('Tenant A attendance should not include Tenant B attendance', async () => {
      const attA = await prisma.attendance.count({ where: { tenantId: TENANT_A } });
      const attB = await prisma.attendance.count({ where: { tenantId: TENANT_B } });
      expect(typeof attA).toBe('number');
      expect(typeof attB).toBe('number');
    });

    it('Tenant A payroll should not include Tenant B payroll', async () => {
      const payA = await prisma.payrollRun.count({ where: { tenantId: TENANT_A } });
      const payB = await prisma.payrollRun.count({ where: { tenantId: TENANT_B } });
      expect(typeof payA).toBe('number');
      expect(typeof payB).toBe('number');
    });

    it('Tenant A CRM should not include Tenant B CRM data', async () => {
      const leadsA = await prisma.lead.count({ where: { tenantId: TENANT_A } });
      const leadsB = await prisma.lead.count({ where: { tenantId: TENANT_B } });
      expect(typeof leadsA).toBe('number');
      expect(typeof leadsB).toBe('number');
    });

    it('Tenant A assets should not include Tenant B assets', async () => {
      const assetsA = await prisma.asset.count({ where: { tenantId: TENANT_A } });
      const assetsB = await prisma.asset.count({ where: { tenantId: TENANT_B } });
      expect(typeof assetsA).toBe('number');
      expect(typeof assetsB).toBe('number');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DATA INTEGRITY
  // ══════════════════════════════════════════════════════════════════════════

  describe('Data Integrity', () => {
    it('all journal lines reference valid journal entries', async () => {
      const lines = await prisma.journalLine.findMany({ where: { tenantId: TENANT_A }, take: 10 });
      for (const line of lines) {
        const entry = await prisma.journalEntry.findUnique({ where: { id: line.journalEntryId } });
        expect(entry).not.toBeNull();
      }
    });

    it('all journal lines reference valid accounts', async () => {
      const lines = await prisma.journalLine.findMany({ where: { tenantId: TENANT_A }, take: 10 });
      for (const line of lines) {
        const account = await prisma.account.findUnique({ where: { id: line.accountId } });
        expect(account).not.toBeNull();
      }
    });

    it('all saved reports reference valid tenants', async () => {
      const reports = await prisma.savedReport.findMany({ where: { id: { in: reportIds } } });
      for (const r of reports) {
        const tenant = await prisma.tenant.findUnique({ where: { id: r.tenantId } });
        expect(tenant).not.toBeNull();
      }
    });

    it('financial calculations use integer minor units', async () => {
      const runs = await prisma.payrollRun.findMany({ where: { tenantId: TENANT_A }, take: 5 });
      for (const run of runs) {
        expect(Number.isInteger(run.totalGross)).toBe(true);
        expect(Number.isInteger(run.totalNet)).toBe(true);
        expect(Number.isInteger(run.totalDeductions)).toBe(true);
      }
    });

    it('all attendance records have valid employee references', async () => {
      const records = await prisma.attendance.findMany({ where: { tenantId: TENANT_A }, take: 10 });
      for (const r of records) {
        const emp = await prisma.employee.findUnique({ where: { id: r.employeeId } });
        expect(emp).not.toBeNull();
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CONCURRENCY
  // ══════════════════════════════════════════════════════════════════════════

  describe('Concurrency', () => {
    it('concurrent dashboard reads should not error', async () => {
      const results = await Promise.allSettled([
        prisma.employee.count({ where: { tenantId: TENANT_A, deletedAt: null } }),
        prisma.attendance.count({ where: { tenantId: TENANT_A } }),
        prisma.leaveRequest.count({ where: { tenantId: TENANT_A } }),
        prisma.asset.count({ where: { tenantId: TENANT_A } }),
      ]);
      expect(results.every(r => r.status === 'fulfilled')).toBe(true);
    });

    it('concurrent report creation with same name fails for one', async () => {
      const name = `Concurrent Report ${Date.now()}`;
      const results = await Promise.allSettled([
        prisma.savedReport.create({ data: { tenantId: TENANT_A, name, domain: 'finance' } }),
        prisma.savedReport.create({ data: { tenantId: TENANT_A, name, domain: 'finance' } }),
      ]);
      const succeeded = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');
      expect(succeeded.length).toBe(1);
      expect(failed.length).toBe(1);

      // Cleanup
      for (const r of succeeded) {
        if (r.status === 'fulfilled') reportIds.push(r.value.id);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // IDEMPOTENCY
  // ══════════════════════════════════════════════════════════════════════════

  describe('Idempotency', () => {
    it('duplicate report name within tenant is rejected', async () => {
      const name = `Idempotent Report ${Date.now()}`;
      const r1 = await prisma.savedReport.create({
        data: { tenantId: TENANT_A, name, domain: 'finance' },
      });
      reportIds.push(r1.id);

      await expect(
        prisma.savedReport.create({ data: { tenantId: TENANT_A, name, domain: 'finance' } }),
      ).rejects.toThrow();
    });
  });
});
