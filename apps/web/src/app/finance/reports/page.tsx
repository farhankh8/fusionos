'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100);
}

type ReportType = 'trial-balance' | 'balance-sheet' | 'profit-loss';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('trial-balance');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get<{ id: string }[]>('/organization/companies');
        const companies = Array.isArray(res) ? res : [];
        if (companies.length > 0) setCompanyId(companies[0]!.id);
      } catch {}
    };
    load();
  }, []);

  const loadReport = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError('');
    setReportData(null);
    try {
      const params = new URLSearchParams({ companyId });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await apiClient.get<Record<string, unknown>>(`/finance/reports/${reportType}?${params.toString()}`);
      setReportData(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [companyId, reportType, startDate, endDate]);

  return (
    <div>
      <PageHeader
        title="Financial Reports"
        description="Generate and review financial statements from posted accounting entries."
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Reports' },
        ]}
      />

      {/* Report Type Tabs */}
      <div className="flex items-center gap-1 mb-4 bg-white border border-[#E2E8F0] rounded-lg p-1 w-fit">
        {([
          { key: 'trial-balance', label: 'Trial Balance' },
          { key: 'balance-sheet', label: 'Balance Sheet' },
          { key: 'profit-loss', label: 'Profit & Loss' },
        ] as const).map((rt) => (
          <button
            key={rt.key}
            onClick={() => { setReportType(rt.key); setReportData(null); }}
            className={`px-4 py-2 text-[13px] font-medium rounded-md transition-colors ${
              reportType === rt.key ? 'bg-[#2563EB] text-white' : 'text-[#475569] hover:bg-[#F8FAFC]'
            }`}
          >
            {rt.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" />
        <span className="text-[12px] text-[#64748B]">to</span>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" />
        <button onClick={loadReport} disabled={loading} className="px-4 py-2 bg-[#2563EB] text-white text-[13px] font-medium rounded-md hover:bg-[#1D4ED8] disabled:opacity-50">
          {loading ? 'Loading...' : 'Generate Report'}
        </button>
        {reportData && (
          <button onClick={() => window.print()} className="px-4 py-2 border border-[#E2E8F0] text-[#475569] text-[13px] font-medium rounded-md hover:bg-[#F8FAFC]">
            Print
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[13px] text-[#DC2626]">{error}</div>
      )}

      {/* Report Content */}
      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-3">
          {Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-8 bg-[#F8FAFC] rounded animate-pulse" />)}
        </div>
      ) : !reportData ? (
        <EmptyState title="No report generated" description="Select date range and click Generate Report to view financial statements." />
      ) : (
        <ReportRenderer type={reportType} data={reportData} />
      )}
    </div>
  );
}

function TrialBalanceReport({ data }: { data: any }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-[#E2E8F0]">
        <h3 className="text-[15px] font-semibold text-[#0F172A]">Trial Balance</h3>
        <p className="text-[12px] text-[#64748B] mt-0.5">
          {data.isBalanced ? '✓ This report is balanced' : '✗ WARNING: This report is NOT balanced — accounting integrity issue'}
        </p>
      </div>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <th className="text-left px-4 py-3 font-medium text-[#64748B]">Code</th>
            <th className="text-left px-4 py-3 font-medium text-[#64748B]">Account</th>
            <th className="text-right px-4 py-3 font-medium text-[#64748B]">Debit</th>
            <th className="text-right px-4 py-3 font-medium text-[#64748B]">Credit</th>
          </tr>
        </thead>
        <tbody>
          {(data.accounts || []).map((a: any, idx: number) => (
            <tr key={idx} className="border-b border-[#E2E8F0] last:border-b-0 hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 font-mono font-medium text-[#0F172A]">{a.code}</td>
              <td className="px-4 py-3 text-[#475569]">{a.name}</td>
              <td className="px-4 py-3 text-right font-medium text-[#0F172A]">{a.debit > 0 ? formatCurrency(a.debit) : '—'}</td>
              <td className="px-4 py-3 text-right font-medium text-[#0F172A]">{a.credit > 0 ? formatCurrency(a.credit) : '—'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-[#CBD5E1] font-semibold bg-[#F8FAFC]">
            <td colSpan={2} className="px-4 py-3 text-right text-[#0F172A]">Totals</td>
            <td className="px-4 py-3 text-right text-[#0F172A]">{formatCurrency(data.totalDebit)}</td>
            <td className="px-4 py-3 text-right text-[#0F172A]">{formatCurrency(data.totalCredit)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function BalanceSheetReport({ data }: { data: any }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-[#E2E8F0]">
        <h3 className="text-[15px] font-semibold text-[#0F172A]">Balance Sheet</h3>
        <p className="text-[12px] text-[#64748B] mt-0.5">
          {data.isBalanced ? '✓ Accounting equation holds: Assets = Liabilities + Equity' : '✗ WARNING: Accounting equation does not balance'}
        </p>
      </div>
      <div className="p-6">
        <div className="space-y-6">
          <div className="p-4 border border-[#E2E8F0] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[14px] font-semibold text-[#2563EB]">Assets</h4>
              <span className="text-[16px] font-semibold text-[#0F172A]">{formatCurrency(data.assets?.total || 0)}</span>
            </div>
          </div>

          <div className="p-4 border border-[#E2E8F0] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[14px] font-semibold text-[#DC2626]">Liabilities</h4>
              <span className="text-[16px] font-semibold text-[#0F172A]">{formatCurrency(data.liabilities?.total || 0)}</span>
            </div>
          </div>

          <div className="p-4 border border-[#E2E8F0] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[14px] font-semibold text-[#7C3AED]">Equity</h4>
              <span className="text-[16px] font-semibold text-[#0F172A]">{formatCurrency(data.equity?.total || 0)}</span>
            </div>
          </div>

          <div className="border-t-2 border-[#CBD5E1] pt-4">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold text-[#0F172A]">Total Liabilities + Equity</span>
              <span className="text-[18px] font-bold text-[#0F172A]">{formatCurrency((data.liabilities?.total || 0) + (data.equity?.total || 0))}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfitLossReport({ data }: { data: any }) {
  const netProfit = data.netProfit || 0;
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-[#E2E8F0]">
        <h3 className="text-[15px] font-semibold text-[#0F172A]">Profit & Loss Statement</h3>
      </div>
      <div className="p-6">
        <div className="space-y-6">
          <div className="p-4 border border-[#E2E8F0] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[14px] font-semibold text-[#16A34A]">Revenue</h4>
              <span className="text-[16px] font-semibold text-[#0F172A]">{formatCurrency(data.revenue?.total || 0)}</span>
            </div>
          </div>

          <div className="p-4 border border-[#E2E8F0] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[14px] font-semibold text-[#D97706]">Expenses</h4>
              <span className="text-[16px] font-semibold text-[#0F172A]">{formatCurrency(data.expenses?.total || 0)}</span>
            </div>
          </div>

          <div className="border-t-2 border-[#CBD5E1] pt-4">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold text-[#0F172A]">Net Profit</span>
              <span className={`text-[18px] font-bold ${netProfit >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                {formatCurrency(netProfit)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportRenderer({ type, data }: { type: ReportType; data: any }) {
  switch (type) {
    case 'trial-balance':
      return <TrialBalanceReport data={data} />;
    case 'balance-sheet':
      return <BalanceSheetReport data={data} />;
    case 'profit-loss':
      return <ProfitLossReport data={data} />;
    default:
      return null;
  }
}
