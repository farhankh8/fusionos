'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import { KpiSkeleton } from '@/components/ui/skeleton';
import { CalendarOff, ArrowLeft, TrendingUp, RefreshCw } from 'lucide-react';

interface Data { summary: { totalRequests: number; approvedRequests: number; pendingRequests: number; rejectedRequests: number; approvalRate: number; totalApprovedDays: number }; leaveByType: any[]; }

export default function LeaveAnalyticsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fetchData = useCallback(async () => { try { setLoading(true); setError(''); setData(await apiClient.get<Data>('/analytics/leave')); } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load leave analytics'); } finally { setLoading(false); } }, []);
  useEffect(() => { fetchData(); }, [fetchData]);
  const s = data?.summary;
  return (
    <div className="min-h-full bg-[#FBF5EC]">
      <PageHeader title="Leave Analytics" description="Leave requests, approvals, and utilization" breadcrumbs={[{ label: 'Analytics', href: '/analytics' }, { label: 'Leave' }]}
        actions={<button onClick={() => window.history.back()} className="flex items-center gap-1.5 rounded-md border border-[#DDD0BB] bg-white px-3 py-1.5 text-[12px] font-medium text-[#57534E] hover:bg-[#FBF5EC]"><ArrowLeft className="h-3.5 w-3.5" />Back</button>} />
      <div className="px-5 py-4 lg:px-6">
        {loading ? <div className="grid grid-cols-4 gap-3">{Array.from({length:4}).map((_,i)=><KpiSkeleton key={i}/>)}</div>
        : error ? <EmptyState icon={CalendarOff} title="Unable to load leave analytics" description={error}
            action={<button onClick={fetchData} className="flex items-center gap-1.5 rounded-md bg-[#064E3B] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#047857]"><RefreshCw className="h-3.5 w-3.5" />Retry</button>} />
        : s ? (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiCard label="Total Requests" value={s.totalRequests} icon={CalendarOff} iconBg="bg-violet-50" iconColor="text-violet-600" />
              <KpiCard label="Approved" value={s.approvedRequests} icon={CalendarOff} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
              <KpiCard label="Pending" value={s.pendingRequests} icon={CalendarOff} iconBg="bg-amber-50" iconColor="text-amber-600" />
              <KpiCard label="Approval Rate" value={`${s.approvalRate}%`} icon={TrendingUp} iconBg="bg-[#D1FAE5]" iconColor="text-[#064E3B]" />
            </div>
            <SectionCard title="Leave by Type">
              {data.leaveByType.length === 0 ? <EmptyState icon={CalendarOff} title="No leave data" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px]">
                    <thead><tr className="border-b border-[#DDD0BB]"><th className="px-3 py-2 font-medium text-[#57534E]">Type</th><th className="px-3 py-2 font-medium text-[#57534E]">Approved</th><th className="px-3 py-2 font-medium text-[#57534E]">Pending</th><th className="px-3 py-2 font-medium text-[#57534E]">Rejected</th></tr></thead>
                    <tbody className="divide-y divide-[#F5E6CC]">{data.leaveByType.map((t:any) => (
                      <tr key={t.name}><td className="px-3 py-2 font-medium text-[#1C1917]">{t.name}</td><td className="px-3 py-2 text-emerald-600">{t.approved}</td><td className="px-3 py-2 text-amber-600">{t.pending}</td><td className="px-3 py-2 text-red-600">{t.rejected}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </>
        ) : <EmptyState icon={CalendarOff} title="No leave data" description="Submit leave requests to see analytics." />}
      </div>
    </div>
  );
}
