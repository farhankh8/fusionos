'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import { KpiSkeleton } from '@/components/ui/skeleton';
import { Wallet, ArrowLeft, RefreshCw } from 'lucide-react';

const fmt = (v: number, c: string = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(v / 100);

interface PayrollCurrencySummary {
  currency: string;
  totalGross: number; totalNet: number; totalDeductions: number;
  totalRuns: number; totalEmployees: number; averageCostPerEmployee: number;
}

interface Data {
  summary: {
    totalGross: number; totalNet: number; totalDeductions: number; totalRuns: number;
    averageCostPerEmployee: number; currency: string;
    hasMixedCurrencies?: boolean; byCurrency?: PayrollCurrencySummary[];
  };
  payrollTrend: any[];
  departmentPayroll: any[];
}

export default function PayrollAnalyticsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fetchData = useCallback(async () => {
    try { setLoading(true); setError(''); setData(await apiClient.get<Data>('/analytics/payroll')); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to load payroll analytics'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const s = data?.summary;
  const mixed = !!(s?.hasMixedCurrencies && (s.byCurrency?.length || 0) > 1);

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <PageHeader title="Payroll Analytics" description="Gross vs net, deductions, and department payroll" breadcrumbs={[{ label: 'Analytics', href: '/analytics' }, { label: 'Payroll' }]}
        actions={<button onClick={() => window.history.back()} className="flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-[12px] font-medium text-[#64748B] hover:bg-[#F8FAFC]"><ArrowLeft className="h-3.5 w-3.5" />Back</button>} />
      <div className="px-5 py-4 lg:px-6">
        {loading ? <div className="grid grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}</div>
          : error ? <EmptyState icon={Wallet} title="Unable to load payroll analytics" description={error}
              action={<button onClick={fetchData} className="flex items-center gap-1.5 rounded-md bg-[#2563EB] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#1D4ED8]"><RefreshCw className="h-3.5 w-3.5" />Retry</button>} />
          : s ? (
            <>
              {mixed ? <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">Multiple currencies detected — figures are shown per currency and never cross-summed.</div> : null}
              <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {mixed
                  ? s.byCurrency!.flatMap(c => [
                      <KpiCard key={`g-${c.currency}`} label={`Gross (${c.currency})`} value={fmt(c.totalGross, c.currency)} icon={Wallet} iconBg="bg-emerald-50" iconColor="text-emerald-600" />,
                      <KpiCard key={`n-${c.currency}`} label={`Avg Cost (${c.currency})`} value={fmt(c.averageCostPerEmployee, c.currency)} icon={Wallet} iconBg="bg-violet-50" iconColor="text-violet-600" />,
                    ])
                  : <>
                      <KpiCard label="Gross Payroll" value={fmt(s.totalGross, s.currency)} icon={Wallet} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                      <KpiCard label="Net Payroll" value={fmt(s.totalNet, s.currency)} icon={Wallet} iconBg="bg-[#EFF6FF]" iconColor="text-[#2563EB]" />
                      <KpiCard label="Deductions" value={fmt(s.totalDeductions, s.currency)} icon={Wallet} iconBg="bg-red-50" iconColor="text-red-600" />
                      <KpiCard label="Avg Cost/Employee" value={fmt(s.averageCostPerEmployee, s.currency)} icon={Wallet} iconBg="bg-violet-50" iconColor="text-violet-600" />
                    </>}
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <SectionCard title="Payroll Trend">
                  {data.payrollTrend.length === 0 ? <EmptyState icon={Wallet} title="No payroll data" /> : (
                    <div className="space-y-2">{data.payrollTrend.map((r: any, i: number) => (
                      <div key={`${r.runId || r.period}-${i}`} className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0">
                        <span className="text-[13px] font-medium text-[#0F172A]">{String(r.period).slice(0, 20)}{r.currency ? <span className="ml-1 text-[11px] text-[#94A3B8]">{r.currency}</span> : null}</span>
                        <div className="flex gap-4"><span className="text-[12px] text-emerald-600">{fmt(r.gross, r.currency)}</span><span className="text-[12px] text-[#2563EB]">{fmt(r.net, r.currency)}</span></div>
                      </div>
                    ))}</div>
                  )}
                </SectionCard>
                <SectionCard title="Department Payroll">
                  {data.departmentPayroll.length === 0 ? <EmptyState icon={Wallet} title="No department data" /> : (
                    <div className="space-y-2">{data.departmentPayroll.map((d: any, i: number) => (
                      <div key={`${d.name}-${d.currency || 'USD'}-${i}`} className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0">
                        <span className="text-[13px] font-medium text-[#0F172A]">{d.name}{d.currency ? <span className="ml-1 text-[11px] text-[#94A3B8]">{d.currency}</span> : null}</span>
                        <div className="flex gap-4"><span className="text-[12px] text-emerald-600">{fmt(d.gross, d.currency)}</span><span className="text-[12px] text-[#64748B]">{d.count} emp</span></div>
                      </div>
                    ))}</div>
                  )}
                </SectionCard>
              </div>
            </>
          ) : <EmptyState icon={Wallet} title="No payroll data" description="Finalize payroll runs to see analytics." />}
      </div>
    </div>
  );
}