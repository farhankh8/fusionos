'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import { KpiSkeleton } from '@/components/ui/skeleton';
import {
  BarChart3, DollarSign, Users, Clock, CalendarOff, Wallet,
  Handshake, FolderKanban, Package, TrendingUp, TrendingDown, ArrowRight, RefreshCw,
} from 'lucide-react';

interface CurrencySummary {
  currency: string;
  totalRevenue?: number; totalExpenses?: number; netProfit?: number; totalAR?: number; totalAP?: number;
  totalGross?: number; totalNet?: number; totalDeductions?: number;
  pipelineValue?: number; wonRevenue?: number;
  totalBookValue?: number; totalMaintenanceCost?: number;
  budget?: number; spent?: number;
  [k: string]: unknown;
}

interface DashboardData {
  finance: { totalRevenue: number; totalExpenses: number; netProfit: number; totalAR: number; totalAP: number; currency: string; hasMixedCurrencies?: boolean; byCurrency?: CurrencySummary[] };
  workforce: { totalEmployees: number; activeEmployees: number; newHires: number };
  attendance: { totalRecords: number; presentRate: number; totalWorkedHours: number; totalOvertimeHours: number };
  leave: { totalRequests: number; approvedRequests: number; pendingRequests: number; approvalRate: number };
  payroll: { totalGross: number; totalNet: number; totalDeductions: number; currency: string; hasMixedCurrencies?: boolean; byCurrency?: CurrencySummary[] };
  crm: { totalLeads: number; pipelineValue: number; wonRevenue: number; winRate: number; currency: string; hasMixedCurrencies?: boolean; byCurrency?: CurrencySummary[] };
  projects: { totalProjects: number; activeProjects: number; completedProjects: number; overdueMilestones: number; hasMixedCurrencies?: boolean; byCurrency?: CurrencySummary[] };
  assets: { totalAssets: number; totalBookValue: number; totalMaintenanceCost: number; currency: string; hasMixedCurrencies?: boolean; byCurrency?: CurrencySummary[] };
}

const fmt = (v: number, c = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(v / 100);
const fmtC = (c: CurrencySummary, v: number) => fmt(v, c.currency === 'MIXED' ? 'USD' : c.currency);

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await apiClient.get<DashboardData>('/analytics/dashboard');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sections = data ? [
    {
      title: 'Financial Performance', href: '/analytics/finance',
      icon: DollarSign, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600',
      kpis: data.finance.hasMixedCurrencies && (data.finance.byCurrency?.length || 0) > 1
        ? data.finance.byCurrency!.flatMap(c => [
            { label: `Revenue (${c.currency})`, value: fmtC(c, c.totalRevenue ?? 0), icon: TrendingUp, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
            { label: `Net Profit (${c.currency})`, value: fmtC(c, c.netProfit ?? 0), icon: DollarSign, iconBg: 'bg-[#EFF6FF]', iconColor: 'text-[#2563EB]' },
          ])
        : [
            { label: 'Revenue', value: fmt(data.finance.totalRevenue, data.finance.currency), icon: TrendingUp, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
            { label: 'Expenses', value: fmt(data.finance.totalExpenses, data.finance.currency), icon: TrendingDown, iconBg: 'bg-red-50', iconColor: 'text-red-600' },
            { label: 'Net Profit', value: fmt(data.finance.netProfit, data.finance.currency), icon: DollarSign, iconBg: 'bg-[#EFF6FF]', iconColor: 'text-[#2563EB]' },
            { label: 'Receivables', value: fmt(data.finance.totalAR, data.finance.currency), icon: DollarSign, iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
          ],
    },
    {
      title: 'Workforce', href: '/analytics/workforce',
      icon: Users, iconBg: 'bg-[#EFF6FF]', iconColor: 'text-[#2563EB]',
      kpis: [
        { label: 'Total Employees', value: data.workforce.totalEmployees, icon: Users, iconBg: 'bg-[#EFF6FF]', iconColor: 'text-[#2563EB]' },
        { label: 'Active', value: data.workforce.activeEmployees, icon: Users, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
        { label: 'New Hires', value: data.workforce.newHires, icon: Users, iconBg: 'bg-violet-50', iconColor: 'text-violet-600' },
      ],
    },
    {
      title: 'Attendance', href: '/analytics/attendance',
      icon: Clock, iconBg: 'bg-amber-50', iconColor: 'text-amber-600',
      kpis: [
        { label: 'Present Rate', value: `${data.attendance.presentRate}%`, icon: Clock, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
        { label: 'Worked Hours', value: data.attendance.totalWorkedHours, icon: Clock, iconBg: 'bg-[#EFF6FF]', iconColor: 'text-[#2563EB]' },
        { label: 'Overtime Hours', value: data.attendance.totalOvertimeHours, icon: Clock, iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
      ],
    },
    {
      title: 'Leave', href: '/analytics/leave',
      icon: CalendarOff, iconBg: 'bg-violet-50', iconColor: 'text-violet-600',
      kpis: [
        { label: 'Total Requests', value: data.leave.totalRequests, icon: CalendarOff, iconBg: 'bg-violet-50', iconColor: 'text-violet-600' },
        { label: 'Approved', value: data.leave.approvedRequests, icon: CalendarOff, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
        { label: 'Pending', value: data.leave.pendingRequests, icon: CalendarOff, iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
        { label: 'Approval Rate', value: `${data.leave.approvalRate}%`, icon: TrendingUp, iconBg: 'bg-[#EFF6FF]', iconColor: 'text-[#2563EB]' },
      ],
    },
    {
      title: 'Payroll', href: '/analytics/payroll',
      icon: Wallet, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600',
      kpis: data.payroll.hasMixedCurrencies && (data.payroll.byCurrency?.length || 0) > 1
        ? data.payroll.byCurrency!.flatMap(c => [
            { label: `Gross (${c.currency})`, value: fmtC(c, c.totalGross ?? 0), icon: Wallet, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
            { label: `Net (${c.currency})`, value: fmtC(c, c.totalNet ?? 0), icon: Wallet, iconBg: 'bg-[#EFF6FF]', iconColor: 'text-[#2563EB]' },
          ])
        : [
            { label: 'Gross Payroll', value: fmt(data.payroll.totalGross, data.payroll.currency), icon: Wallet, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
            { label: 'Net Payroll', value: fmt(data.payroll.totalNet, data.payroll.currency), icon: Wallet, iconBg: 'bg-[#EFF6FF]', iconColor: 'text-[#2563EB]' },
            { label: 'Deductions', value: fmt(data.payroll.totalDeductions, data.payroll.currency), icon: Wallet, iconBg: 'bg-red-50', iconColor: 'text-red-600' },
          ],
    },
    {
      title: 'Sales & CRM', href: '/analytics/crm',
      icon: Handshake, iconBg: 'bg-violet-50', iconColor: 'text-violet-600',
      kpis: data.crm.hasMixedCurrencies && (data.crm.byCurrency?.length || 0) > 1
        ? data.crm.byCurrency!.flatMap(c => [
            { label: `Pipeline (${c.currency})`, value: fmtC(c, c.pipelineValue ?? 0), icon: TrendingUp, iconBg: 'bg-[#EFF6FF]', iconColor: 'text-[#2563EB]' },
            { label: `Won (${c.currency})`, value: fmtC(c, c.wonRevenue ?? 0), icon: DollarSign, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
          ])
        : [
            { label: 'Total Leads', value: data.crm.totalLeads, icon: Handshake, iconBg: 'bg-violet-50', iconColor: 'text-violet-600' },
            { label: 'Pipeline', value: fmt(data.crm.pipelineValue, data.crm.currency), icon: TrendingUp, iconBg: 'bg-[#EFF6FF]', iconColor: 'text-[#2563EB]' },
            { label: 'Won Revenue', value: fmt(data.crm.wonRevenue, data.crm.currency), icon: DollarSign, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
            { label: 'Win Rate', value: `${data.crm.winRate}%`, icon: TrendingUp, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
          ],
    },
    {
      title: 'Projects', href: '/analytics/projects',
      icon: FolderKanban, iconBg: 'bg-[#EFF6FF]', iconColor: 'text-[#2563EB]',
      kpis: data.projects.hasMixedCurrencies && (data.projects.byCurrency?.length || 0) > 1
        ? data.projects.byCurrency!.flatMap(c => [
            { label: `Budget (${c.currency})`, value: fmtC(c, c.budget ?? 0), icon: FolderKanban, iconBg: 'bg-[#EFF6FF]', iconColor: 'text-[#2563EB]' },
            { label: `Spent (${c.currency})`, value: fmtC(c, c.spent ?? 0), icon: FolderKanban, iconBg: 'bg-red-50', iconColor: 'text-red-600' },
          ])
        : [
            { label: 'Total Projects', value: data.projects.totalProjects, icon: FolderKanban, iconBg: 'bg-[#EFF6FF]', iconColor: 'text-[#2563EB]' },
            { label: 'Active', value: data.projects.activeProjects, icon: FolderKanban, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
            { label: 'Completed', value: data.projects.completedProjects, icon: FolderKanban, iconBg: 'bg-violet-50', iconColor: 'text-violet-600' },
            { label: 'Overdue Milestones', value: data.projects.overdueMilestones, icon: CalendarOff, iconBg: 'bg-red-50', iconColor: 'text-red-600' },
          ],
    },
    {
      title: 'Assets', href: '/analytics/assets',
      icon: Package, iconBg: 'bg-amber-50', iconColor: 'text-amber-600',
      kpis: data.assets.hasMixedCurrencies && (data.assets.byCurrency?.length || 0) > 1
        ? data.assets.byCurrency!.flatMap(c => [
            { label: `Book Value (${c.currency})`, value: fmtC(c, c.totalBookValue ?? 0), icon: DollarSign, iconBg: 'bg-[#EFF6FF]', iconColor: 'text-[#2563EB]' },
            { label: `Maintenance (${c.currency})`, value: fmtC(c, c.totalMaintenanceCost ?? 0), icon: Package, iconBg: 'bg-red-50', iconColor: 'text-red-600' },
          ])
        : [
            { label: 'Total Assets', value: data.assets.totalAssets, icon: Package, iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
            { label: 'Book Value', value: fmt(data.assets.totalBookValue, data.assets.currency), icon: DollarSign, iconBg: 'bg-[#EFF6FF]', iconColor: 'text-[#2563EB]' },
            { label: 'Maintenance Cost', value: fmt(data.assets.totalMaintenanceCost, data.assets.currency), icon: Package, iconBg: 'bg-red-50', iconColor: 'text-red-600' },
          ],
    },
  ] : [];

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <PageHeader
        title="Analytics"
        description="Business performance across your organization"
      />
      <div className="px-5 py-4 lg:px-6">
        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-[#E2E8F0] bg-white p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-8 w-8 animate-pulse rounded-lg bg-[#F1F5F9]" />
                  <div className="h-4 w-32 animate-pulse rounded bg-[#F1F5F9]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, j) => <KpiSkeleton key={j} />)}
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={BarChart3}
            title="Unable to load analytics"
            description={error}
            action={
              <button
                onClick={fetchData}
                className="flex items-center gap-1.5 rounded-md bg-[#2563EB] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#1D4ED8]"
              >
                <RefreshCw className="h-3.5 w-3.5" />Retry
              </button>
            }
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {sections.map((section) => (
              <div
                key={section.title}
                className="rounded-lg border border-[#E2E8F0] bg-white p-5 cursor-pointer hover:border-[#2563EB]/30 transition-colors"
                onClick={() => router.push(section.href)}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${section.iconBg}`}>
                      <section.icon className={`h-4 w-4 ${section.iconColor}`} />
                    </div>
                    <h3 className="text-[14px] font-semibold text-[#0F172A]">{section.title}</h3>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#94A3B8]" />
                </div>
                {section.kpis.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {section.kpis.map((kpi) => (
                      <div key={kpi.label} className="rounded-md bg-[#F8FAFC] p-3">
                        <p className="text-[11px] font-medium text-[#64748B]">{kpi.label}</p>
                        <p className="text-[16px] font-bold text-[#0F172A]">{kpi.value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-[#64748B]">No data available</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}