'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import { KpiSkeleton } from '@/components/ui/skeleton';
import { Users, UserPlus, ArrowLeft, BarChart3, RefreshCw } from 'lucide-react';

interface WorkforceData {
  summary: { totalEmployees: number; activeEmployees: number; newHires: number };
  departmentDistribution: { departmentId: string; name: string; count: number }[];
  employmentTypeDistribution: { type: string; count: number }[];
}

export default function WorkforceAnalyticsPage() {
  const [data, setData] = useState<WorkforceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await apiClient.get<WorkforceData>('/analytics/workforce');
      setData(result);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load workforce analytics'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const s = data?.summary;

  return (
    <div className="min-h-full bg-[#FBF5EC]">
      <PageHeader
        title="Workforce Analytics"
        description="Employee headcount, department distribution, and hiring trends"
        breadcrumbs={[{ label: 'Analytics', href: '/analytics' }, { label: 'Workforce' }]}
        actions={
          <button onClick={() => window.history.back()} className="flex items-center gap-1.5 rounded-md border border-[#DDD0BB] bg-white px-3 py-1.5 text-[12px] font-medium text-[#57534E] hover:bg-[#FBF5EC]">
            <ArrowLeft className="h-3.5 w-3.5" />Back
          </button>
        }
      />
      <div className="px-5 py-4 lg:px-6">
        {loading ? (
          <div className="grid grid-cols-3 gap-3">{Array.from({ length: 3 }).map((_, i) => <KpiSkeleton key={i} />)}</div>
        ) : error ? (
          <EmptyState icon={BarChart3} title="Unable to load workforce analytics" description={error}
            action={<button onClick={fetchData} className="flex items-center gap-1.5 rounded-md bg-[#064E3B] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#047857]"><RefreshCw className="h-3.5 w-3.5" />Retry</button>} />
        ) : s ? (
          <>
            <div className="mb-4 grid grid-cols-3 gap-3">
              <KpiCard label="Total Employees" value={s.totalEmployees} icon={Users} iconBg="bg-[#D1FAE5]" iconColor="text-[#064E3B]" />
              <KpiCard label="Active Employees" value={s.activeEmployees} icon={Users} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
              <KpiCard label="New Hires" value={s.newHires} icon={UserPlus} iconBg="bg-violet-50" iconColor="text-violet-600" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard title="Department Distribution">
                {!data.departmentDistribution.length ? (
                  <EmptyState icon={BarChart3} title="No department data" />
                ) : (
                  <div className="space-y-2">
                    {data.departmentDistribution.map((d) => (
                      <div key={d.departmentId} className="flex items-center justify-between py-2 border-b border-[#F5E6CC] last:border-0">
                        <span className="text-[13px] font-medium text-[#1C1917]">{d.name}</span>
                        <span className="text-[13px] font-bold text-[#064E3B]">{d.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Employment Type">
                {!data.employmentTypeDistribution.length ? (
                  <EmptyState icon={BarChart3} title="No type data" />
                ) : (
                  <div className="space-y-2">
                    {data.employmentTypeDistribution.map((t) => (
                      <div key={t.type} className="flex items-center justify-between py-2 border-b border-[#F5E6CC] last:border-0">
                        <span className="text-[13px] font-medium text-[#1C1917]">{t.type.replace(/_/g, ' ')}</span>
                        <span className="text-[13px] font-bold text-[#064E3B]">{t.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          </>
        ) : (
          <EmptyState icon={Users} title="No workforce data" description="Add employees to see analytics." />
        )}
      </div>
    </div>
  );
}
