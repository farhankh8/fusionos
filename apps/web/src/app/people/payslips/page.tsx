'use client';

/**
 * FusionOS Payslips Page
 * Enterprise payslip workspace with table and detail views.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { FilterBar } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { KpiSkeleton, TableSkeleton } from '@/components/ui/skeleton';
import { SectionCard } from '@/components/ui/section-card';
import { Receipt, FileText, DollarSign, CheckCircle2, Clock, Download, Eye } from 'lucide-react';

/* ── Types ───────────────────────────────────────────────────────────────── */

interface Payslip {
  id: string;
  employeeId: string;
  employee?: { id: string; firstName: string; lastName: string; employeeCode: string; department?: { name: string }; designation?: { name: string } };
  period?: { id: string; name: string };
  periodId: string;
  currency: string;
  grossAmount: number;
  totalDeductions: number;
  netAmount: number;
  status: string;
  generatedAt: string;
  finalizedAt?: string;
}

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

/* ── Main Component ──────────────────────────────────────────────────────── */

export default function PayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [kpis, setKpis] = useState({ total: 0, finalized: 0, pending: 0 });
  const [kpiLoading, setKpiLoading] = useState(true);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  /* ── Data Fetching ──────────────────────────────────────────────────────── */

  const fetchPayslips = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        page: page.toString(),
        limit: '15',
      };
      if (search) params['search'] = search;
      if (statusFilter) params['status'] = statusFilter;

      const responseData = await apiClient.get<{ data: Payslip[]; meta?: { total: number; totalPages: number } }>('/payroll/payslips', params);
      setPayslips(responseData.data || []);
      setTotalPages(responseData.meta?.totalPages || 1);
      setTotalCount(responseData.meta?.total || 0);
    } catch {
      setPayslips([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  const fetchKpis = useCallback(async () => {
    try {
      setKpiLoading(true);
      const data = await apiClient.get<{ data: Payslip[]; meta?: { total: number } }>('/payroll/payslips', { page: '1', limit: '100' });
      const all = data.data || [];
      const finalized = all.filter((p: Payslip) => p.status === 'FINALIZED').length;
      const pending = all.filter((p: Payslip) => p.status !== 'FINALIZED').length;
      setKpis({ total: data.meta?.total || all.length, finalized, pending });
    } catch {
      // KPI data unavailable
    } finally {
      setKpiLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayslips(); }, [fetchPayslips]);
  useEffect(() => { fetchKpis(); }, [fetchKpis]);

  /* ── Detail View ────────────────────────────────────────────────────────── */

  if (selectedPayslip) {
    return (
      <div className="min-h-full bg-[#FBF5EC]">
        <PageHeader
          title="Payslip Detail"
          description={`${selectedPayslip.employee?.firstName} ${selectedPayslip.employee?.lastName} — ${selectedPayslip.period?.name || 'N/A'}`}
          breadcrumbs={[
            { label: 'People' },
            { label: 'Payslips', onClick: () => setSelectedPayslip(null) },
            { label: 'Detail' },
          ]}
          actions={
            <button
              onClick={() => setSelectedPayslip(null)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#DDD0BB] px-3 text-[12px] font-medium text-[#57534E] hover:bg-[#FBF5EC] transition-colors"
            >
              Back to List
            </button>
          }
        />
        <div className="p-5 lg:p-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Employee Info */}
            <SectionCard title="Employee Information">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#064E3B] text-[13px] font-semibold text-white">
                    {selectedPayslip.employee?.firstName?.charAt(0)}{selectedPayslip.employee?.lastName?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[#1C1917]">{selectedPayslip.employee?.firstName} {selectedPayslip.employee?.lastName}</p>
                    <p className="text-[12px] text-[#57534E]">{selectedPayslip.employee?.employeeCode}</p>
                  </div>
                </div>
                <div className="space-y-2 border-t border-[#DDD0BB] pt-3">
                  <div className="flex justify-between">
                    <span className="text-[12px] text-[#57534E]">Department</span>
                    <span className="text-[12px] font-medium text-[#1C1917]">{selectedPayslip.employee?.department?.name || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[12px] text-[#57534E]">Designation</span>
                    <span className="text-[12px] font-medium text-[#1C1917]">{selectedPayslip.employee?.designation?.name || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[12px] text-[#57534E]">Period</span>
                    <span className="text-[12px] font-medium text-[#1C1917]">{selectedPayslip.period?.name || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[12px] text-[#57534E]">Status</span>
                    <StatusBadge status={selectedPayslip.status} />
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Earnings */}
            <SectionCard title="Earnings">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[13px] text-[#57534E]">Gross Amount</span>
                  <span className="text-[14px] font-semibold text-emerald-600">{formatMoney(selectedPayslip.grossAmount, selectedPayslip.currency)}</span>
                </div>
                <div className="border-t border-[#DDD0BB] pt-3">
                  <div className="flex justify-between">
                    <span className="text-[13px] text-[#57534E]">Total Deductions</span>
                    <span className="text-[14px] font-semibold text-red-600">-{formatMoney(selectedPayslip.totalDeductions, selectedPayslip.currency)}</span>
                  </div>
                </div>
                <div className="border-t border-[#DDD0BB] pt-3">
                  <div className="flex justify-between">
                    <span className="text-[13px] font-semibold text-[#1C1917]">Net Amount</span>
                    <span className="text-[16px] font-bold text-[#1C1917]">{formatMoney(selectedPayslip.netAmount, selectedPayslip.currency)}</span>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Payslip Info */}
            <SectionCard title="Payslip Information">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[12px] text-[#57534E]">Generated</span>
                  <span className="text-[12px] font-medium text-[#1C1917]">{selectedPayslip.generatedAt ? new Date(selectedPayslip.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                </div>
                {selectedPayslip.finalizedAt && (
                  <div className="flex justify-between">
                    <span className="text-[12px] text-[#57534E]">Finalized</span>
                    <span className="text-[12px] font-medium text-[#1C1917]">{new Date(selectedPayslip.finalizedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[12px] text-[#57534E]">Currency</span>
                  <span className="text-[12px] font-medium text-[#1C1917]">{selectedPayslip.currency}</span>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    );
  }

  /* ── List View ──────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-full bg-[#FBF5EC]">
      <PageHeader
        title="Payslips"
        description="View and manage employee payslips"
        breadcrumbs={[{ label: 'People' }, { label: 'Payslips' }]}
      />

      <div className="px-5 py-4 lg:px-6">
        {/* KPI Row */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          {kpiLoading ? (
            Array.from({ length: 3 }).map((_, i) => <KpiSkeleton key={i} />)
          ) : (
            <>
              <KpiCard label="Total Payslips" value={kpis.total} icon={FileText} iconBg="bg-[#D1FAE5]" iconColor="text-[#064E3B]" />
              <KpiCard label="Finalized" value={kpis.finalized} icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
              <KpiCard label="Pending" value={kpis.pending} icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-600" />
            </>
          )}
        </div>

        {/* Filters */}
        <FilterBar
          search={search}
          searchPlaceholder="Search by employee name or code..."
          onSearchChange={(val) => { setSearch(val); setPage(1); }}
          filters={[
            {
              key: 'status',
              label: 'All Status',
              value: statusFilter,
              options: [
                { value: 'GENERATED', label: 'Generated' },
                { value: 'FINALIZED', label: 'Finalized' },
              ],
              onChange: (val) => { setStatusFilter(val); setPage(1); },
            },
          ]}
          activeFilterCount={statusFilter ? 1 : 0}
          onClearFilters={() => { setStatusFilter(''); setSearch(''); setPage(1); }}
        />

        {/* Table */}
        {loading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : payslips.length === 0 ? (
          <div className="overflow-hidden rounded-lg border border-[#DDD0BB] bg-white">
            <EmptyState
              icon={Receipt}
              title="No payslips found"
              description="Payslips will appear here once payroll runs are finalized."
            />
          </div>
        ) : (
          <DataTable
            columns={[
              {
                key: 'employee',
                label: 'Employee',
                render: (item: Payslip) => (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#064E3B] text-[11px] font-semibold text-white">
                      {item.employee?.firstName?.charAt(0)}{item.employee?.lastName?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-[#1C1917]">{item.employee?.firstName} {item.employee?.lastName}</p>
                      <p className="text-[11px] text-[#57534E]">{item.employee?.employeeCode}</p>
                    </div>
                  </div>
                ),
              },
              {
                key: 'period',
                label: 'Period',
                render: (item: Payslip) => (
                  <span className="text-[13px] text-[#57534E]">{item.period?.name || '—'}</span>
                ),
              },
              {
                key: 'grossAmount',
                label: 'Gross',
                render: (item: Payslip) => (
                  <span className="text-[13px] text-[#57534E]">{formatMoney(item.grossAmount, item.currency)}</span>
                ),
                align: 'right' as const,
              },
              {
                key: 'totalDeductions',
                label: 'Deductions',
                render: (item: Payslip) => (
                  <span className="text-[13px] text-red-600">{formatMoney(item.totalDeductions, item.currency)}</span>
                ),
                align: 'right' as const,
              },
              {
                key: 'netAmount',
                label: 'Net',
                render: (item: Payslip) => (
                  <span className="text-[13px] font-semibold text-[#1C1917]">{formatMoney(item.netAmount, item.currency)}</span>
                ),
                align: 'right' as const,
              },
              {
                key: 'status',
                label: 'Status',
                render: (item: Payslip) => <StatusBadge status={item.status} />,
              },
              {
                key: 'actions',
                label: '',
                render: (item: Payslip) => (
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedPayslip(item); }}
                    className="inline-flex h-7 items-center gap-1 rounded border border-[#DDD0BB] px-2 text-[11px] text-[#57534E] hover:bg-[#FBF5EC]"
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </button>
                ),
              },
            ]}
            data={payslips}
            page={page}
            totalPages={totalPages}
            total={totalCount}
            limit={15}
            onPageChange={setPage}
            onRowClick={(item) => setSelectedPayslip(item)}
          />
        )}
      </div>
    </div>
  );
}
