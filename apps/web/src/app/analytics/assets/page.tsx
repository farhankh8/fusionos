'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import { KpiSkeleton } from '@/components/ui/skeleton';
import { Package, ArrowLeft, DollarSign, Wrench, RefreshCw } from 'lucide-react';

const fmt = (v: number, c: string = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(v / 100);

interface AssetCurrencySummary { currency: string; totalBookValue: number; totalPurchaseCost: number; totalMaintenanceCost: number; }

interface Data {
  summary: {
    totalAssets: number; activeAssets: number; assignedAssets: number; availableAssets: number;
    inMaintenanceAssets: number; totalBookValue: number; totalMaintenanceCost: number; currency: string;
    hasMixedCurrencies?: boolean; byCurrency?: AssetCurrencySummary[];
  };
  categoryDistribution: any[];
}

export default function AssetsAnalyticsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fetchData = useCallback(async () => {
    try { setLoading(true); setError(''); setData(await apiClient.get<Data>('/analytics/assets')); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to load asset analytics'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);
  const s = data?.summary;
  const mixed = !!(s?.hasMixedCurrencies && (s.byCurrency?.length || 0) > 1);

  return (
    <div className="min-h-full bg-[#FBF5EC]">
      <PageHeader title="Asset Analytics" description="Asset distribution, book value, and maintenance cost" breadcrumbs={[{ label: 'Analytics', href: '/analytics' }, { label: 'Assets' }]}
        actions={<button onClick={() => window.history.back()} className="flex items-center gap-1.5 rounded-md border border-[#DDD0BB] bg-white px-3 py-1.5 text-[12px] font-medium text-[#57534E] hover:bg-[#FBF5EC]"><ArrowLeft className="h-3.5 w-3.5" />Back</button>} />
      <div className="px-5 py-4 lg:px-6">
        {loading ? <div className="grid grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}</div>
          : error ? <EmptyState icon={Package} title="Unable to load asset analytics" description={error}
              action={<button onClick={fetchData} className="flex items-center gap-1.5 rounded-md bg-[#064E3B] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#047857]"><RefreshCw className="h-3.5 w-3.5" />Retry</button>} />
          : s ? (
            <>
              {mixed ? <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">Multiple currencies detected — figures are shown per currency and never cross-summed.</div> : null}
              <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KpiCard label="Total Assets" value={s.totalAssets} icon={Package} iconBg="bg-amber-50" iconColor="text-amber-600" />
                {mixed ? (
                  s.byCurrency!.flatMap(c => [
                    <KpiCard key={`bv-${c.currency}`} label={`Book Value (${c.currency})`} value={fmt(c.totalBookValue, c.currency)} icon={DollarSign} iconBg="bg-[#D1FAE5]" iconColor="text-[#064E3B]" />,
                    <KpiCard key={`m-${c.currency}`} label={`Maintenance (${c.currency})`} value={fmt(c.totalMaintenanceCost, c.currency)} icon={Wrench} iconBg="bg-amber-50" iconColor="text-amber-600" />,
                  ])
                ) : (
                  <>
                    <KpiCard label="Book Value" value={fmt(s.totalBookValue, s.currency)} icon={DollarSign} iconBg="bg-[#D1FAE5]" iconColor="text-[#064E3B]" />
                    <KpiCard label="Assigned" value={s.assignedAssets} icon={Package} iconBg="bg-violet-50" iconColor="text-violet-600" />
                    <KpiCard label="In Maintenance" value={s.inMaintenanceAssets} icon={Wrench} iconBg="bg-amber-50" iconColor="text-amber-600" />
                  </>
                )}
              </div>
              <SectionCard title="Assets by Category">
                {data.categoryDistribution.length === 0 ? <EmptyState icon={Package} title="No category data" /> : (
                  <div className="space-y-2">{data.categoryDistribution.map((c: any) => (
                    <div key={c.categoryId} className="flex items-center justify-between py-2 border-b border-[#F5E6CC] last:border-0">
                      <span className="text-[13px] font-medium text-[#1C1917]">{c.name}</span>
                      <span className="text-[13px] font-bold text-[#064E3B]">{c.count}</span>
                    </div>
                  ))}</div>
                )}
              </SectionCard>
            </>
          ) : <EmptyState icon={Package} title="No asset data" description="Create assets to see analytics." />}
      </div>
    </div>
  );
}