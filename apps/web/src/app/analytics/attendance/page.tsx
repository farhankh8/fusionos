'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import { KpiSkeleton } from '@/components/ui/skeleton';
import { Clock, ArrowLeft, BarChart3, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface Data { summary: { totalRecords: number; presentRate: number; totalWorkedHours: number; totalOvertimeHours: number; lateRecords: number; absentRecords: number; incompleteRecords: number }; trend: any[]; }

export default function AttendanceAnalyticsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fetchData = useCallback(async () => { try { setLoading(true); setError(''); setData(await apiClient.get<Data>('/analytics/attendance')); } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load attendance analytics'); } finally { setLoading(false); } }, []);
  useEffect(() => { fetchData(); }, [fetchData]);
  const s = data?.summary;
  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <PageHeader title="Attendance Analytics" description="Present rate, worked hours, and overtime trends" breadcrumbs={[{ label: 'Analytics', href: '/analytics' }, { label: 'Attendance' }]}
        actions={<button onClick={() => window.history.back()} className="flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-[12px] font-medium text-[#64748B] hover:bg-[#F8FAFC]"><ArrowLeft className="h-3.5 w-3.5" />Back</button>} />
      <div className="px-5 py-4 lg:px-6">
        {loading ? <div className="grid grid-cols-4 gap-3">{Array.from({length:4}).map((_,i)=><KpiSkeleton key={i}/>)}</div>
        : error ? <EmptyState icon={BarChart3} title="Unable to load attendance analytics" description={error}
            action={<button onClick={fetchData} className="flex items-center gap-1.5 rounded-md bg-[#2563EB] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#1D4ED8]"><RefreshCw className="h-3.5 w-3.5" />Retry</button>} />
        : s ? (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <KpiCard label="Present Rate" value={`${s.presentRate}%`} icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
              <KpiCard label="Total Records" value={s.totalRecords} icon={Clock} iconBg="bg-[#EFF6FF]" iconColor="text-[#2563EB]" />
              <KpiCard label="Worked Hours" value={s.totalWorkedHours} icon={Clock} iconBg="bg-[#EFF6FF]" iconColor="text-[#2563EB]" />
              <KpiCard label="Late Count" value={s.lateRecords} icon={AlertTriangle} iconBg="bg-amber-50" iconColor="text-amber-600" />
              <KpiCard label="Incomplete" value={s.incompleteRecords} icon={AlertTriangle} iconBg="bg-red-50" iconColor="text-red-600" />
            </div>
            <SectionCard title="Attendance Trend">
              {data.trend.length === 0 ? <EmptyState icon={BarChart3} title="No attendance data" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px]">
                    <thead><tr className="border-b border-[#E2E8F0]"><th className="px-3 py-2 font-medium text-[#64748B]">Date</th><th className="px-3 py-2 font-medium text-[#64748B]">Present</th><th className="px-3 py-2 font-medium text-[#64748B]">Absent</th><th className="px-3 py-2 font-medium text-[#64748B]">Late</th><th className="px-3 py-2 font-medium text-[#64748B]">Overtime</th></tr></thead>
                    <tbody className="divide-y divide-[#F1F5F9]">{data.trend.slice(0,30).map((t:any) => (
                      <tr key={t.date}><td className="px-3 py-2 font-medium text-[#0F172A]">{t.date}</td><td className="px-3 py-2 text-emerald-600">{t.PRESENT||0}</td><td className="px-3 py-2 text-red-600">{t.ABSENT||0}</td><td className="px-3 py-2 text-amber-600">{t.LATE||0}</td><td className="px-3 py-2 text-[#2563EB]">{t.OVERTIME||0}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </>
        ) : <EmptyState icon={Clock} title="No attendance data" description="Record attendance to see analytics." />}
      </div>
    </div>
  );
}
