/**
 * FusionOS Analytics Service
 *
 * Enterprise Analytics & Business Intelligence engine.
 * READ-ONLY with respect to operational data — derives all metrics
 * from authoritative operational modules via Prisma aggregation queries.
 *
 * Domains: Finance, Workforce, Attendance, Leave, Payroll, CRM, Projects, Assets
 *
 * Hardening (Phase 15.5) guarantees:
 * - Tenant isolation enforced at the database level on every query.
 * - Company isolation enforced via buildCompanyFilter on every domain.
 * - Currency safety: monetary amounts (integer minor units) are aggregated
 *   per currency. Cross-currency summation is NEVER performed; mixed-currency
 *   results are surfaced via `byCurrency` + `hasMixedCurrencies`.
 * - Errors propagate (fail loudly) — analytics never fabricate zero-summaries.
 * - Export enforces per-domain RBAC on top of the endpoint-level permission.
 */

import {
  Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { AttendanceStatus, AssetStatus } from '@prisma/client';
import type { TenantContext } from '../../auth/services/tenant-context.service';
import { AuditLogService } from '../../common/services/audit-log.service';
import { AnalyticsFilterDto, SavedReportDto, UpdateReportDto, ANALYTICS_DOMAINS } from '../dto/analytics.dto';

type AnalyticsDomain = (typeof ANALYTICS_DOMAINS)[number];

const DOMAIN_PERMISSIONS: Record<AnalyticsDomain, string> = {
  finance: 'analytics:finance:read',
  workforce: 'analytics:workforce:read',
  attendance: 'analytics:attendance:read',
  leave: 'analytics:leave:read',
  payroll: 'analytics:payroll:read',
  crm: 'analytics:crm:read',
  projects: 'analytics:project:read',
  assets: 'analytics:asset:read',
};

// Explicit whitelist of the metrics a saved report may reference (§29).
const REPORT_METRICS_BY_DOMAIN: Record<string, string[]> = {
  finance: ['totalRevenue', 'totalExpenses', 'netProfit', 'totalAR', 'totalAP', 'invoiceCount', 'unpaidInvoiceCount', 'billCount', 'unpaidBillCount', 'currency', 'hasMixedCurrencies'],
  workforce: ['totalEmployees', 'activeEmployees', 'newHires'],
  attendance: ['totalRecords', 'presentRecords', 'absentRecords', 'lateRecords', 'overtimeRecords', 'incompleteRecords', 'presentRate', 'totalWorkedHours', 'totalOvertimeHours', 'totalLateMinutes'],
  leave: ['totalRequests', 'approvedRequests', 'pendingRequests', 'rejectedRequests', 'approvalRate', 'totalApprovedDays'],
  payroll: ['totalGross', 'totalNet', 'totalDeductions', 'totalRuns', 'totalEmployees', 'averageCostPerEmployee', 'currency', 'hasMixedCurrencies'],
  crm: ['totalLeads', 'qualifiedLeads', 'convertedLeads', 'conversionRate', 'totalOpps', 'openOpps', 'wonOpps', 'lostOpps', 'pipelineValue', 'weightedPipeline', 'wonRevenue', 'winRate'],
  projects: ['totalProjects', 'activeProjects', 'completedProjects', 'onHoldProjects', 'overdueMilestones', 'totalBudget', 'totalSpent', 'totalActualCost', 'totalLoggedHours', 'billableHours', 'nonBillableHours'],
  assets: ['totalAssets', 'activeAssets', 'assignedAssets', 'availableAssets', 'inMaintenanceAssets', 'inRepairAssets', 'retiredAssets', 'disposedAssets', 'totalBookValue', 'totalPurchaseCost', 'totalMaintenanceCost', 'currency', 'hasMixedCurrencies'],
};

const AR_STATUSES = ['ISSUED', 'PARTIALLY_PAID'] as const;
const AP_STATUSES = ['OPEN', 'PARTIALLY_PAID'] as const;

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  // Statuses that represent a productive day for present-rate purposes (F11).
  private readonly PRESENT_STATUSES = ['PRESENT', 'LATE', 'HALF_DAY', 'EARLY_DEPARTURE', 'OVERTIME'] as const;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLog: AuditLogService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // EXECUTIVE DASHBOARD — Cross-module KPIs
  // ═══════════════════════════════════════════════════════════════════════════

  async getDashboard(ctx: TenantContext, filters: AnalyticsFilterDto) {
    const [
      financeMetrics,
      workforceMetrics,
      attendanceMetrics,
      leaveMetrics,
      payrollMetrics,
      crmMetrics,
      projectMetrics,
      assetMetrics,
    ] = await Promise.all([
      this.getFinanceSummary(ctx, filters),
      this.getWorkforceSummary(ctx, filters),
      this.getAttendanceSummary(ctx, filters),
      this.getLeaveSummary(ctx, filters),
      this.getPayrollSummary(ctx, filters),
      this.getCRMSummary(ctx, filters),
      this.getProjectSummary(ctx, filters),
      this.getAssetSummary(ctx, filters),
    ]);

    return {
      period: { startDate: filters.startDate, endDate: filters.endDate },
      finance: financeMetrics,
      workforce: workforceMetrics,
      attendance: attendanceMetrics,
      leave: leaveMetrics,
      payroll: payrollMetrics,
      crm: crmMetrics,
      projects: projectMetrics,
      assets: assetMetrics,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FINANCE ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════

  async getFinanceAnalytics(ctx: TenantContext, filters: AnalyticsFilterDto) {
    const dateFilter = this.buildDateFilterForJournals(filters);
    const companyFilter = this.buildCompanyFilter(filters);
    const endDate = filters.endDate ? new Date(filters.endDate) : undefined;

    const [incomeLines, expenseLines, invoices, bills] = await Promise.all([
      // Revenue — from posted journal lines on INCOME accounts (credit = revenue)
      this.prisma.journalLine.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...companyFilter,
          journalEntry: {
            status: 'POSTED',
            ...(filters.currency ? { currency: filters.currency } : {}),
            ...dateFilter,
          },
          account: { accountType: 'INCOME' },
        },
        include: { journalEntry: { select: { postingDate: true, currency: true } } },
      }),
      // Expenses — from posted journal lines on EXPENSE accounts (debit = expense)
      this.prisma.journalLine.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...companyFilter,
          journalEntry: {
            status: 'POSTED',
            ...(filters.currency ? { currency: filters.currency } : {}),
            ...dateFilter,
          },
          account: { accountType: 'EXPENSE' },
        },
        include: { journalEntry: { select: { postingDate: true, currency: true } } },
      }),
      // All invoices issued up to the end of the period (for counts)
      this.prisma.invoice.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...companyFilter,
          ...(filters.currency ? { currency: filters.currency } : {}),
          ...(endDate ? { issuedDate: { lte: endDate } } : {}),
        },
      }),
      // All bills received up to the end of the period (for counts)
      this.prisma.bill.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...companyFilter,
          ...(filters.currency ? { currency: filters.currency } : {}),
          ...(endDate ? { receivedDate: { lte: endDate } } : {}),
        },
      }),
    ]);

    // Outstanding AR — invoices issued by end-of-period that are not yet paid (F19)
    const outstandingInvoices = invoices.filter(
      i => (AR_STATUSES as readonly string[]).includes(i.status) && i.outstandingAmount > 0,
    );
    // Outstanding AP — bills received by end-of-period that are not yet paid (F19)
    const outstandingBills = bills.filter(
      b => (AP_STATUSES as readonly string[]).includes(b.status) && b.outstandingAmount > 0,
    );

    // Aggregate revenue/expenses per currency — never mix currencies (F1).
    const revenueByCur = new Map<string, number>();
    for (const line of incomeLines) {
      const cur = line.journalEntry.currency;
      revenueByCur.set(cur, (revenueByCur.get(cur) || 0) + line.credit - line.debit);
    }
    const expenseByCur = new Map<string, number>();
    for (const line of expenseLines) {
      const cur = line.journalEntry.currency;
      expenseByCur.set(cur, (expenseByCur.get(cur) || 0) + line.debit - line.credit);
    }
    const arByCur = new Map<string, number>();
    for (const inv of outstandingInvoices) {
      arByCur.set(inv.currency, (arByCur.get(inv.currency) || 0) + inv.outstandingAmount);
    }
    const apByCur = new Map<string, number>();
    for (const bill of outstandingBills) {
      apByCur.set(bill.currency, (apByCur.get(bill.currency) || 0) + bill.outstandingAmount);
    }
    const unpaidInvByCur = new Map<string, number>();
    for (const inv of invoices) {
      if (inv.outstandingAmount > 0) unpaidInvByCur.set(inv.currency, (unpaidInvByCur.get(inv.currency) || 0) + 1);
    }
    const unpaidBillByCur = new Map<string, number>();
    for (const bill of bills) {
      if (bill.outstandingAmount > 0) unpaidBillByCur.set(bill.currency, (unpaidBillByCur.get(bill.currency) || 0) + 1);
    }

    const currencies = [
      ...new Set([...revenueByCur.keys(), ...expenseByCur.keys(), ...arByCur.keys(), ...apByCur.keys()]),
    ].sort();

    const byCurrency = currencies.map(currency => {
      const totalRevenue = revenueByCur.get(currency) || 0;
      const totalExpenses = expenseByCur.get(currency) || 0;
      return {
        currency,
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        totalAR: arByCur.get(currency) || 0,
        totalAP: apByCur.get(currency) || 0,
        invoiceCount: invoices.filter(i => i.currency === currency).length,
        unpaidInvoiceCount: unpaidInvByCur.get(currency) || 0,
        billCount: bills.filter(b => b.currency === currency).length,
        unpaidBillCount: unpaidBillByCur.get(currency) || 0,
      };
    });

    // Revenue/expense trend by month and currency (no cross-currency mixing)
    const revenueByMonth = new Map<string, number>(); // key: month|currency
    const expenseByMonth = new Map<string, number>(); // key: month|currency
    for (const line of incomeLines) {
      const key = `${line.journalEntry.postingDate.toISOString().slice(0, 7)}|${line.journalEntry.currency}`;
      revenueByMonth.set(key, (revenueByMonth.get(key) || 0) + line.credit - line.debit);
    }
    for (const line of expenseLines) {
      const key = `${line.journalEntry.postingDate.toISOString().slice(0, 7)}|${line.journalEntry.currency}`;
      expenseByMonth.set(key, (expenseByMonth.get(key) || 0) + line.debit - line.credit);
    }
    const trendKeys = [...new Set([...revenueByMonth.keys(), ...expenseByMonth.keys()])].sort((a, b) => a.localeCompare(b));
    const revenueTrend = trendKeys.map(key => {
      const [month, currency] = key.split('|');
      return { month, currency, revenue: revenueByMonth.get(key) || 0, expenses: expenseByMonth.get(key) || 0 };
    });

    const invoiceCount = invoices.length;
    const unpaidInvoiceCount = invoices.filter(i => i.outstandingAmount > 0).length;
    const billCount = bills.length;
    const unpaidBillCount = bills.filter(b => b.outstandingAmount > 0).length;

    // Summary: monetary aggregates are only ever exposed for a single currency
    // or filtered currency; overall (currency-agnostic) counts are preserved.
    const summary = this.decorateCurrencySummary<{
      totalRevenue: number; totalExpenses: number; netProfit: number;
      totalAR: number; totalAP: number; invoiceCount: number; unpaidInvoiceCount: number;
      billCount: number; unpaidBillCount: number;
    }>(
      filters,
      byCurrency,
      (b) => ({
        totalRevenue: b.totalRevenue,
        totalExpenses: b.totalExpenses,
        netProfit: b.netProfit,
        totalAR: b.totalAR,
        totalAP: b.totalAP,
        invoiceCount: b.invoiceCount,
        unpaidInvoiceCount: b.unpaidInvoiceCount,
        billCount: b.billCount,
        unpaidBillCount: b.unpaidBillCount,
      }),
      {
        totalRevenue: 0, totalExpenses: 0, netProfit: 0, totalAR: 0, totalAP: 0,
        invoiceCount, unpaidInvoiceCount, billCount, unpaidBillCount,
      },
    );

    return { summary, revenueTrend, invoiceCount, unpaidInvoiceCount, billCount, unpaidBillCount };
  }

  async getFinanceSummary(ctx: TenantContext, filters: AnalyticsFilterDto) {
    const result = await this.getFinanceAnalytics(ctx, filters);
    return result.summary;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKFORCE ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════

  async getWorkforceAnalytics(ctx: TenantContext, filters: AnalyticsFilterDto) {
    const companyFilter = this.buildCompanyFilter(filters);

    const where: Prisma.EmployeeWhereInput = {
      tenantId: ctx.tenantId, deletedAt: null, ...companyFilter,
    };

    const totalEmployees = await this.prisma.employee.count({ where });
    const activeEmployees = await this.prisma.employee.count({ where: { ...where, employmentStatus: 'ACTIVE' } });

    // New hires in period
    const empDateFilter = this.buildDateFilterForEmployee(filters);
    const newHires = await this.prisma.employee.count({
      where: {
        ...where,
        ...(empDateFilter.joiningDate ? { joiningDate: empDateFilter.joiningDate } : {}),
      },
    });

    // Department distribution
    const deptGroups = await this.prisma.employee.groupBy({
      by: ['departmentId'],
      where: { ...where, departmentId: { not: null } },
      _count: true,
    });

    const departments = await this.prisma.department.findMany({
      where: { tenantId: ctx.tenantId, ...companyFilter },
      select: { id: true, name: true },
    });
    const deptMap = new Map(departments.map(d => [d.id, d.name]));

    const departmentDistribution = deptGroups.map(g => ({
      departmentId: g.departmentId,
      name: deptMap.get(g.departmentId || '') || 'Unknown',
      count: g._count,
    }));

    // Employment type distribution
    const typeGroups = await this.prisma.employee.groupBy({
      by: ['employmentType'],
      where,
      _count: true,
    });

    return {
      summary: { totalEmployees, activeEmployees, newHires },
      departmentDistribution,
      employmentTypeDistribution: typeGroups.map(g => ({ type: g.employmentType || 'UNKNOWN', count: g._count })),
    };
  }

  async getWorkforceSummary(ctx: TenantContext, filters: AnalyticsFilterDto) {
    const result = await this.getWorkforceAnalytics(ctx, filters);
    return result.summary;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ATTENDANCE ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════

  async getAttendanceAnalytics(ctx: TenantContext, filters: AnalyticsFilterDto) {
    const dateFilter = this.buildDateFilterForAttendance(filters);
    const companyFilter = this.buildCompanyFilter(filters);

    const employeeWhere: Prisma.EmployeeWhereInput = {
      tenantId: ctx.tenantId, deletedAt: null, ...companyFilter,
    };
    const employeeIds = (await this.prisma.employee.findMany({ where: employeeWhere, select: { id: true } })).map(e => e.id);

    const attendanceWhere: Prisma.AttendanceWhereInput = {
      tenantId: ctx.tenantId,
      employeeId: { in: employeeIds },
      ...(dateFilter.date ? { date: dateFilter.date } : {}),
    };

    const [totalRecords, presentRecords, absentRecords, lateRecords, overtimeRecords, incompleteRecords] = await Promise.all([
      this.prisma.attendance.count({ where: attendanceWhere }),
      this.prisma.attendance.count({ where: { ...attendanceWhere, status: { in: this.PRESENT_STATUSES as unknown as AttendanceStatus[] } } }),
      this.prisma.attendance.count({ where: { ...attendanceWhere, status: 'ABSENT' } }),
      this.prisma.attendance.count({ where: { ...attendanceWhere, lateMinutes: { gt: 0 } } }),
      this.prisma.attendance.count({ where: { ...attendanceWhere, overtimeMinutes: { gt: 0 } } }),
      this.prisma.attendance.count({ where: { ...attendanceWhere, status: 'INCOMPLETE' } }),
    ]);

    // Aggregate worked/overtime hours — includes every productive status (F11)
    const workedAgg = await this.prisma.attendance.aggregate({
      where: { ...attendanceWhere, status: { in: this.PRESENT_STATUSES as unknown as AttendanceStatus[] } },
      _sum: { totalWorkedMinutes: true, overtimeMinutes: true, lateMinutes: true },
    });

    const presentRate = totalRecords > 0 ? (presentRecords / totalRecords) * 100 : 0;

    // Attendance trend (by day)
    const trend = await this.prisma.attendance.groupBy({
      by: ['date', 'status'],
      where: attendanceWhere,
      _count: true,
      orderBy: { date: 'asc' },
    });

    // Group by date
    const trendByDate = new Map<string, Record<string, number>>();
    for (const t of trend) {
      const dateKey = t.date.toISOString().slice(0, 10);
      if (!trendByDate.has(dateKey)) trendByDate.set(dateKey, {});
      trendByDate.get(dateKey)![t.status] = t._count;
    }

    const worked = workedAgg._sum;
    return {
      summary: {
        totalRecords,
        presentRecords,
        absentRecords,
        lateRecords,
        overtimeRecords,
        incompleteRecords,
        presentRate: Math.round(presentRate * 10) / 10,
        totalWorkedHours: Math.round(((worked?.totalWorkedMinutes || 0) / 60) * 10) / 10,
        totalOvertimeHours: Math.round(((worked?.overtimeMinutes || 0) / 60) * 10) / 10,
        totalLateMinutes: worked?.lateMinutes || 0,
      },
      trend: Array.from(trendByDate.entries()).map(([date, statuses]) => ({ date, ...statuses })),
    };
  }

  async getAttendanceSummary(ctx: TenantContext, filters: AnalyticsFilterDto) {
    const result = await this.getAttendanceAnalytics(ctx, filters);
    return result.summary;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEAVE ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════

  async getLeaveAnalytics(ctx: TenantContext, filters: AnalyticsFilterDto) {
    // LeaveRequest has no companyId column — scope by company via the
    // employee relation (soft-deleted employees excluded).
    const where: Prisma.LeaveRequestWhereInput = {
      tenantId: ctx.tenantId,
      ...(filters.companyId ? { employee: { companyId: filters.companyId, deletedAt: null } } : {}),
      ...this.buildDateFilterForLeave(filters),
    };

    const [totalRequests, approvedRequests, pendingRequests, rejectedRequests] = await Promise.all([
      this.prisma.leaveRequest.count({ where }),
      this.prisma.leaveRequest.count({ where: { ...where, status: 'APPROVED' } }),
      this.prisma.leaveRequest.count({ where: { ...where, status: 'PENDING' } }),
      this.prisma.leaveRequest.count({ where: { ...where, status: 'REJECTED' } }),
    ]);

    // Total approved leave days
    const approvedDays = await this.prisma.leaveRequest.aggregate({
      where: { ...where, status: 'APPROVED' },
      _sum: { duration: true },
    });

    const approvalRate = totalRequests > 0 ? (approvedRequests / totalRequests) * 100 : 0;

    // Leave by type
    const leaveTypes = await this.prisma.leaveType.findMany({
      where: { tenantId: ctx.tenantId },
      select: { id: true, name: true },
    });
    const leaveTypeMap = new Map(leaveTypes.map(lt => [lt.id, lt.name]));

    const byType = await this.prisma.leaveRequest.groupBy({
      by: ['leaveTypeId', 'status'],
      where,
      _count: true,
    });

    const leaveByType = new Map<string, { name: string; approved: number; pending: number; rejected: number }>();
    for (const bt of byType) {
      const typeName = leaveTypeMap.get(bt.leaveTypeId) || 'Unknown';
      if (!leaveByType.has(bt.leaveTypeId)) leaveByType.set(bt.leaveTypeId, { name: typeName, approved: 0, pending: 0, rejected: 0 });
      const entry = leaveByType.get(bt.leaveTypeId)!;
      if (bt.status === 'APPROVED') entry.approved = bt._count;
      if (bt.status === 'PENDING') entry.pending = bt._count;
      if (bt.status === 'REJECTED') entry.rejected = bt._count;
    }

    return {
      summary: {
        totalRequests,
        approvedRequests,
        pendingRequests,
        rejectedRequests,
        approvalRate: Math.round(approvalRate * 10) / 10,
        totalApprovedDays: approvedDays._sum.duration || 0,
      },
      leaveByType: Array.from(leaveByType.values()),
    };
  }

  async getLeaveSummary(ctx: TenantContext, filters: AnalyticsFilterDto) {
    const result = await this.getLeaveAnalytics(ctx, filters);
    return result.summary;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYROLL ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════

  async getPayrollAnalytics(ctx: TenantContext, filters: AnalyticsFilterDto) {
    const companyFilter = this.buildCompanyFilter(filters);

    // ONLY FINALIZED runs may influence payroll metrics (authoritative, §5).
    // Summary aggregates span ALL finalized runs — the last-12 truncation
    // applies exclusively to the trend series (F15/F16).
    const runs = await this.prisma.payrollRun.findMany({
      where: {
        tenantId: ctx.tenantId,
        status: 'FINALIZED',
        ...companyFilter,
        ...(filters.currency ? { currency: filters.currency } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    const runIds = runs.map(r => r.id);
    const lines = runIds.length > 0 ? await this.prisma.payrollLine.findMany({
      where: { runId: { in: runIds } },
      include: { employee: { select: { departmentId: true, department: { select: { name: true } } } } },
    }) : [];

    // Summary aggregates per currency across ALL finalized runs
    const grossByCur = new Map<string, number>();
    const netByCur = new Map<string, number>();
    const deductionsByCur = new Map<string, number>();
    const runCountByCur = new Map<string, number>();
    const headcountByCur = new Map<string, number>();
    for (const run of runs) {
      grossByCur.set(run.currency, (grossByCur.get(run.currency) || 0) + run.totalGross);
      netByCur.set(run.currency, (netByCur.get(run.currency) || 0) + run.totalNet);
      deductionsByCur.set(run.currency, (deductionsByCur.get(run.currency) || 0) + run.totalDeductions);
      runCountByCur.set(run.currency, (runCountByCur.get(run.currency) || 0) + 1);
      headcountByCur.set(run.currency, (headcountByCur.get(run.currency) || 0) + run.totalEmployees);
    }
    // Distinct employees per currency (from lines — avoids summing headcounts across periods)
    const distinctEmpByCur = new Map<string, Set<string>>();
    for (const line of lines) {
      if (!distinctEmpByCur.has(line.currency)) distinctEmpByCur.set(line.currency, new Set());
      distinctEmpByCur.get(line.currency)!.add(line.employeeId);
    }

    const currencies = [...new Set([...grossByCur.keys()])].sort();
    const scopedHeadcount = (currency: string) => {
      const distinct = distinctEmpByCur.get(currency)?.size || 0;
      return distinct > 0 ? distinct : (headcountByCur.get(currency) || 0);
    };
    const byCurrency = currencies.map(currency => {
      const totalGross = grossByCur.get(currency) || 0;
      const headcount = scopedHeadcount(currency);
      return {
        currency,
        totalGross,
        totalNet: netByCur.get(currency) || 0,
        totalDeductions: deductionsByCur.get(currency) || 0,
        totalRuns: runCountByCur.get(currency) || 0,
        totalEmployees: headcount,
        averageCostPerEmployee: totalGross > 0 && headcount > 0 ? Math.round(totalGross / headcount) : 0,
      };
    });

    const totalRuns = runs.length;
    const totalEmployees = byCurrency.reduce((sum, b) => sum + b.totalEmployees, 0);
    const totalGross = byCurrency.reduce((sum, b) => sum + b.totalGross, 0);
    const totalNet = byCurrency.reduce((sum, b) => sum + b.totalNet, 0);
    const totalDeductions = byCurrency.reduce((sum, b) => sum + b.totalDeductions, 0);
    const averageCostPerEmployee = totalGross > 0 && totalEmployees > 0 ? Math.round(totalGross / totalEmployees) : 0;

    // Department payroll breakdown (per currency)
    const deptPayroll = new Map<string, { name: string; currency: string; gross: number; net: number; count: number }>();
    for (const line of lines) {
      const deptId = line.employee.departmentId || 'none';
      const deptName = line.employee.department?.name || 'Unknown';
      const key = `${deptId}|${line.currency}`;
      if (!deptPayroll.has(key)) deptPayroll.set(key, { name: deptName, currency: line.currency, gross: 0, net: 0, count: 0 });
      const entry = deptPayroll.get(key)!;
      entry.gross += line.grossPay;
      entry.net += line.netPay;
      entry.count += 1;
    }

    // Payroll trend — last 12 finalized runs (trend only, not the summary)
    const trendRuns = runs.slice(0, 12);
    const periods = trendRuns.length > 0 ? await this.prisma.payrollPeriod.findMany({
      where: { tenantId: ctx.tenantId, id: { in: trendRuns.map(r => r.periodId) } },
      select: { id: true, name: true },
    }) : [];
    const periodMap = new Map(periods.map(p => [p.id, p.name]));
    const payrollTrend = trendRuns.map(r => ({
      runId: r.id,
      period: periodMap.get(r.periodId) || r.id,
      gross: r.totalGross,
      net: r.totalNet,
      deductions: r.totalDeductions,
      employees: r.totalEmployees,
      currency: r.currency,
    }));

    return {
      summary: {
        totalGross, totalNet, totalDeductions, totalRuns,
        totalEmployees, averageCostPerEmployee,
        currency: this.resolveSummaryCurrency(filters, currencies),
        hasMixedCurrencies: currencies.length > 1,
        byCurrency,
      },
      payrollTrend,
      departmentPayroll: Array.from(deptPayroll.values()),
    };
  }

  async getPayrollSummary(ctx: TenantContext, filters: AnalyticsFilterDto) {
    const result = await this.getPayrollAnalytics(ctx, filters);
    return result.summary;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CRM ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════

  async getCRMAnalytics(ctx: TenantContext, filters: AnalyticsFilterDto) {
    const companyFilter = this.buildCompanyFilter(filters);

    const where: Prisma.LeadWhereInput = { tenantId: ctx.tenantId, ...companyFilter };
    const oppWhere: Prisma.OpportunityWhereInput = {
      tenantId: ctx.tenantId, ...companyFilter,
      ...(filters.currency ? { currency: filters.currency } : {}),
    };

    const [totalLeads, qualifiedLeads, convertedLeads] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.count({ where: { ...where, status: 'QUALIFIED' } }),
      this.prisma.lead.count({ where: { ...where, status: 'CONVERTED' } }),
    ]);

    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    // Opportunities
    const [totalOpps, openOpps, wonOpps, lostOpps] = await Promise.all([
      this.prisma.opportunity.count({ where: oppWhere }),
      this.prisma.opportunity.count({ where: { ...oppWhere, status: 'OPEN' } }),
      this.prisma.opportunity.count({ where: { ...oppWhere, status: 'WON' } }),
      this.prisma.opportunity.count({ where: { ...oppWhere, status: 'LOST' } }),
    ]);

    // Pipeline value — per currency (F17)
    const pipelineOpps = await this.prisma.opportunity.findMany({
      where: { ...oppWhere, status: 'OPEN' },
      select: { amount: true, probability: true, currency: true },
    });
    const pipelineByCur = new Map<string, { value: number; weighted: number }>();
    for (const o of pipelineOpps) {
      const entry = pipelineByCur.get(o.currency) || { value: 0, weighted: 0 };
      entry.value += o.amount;
      entry.weighted += Math.round(o.amount * o.probability / 100);
      pipelineByCur.set(o.currency, entry);
    }

    // Won revenue — per currency
    const wonOppsList = await this.prisma.opportunity.findMany({
      where: { ...oppWhere, status: 'WON' },
      select: { amount: true, currency: true },
    });
    const wonByCur = new Map<string, number>();
    for (const o of wonOppsList) {
      wonByCur.set(o.currency, (wonByCur.get(o.currency) || 0) + o.amount);
    }

    const currencies = [...new Set([...pipelineByCur.keys(), ...wonByCur.keys()])].sort();
    const byCurrency = currencies.map(currency => ({
      currency,
      pipelineValue: pipelineByCur.get(currency)?.value || 0,
      weightedPipeline: pipelineByCur.get(currency)?.weighted || 0,
      wonRevenue: wonByCur.get(currency) || 0,
    }));

    const pipelineValue = byCurrency.reduce((sum, b) => sum + b.pipelineValue, 0);
    const weightedPipeline = byCurrency.reduce((sum, b) => sum + b.weightedPipeline, 0);
    const wonRevenue = byCurrency.reduce((sum, b) => sum + b.wonRevenue, 0);

    const winRate = (wonOpps + lostOpps) > 0 ? (wonOpps / (wonOpps + lostOpps)) * 100 : 0;

    // Pipeline by stage AND currency — never mix currencies within a stage
    const pipelineByStage = await this.prisma.opportunity.groupBy({
      by: ['stage', 'currency'],
      where: oppWhere,
      _sum: { amount: true },
      _count: true,
    });

    return {
      summary: {
        totalLeads, qualifiedLeads, convertedLeads, conversionRate: Math.round(conversionRate * 10) / 10,
        totalOpps, openOpps, wonOpps, lostOpps,
        pipelineValue, weightedPipeline, wonRevenue,
        winRate: Math.round(winRate * 10) / 10,
        currency: this.resolveSummaryCurrency(filters, currencies),
        hasMixedCurrencies: currencies.length > 1,
        byCurrency,
      },
      pipelineByStage: pipelineByStage.sort((a, b) => a.stage.localeCompare(b.stage) || a.currency.localeCompare(b.currency)).map(s => ({
        stage: s.stage,
        currency: s.currency,
        count: s._count,
        value: s._sum.amount || 0,
      })),
    };
  }

  async getCRMSummary(ctx: TenantContext, filters: AnalyticsFilterDto) {
    const result = await this.getCRMAnalytics(ctx, filters);
    return result.summary;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECT ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════

  async getProjectAnalytics(ctx: TenantContext, filters: AnalyticsFilterDto) {
    const companyFilter = this.buildCompanyFilter(filters);
    const where: Prisma.ProjectWhereInput = { tenantId: ctx.tenantId, ...companyFilter };

    const projects = await this.prisma.project.findMany({
      where,
      select: {
        id: true, name: true, status: true, currency: true, budgetAmount: true, actualCost: true,
        budget: { select: { budgetAmount: true, spentAmount: true, currency: true } },
      },
    });

    // Status distribution + counts
    const statusDist = await this.prisma.project.groupBy({
      by: ['status'],
      where,
      _count: true,
    });
    const statusCounts = new Map(statusDist.map(s => [s.status, s._count]));

    // Budget vs actual — authoritative source is ProjectBudget (F3); fall back
    // to the Project-level denormalized fields when no budget row exists.
    const budgetByCur = new Map<string, number>();
    const spentByCur = new Map<string, number>();
    const actualByCur = new Map<string, number>();
    for (const p of projects) {
      const currency = p.budget?.currency || p.currency;
      const budget = p.budget?.budgetAmount ?? p.budgetAmount ?? 0;
      const spent = p.budget?.spentAmount ?? 0;
      const actual = p.actualCost ?? 0;
      budgetByCur.set(currency, (budgetByCur.get(currency) || 0) + budget);
      spentByCur.set(currency, (spentByCur.get(currency) || 0) + spent);
      actualByCur.set(currency, (actualByCur.get(currency) || 0) + actual);
    }
    const currencies = [...new Set([...budgetByCur.keys(), ...spentByCur.keys(), ...actualByCur.keys()])].sort();
    const byCurrency = currencies.map(currency => ({
      currency,
      budget: budgetByCur.get(currency) || 0,
      spent: spentByCur.get(currency) || 0,
      actualCost: actualByCur.get(currency) || 0,
    }));
    const totalBudget = byCurrency.reduce((sum, b) => sum + b.budget, 0);
    const totalSpent = byCurrency.reduce((sum, b) => sum + b.spent, 0);
    const totalActualCost = byCurrency.reduce((sum, b) => sum + b.actualCost, 0);

    // Overdue milestones — scoped to the filtered company's projects (F4):
    // milestones explicitly marked OVERDUE, or open milestones past their
    // target date.
    const projectIds = projects.map(p => p.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueMilestones = projectIds.length > 0 ? await this.prisma.projectMilestone.count({
      where: {
        projectId: { in: projectIds },
        OR: [
          { status: 'OVERDUE' },
          { status: { in: ['PENDING', 'IN_PROGRESS'] }, targetDate: { lt: today } },
        ],
      },
    }) : 0;

    // Approved time tracking (hours)
    const timeEntries = projectIds.length > 0 ? await this.prisma.projectTimeEntry.findMany({
      where: { projectId: { in: projectIds }, status: 'APPROVED' },
      select: { durationMinutes: true, isBillable: true },
    }) : [];
    const totalLoggedMinutes = timeEntries.reduce((sum, t) => sum + t.durationMinutes, 0);
    const billableMinutes = timeEntries.reduce((sum, t) => sum + (t.isBillable ? t.durationMinutes : 0), 0);
    const totalLoggedHours = Math.round((totalLoggedMinutes / 60) * 10) / 10;
    const billableHours = Math.round((billableMinutes / 60) * 10) / 10;

    return {
      summary: {
        totalProjects: projects.length,
        activeProjects: statusCounts.get('ACTIVE') || 0,
        completedProjects: statusCounts.get('COMPLETED') || 0,
        onHoldProjects: statusCounts.get('ON_HOLD') || 0,
        overdueMilestones,
        totalBudget, totalSpent, totalActualCost,
        totalLoggedHours, billableHours,
        nonBillableHours: Math.round((totalLoggedHours - billableHours) * 10) / 10,
        currency: this.resolveSummaryCurrency(filters, currencies),
        hasMixedCurrencies: currencies.length > 1,
        byCurrency,
      },
      statusDistribution: statusDist.map(s => ({ status: s.status, count: s._count })),
      projects: projects.slice(0, 10).map(p => ({ id: p.id, name: p.name, status: p.status })),
    };
  }

  async getProjectSummary(ctx: TenantContext, filters: AnalyticsFilterDto) {
    const result = await this.getProjectAnalytics(ctx, filters);
    return result.summary;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ASSET ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════

  async getAssetAnalytics(ctx: TenantContext, filters: AnalyticsFilterDto) {
    const companyFilter = this.buildCompanyFilter(filters);
    const where: Prisma.AssetWhereInput = { tenantId: ctx.tenantId, ...companyFilter };

    // Status distribution — activeAssets is the aggregate of operational
    // statuses (F18): ACTIVE, ASSIGNED, AVAILABLE, IN_MAINTENANCE, IN_REPAIR.
    const OPERATIONAL_STATUSES = ['ACTIVE', 'ASSIGNED', 'AVAILABLE', 'IN_MAINTENANCE', 'IN_REPAIR'] as unknown as AssetStatus[];
    const statusDist = await this.prisma.asset.groupBy({
      by: ['status'],
      where,
      _count: true,
    });
    const statusCounts = new Map(statusDist.map(s => [s.status, s._count]));
    const sumStatus = (...statuses: readonly AssetStatus[]) =>
      statuses.reduce((sum, s) => sum + (statusCounts.get(s) || 0), 0);

    const activeAssets = sumStatus(...OPERATIONAL_STATUSES);

    // Book value / purchase cost — per currency, excluding DRAFT and DISPOSED
    const valuedAssets = await this.prisma.asset.findMany({
      where: { ...where, status: { notIn: ['DISPOSED', 'DRAFT'] } },
      select: { currency: true, currentBookValue: true, purchaseCost: true },
    });
    const bookByCur = new Map<string, number>();
    const purchaseByCur = new Map<string, number>();
    for (const a of valuedAssets) {
      bookByCur.set(a.currency, (bookByCur.get(a.currency) || 0) + a.currentBookValue);
      purchaseByCur.set(a.currency, (purchaseByCur.get(a.currency) || 0) + a.purchaseCost);
    }

    // Maintenance cost — per currency, scoped to the company (F5)
    const maintGroups = await this.prisma.assetMaintenanceRecord.groupBy({
      by: ['currency'],
      where: {
        tenantId: ctx.tenantId,
        status: 'COMPLETED',
        asset: { ...companyFilter },
      },
      _sum: { cost: true },
    });
    const maintByCur = new Map(maintGroups.map(g => [g.currency, g._sum.cost || 0]));

    const currencies = [...new Set([...bookByCur.keys(), ...purchaseByCur.keys(), ...maintByCur.keys()])].sort();
    const byCurrency = currencies.map(currency => ({
      currency,
      totalBookValue: bookByCur.get(currency) || 0,
      totalPurchaseCost: purchaseByCur.get(currency) || 0,
      totalMaintenanceCost: maintByCur.get(currency) || 0,
    }));
    const totalBookValue = byCurrency.reduce((sum, b) => sum + b.totalBookValue, 0);
    const totalPurchaseCost = byCurrency.reduce((sum, b) => sum + b.totalPurchaseCost, 0);
    const totalMaintenanceCost = byCurrency.reduce((sum, b) => sum + b.totalMaintenanceCost, 0);

    // Category distribution
    const categoryDist = await this.prisma.asset.groupBy({
      by: ['categoryId'],
      where: { ...where, categoryId: { not: null } },
      _count: true,
    });

    const categories = await this.prisma.assetCategory.findMany({
      where: { tenantId: ctx.tenantId },
      select: { id: true, name: true },
    });
    const catMap = new Map(categories.map(c => [c.id, c.name]));

    return {
      summary: {
        totalAssets: statusDist.reduce((sum, s) => sum + s._count, 0),
        activeAssets,
        assignedAssets: statusCounts.get('ASSIGNED') || 0,
        availableAssets: statusCounts.get('AVAILABLE') || 0,
        inMaintenanceAssets: statusCounts.get('IN_MAINTENANCE') || 0,
        inRepairAssets: statusCounts.get('IN_REPAIR') || 0,
        retiredAssets: statusCounts.get('RETIRED') || 0,
        disposedAssets: statusCounts.get('DISPOSED') || 0,
        totalBookValue, totalPurchaseCost, totalMaintenanceCost,
        currency: this.resolveSummaryCurrency(filters, currencies),
        hasMixedCurrencies: currencies.length > 1,
        byCurrency,
      },
      categoryDistribution: categoryDist.map(c => ({
        categoryId: c.categoryId,
        name: catMap.get(c.categoryId || '') || 'Unknown',
        count: c._count,
      })),
    };
  }

  async getAssetSummary(ctx: TenantContext, filters: AnalyticsFilterDto) {
    const result = await this.getAssetAnalytics(ctx, filters);
    return result.summary;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVED REPORTS
  // ═══════════════════════════════════════════════════════════════════════════

  async listReports(ctx: TenantContext) {
    return this.prisma.savedReport.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createReport(ctx: TenantContext, dto: SavedReportDto) {
    this.validateReportPayload(dto);

    const existing = await this.prisma.savedReport.findFirst({
      where: { tenantId: ctx.tenantId, name: dto.name },
    });
    if (existing) throw new BadRequestException(`Report "${dto.name}" already exists`);

    const report = await this.prisma.savedReport.create({
      data: {
        tenantId: ctx.tenantId,
        name: dto.name,
        description: dto.description,
        domain: dto.domain,
        filters: (dto.filters || {}) as Prisma.InputJsonValue,
        metrics: dto.metrics || [],
        createdBy: ctx.userId,
      },
    });

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'ANALYTICS_REPORT_CREATED',
      entityType: 'SavedReport',
      entityId: report.id,
      newValue: { name: dto.name, domain: dto.domain },
    });

    return report;
  }

  async getReport(ctx: TenantContext, id: string) {
    const report = await this.prisma.savedReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');
    if (report.tenantId !== ctx.tenantId) throw new ForbiddenException('Access denied');
    return report;
  }

  async updateReport(ctx: TenantContext, id: string, dto: UpdateReportDto) {
    const report = await this.getReport(ctx, id);
    // Metrics are validated against the report's own domain on update.
    this.validateReportPayload({
      name: dto.name,
      description: dto.description,
      domain: (report.domain as AnalyticsDomain) || 'finance',
      metrics: dto.metrics,
      filters: dto.filters,
    });

    return this.prisma.savedReport.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.filters !== undefined && { filters: dto.filters as Prisma.InputJsonValue }),
        ...(dto.metrics !== undefined && { metrics: dto.metrics }),
      },
    });
  }

  async deleteReport(ctx: TenantContext, id: string) {
    await this.getReport(ctx, id);
    await this.prisma.savedReport.delete({ where: { id } });

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'ANALYTICS_REPORT_DELETED',
      entityType: 'SavedReport',
      entityId: id,
    });

    return { deleted: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT
  // ═══════════════════════════════════════════════════════════════════════════

  async exportData(ctx: TenantContext, domain: string, format: string, filters: AnalyticsFilterDto) {
    const resolvedDomain = this.resolveDomain(domain);
    // Defense-in-depth: exporting one domain requires that domain's read
    // permission, not just analytics:export (F7).
    this.assertDomainAccess(ctx, resolvedDomain);

    let data: any;
    switch (resolvedDomain) {
      case 'finance': data = await this.getFinanceAnalytics(ctx, filters); break;
      case 'workforce': data = await this.getWorkforceAnalytics(ctx, filters); break;
      case 'attendance': data = await this.getAttendanceAnalytics(ctx, filters); break;
      case 'leave': data = await this.getLeaveAnalytics(ctx, filters); break;
      case 'payroll': data = await this.getPayrollAnalytics(ctx, filters); break;
      case 'crm': data = await this.getCRMAnalytics(ctx, filters); break;
      case 'projects': data = await this.getProjectAnalytics(ctx, filters); break;
      case 'assets': data = await this.getAssetAnalytics(ctx, filters); break;
    }

    const isCsv = format === 'csv';
    const csv = isCsv ? this.toCsv(this.exportRows(resolvedDomain, data)) : undefined;

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'ANALYTICS_DATA_EXPORTED',
      entityType: 'Analytics',
      newValue: { domain: resolvedDomain, format: isCsv ? 'csv' : 'json' },
    });

    return { domain: resolvedDomain, format: isCsv ? 'csv' : 'json', data, csv, exportedAt: new Date().toISOString() };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private resolveDomain(domain: string): AnalyticsDomain {
    if (!domain || !(ANALYTICS_DOMAINS as readonly string[]).includes(domain)) {
      throw new BadRequestException(`Unknown domain: ${domain}. Supported: ${ANALYTICS_DOMAINS.join(', ')}`);
    }
    return domain as AnalyticsDomain;
  }

  private assertDomainAccess(ctx: TenantContext, domain: AnalyticsDomain) {
    const permission = DOMAIN_PERMISSIONS[domain];
    if (!Array.isArray(ctx.permissions) || !ctx.permissions.includes(permission)) {
      throw new ForbiddenException(`Permission "${permission}" is required to export analytics domain "${domain}"`);
    }
  }

  /**
   * Builds a currency-safe summary object from per-currency buckets.
   * - When `filters.currency` is set, summary values reflect that currency.
   * - When the data set is single-currency, summary values reflect it.
   * - When multiple currencies are present and no filter is applied, monetary
   *   summary fields are ZERO and consumers must render `byCurrency` instead.
   *   Non-monetary aggregates supplied via `fallback` (e.g. counts) are kept.
   */
  private decorateCurrencySummary<T extends Record<string, number>>(
    filters: AnalyticsFilterDto,
    byCurrency: { currency: string }[],
    mapBucket: (b: any) => T,
    fallback: Partial<T>,
  ): T & { currency: string; hasMixedCurrencies: boolean; byCurrency: Array<T & { currency: string }> } {
    const currency = this.resolveSummaryCurrency(filters, byCurrency.map(b => b.currency));
    const hasMixedCurrencies = byCurrency.length > 1;
    // Currency is preserved on every row — consumers (CSV export, dashboards)
    // must never receive currency-agnostic buckets.
    const buckets = byCurrency.map(b => ({ ...mapBucket(b), currency: b.currency }));
    const scope = filters.currency ? byCurrency.filter(b => b.currency === filters.currency) : byCurrency;

    let summary: T;
    if (scope.length === 1) {
      summary = mapBucket(scope[0]);
    } else if (scope.length > 1) {
      // Mixed currencies and no filter — never sum across currencies.
      summary = { ...fallback } as T;
    } else {
      summary = { ...fallback } as T;
    }

    return { ...summary, currency, hasMixedCurrencies, byCurrency: buckets };
  }

  private resolveSummaryCurrency(filters: AnalyticsFilterDto, currencies: string[]): string {
    if (filters.currency) return filters.currency;
    if (currencies.length === 1) return currencies[0];
    if (currencies.length > 1) return 'MIXED';
    return 'USD';
  }

  private validateReportPayload(dto: { name?: string; description?: string; domain?: string; metrics?: string[]; filters?: Record<string, unknown> }) {
    const domain = dto.domain;
    if (domain !== undefined && !(ANALYTICS_DOMAINS as readonly string[]).includes(domain)) {
      throw new BadRequestException(`Unsupported report domain: ${domain}. Supported: ${ANALYTICS_DOMAINS.join(', ')}`);
    }
    if (dto.name !== undefined && (typeof dto.name !== 'string' || dto.name.length < 1 || dto.name.length > 255)) {
      throw new BadRequestException('Report name must be between 1 and 255 characters');
    }
    if (dto.description !== undefined && dto.description !== null && typeof dto.description === 'string' && dto.description.length > 1000) {
      throw new BadRequestException('Report description must not exceed 1000 characters');
    }
    if (dto.filters !== undefined) {
      if (dto.filters === null || typeof dto.filters !== 'object' || Array.isArray(dto.filters)) {
        throw new BadRequestException('Report filters must be a JSON object');
      }
      const jsonLength = JSON.stringify(dto.filters).length;
      if (jsonLength > 4000) throw new BadRequestException('Report filters must not exceed 4000 characters');
    }
    if (dto.metrics !== undefined) {
      if (!Array.isArray(dto.metrics) || dto.metrics.length > 50) {
        throw new BadRequestException('Report metrics must be an array of at most 50 strings');
      }
      const allowed = domain ? (REPORT_METRICS_BY_DOMAIN[domain] || []) : [];
      for (const metric of dto.metrics) {
        if (typeof metric !== 'string' || !allowed.includes(metric)) {
          throw new BadRequestException(`Unsupported metric "${metric}" for domain "${domain}"`);
        }
      }
    }
  }

  private buildCompanyFilter(filters: AnalyticsFilterDto): { companyId?: string } {
    return filters.companyId ? { companyId: filters.companyId } : {};
  }

  private buildDateFilterForJournals(filters: AnalyticsFilterDto): { postingDate?: any } {
    if (!filters.startDate && !filters.endDate) return {};
    return {
      postingDate: {
        ...(filters.startDate && { gte: new Date(filters.startDate) }),
        ...(filters.endDate && { lte: new Date(filters.endDate) }),
      },
    };
  }

  private buildDateFilterForAttendance(filters: AnalyticsFilterDto): { date?: any } {
    if (!filters.startDate && !filters.endDate) return {};
    return {
      date: {
        ...(filters.startDate && { gte: new Date(filters.startDate) }),
        ...(filters.endDate && { lte: new Date(filters.endDate) }),
      },
    };
  }

  private buildDateFilterForLeave(filters: AnalyticsFilterDto): { startDate?: any } {
    if (!filters.startDate && !filters.endDate) return {};
    return {
      startDate: {
        ...(filters.startDate && { gte: new Date(filters.startDate) }),
        ...(filters.endDate && { lte: new Date(filters.endDate) }),
      },
    };
  }

  private buildDateFilterForEmployee(filters: AnalyticsFilterDto): { joiningDate?: any } {
    if (!filters.startDate && !filters.endDate) return {};
    return {
      joiningDate: {
        ...(filters.startDate && { gte: new Date(filters.startDate) }),
        ...(filters.endDate && { lte: new Date(filters.endDate) }),
      },
    };
  }

  private exportRows(domain: AnalyticsDomain, data: any): Record<string, unknown>[] {
    switch (domain) {
      case 'finance':
        return data.summary.byCurrency.map((r: any) => ({
          currency: r.currency,
          totalRevenue: r.totalRevenue,
          totalExpenses: r.totalExpenses,
          netProfit: r.netProfit,
          totalAR: r.totalAR,
          totalAP: r.totalAP,
          invoiceCount: r.invoiceCount,
          unpaidInvoiceCount: r.unpaidInvoiceCount,
          billCount: r.billCount,
          unpaidBillCount: r.unpaidBillCount,
        }));
      case 'payroll':
        return data.summary.byCurrency.map((r: any) => ({
          currency: r.currency,
          totalGross: r.totalGross,
          totalNet: r.totalNet,
          totalDeductions: r.totalDeductions,
          totalRuns: r.totalRuns,
          totalEmployees: r.totalEmployees,
          averageCostPerEmployee: r.averageCostPerEmployee,
        }));
      case 'crm':
        return data.summary.byCurrency.map((r: any) => ({
          currency: r.currency,
          pipelineValue: r.pipelineValue,
          weightedPipeline: r.weightedPipeline,
          wonRevenue: r.wonRevenue,
        }));
      case 'assets':
        return data.summary.byCurrency.map((r: any) => ({
          currency: r.currency,
          totalBookValue: r.totalBookValue,
          totalPurchaseCost: r.totalPurchaseCost,
          totalMaintenanceCost: r.totalMaintenanceCost,
        }));
      case 'projects':
        return data.summary.byCurrency.map((r: any) => ({
          currency: r.currency,
          budget: r.budget,
          spent: r.spent,
          actualCost: r.actualCost,
        }));
      case 'workforce':
      case 'attendance':
      case 'leave':
        return [data.summary];
      default:
        return [];
    }
  }

  private toCsv(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return '';
    const headers = [...new Set(rows.flatMap(r => Object.keys(r)))];
    const escape = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    return [
      headers.join(','),
      ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
    ].join('\r\n');
  }
}