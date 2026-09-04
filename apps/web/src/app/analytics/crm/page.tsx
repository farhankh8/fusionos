'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import { KpiSkeleton } from '@/components/ui/skeleton';
import { Handshake, ArrowLeft, TrendingUp, DollarSign, RefreshCw } from 'lucide-react';

const fmt = (v: number, c: string = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(v / 100);

interface CrmCurrencySummary { currency: string; pipelineValue: number; weightedPipeline: number; wonRevenue: number; }

interface Data {
  summary: {
    totalLeads: number; conversionRate: number; pipelineValue: number; weightedPipeline: number;
    wonRevenue: number; winRate: number; currency: string;
    hasMixedCurrencies?: boolean; byCurrency?: CrmCurrencySummary[];
  };
  pipelineByStage: { stage: string; currency: string; count: number; value: number }[];
}

export default function CRMAnalyticsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fetchData = useCallback(async () => {
    try { setLoading(true); setError(''); setData(await apiClient.get<Data>('/analytics/crm')); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to load CRM analytics'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);
  const s = data?.summary;
  const mixed = !!(s?.hasMixedCurrencies && (s.byCurrency?.length || 0) > 1);

  return (
    <div className="min-h-full bg-[#FBF5EC]">
      <PageHeader title="CRM Analytics" description="Leads, pipeline, conversion, and win rate" breadcrumbs={[{ label: 'Analytics', href: '/analytics' }, { label: 'CRM' }]}
        actions={<button onClick={() => window.history.back()} className="flex items-center gap-1.5 rounded-md border border-[#DDD0BB] bg-white px-3 py-1.5 text-[12px] font-medium text-[#57534E] hover:bg-[#FBF5EC]"><ArrowLeft className="h-3.5 w-3.5" />Back</button>} />
      <div className="px-5 py-4 lg:px-6">
        {loading ? <div className="grid grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}</div>
          : error ? <EmptyState icon={Handshake} title="Unable to load CRM analytics" description={error}
              action={<button onClick={fetchData} className="flex items-center gap-1.5 rounded-md bg-[#064E3B] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#047857]"><RefreshCw className="h-3.5 w-3.5" />Retry</button>} />
          : s ? (
            <>
              {mixed ? <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">Multiple currencies detected — pipeline figures are shown per currency and never cross-summed.</div> : null}
              <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {mixed
                  ? s.byCurrency!.flatMap(c => [
                      <KpiCard key={`p-${c.currency}`} label={`Pipeline (${c.currency})`} value={fmt(c.pipelineValue, c.currency)} icon={DollarSign} iconBg="bg-[#D1FAE5]" iconColor="text-[#064E3B]" />,
                      <KpiCard key={`w-${c.currency}`} label={`Won (${c.currency})`} value={fmt(c.wonRevenue, c.currency)} icon={TrendingUp} iconBg="bg-emerald-50" iconColor="text-emerald-600" />,
                    ])
                  : <>
                      <KpiCard label="Total Leads" value={s.totalLeads} icon={Handshake} iconBg="bg-violet-50" iconColor="text-violet-600" />
                      <KpiCard label="Pipeline Value" value={fmt(s.pipelineValue, s.currency)} icon={DollarSign} iconBg="bg-[#D1FAE5]" iconColor="text-[#064E3B]" />
                      <KpiCard label="Won Revenue" value={fmt(s.wonRevenue, s.currency)} icon={TrendingUp} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                      <KpiCard label="Win Rate" value={`${s.winRate}%`} icon={TrendingUp} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                    </>}
              </div>
              <SectionCard title="Pipeline by Stage">
                {data.pipelineByStage.length === 0 ? <EmptyState icon={Handshake} title="No pipeline data" /> : (
                  <div className="space-y-2">{data.pipelineByStage.map((st: any) => (
                    <div key={`${st.stage}-${st.currency || 'USD'}`} className="flex items-center justify-between py-2 border-b border-[#F5E6CC] last:border-0">
                      <span className="text-[13px] font-medium text-[#1C1917]">{st.stage.replace(/_/g, ' ')} <span className="text-[11px] text-[#8E7E68]">{st.currency || 'USD'}</span></span>
                      <div className="flex gap-4"><span className="text-[12px] text-[#57534E]">{st.count} opps</span><span className="text-[12px] font-bold text-[#064E3B]">{fmt(st.value, st.currency || 'USD')}</span></div>
                    </div>
                  ))}</div>
                )}
              </SectionCard>
            </>
          ) : <EmptyState icon={Handshake} title="No CRM data" description="Create leads and opportunities to see analytics." />}
      </div>
    </div>
  );
}