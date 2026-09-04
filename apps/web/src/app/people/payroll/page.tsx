'use client';

/**
 * FusionOS Payroll Management Page
 * Enterprise payroll workspace with dashboard, periods, runs, salary structures, and payslips.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionCard } from '@/components/ui/section-card';
import { KpiSkeleton, TableSkeleton } from '@/components/ui/skeleton';
import { Wallet, Users, TrendingUp, TrendingDown, DollarSign, Clock, CheckCircle2, FileText, Settings, BarChart3, Plus } from 'lucide-react';

/* ── Types ───────────────────────────────────────────────────────────────── */

interface PayrollPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  employeeCount: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  currency: string;
}

interface PayrollRun {
  id: string;
  periodId: string;
  period?: { name: string };
  calculationMode: string;
  employeeCount: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface SalaryStructure {
  id: string;
  name: string;
  employee?: { firstName: string; lastName: string; employeeCode: string };
  currency: string;
  basicSalary: number;
  totalEarnings: number;
  totalDeductions: number;
  effectiveDate: string;
  status: string;
}

interface PayrollDashboard {
  currentPeriod?: string;
  employeeCount: number;
  grossPayroll: number;
  deductions: number;
  netPayroll: number;
  pendingReview: number;
  finalized: number;
  currency: string;
}

/* ── Tab Configuration ───────────────────────────────────────────────────── */

const PAYROLL_TABS = [
  { id: 'dashboard', label: 'Overview' },
  { id: 'periods', label: 'Periods' },
  { id: 'runs', label: 'Runs' },
  { id: 'structures', label: 'Salary Structures' },
  { id: 'payslips', label: 'Payslips' },
];

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const formatMoney = (amount: number, currency: string = 'USD') => {
  if (!amount && amount !== 0) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
};

const PERIOD_STATUS_ORDER: Record<string, number> = {
  DRAFT: 0, OPEN: 1, PROCESSING: 2, CALCULATED: 3, UNDER_REVIEW: 4, APPROVED: 5, FINALIZED: 6, CLOSED: 7,
};

/* ── Main Component ──────────────────────────────────────────────────────── */

export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState<PayrollDashboard | null>(null);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  /* ── Data Fetching ──────────────────────────────────────────────────────── */

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<PayrollDashboard>('/payroll/dashboard');
      setDashboard(data);
    } catch {
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPeriods = useCallback(async () => {
    try {
      setLoading(true);
      const responseData = await apiClient.get<{ data: PayrollPeriod[]; meta?: { total: number; totalPages: number } }>('/payroll/periods', { page: page.toString(), limit: '15' });
      setPeriods(responseData.data || []);
      setTotalPages(responseData.meta?.totalPages || 1);
      setTotalCount(responseData.meta?.total || 0);
    } catch {
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  const fetchRuns = useCallback(async () => {
    try {
      setLoading(true);
      const responseData = await apiClient.get<{ data: PayrollRun[]; meta?: { total: number; totalPages: number } }>('/payroll/runs', { page: page.toString(), limit: '15' });
      setRuns(responseData.data || []);
      setTotalPages(responseData.meta?.totalPages || 1);
      setTotalCount(responseData.meta?.total || 0);
    } catch {
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  const fetchStructures = useCallback(async () => {
    try {
      setLoading(true);
      const responseData = await apiClient.get<{ data: SalaryStructure[]; meta?: { total: number; totalPages: number } }>('/payroll/salaries', { page: page.toString(), limit: '15' });
      setStructures(responseData.data || []);
      setTotalPages(responseData.meta?.totalPages || 1);
      setTotalCount(responseData.meta?.total || 0);
    } catch {
      setStructures([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    setPage(1);
    if (activeTab === 'dashboard') fetchDashboard();
    else if (activeTab === 'periods') fetchPeriods();
    else if (activeTab === 'runs') fetchRuns();
    else if (activeTab === 'structures') fetchStructures();
  }, [activeTab, fetchDashboard, fetchPeriods, fetchRuns, fetchStructures]);

  useEffect(() => {
    if (activeTab !== 'dashboard') {
      if (activeTab === 'periods') fetchPeriods();
      else if (activeTab === 'runs') fetchRuns();
      else if (activeTab === 'structures') fetchStructures();
    }
  }, [page, activeTab, fetchPeriods, fetchRuns, fetchStructures]);

  /* ── Render Helpers ─────────────────────────────────────────────────────── */

  const renderDashboard = () => (
    loading ? (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <KpiSkeleton key={i} />)}
      </div>
    ) : !dashboard ? (
      <div className="overflow-hidden rounded-lg border border-[#DDD0BB] bg-white">
        <EmptyState icon={Wallet} title="No payroll data available" description="Payroll dashboard will appear once periods and runs are created." />
      </div>
    ) : (
      <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-5">
          <KpiCard label="Current Period" value={dashboard.currentPeriod || 'N/A'} icon={Clock} iconBg="bg-[#D1FAE5]" iconColor="text-[#064E3B]" />
          <KpiCard label="Employees" value={dashboard.employeeCount} icon={Users} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <KpiCard label="Gross Payroll" value={formatMoney(dashboard.grossPayroll, dashboard.currency)} icon={TrendingUp} iconBg="bg-blue-50" iconColor="text-blue-600" />
          <KpiCard label="Deductions" value={formatMoney(dashboard.deductions, dashboard.currency)} icon={TrendingDown} iconBg="bg-red-50" iconColor="text-red-600" />
          <KpiCard label="Net Payroll" value={formatMoney(dashboard.netPayroll, dashboard.currency)} icon={DollarSign} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <KpiCard label="Pending Review" value={dashboard.pendingReview} icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-600" />
          <KpiCard label="Finalized" value={dashboard.finalized} icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <KpiCard label="Currency" value={dashboard.currency} icon={DollarSign} iconBg="bg-purple-50" iconColor="text-purple-600" />
        </div>
      </>
    )
  );

  const renderPeriods = () => (
    loading ? (
      <TableSkeleton rows={8} cols={7} />
    ) : periods.length === 0 ? (
      <div className="overflow-hidden rounded-lg border border-[#DDD0BB] bg-white">
        <EmptyState icon={Clock} title="No payroll periods found" description="Create your first payroll period to get started." />
      </div>
    ) : (
      <DataTable
        columns={[
          {
            key: 'name',
            label: 'Period',
            render: (item: PayrollPeriod) => (
              <span className="text-[13px] font-medium text-[#1C1917]">{item.name}</span>
            ),
          },
          {
            key: 'startDate',
            label: 'Start Date',
            render: (item: PayrollPeriod) => (
              <span className="text-[13px] text-[#57534E]">{new Date(item.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            ),
          },
          {
            key: 'endDate',
            label: 'End Date',
            render: (item: PayrollPeriod) => (
              <span className="text-[13px] text-[#57534E]">{new Date(item.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            render: (item: PayrollPeriod) => <StatusBadge status={item.status} />,
          },
          {
            key: 'employeeCount',
            label: 'Employees',
            render: (item: PayrollPeriod) => (
              <span className="text-[13px] text-[#57534E]">{item.employeeCount || 0}</span>
            ),
            align: 'right' as const,
          },
          {
            key: 'totalNet',
            label: 'Net',
            render: (item: PayrollPeriod) => (
              <span className="text-[13px] font-medium text-[#1C1917]">{formatMoney(item.totalNet, item.currency)}</span>
            ),
            align: 'right' as const,
          },
        ]}
        data={periods}
        page={page}
        totalPages={totalPages}
        total={totalCount}
        limit={15}
        onPageChange={setPage}
      />
    )
  );

  const renderRuns = () => (
    loading ? (
      <TableSkeleton rows={8} cols={7} />
    ) : runs.length === 0 ? (
      <div className="overflow-hidden rounded-lg border border-[#DDD0BB] bg-white">
        <EmptyState icon={BarChart3} title="No payroll runs found" description="Create a payroll run to calculate employee salaries." />
      </div>
    ) : (
      <DataTable
        columns={[
          {
            key: 'period',
            label: 'Period',
            render: (item: PayrollRun) => (
              <span className="text-[13px] font-medium text-[#1C1917]">{item.period?.name || '—'}</span>
            ),
          },
          {
            key: 'calculationMode',
            label: 'Mode',
            render: (item: PayrollRun) => (
              <span className="rounded bg-[#F5E6CC] px-1.5 py-0.5 text-[11px] font-medium text-[#57534E]">{item.calculationMode}</span>
            ),
          },
          {
            key: 'employeeCount',
            label: 'Employees',
            render: (item: PayrollRun) => (
              <span className="text-[13px] text-[#57534E]">{item.employeeCount}</span>
            ),
            align: 'right' as const,
          },
          {
            key: 'totalGross',
            label: 'Gross',
            render: (item: PayrollRun) => (
              <span className="text-[13px] text-[#57534E]">{formatMoney(item.totalGross, item.currency)}</span>
            ),
            align: 'right' as const,
          },
          {
            key: 'totalDeductions',
            label: 'Deductions',
            render: (item: PayrollRun) => (
              <span className="text-[13px] text-red-600">{formatMoney(item.totalDeductions, item.currency)}</span>
            ),
            align: 'right' as const,
          },
          {
            key: 'totalNet',
            label: 'Net',
            render: (item: PayrollRun) => (
              <span className="text-[13px] font-semibold text-[#1C1917]">{formatMoney(item.totalNet, item.currency)}</span>
            ),
            align: 'right' as const,
          },
          {
            key: 'status',
            label: 'Status',
            render: (item: PayrollRun) => <StatusBadge status={item.status} />,
          },
        ]}
        data={runs}
        page={page}
        totalPages={totalPages}
        total={totalCount}
        limit={15}
        onPageChange={setPage}
      />
    )
  );

  const renderStructures = () => (
    loading ? (
      <TableSkeleton rows={8} cols={6} />
    ) : structures.length === 0 ? (
      <div className="overflow-hidden rounded-lg border border-[#DDD0BB] bg-white">
        <EmptyState icon={Settings} title="No salary structures found" description="Configure salary structures to define employee compensation." />
      </div>
    ) : (
      <DataTable
        columns={[
          {
            key: 'name',
            label: 'Structure',
            render: (item: SalaryStructure) => (
              <span className="text-[13px] font-medium text-[#1C1917]">{item.name}</span>
            ),
          },
          {
            key: 'employee',
            label: 'Employee',
            render: (item: SalaryStructure) => (
              <span className="text-[13px] text-[#57534E]">{item.employee ? `${item.employee.firstName} ${item.employee.lastName}` : '—'}</span>
            ),
          },
          {
            key: 'basicSalary',
            label: 'Basic Salary',
            render: (item: SalaryStructure) => (
              <span className="text-[13px] font-medium text-[#1C1917]">{formatMoney(item.basicSalary, item.currency)}</span>
            ),
            align: 'right' as const,
          },
          {
            key: 'totalEarnings',
            label: 'Total Earnings',
            render: (item: SalaryStructure) => (
              <span className="text-[13px] text-emerald-600">{formatMoney(item.totalEarnings, item.currency)}</span>
            ),
            align: 'right' as const,
          },
          {
            key: 'effectiveDate',
            label: 'Effective Date',
            render: (item: SalaryStructure) => (
              <span className="text-[13px] text-[#57534E]">{new Date(item.effectiveDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            render: (item: SalaryStructure) => <StatusBadge status={item.status} />,
          },
        ]}
        data={structures}
        page={page}
        totalPages={totalPages}
        total={totalCount}
        limit={15}
        onPageChange={setPage}
      />
    )
  );

  /* ── Main Render ────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-full bg-[#FBF5EC]">
      <PageHeader
        title="Payroll"
        description="Manage payroll runs, salary structures and employee compensation"
        breadcrumbs={[{ label: 'People' }, { label: 'Payroll' }]}
        actions={
          <button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#064E3B] px-3 text-[12px] font-medium text-white hover:bg-[#047857] transition-colors">
            <Plus className="h-3.5 w-3.5" />
            New Period
          </button>
        }
      />

      <div className="px-5 py-4 lg:px-6">
        {/* Tabs */}
        <Tabs tabs={PAYROLL_TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        <div className="pt-4">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'periods' && renderPeriods()}
          {activeTab === 'runs' && renderRuns()}
          {activeTab === 'structures' && renderStructures()}
          {activeTab === 'payslips' && (
            <div className="overflow-hidden rounded-lg border border-[#DDD0BB] bg-white">
              <EmptyState
                icon={FileText}
                title="Payslips"
                description="View payslips from the dedicated Payslips page."
                action={
                  <a href="/people/payslips" className="inline-flex items-center gap-1.5 rounded-md bg-[#064E3B] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#047857]">
                    View Payslips
                  </a>
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
