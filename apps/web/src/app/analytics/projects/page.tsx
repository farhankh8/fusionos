'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import { KpiSkeleton } from '@/components/ui/skeleton';
import { FolderKanban, ArrowLeft, AlertTriangle, DollarSign, RefreshCw } from 'lucide-react';

const fmt = (v: number, c: string = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(v / 100);

interface ProjectCurrencySummary { currency: string; budget: number; spent: number; actualCost: number; }

interface Data {
  summary: {
    totalProjects: number; activeProjects: number; completedProjects: number; onHoldProjects: number;
    overdueMilestones: number; totalBudget: number; totalSpent: number; totalActualCost: number;
    totalLoggedHours: number; billableHours: number; nonBillableHours: number;
    currency: string; hasMixedCurrencies?: boolean; byCurrency?: ProjectCurrencySummary[];
  };
  statusDistribution: any[];
}

export default function ProjectsAnalyticsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fetchData = useCallback(async () => {
    try { setLoading(true); setError(''); setData(await apiClient.get<Data>('/analytics/projects')); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to load project analytics'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);
  const s = data?.summary;
  const mixed = !!(s?.hasMixedCurrencies && (s.byCurrency?.length || 0) > 1);

  return (
    <div className="min-h-full bg-[#FBF5EC]">
      <PageHeader title="Project Analytics" description="Project status, milestones, budgets, and tracked time" breadcrumbs={[{ label: 'Analytics', href: '/analytics' }, { label: 'Projects' }]}
        actions={<button onClick={() => window.history.back()} className="flex items-center gap-1.5 rounded-md border border-[#DDD0BB] bg-white px-3 py-1.5 text-[12px] font-medium text-[#57534E] hover:bg-[#FBF5EC]"><ArrowLeft className="h-3.5 w-3.5" />Back</button>} />
      <div className="px-5 py-4 lg:px-6">
        {loading ? <div className="grid grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}</div>
          : error ? <EmptyState icon={FolderKanban} title="Unable to load project analytics" description={error}
              action={<button onClick={fetchData} className="flex items-center gap-1.5 rounded-md bg-[#064E3B] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#047857]"><RefreshCw className="h-3.5 w-3.5" />Retry</button>} />
          : s ? (
            <>
              <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KpiCard label="Total Projects" value={s.totalProjects} icon={FolderKanban} iconBg="bg-[#D1FAE5]" iconColor="text-[#064E3B]" />
                <KpiCard label="Active" value={s.activeProjects} icon={FolderKanban} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                <KpiCard label="Completed" value={s.completedProjects} icon={FolderKanban} iconBg="bg-violet-50" iconColor="text-violet-600" />
                <KpiCard label="Overdue Milestones" value={s.overdueMilestones} icon={AlertTriangle} iconBg="bg-red-50" iconColor="text-red-600" />
              </div>
              {mixed ? <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">Multiple currencies detected — budget figures are shown per currency and never cross-summed.</div> : null}
              <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
                {mixed
                  ? s.byCurrency!.flatMap(c => [
                      <KpiCard key={`b-${c.currency}`} label={`Budget (${c.currency})`} value={fmt(c.budget, c.currency)} icon={DollarSign} iconBg="bg-[#D1FAE5]" iconColor="text-[#064E3B]" />,
                      <KpiCard key={`s-${c.currency}`} label={`Spent (${c.currency})`} value={fmt(c.spent, c.currency)} icon={DollarSign} iconBg="bg-red-50" iconColor="text-red-600" />,
                    ])
                  : <>
                      <KpiCard label="Total Budget" value={fmt(s.totalBudget, s.currency)} icon={DollarSign} iconBg="bg-[#D1FAE5]" iconColor="text-[#064E3B]" />
                      <KpiCard label="Total Spent" value={fmt(s.totalSpent, s.currency)} icon={DollarSign} iconBg="bg-red-50" iconColor="text-red-600" />
                      <KpiCard label="Logged Hours" value={s.totalLoggedHours} icon={FolderKanban} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                    </>}
              </div>
              <SectionCard title="Project Status Distribution">
                {data.statusDistribution.length === 0 ? <EmptyState icon={FolderKanban} title="No project data" /> : (
                  <div className="space-y-2">{data.statusDistribution.map((st: any) => (
                    <div key={st.status} className="flex items-center justify-between py-2 border-b border-[#F5E6CC] last:border-0">
                      <span className="text-[13px] font-medium text-[#1C1917]">{st.status.replace(/_/g, ' ')}</span>
                      <span className="text-[13px] font-bold text-[#064E3B]">{st.count}</span>
                    </div>
                  ))}</div>
                )}
              </SectionCard>
            </>
          ) : <EmptyState icon={FolderKanban} title="No project data" description="Create projects to see analytics." />}
      </div>
    </div>
  );
}