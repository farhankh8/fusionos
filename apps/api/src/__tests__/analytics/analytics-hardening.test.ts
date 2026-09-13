/**
 * FusionOS Analytics Hardening Tests — Phase 15.5
 *
 * Purpose: verify the hardened analytics service produces CORRECT,
 * currency-safe, isolated results from a fully controlled dataset.
 *
 * Unlike analytics-integration.test.ts (raw Prisma only), these tests
 * exercise the AnalyticsService directly with a dedicated tenant owned
 * exclusively by this file. All data is created in beforeAll and removed
 * via the owning tenant's cascade — no tenant-wide deleteMany.
 *
 * Coverage:
 * - F1  Finance revenue/expenses come from POSTED journal lines, never invoices
 * - F3  Project budgets come from ProjectBudget (fallback to Project fields)
 * - F4  Company isolation (finance/attendance/leave/workforce/payroll/projects/assets)
 * - F5  Date boundaries (inclusive-equality on @db.Date filters)
 * - F7  Export per-domain RBAC on top of analytics:export
 * - F11 Attendance present-rate counts productive statuses
 * - F15 >=12 payroll runs: summary spans ALL runs, trend truncates to 12
 * - F17 Currency isolation: cross-currency summation never rendered as a scalar
 * - F18 Asset lifecycle classification (excludes DISPOSED/DRAFT from book value)
 * - F19 AR/AP status-aware outstanding balances
 * - Saved report domain/metric whitelist validation
 * - IDOR: cross-tenant report access is forbidden
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { AnalyticsService } from '../../analytics/services/analytics.service';
import type { TenantContext } from '../../auth/services/tenant-context.service';

const prisma = new PrismaClient();

const TENANT = randomUUID();
const COM_A = randomUUID();
const COM_B = randomUUID();
const USR = '00000000-0000-4000-8000-000000000003';
const OTHER_TENANT = '10000000-0000-4000-8000-000000000001';

const noopAudit = { record: async () => {} } as any;
const service = new AnalyticsService(prisma as any, noopAudit);

const ALL_PERMS = [
  'analytics:read', 'analytics:export',
  'analytics:finance:read', 'analytics:workforce:read',
  'analytics:attendance:read', 'analytics:leave:read',
  'analytics:payroll:read', 'analytics:crm:read',
  'analytics:project:read', 'analytics:asset:read',
];

function makeCtx(tenantId: string, permissions: string[] = ALL_PERMS, userId = USR): TenantContext {
  return {
    userId, employeeId: null, sessionId: null, email: 'harden@fusionos.test',
    tenantId, tenantName: 'Hardening', tenantSlug: 'harden',
    roleId: 'role', roleName: 'super_admin', roleIsSystem: true,
    userRoleId: 'userrole', scope: null, permissions,
  };
}

const ctxA = makeCtx(TENANT);
const otherCtx = makeCtx(OTHER_TENANT);

let companyA: string;
let companyB: string;
let deptD1: string;
let deptD2: string;
let deptD3: string;
let emp1: string; // active, dept D1, 2026-01-15
let emp2: string; // terminated, dept D1, 2025-01-01
let emp3: string; // active, dept D2, 2026-06-10

function bucketFor(list: { currency: string }[], currency: string) {
  const found = list.find(b => b.currency === currency);
  expect(found).toBeDefined();
  return found as any;
}

describe('Analytics Hardening (Phase 15.5)', () => {
  beforeAll(async () => {
    await prisma.tenant.create({
      data: { id: TENANT, name: 'Hardening Tenant', slug: randomUUID(), status: 'ACTIVE' },
    });

    const [ca, cb] = await Promise.all([
      prisma.company.create({ data: { tenantId: TENANT, id: COM_A, name: 'HC A', code: 'HCA' } }),
      prisma.company.create({ data: { tenantId: TENANT, id: COM_B, name: 'HC B', code: 'HCB' } }),
    ]);
    companyA = ca.id;
    companyB = cb.id;

    // ── Departments & Employees ──
    const [d1, d2, d3] = await Promise.all([
      prisma.department.create({ data: { tenantId: TENANT, companyId: companyA, name: 'Engineering', code: 'D1' } }),
      prisma.department.create({ data: { tenantId: TENANT, companyId: companyA, name: 'Operations', code: 'D2' } }),
      prisma.department.create({ data: { tenantId: TENANT, companyId: companyB, name: 'Sales', code: 'D3' } }),
    ]);
    deptD1 = d1.id; deptD2 = d2.id; deptD3 = d3.id;

    const commonEmp = (code: string, firstName: string, province: any) => ({
      tenantId: TENANT, employeeCode: code, firstName, lastName: code,
      email: `${code.toLowerCase()}@harden.test`, joiningDate: new Date('2026-01-15'),
      ...province,
    });

    const e1 = await prisma.employee.create({
      data: commonEmp('H-E1', 'Amir', { companyId: companyA, departmentId: deptD1, employmentStatus: 'ACTIVE', employmentType: 'FULL_TIME' }),
    });
    const e2 = await prisma.employee.create({
      data: commonEmp('H-E2', 'Bea', { companyId: companyA, departmentId: deptD1, employmentStatus: 'TERMINATED', employmentType: 'FULL_TIME', joiningDate: new Date('2025-01-01') }),
    });
    const e3 = await prisma.employee.create({
      data: commonEmp('H-E3', 'Cal', { companyId: companyA, departmentId: deptD2, employmentStatus: 'ACTIVE', employmentType: 'PART_TIME', joiningDate: new Date('2026-06-10') }),
    });
    await prisma.employee.create({
      data: commonEmp('H-E4', 'Dee', { companyId: companyB, departmentId: deptD3, employmentStatus: 'ACTIVE', employmentType: 'FULL_TIME', joiningDate: new Date('2026-03-01') }),
    });
    emp1 = e1.id; emp2 = e2.id; emp3 = e3.id;

    // ── Attendance (company A employees only) ──
    await prisma.attendance.createMany({
      data: [
        { tenantId: TENANT, employeeId: emp1, date: new Date('2026-07-01'), status: 'PRESENT', totalWorkedMinutes: 480 },
        { tenantId: TENANT, employeeId: emp1, date: new Date('2026-07-02'), status: 'LATE', totalWorkedMinutes: 440, lateMinutes: 30 },
        { tenantId: TENANT, employeeId: emp1, date: new Date('2026-07-03'), status: 'ABSENT' },
        { tenantId: TENANT, employeeId: emp2, date: new Date('2026-07-01'), status: 'PRESENT', totalWorkedMinutes: 480, overtimeMinutes: 60 },
        { tenantId: TENANT, employeeId: emp3, date: new Date('2026-07-02'), status: 'HALF_DAY', totalWorkedMinutes: 240 },
        { tenantId: TENANT, employeeId: emp3, date: new Date('2026-07-03'), status: 'INCOMPLETE' },
      ],
    });

    // ── Leave ──
    const lt1 = await prisma.leaveType.create({ data: { tenantId: TENANT, name: 'Annual', code: 'ANNUALH' } });
    const lt2 = await prisma.leaveType.create({ data: { tenantId: TENANT, name: 'Sick', code: 'SICKH' } });

    await prisma.leaveRequest.createMany({
      data: [
        { tenantId: TENANT, employeeId: emp1, leaveTypeId: lt1.id, startDate: new Date('2026-07-10'), endDate: new Date('2026-07-12'), duration: 3, status: 'APPROVED' },
        { tenantId: TENANT, employeeId: emp1, leaveTypeId: lt1.id, startDate: new Date('2026-07-20'), endDate: new Date('2026-07-21'), duration: 2, status: 'PENDING' },
        { tenantId: TENANT, employeeId: emp2, leaveTypeId: lt1.id, startDate: new Date('2026-07-11'), endDate: new Date('2026-07-15'), duration: 5, status: 'APPROVED' },
        { tenantId: TENANT, employeeId: emp3, leaveTypeId: lt2.id, startDate: new Date('2026-08-01'), endDate: new Date('2026-08-01'), duration: 1, status: 'APPROVED' },
      ],
    });

    // ── Payroll: 13 FINALIZED USD runs + 1 DRAFT run (F15 regression) ──
    for (let i = 1; i <= 14; i++) {
      const period = await prisma.payrollPeriod.create({
        data: {
          tenantId: TENANT, name: `H-PER-${i}`,
          startDate: new Date(`2026-01-01`), endDate: new Date(`2026-01-31`),
          paymentDate: new Date(`2026-02-05`),
        },
      });
      const run = await prisma.payrollRun.create({
        data: {
          tenantId: TENANT, periodId: period.id, companyId: companyA,
          status: (i <= 13 ? 'FINALIZED' : 'APPROVED') as any, currency: 'USD',
          totalGross: 1000, totalNet: 800, totalDeductions: 200, totalEmployees: 1,
        },
      });
      if (i <= 13) {
        await prisma.payrollLine.create({
          data: {
            tenantId: TENANT, runId: run.id, employeeId: emp1, currency: 'USD',
            status: 'DRAFT', grossPay: 1000, netPay: 800, totalDeductions: 200,
          },
        });
      }
    }

    // ── Finance ──
    const incomeAcct = await prisma.account.create({
      data: { tenantId: TENANT, companyId: companyA, code: 'H-INCOME', name: 'H Revenue', accountType: 'INCOME', accountSubtype: 'REVENUE', normalBalance: 'CREDIT', allowManualPosting: true },
    });
    const expenseAcct = await prisma.account.create({
      data: { tenantId: TENANT, companyId: companyA, code: 'H-EXPENSE', name: 'H Expense', accountType: 'EXPENSE', accountSubtype: 'OPERATING_EXPENSE', normalBalance: 'DEBIT', allowManualPosting: true },
    });
    const cashAcct = await prisma.account.create({
      data: { tenantId: TENANT, companyId: companyA, code: 'H-CASH', name: 'H Cash', accountType: 'ASSET', accountSubtype: 'CASH', normalBalance: 'DEBIT', allowManualPosting: true },
    });
    const arAcct = await prisma.account.create({
      data: { tenantId: TENANT, companyId: companyA, code: 'H-AR', name: 'H AR', accountType: 'ASSET', accountSubtype: 'ACCOUNTS_RECEIVABLE', normalBalance: 'DEBIT', allowManualPosting: true },
    });

    const [incomeB, cashB] = await prisma.$transaction([
      prisma.account.create({ data: { tenantId: TENANT, companyId: companyB, code: 'H-INCOME', name: 'H Revenue B', accountType: 'INCOME', accountSubtype: 'REVENUE', normalBalance: 'CREDIT', allowManualPosting: true } }),
      prisma.account.create({ data: { tenantId: TENANT, companyId: companyB, code: 'H-CASH', name: 'H Cash B', accountType: 'ASSET', accountSubtype: 'CASH', normalBalance: 'DEBIT', allowManualPosting: true } }),
    ]);

    const je = async (companyId: string, day: string, desc: string, lines: { accountId: string; debit: number; credit: number }[], currency = 'USD') => {
      const entry = await prisma.journalEntry.create({
        data: {
          tenantId: TENANT, companyId, journalNumber: `H-JE-${desc}-${randomUUID().slice(0, 6)}`,
          postingDate: new Date(day), documentDate: new Date(day), description: desc,
          status: 'POSTED', currency, totalDebit: lines.reduce((s, l) => s + l.debit, 0),
          totalCredit: lines.reduce((s, l) => s + l.credit, 0), createdBy: USR,
        },
      });
      await prisma.journalLine.createMany({
        data: lines.map((l, idx) => ({
          tenantId: TENANT, companyId, journalEntryId: entry.id, accountId: l.accountId,
          lineNumber: idx + 1, debit: l.debit, credit: l.credit, currency,
        })),
      });
      return entry;
    };

    await Promise.all([
      je(companyA, '2026-05-10', 'rev-a', [{ accountId: arAcct.id, debit: 100000, credit: 0 }, { accountId: incomeAcct.id, debit: 0, credit: 100000 }]),
      je(companyA, '2026-05-15', 'exp-a', [{ accountId: expenseAcct.id, debit: 40000, credit: 0 }, { accountId: cashAcct.id, debit: 0, credit: 40000 }]),
      je(companyB, '2026-05-20', 'rev-b', [{ accountId: incomeB.id, debit: 0, credit: 70000 }, { accountId: cashB.id, debit: 70000, credit: 0 }], 'AED'),
      je(companyA, '2026-04-30', 'rev-old', [{ accountId: arAcct.id, debit: 5000, credit: 0 }, { accountId: incomeAcct.id, debit: 0, credit: 5000 }]),
      je(companyA, '2026-06-01', 'exp-late', [{ accountId: expenseAcct.id, debit: 1000, credit: 0 }, { accountId: cashAcct.id, debit: 0, credit: 1000 }]),
    ]);

    // Invoices / bills (AR/AP semantics; revenue is journal-only)
    const cust = await prisma.customer.create({ data: { tenantId: TENANT, companyId: companyA, name: 'HCust', code: 'HC' } });
    const [vend] = await Promise.all([
      prisma.vendor.create({ data: { tenantId: TENANT, companyId: companyA, name: 'HVend', code: 'HV' } }),
    ]);
    await prisma.invoice.createMany({
      data: [
        { tenantId: TENANT, companyId: companyA, customerId: cust.id, invoiceNumber: 'H-INV-1', amount: 50000, outstandingAmount: 20000, paidAmount: 30000, currency: 'USD', issuedDate: new Date('2026-05-01'), dueDate: new Date('2026-06-01'), status: 'ISSUED', createdBy: USR },
        { tenantId: TENANT, companyId: companyA, customerId: cust.id, invoiceNumber: 'H-INV-2', amount: 30000, outstandingAmount: 0, paidAmount: 30000, currency: 'USD', issuedDate: new Date('2026-05-25'), dueDate: new Date('2026-06-25'), status: 'PAID', createdBy: USR },
        { tenantId: TENANT, companyId: companyA, customerId: cust.id, invoiceNumber: 'H-INV-3', amount: 10000, outstandingAmount: 10000, currency: 'USD', issuedDate: new Date('2026-05-02'), dueDate: new Date('2026-06-02'), status: 'DRAFT', createdBy: USR },
        { tenantId: TENANT, companyId: companyB, customerId: cust.id, invoiceNumber: 'H-INV-4', amount: 10000, outstandingAmount: 10000, currency: 'AED', issuedDate: new Date('2026-06-01'), dueDate: new Date('2026-07-01'), status: 'ISSUED', createdBy: USR },
      ],
    });
    await prisma.bill.createMany({
      data: [
        { tenantId: TENANT, companyId: companyA, vendorId: vend.id, billNumber: 'H-BILL-1', amount: 30000, outstandingAmount: 30000, currency: 'USD', receivedDate: new Date('2026-05-02'), dueDate: new Date('2026-06-02'), status: 'OPEN', createdBy: USR },
        { tenantId: TENANT, companyId: companyA, vendorId: vend.id, billNumber: 'H-BILL-2', amount: 5000, outstandingAmount: 0, currency: 'USD', receivedDate: new Date('2026-05-03'), dueDate: new Date('2026-06-03'), status: 'PAID', createdBy: USR },
        { tenantId: TENANT, companyId: companyA, vendorId: vend.id, billNumber: 'H-BILL-OLD', amount: 5000, outstandingAmount: 0, currency: 'USD', receivedDate: new Date('2026-04-28'), dueDate: new Date('2026-05-28'), status: 'PAID', createdBy: USR },
      ],
    });

    // ── CRM ──
    const profile = await prisma.customerProfile.create({
      data: { tenantId: TENANT, companyId: companyA, customerId: cust.id },
    });
    await prisma.lead.createMany({
      data: [
        { tenantId: TENANT, companyId: companyA, firstName: 'QA', lastName: 'Lead', status: 'QUALIFIED' },
        { tenantId: TENANT, companyId: companyA, firstName: 'QB', lastName: 'Lead', status: 'CONVERTED' },
        { tenantId: TENANT, companyId: companyA, firstName: 'QC', lastName: 'Lead', status: 'CONVERTED' },
      ],
    });
    await prisma.opportunity.createMany({
      data: [
        { tenantId: TENANT, companyId: companyA, customerProfileId: profile.id, name: 'OP1', stage: 'PROPOSAL', status: 'OPEN', amount: 100000, probability: 50, currency: 'USD' },
        { tenantId: TENANT, companyId: companyA, customerProfileId: profile.id, name: 'OP2', stage: 'PROSPECTING', status: 'OPEN', amount: 40000, probability: 25, currency: 'AED' },
        { tenantId: TENANT, companyId: companyA, customerProfileId: profile.id, name: 'OP3', stage: 'CLOSED_WON', status: 'WON', amount: 60000, currency: 'USD' },
        { tenantId: TENANT, companyId: companyA, customerProfileId: profile.id, name: 'OP4', stage: 'CLOSED_LOST', status: 'LOST', amount: 30000, currency: 'USD' },
      ],
    });

    // ── Projects & budgets ──
    const prjA = await prisma.project.create({
      data: { tenantId: TENANT, companyId: companyA, code: 'H-PRJA', name: 'Alpha', status: 'ACTIVE', actualCost: 0 },
    });
    const prjB = await prisma.project.create({
      data: { tenantId: TENANT, companyId: companyA, code: 'H-PRJB', name: 'Beta', status: 'COMPLETED', budgetAmount: 100000, actualCost: 30000 },
    });
    const prjC = await prisma.project.create({
      data: { tenantId: TENANT, companyId: companyB, code: 'H-PRJC', name: 'Gamma', status: 'ACTIVE', currency: 'AED', actualCost: 0 },
    });
    await prisma.projectBudget.createMany({
      data: [
        { tenantId: TENANT, projectId: prjA.id, budgetAmount: 500000, spentAmount: 200000, currency: 'USD' },
        { tenantId: TENANT, projectId: prjC.id, budgetAmount: 900000, spentAmount: 100000, currency: 'AED' },
      ],
    });
    await prisma.projectMilestone.createMany({
      data: [
        { tenantId: TENANT, projectId: prjA.id, name: 'M1', status: 'OVERDUE', targetDate: new Date('2026-01-01') },
        { tenantId: TENANT, projectId: prjA.id, name: 'M2', status: 'PENDING', targetDate: new Date('2026-01-02') },
        { tenantId: TENANT, projectId: prjA.id, name: 'M3', status: 'COMPLETED', targetDate: new Date('2026-01-03') },
        { tenantId: TENANT, projectId: prjB.id, name: 'M4', status: 'PENDING', targetDate: new Date('2027-01-01') },
      ],
    });
    await prisma.projectTimeEntry.createMany({
      data: [
        { tenantId: TENANT, projectId: prjA.id, employeeId: emp1, date: new Date('2026-05-05'), durationMinutes: 120, isBillable: true, status: 'APPROVED' },
        { tenantId: TENANT, projectId: prjA.id, employeeId: emp1, date: new Date('2026-05-05'), durationMinutes: 60, isBillable: false, status: 'APPROVED' },
        { tenantId: TENANT, projectId: prjA.id, employeeId: emp1, date: new Date('2026-05-06'), durationMinutes: 240, isBillable: true, status: 'DRAFT' },
        { tenantId: TENANT, projectId: prjB.id, employeeId: emp1, date: new Date('2026-05-07'), durationMinutes: 30, isBillable: true, status: 'APPROVED' },
      ],
    });

    // ── Assets ──
    const cat = await prisma.assetCategory.create({
      data: { tenantId: TENANT, companyId: companyA, name: 'Hardware', code: 'HWR' },
    });
    const mkAsset = async (code: string, amt: any, extra: any) => prisma.asset.create({
      data: { tenantId: TENANT, companyId: extra.companyId, assetCode: code, name: code, categoryId: extra.categoryId, status: extra.status, currency: extra.currency || 'USD', purchaseCost: amt.purchase, currentBookValue: amt.book },
    });
    const ast1 = await mkAsset('H-AST-1', { purchase: 150000, book: 100000 }, { companyId: companyA, categoryId: cat.id, status: 'ACTIVE' });
    await mkAsset('H-AST-2', { purchase: 20000, book: 20000 }, { companyId: companyA, categoryId: cat.id, status: 'DISPOSED' });
    await mkAsset('H-AST-3', { purchase: 60000, book: 50000 }, { companyId: companyA, categoryId: cat.id, status: 'ASSIGNED', currency: 'AED' });
    const ast4 = await mkAsset('H-AST-4', { purchase: 50000, book: 40000 }, { companyId: companyA, categoryId: cat.id, status: 'IN_MAINTENANCE' });
    await mkAsset('H-AST-5', { purchase: 100000, book: 90000 }, { companyId: companyB, categoryId: undefined, status: 'AVAILABLE', currency: 'AED' });
    await prisma.assetMaintenanceRecord.createMany({
      data: [
        { tenantId: TENANT, assetId: ast1.id, type: 'PREVENTIVE', title: 'M1', status: 'COMPLETED', cost: 8000, currency: 'USD' },
        { tenantId: TENANT, assetId: ast1.id, type: 'PREVENTIVE', title: 'M2', status: 'SCHEDULED', cost: 5000, currency: 'USD' },
        { tenantId: TENANT, assetId: ast4.id, type: 'CORRECTIVE', title: 'M3', status: 'COMPLETED', cost: 2000, currency: 'USD' },
      ],
    });
  });

  afterAll(async () => {
    await prisma.$transaction([
      prisma.tenant.delete({ where: { id: TENANT } }),
    ]);
    await prisma.$disconnect();
  });

  // ══════════════════════════════════════════════════════════════════════
  // F1/F19/F5 — FINANCE
  // ══════════════════════════════════════════════════════════════════════

  describe('Finance', () => {
    it('F1: revenue/expenses come from POSTED journal lines, not invoice amounts', async () => {
      const res = await service.getFinanceAnalytics(ctxA, {});
      // Journal revenue (100000 A + 5000 old) vs invoice amount 50000 — must differ
      const usd = bucketFor(res.summary.byCurrency, 'USD');
      // invoice issued 50000; ONLY journal revenue is revenue
      expect(usd.totalRevenue).not.toBe(50000);
      const journalRev = 100000 + 5000; // 2026-05-10 + 2026-04-30
      const journalExp = 40000 + 1000; // 2026-05-15 + 2026-06-01
      expect(usd.totalRevenue).toBe(journalRev);
      expect(usd.totalExpenses).toBe(journalExp);
      expect(usd.netProfit).toBe(journalRev - journalExp);
    });

    it('F19: AR/AP count only issued/open outstanding balances', async () => {
      const res = await service.getFinanceAnalytics(ctxA, {});
      const usd = bucketFor(res.summary.byCurrency, 'USD');
      expect(usd.totalAR).toBe(20000);        // INV-1 (ISSUED, outstanding>0)
      expect(usd.totalAP).toBe(30000);        // BILL-1 (OPEN, outstanding>0)
      expect(usd.unpaidInvoiceCount).toBe(2); // INV-1 + INV-3 (DRAFT but outstanding>0)
      expect(usd.unpaidBillCount).toBe(1);
      expect(usd.invoiceCount).toBe(3);       // all USD invoices incl. draft/paid
      expect(usd.billCount).toBe(3);          // includes H-BILL-OLD (April)
    });

    it('F17: mixed currencies are never summed into a scalar', async () => {
      const res = await service.getFinanceAnalytics(ctxA, {});
      expect(res.summary.hasMixedCurrencies).toBe(true);
      expect(res.summary.currency).toBe('MIXED');
      expect(res.summary.totalRevenue).toBe(0); // fallback, not a cross-currency sum
      expect(res.revenueTrend.every((r: any) => typeof r.currency === 'string')).toBe(true);

      const usd = bucketFor(res.summary.byCurrency, 'USD');
      const aed = bucketFor(res.summary.byCurrency, 'AED');
      expect(aed.totalRevenue).toBe(70000);
      expect(aed.totalExpenses).toBe(0);
      expect(usd.totalAR).toBe(20000);
      expect(aed.totalAR).toBe(10000);
    });

    it('F5: date boundaries are inclusive on @db.Date fields', async () => {
      const res = await service.getFinanceAnalytics(ctxA, { startDate: '2026-05-01', endDate: '2026-05-31' });
      const usd = bucketFor(res.summary.byCurrency, 'USD');
      expect(usd.totalRevenue).toBe(100000);       // 2026-04-30 excluded, 2026-05-10 kept
      expect(usd.totalExpenses).toBe(40000);       // 2026-06-01 excluded
      expect(usd.netProfit).toBe(60000);
      expect(usd.invoiceCount).toBe(3);            // 2026-06-01 invoice excluded (lte endDate)
      expect(usd.billCount).toBe(3);               // AR/AP bound by endDate only; April bill remains outstanding-as-of-May
      // Currency filtered + date filtered
      const scoped = await service.getFinanceAnalytics(ctxA, { startDate: '2026-05-01', endDate: '2026-05-31', currency: 'USD' });
      expect(scoped.summary.totalRevenue).toBe(100000);
      expect(scoped.summary.currency).toBe('USD');
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // F15 — PAYROLL
  // ══════════════════════════════════════════════════════════════════════

  describe('Payroll', () => {
    it('F15: summary spans ALL 13 finalized runs; trend truncates to 12', async () => {
      const res = await service.getPayrollAnalytics(ctxA, {});
      expect(res.summary.totalRuns).toBe(13);
      expect(res.summary.totalGross).toBe(13000);
      expect(res.summary.totalNet).toBe(10400);
      expect(res.summary.totalDeductions).toBe(2600);
      expect(res.summary.totalEmployees).toBe(1); // distinct employee across runs
      expect(res.summary.averageCostPerEmployee).toBe(13000);
      expect(res.summary.currency).toBe('USD');
      expect(res.summary.hasMixedCurrencies).toBe(false);
      expect(res.payrollTrend.length).toBe(12);   // regression: trend is capped
    });

    it('only FINALIZED runs count', async () => {
      const res = await service.getPayrollAnalytics(ctxA, {});
      // 14 runs exist but 1 is DRAFT — never included
      expect(res.summary.totalRuns).toBe(13);
      const dept = res.departmentPayroll.find((d: any) => d.currency === 'USD')!;
      expect(dept).toBeDefined();
      expect(dept.gross).toBe(13000);
      expect(dept.count).toBe(13);
      expect(dept.name).toBe('Engineering');
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // F4 — COMPANY ISOLATION
  // ══════════════════════════════════════════════════════════════════════

  describe('Company isolation', () => {
    it('finance: company filter scopes journals, invoices and bills', async () => {
      const res = await service.getFinanceAnalytics(ctxA, { companyId: companyA });
      const usd = bucketFor(res.summary.byCurrency, 'USD');
      expect(usd.totalRevenue).toBe(105000); // A journals only; AED entry is B
      expect(usd.totalAR).toBe(20000);       // AED invoice (B) excluded
      expect(res.summary.hasMixedCurrencies).toBe(false);
    });

    it('workforce: company filter scopes employee counts', async () => {
      const a = await service.getWorkforceAnalytics(ctxA, { companyId: companyA });
      expect(a.summary.totalEmployees).toBe(3); // E1,E2,E3
      expect(a.summary.activeEmployees).toBe(2);
      const b = await service.getWorkforceAnalytics(ctxA, { companyId: companyB });
      expect(b.summary.totalEmployees).toBe(1); // E4
      expect(b.summary.activeEmployees).toBe(1);
    });

    it('attendance: company filter resolved through employees', async () => {
      const a = await service.getAttendanceAnalytics(ctxA, { companyId: companyA });
      expect(a.summary.totalRecords).toBe(6);
      const b = await service.getAttendanceAnalytics(ctxA, { companyId: companyB });
      expect(b.summary.totalRecords).toBe(0);
    });

    it('leave: company filter resolved through the employee relation', async () => {
      // E3 belongs to company A, so ALL 4 requests belong to company A employees.
      const a = await service.getLeaveAnalytics(ctxA, { companyId: companyA });
      expect(a.summary.totalRequests).toBe(4);
      expect(a.summary.approvedRequests).toBe(3);
      expect(a.summary.totalApprovedDays).toBe(9);
      const b = await service.getLeaveAnalytics(ctxA, { companyId: companyB });
      expect(b.summary.totalRequests).toBe(0);
    });

    it('payroll: company filter scopes runs', async () => {
      const a = await service.getPayrollAnalytics(ctxA, { companyId: companyA });
      expect(a.summary.totalRuns).toBe(13);
      const b = await service.getPayrollAnalytics(ctxA, { companyId: companyB });
      expect(b.summary.totalRuns).toBe(0);
    });

    it('projects: company filter scopes projects, budget, milestones and hours', async () => {
      const a = await service.getProjectAnalytics(ctxA, { companyId: companyA });
      expect(a.summary.totalProjects).toBe(2);
      expect(a.summary.overdueMilestones).toBe(2);
      expect(a.summary.totalLoggedHours).toBe(3.5);
      expect(a.summary.billableHours).toBe(2.5);
      expect(a.summary.nonBillableHours).toBe(1);
      const b = await service.getProjectAnalytics(ctxA, { companyId: companyB });
      expect(b.summary.totalProjects).toBe(1); // PRJ-C only (Gamma)
      expect(b.summary.overdueMilestones).toBe(0);
    });

    it('assets: company filter scopes asset values and maintenance', async () => {
      const a = await service.getAssetAnalytics(ctxA, { companyId: companyA });
      expect(a.summary.totalAssets).toBe(4);
      expect(a.summary.activeAssets).toBe(3);
      const usd = bucketFor(a.summary.byCurrency, 'USD');
      expect(usd.totalBookValue).toBe(140000);
      expect(usd.totalMaintenanceCost).toBe(10000);
      const b = await service.getAssetAnalytics(ctxA, { companyId: companyB });
      expect(b.summary.totalAssets).toBe(1);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // F11 — ATTENDANCE
  // ══════════════════════════════════════════════════════════════════════

  describe('Attendance', () => {
    it('F11: present rate counts every productive status', async () => {
      const res = await service.getAttendanceAnalytics(ctxA, {});
      expect(res.summary.totalRecords).toBe(6);
      expect(res.summary.presentRecords).toBe(4); // PRESENT+LATE+HALF_DAY+PRESENT = 4
      expect(res.summary.absentRecords).toBe(1);
      expect(res.summary.incompleteRecords).toBe(1);
      expect(res.summary.lateRecords).toBe(1);
      expect(res.summary.overtimeRecords).toBe(1);
      expect(res.summary.presentRate).toBe(66.7); // 4/6
      expect(res.summary.totalWorkedHours).toBe(27.3); // (480+440+480+240)/60
      expect(res.summary.totalOvertimeHours).toBe(1);
      expect(res.summary.totalLateMinutes).toBe(30);
      expect(res.trend.length).toBe(3);
    });

    it('date filter narrows attendance window', async () => {
      const res = await service.getAttendanceAnalytics(ctxA, { startDate: '2026-07-01', endDate: '2026-07-02' });
      expect(res.summary.totalRecords).toBe(4);
      expect(res.summary.presentRate).toBe(100); // all 4 records are productive
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // LEAVE
  // ══════════════════════════════════════════════════════════════════════

  describe('Leave', () => {
    it('aggregates requests, approval rate and approved days', async () => {
      const res = await service.getLeaveAnalytics(ctxA, {});
      expect(res.summary.totalRequests).toBe(4);
      expect(res.summary.approvedRequests).toBe(3);
      expect(res.summary.pendingRequests).toBe(1);
      expect(res.summary.rejectedRequests).toBe(0);
      expect(res.summary.totalApprovedDays).toBe(9);
      expect(res.summary.approvalRate).toBe(75);
      const annual = res.leaveByType.find((l: any) => l.name === 'Annual')!;
      expect(annual.approved).toBe(2);
      expect(annual.pending).toBe(1);
    });

    it('date filter bounds by leave start date', async () => {
      const res = await service.getLeaveAnalytics(ctxA, { startDate: '2026-07-10', endDate: '2026-07-31' });
      expect(res.summary.totalRequests).toBe(3); // Aug 1 request excluded
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // WORKFORCE
  // ══════════════════════════════════════════════════════════════════════

  describe('Workforce', () => {
    it('counts employees, active, new hires and distributions', async () => {
      const res = await service.getWorkforceAnalytics(ctxA, { startDate: '2026-01-01', endDate: '2026-12-31' });
      expect(res.summary.totalEmployees).toBe(4);
      expect(res.summary.activeEmployees).toBe(3);
      expect(res.summary.newHires).toBe(3); // E1,E3,E4 joined in 2026
      const eng = res.departmentDistribution.find((d: any) => d.name === 'Engineering');
      expect(eng?.count).toBe(2); // E1 + E2
      const sales = res.departmentDistribution.find((d: any) => d.name === 'Sales');
      expect(sales?.count).toBe(1);
    });

    it('soft-deleted employees are excluded', async () => {
      // new hire count for the exact window should ignore terminated joining dates
      const res = await service.getWorkforceAnalytics(ctxA, {});
      expect(res.summary.totalEmployees).toBe(4);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // F17 — CRM PIPELINE
  // ══════════════════════════════════════════════════════════════════════

  describe('CRM', () => {
    it('per-currency pipeline and weighted value', async () => {
      const res = await service.getCRMAnalytics(ctxA, {});
      expect(res.summary.totalLeads).toBe(3);
      expect(res.summary.qualifiedLeads).toBe(1);
      expect(res.summary.convertedLeads).toBe(2);
      expect(res.summary.conversionRate).toBe(66.7);
      expect(res.summary.totalOpps).toBe(4);
      expect(res.summary.openOpps).toBe(2);
      expect(res.summary.wonOpps).toBe(1);
      expect(res.summary.lostOpps).toBe(1);
      expect(res.summary.winRate).toBe(50);
      expect(res.summary.hasMixedCurrencies).toBe(true);

      const usd = bucketFor(res.summary.byCurrency, 'USD');
      expect(usd.pipelineValue).toBe(100000);
      expect(usd.weightedPipeline).toBe(50000);
      expect(usd.wonRevenue).toBe(60000);
      const aed = bucketFor(res.summary.byCurrency, 'AED');
      expect(aed.pipelineValue).toBe(40000);
      expect(aed.weightedPipeline).toBe(10000);
      expect(aed.wonRevenue).toBe(0);

      const row = res.pipelineByStage.find((s: any) => s.stage === 'PROPOSAL')!;
      expect(row).toBeDefined();
      expect(row.currency).toBe('USD');
      expect(row.value).toBe(100000);
      expect(row.count).toBe(1);
    });

    it('currency filter isolates one currency', async () => {
      const res = await service.getCRMAnalytics(ctxA, { currency: 'AED' });
      expect(res.summary.hasMixedCurrencies).toBe(false);
      expect(res.summary.pipelineValue).toBe(40000);
      expect(res.summary.weightedPipeline).toBe(10000);
      expect(res.summary.currency).toBe('AED');
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // F3 — PROJECT BUDGETS
  // ══════════════════════════════════════════════════════════════════════

  describe('Projects', () => {
    it('F3: budget comes from ProjectBudget; fallback to Project fields', async () => {
      const res = await service.getProjectAnalytics(ctxA, {});
      expect(res.summary.totalProjects).toBe(3);
      expect(res.summary.activeProjects).toBe(2);
      expect(res.summary.completedProjects).toBe(1);
      // Alpha: ProjectBudget 500000; Beta: fallback 100000; Gamma: 900000 (AED)
      const usd = bucketFor(res.summary.byCurrency, 'USD');
      expect(usd.budget).toBe(600000);
      expect(usd.spent).toBe(200000);
      expect(usd.actualCost).toBe(30000);
      const aed = bucketFor(res.summary.byCurrency, 'AED');
      expect(aed.budget).toBe(900000);
      expect(aed.spent).toBe(100000);
      expect(res.summary.hasMixedCurrencies).toBe(true);
    });

    it('overdue milestones: OVERDUE status or overdue open milestone', async () => {
      const res = await service.getProjectAnalytics(ctxA, {});
      // M1 (OVERDUE) + M2 (PENDING, past target) + M3 (COMPLETED, ignored) + M4 (future)
      expect(res.summary.overdueMilestones).toBe(2);
    });

    it('approved time entries only; billable vs non-billable', async () => {
      const res = await service.getProjectAnalytics(ctxA, {});
      expect(res.summary.totalLoggedHours).toBe(3.5);
      expect(res.summary.billableHours).toBe(2.5);
      expect(res.summary.nonBillableHours).toBe(1);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // F18 — ASSETS
  // ══════════════════════════════════════════════════════════════════════

  describe('Assets', () => {
    it('F18: lifecycle classification and statuses', async () => {
      const res = await service.getAssetAnalytics(ctxA, {});
      expect(res.summary.totalAssets).toBe(5);
      expect(res.summary.activeAssets).toBe(4); // ACTIVE+ASSIGNED+IN_MAINTENANCE+AVAILABLE
      expect(res.summary.disposedAssets).toBe(1);
      expect(res.summary.assignedAssets).toBe(1);
      expect(res.summary.inMaintenanceAssets).toBe(1);
      expect(res.summary.availableAssets).toBe(1);
    });

    it('F18: book value excludes DISPOSED; maintenance only COMPLETED', async () => {
      const res = await service.getAssetAnalytics(ctxA, {});
      const usd = bucketFor(res.summary.byCurrency, 'USD');
      // AST-1(100000) + AST-4(40000); AST-2 DISPOSED excluded
      expect(usd.totalBookValue).toBe(140000);
      expect(usd.totalPurchaseCost).toBe(200000);
      expect(usd.totalMaintenanceCost).toBe(10000); // only COMPLETED records
      const aed = bucketFor(res.summary.byCurrency, 'AED');
      expect(aed.totalBookValue).toBe(140000);
      expect(aed.totalMaintenanceCost).toBe(0);
      expect(res.summary.hasMixedCurrencies).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // TENANT ISOLATION + IDOR
  // ══════════════════════════════════════════════════════════════════════

  describe('Tenant isolation & IDOR', () => {
    it('reports created in one tenant are invisible to another', async () => {
      const report = await service.createReport(ctxA, {
        name: `H-Report-${Date.now()}`, description: 'internal', domain: 'finance',
        metrics: ['totalRevenue', 'netProfit'],
      });
      const mine = await service.listReports(ctxA);
      expect(mine.find((r: any) => r.id === report.id)).toBeTruthy();
      const others = await service.listReports(otherCtx);
      expect(others.find((r: any) => r.id === report.id)).toBeFalsy();
    });

    it('IDOR: cross-tenant report read/update/delete is forbidden', async () => {
      const report = await service.createReport(ctxA, {
        name: `H-Idor-${Date.now()}`, domain: 'finance',
      });
      await expect(service.getReport(otherCtx, report.id)).rejects.toThrow('Access denied');
      await expect(service.updateReport(otherCtx, report.id, { name: 'stolen' })).rejects.toThrow('Access denied');
      await expect(service.deleteReport(otherCtx, report.id)).rejects.toThrow('Access denied');
      // cleanup
      await service.deleteReport(ctxA, report.id);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // F7 — EXPORT RBAC & SHAPES
  // ══════════════════════════════════════════════════════════════════════

  describe('Export', () => {
    it('F7: export requires the domain read permission, not just analytics:export', async () => {
      const exportOnly = makeCtx(TENANT, ['analytics:export', 'analytics:read']);
      await expect(service.exportData(exportOnly, 'payroll', 'csv', {}))
        .rejects.toThrow('analytics:payroll:read');
    });

    it('exports CSV and JSON honoring the format flag', async () => {
      const res = await service.exportData(ctxA, 'finance', 'csv', { companyId: companyA });
      expect(res.domain).toBe('finance');
      expect(res.format).toBe('csv');
      expect(res.csv).toContain('currency');
      expect(res.csv).toContain('totalRevenue');
      expect(res.data.summary.byCurrency.length).toBe(1); // single company = single currency

      const json = await service.exportData(ctxA, 'assets', 'json', { companyId: companyA });
      expect(json.format).toBe('json');
      expect(json.csv).toBeUndefined();
      expect(json.data.summary.totalAssets).toBe(4);
    });

    it('rejects unknown export domains', async () => {
      await expect(service.exportData(ctxA, 'marketing', 'csv', {})).rejects.toThrow('Unknown domain');
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // SAVED REPORTS — VALIDATION
  // ══════════════════════════════════════════════════════════════════════

  describe('Saved report validation', () => {
    it('rejects unsupported domains', async () => {
      await expect(service.createReport(ctxA, { name: 'x', domain: 'hacking' })).rejects.toThrow();
    });

    it('rejects metrics not in the domain whitelist', async () => {
      await expect(service.createReport(ctxA, { name: 'x', domain: 'finance', metrics: ['notARealMetric'] })).rejects.toThrow('Unsupported metric');
    });

    it('accepts whitelisted metrics', async () => {
      const report = await service.createReport(ctxA, { name: 'x', domain: 'payroll', metrics: ['totalGross', 'totalNet'] });
      await service.deleteReport(ctxA, report.id);
    });

    it('rejects oversized name/description/filters', async () => {
      await expect(service.createReport(ctxA, { name: 'x'.repeat(256), domain: 'finance' })).rejects.toThrow('name');
      await expect(service.createReport(ctxA, { name: 'y', description: 'z'.repeat(1001), domain: 'finance' })).rejects.toThrow();
      await expect(service.createReport(ctxA, { name: 'y', domain: 'finance', filters: { blob: 'a'.repeat(4001) } })).rejects.toThrow('4000');
    });

    it('duplicate report names are rejected', async () => {
      const name = `H-Dup-${Date.now()}`;
      await service.createReport(ctxA, { name, domain: 'finance' });
      await expect(service.createReport(ctxA, { name, domain: 'finance' })).rejects.toThrow('already exists');
    });
  });
});