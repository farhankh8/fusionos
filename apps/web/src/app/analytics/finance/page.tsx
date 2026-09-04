'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import { KpiSkeleton } from '@/components/ui/skeleton';
import { RefreshCw, DollarSign, TrendingUp, TrendingDown, ArrowLeft, BarChart3 } from 'lucide-react';

interface FinanceCurrencySummary {
  currency: string;
  totalRevenue: number; totalExpenses: number; netProfit: number;
  totalAR: number; totalAP: number;
  invoiceCount: number; unpaidInvoiceCount: number; billCount: number; unpaidBillCount: number;
}

interface FinanceData {
  summary: {
    totalRevenue: number; totalExpenses: number; netProfit: number; totalAR: number; totalAP: number;
    invoiceCount: number; unpaidInvoiceCount: number; billCount: number; unpaidBillCount: number;
    currency: string; hasMixedCurrencies?: boolean; byCurrency?: FinanceCurrencySummary[];
  };
  revenueTrend: { month: string; currency: string; revenue: number; expenses: number }[];
  invoiceCount: number;
  unpaidInvoiceCount: number;
  billCount: number;
  unpaidBillCount: number;
}

const fmt = (v: number, c = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(v / 100);

export default function FinanceAnalyticsPage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await apiClient.get<FinanceData>('/analytics/finance');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load finance analytics');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const s = data?.summary;
  const mixed = !!(s?.hasMixedCurrencies && (s.byCurrency?.length || 0) > 1);

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <PageHeader
        title="Finance Analytics"
        description="Financial performance, P&L, and receivables/payables"
        breadcrumbs={[{ label: 'Analytics', href: '/analytics' }, { label: 'Finance' }]}
        actions={
          <button onClick={() => window.history.back()} className="flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-[12px] font-medium text-[#64748B] hover:bg-[#F8FAFC]">
            <ArrowLeft className="h-3.5 w-3.5" />Back
          </button>
        }
      />
      <div className="px-5 py-4 lg:px-6">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)}</div>
        ) : error ? (
          <EmptyState
            icon={BarChart3}
            title="Unable to load finance analytics"
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
        ) : s ? (
          <>
            {mixed ? (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">
                Multiple currencies detected — figures are shown per currency and never cross-summed.
              </div>
            ) : null}
            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
              {mixed ? (
                s.byCurrency!.flatMap(c => [
                  <KpiCard key={`rev-${c.currency}`} label={`Revenue (${c.currency})`} value={fmt(c.totalRevenue, c.currency)} icon={TrendingUp} iconBg="bg-emerald-50" iconColor="text-emerald-600" />,
                  <KpiCard key={`net-${c.currency}`} label={`Net Profit (${c.currency})`} value={fmt(c.netProfit, c.currency)} icon={DollarSign} iconBg="bg-[#EFF6FF]" iconColor="text-[#2563EB]" />,
                  <KpiCard key={`ar-${c.currency}`} label={`Receivables (${c.currency})`} value={fmt(c.totalAR, c.currency)} icon={DollarSign} iconBg="bg-amber-50" iconColor="text-amber-600" />,
                  <KpiCard key={`ap-${c.currency}`} label={`Payables (${c.currency})`} value={fmt(c.totalAP, c.currency)} icon={DollarSign} iconBg="bg-red-50" iconColor="text-red-600" />,
                ])
              ) : (
                <>
                  <KpiCard label="Revenue" value={fmt(s.totalRevenue, s.currency)} icon={TrendingUp} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                  <KpiCard label="Expenses" value={fmt(s.totalExpenses, s.currency)} icon={TrendingDown} iconBg="bg-red-50" iconColor="text-red-600" />
                  <KpiCard label="Net Profit" value={fmt(s.netProfit, s.currency)} icon={DollarSign} iconBg="bg-[#EFF6FF]" iconColor="text-[#2563EB]" />
                  <KpiCard label="Receivables" value={fmt(s.totalAR, s.currency)} icon={DollarSign} iconBg="bg-amber-50" iconColor="text-amber-600" />
                  <KpiCard label="Payables" value={fmt(s.totalAP, s.currency)} icon={DollarSign} iconBg="bg-red-50" iconColor="text-red-600" />
                </>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard title="Revenue Trend">
                {data.revenueTrend.length === 0 ? (
                  <EmptyState icon={BarChart3} title="No revenue data" description="Post journal entries to see trends." />
                ) : (
                  <div className="space-y-2">
                    {data.revenueTrend.map((t) => (
                      <div key={`${t.month}-${t.currency}`} className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0">
                        <span className="text-[13px] font-medium text-[#0F172A]">{t.month} <span className="text-[11px] text-[#94A3B8]">{t.currency}</span></span>
                        <div className="flex gap-4">
                          <span className="text-[12px] text-emerald-600">Rev: {fmt(t.revenue, t.currency)}</span>
                          <span className="text-[12px] text-red-600">Exp: {fmt(t.expenses, t.currency)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Invoice & Bill Summary">
                <div className="space-y-3">
                  {[
                    ['Total Invoices', data.invoiceCount],
                    ['Unpaid Invoices', data.unpaidInvoiceCount],
                    ['Total Bills', data.billCount],
                    ['Unpaid Bills', data.unpaidBillCount],
                  ].map(([label, value]) => (
                    <div key={label as string} className="flex justify-between py-1 border-b border-[#F1F5F9] last:border-0">
                      <span className="text-[12px] text-[#64748B]">{label as string}</span>
                      <span className="text-[12px] font-medium text-[#0F172A]">{value as number}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          </>
        ) : (
          <EmptyState icon={BarChart3} title="No financial data" description="Configure your chart of accounts and post journal entries to see analytics." />
        )}
      </div>
    </div>
  );
}