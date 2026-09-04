'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs } from '@/components/ui/tabs';
import { Package, Edit, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface Asset {
  id: string; assetCode: string; name: string; description?: string; status: string; condition: string;
  serialNumber?: string; manufacturer?: string; model?: string; purchaseDate?: string; purchaseCost: number;
  currency: string; currentBookValue: number; usefulLife?: number; residualValue: number;
  inServiceDate?: string; disposalDate?: string; disposalMethod?: string; notes?: string;
  category?: { id: string; name: string; code: string } | null;
  location?: { id: string; name: string; building?: string; floor?: string; room?: string } | null;
  vendor?: { id: string; name: string } | null;
  assignments: { id: string; status: string; assignedAt: string; returnedAt?: string; employee?: { firstName: string; lastName: string; employeeCode: string } | null; project?: { name: string; code: string } | null }[];
  maintenanceRecords: { id: string; type: string; title: string; status: string; scheduledDate?: string; cost: number; currency: string; assignedTo?: { firstName: string; lastName: string } | null }[];
  inspections: { id: string; inspectionType: string; status: string; scheduledDate: string; completedDate?: string; condition?: string; findings?: string; inspector?: { firstName: string; lastName: string } | null }[];
  warranties: { id: string; provider: string; startDate: string; endDate: string; referenceNumber?: string; coverage?: string; isActive: boolean }[];
  depreciations: { id: string; periodStartDate: string; periodEndDate: string; depreciationAmount: number; openingBookValue: number; closingBookValue: number; depreciationMethod: string }[];
  activities: { id: string; action: string; description: string; createdAt: string; actor?: { firstName: string; lastName: string } | null }[];
}

const TAB_LIST = [
  { id: 'overview', label: 'Overview' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'inspections', label: 'Inspections' },
  { id: 'warranty', label: 'Warranty' },
  { id: 'depreciation', label: 'Depreciation' },
  { id: 'activity', label: 'Activity' },
];

export default function AssetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchAsset = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<Asset>(`/assets/${id}`);
      setAsset(data);
    } catch { router.push('/assets'); } finally { setLoading(false); }
  }, [id, router]);

  useEffect(() => { fetchAsset(); }, [fetchAsset]);

  const fmt = (d: number, c: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(d / 100);
  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString() : '—';
  const getStatusColor = (s: string) => {
    const m: Record<string, string> = { ACTIVE: 'bg-emerald-50 text-emerald-700', AVAILABLE: 'bg-blue-50 text-blue-700', ASSIGNED: 'bg-violet-50 text-violet-700', IN_MAINTENANCE: 'bg-amber-50 text-amber-700', DRAFT: 'bg-gray-50 text-gray-600', RETIRED: 'bg-red-50 text-red-700', DISPOSED: 'bg-red-50 text-red-700', COMPLETED: 'bg-emerald-50 text-emerald-700', SCHEDULED: 'bg-blue-50 text-blue-700', IN_PROGRESS: 'bg-amber-50 text-amber-700', PASSED: 'bg-emerald-50 text-emerald-700', FAILED: 'bg-red-50 text-red-700' };
    return m[s] || 'bg-gray-50 text-gray-600';
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E2E8F0] border-t-[#2563EB]" /></div>;
  if (!asset) return null;

  const tabCounts = TAB_LIST.map(t => ({
    ...t,
    count: t.id === 'assignments' ? asset.assignments.length : t.id === 'maintenance' ? asset.maintenanceRecords.length : t.id === 'inspections' ? asset.inspections.length : undefined,
  }));

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <PageHeader
        title={asset.name}
        description={`Asset Code: ${asset.assetCode}`}
        breadcrumbs={[{ label: 'Assets', href: '/assets' }, { label: asset.name }]}
        actions={<div className="flex items-center gap-2"><button onClick={() => router.push(`/assets/${id}/edit`)} className="flex items-center gap-1 rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-[12px] font-medium text-[#64748B] hover:bg-[#F8FAFC]"><Edit className="h-3.5 w-3.5" />Edit</button></div>}
      />
      <div className="px-5 py-4 lg:px-6">
        <Tabs tabs={tabCounts} activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'overview' && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <SectionCard title="Asset Information">
              <div className="space-y-3">
                {[
                  ['Status', <span key="s" className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${getStatusColor(asset.status)}`}>{asset.status.replace(/_/g, ' ')}</span>],
                  ['Condition', asset.condition], ['Category', asset.category?.name ?? '—'],
                  ['Location', asset.location ? [asset.location.name, asset.location.building, asset.location.floor, asset.location.room].filter(Boolean).join(', ') : '—'],
                  ['Serial Number', asset.serialNumber ?? '—'], ['Manufacturer', asset.manufacturer ?? '—'], ['Model', asset.model ?? '—'],
                ].map(([l, v], i) => (
                  <div key={i} className="flex justify-between py-1 border-b border-[#F1F5F9] last:border-0">
                    <span className="text-[12px] text-[#64748B]">{l as string}</span>
                    <span className="text-[12px] font-medium text-[#0F172A]">{v as any}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Financial Information">
              <div className="space-y-3">
                {[
                  ['Purchase Cost', fmt(asset.purchaseCost, asset.currency)],
                  ['Current Book Value', fmt(asset.currentBookValue, asset.currency)],
                  ['Residual Value', fmt(asset.residualValue, asset.currency)],
                  ['Useful Life', asset.usefulLife ? `${asset.usefulLife} months` : '—'],
                  ['Purchase Date', fmtDate(asset.purchaseDate)], ['In Service Date', fmtDate(asset.inServiceDate)],
                  ['Vendor', asset.vendor?.name ?? '—'],
                ].map(([l, v], i) => (
                  <div key={i} className="flex justify-between py-1 border-b border-[#F1F5F9] last:border-0">
                    <span className="text-[12px] text-[#64748B]">{l as string}</span>
                    <span className="text-[12px] font-medium text-[#0F172A]">{v as any}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === 'assignments' && (
          <div className="mt-4">
            <SectionCard title="Current & Past Assignments">
              {asset.assignments.length === 0 ? <EmptyState icon={Package} title="No assignments" /> : (
                <div className="divide-y divide-[#E2E8F0]">
                  {asset.assignments.map(a => (
                    <div key={a.id} className="flex items-center justify-between py-3">
                      <div><p className="text-[13px] font-medium text-[#0F172A]">{a.employee ? `${a.employee.firstName} ${a.employee.lastName} (${a.employee.employeeCode})` : a.project ? `Project: ${a.project.name}` : '—'}</p>
                      <p className="text-[11px] text-[#64748B]">Assigned: {fmtDate(a.assignedAt)}{a.returnedAt ? ` · Returned: ${fmtDate(a.returnedAt)}` : ''}</p></div>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${getStatusColor(a.status)}`}>{a.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="mt-4">
            <SectionCard title="Maintenance Records">
              {asset.maintenanceRecords.length === 0 ? <EmptyState icon={Clock} title="No maintenance records" /> : (
                <div className="divide-y divide-[#E2E8F0]">
                  {asset.maintenanceRecords.map(m => (
                    <div key={m.id} className="flex items-center justify-between py-3">
                      <div><p className="text-[13px] font-medium text-[#0F172A]">{m.title}</p>
                      <p className="text-[11px] text-[#64748B]">{m.type.replace(/_/g, ' ')} · {fmtDate(m.scheduledDate)} · {fmt(m.cost, m.currency)}</p></div>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${getStatusColor(m.status)}`}>{m.status.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {activeTab === 'inspections' && (
          <div className="mt-4">
            <SectionCard title="Inspection Records">
              {asset.inspections.length === 0 ? <EmptyState icon={CheckCircle2} title="No inspections" /> : (
                <div className="divide-y divide-[#E2E8F0]">
                  {asset.inspections.map(i => (
                    <div key={i.id} className="flex items-center justify-between py-3">
                      <div><p className="text-[13px] font-medium text-[#0F172A]">{i.inspectionType}</p>
                      <p className="text-[11px] text-[#64748B]">Scheduled: {fmtDate(i.scheduledDate)}{i.completedDate ? ` · Completed: ${fmtDate(i.completedDate)}` : ''}</p></div>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${getStatusColor(i.status)}`}>{i.status.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {activeTab === 'warranty' && (
          <div className="mt-4">
            <SectionCard title="Warranty Information">
              {asset.warranties.length === 0 ? <EmptyState icon={AlertTriangle} title="No warranty records" /> : (
                <div className="divide-y divide-[#E2E8F0]">
                  {asset.warranties.map(w => (
                    <div key={w.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-medium text-[#0F172A]">{w.provider}</p>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${w.isActive && new Date(w.endDate) > new Date() ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {w.isActive && new Date(w.endDate) > new Date() ? 'Active' : 'Expired'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B]">{fmtDate(w.startDate)} — {fmtDate(w.endDate)}{w.referenceNumber ? ` · Ref: ${w.referenceNumber}` : ''}</p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {activeTab === 'depreciation' && (
          <div className="mt-4">
            <SectionCard title="Depreciation History">
              {asset.depreciations.length === 0 ? <EmptyState icon={Package} title="No depreciation records" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px]">
                    <thead><tr className="border-b border-[#E2E8F0]"><th className="px-3 py-2 font-medium text-[#64748B]">Period</th><th className="px-3 py-2 font-medium text-[#64748B]">Opening</th><th className="px-3 py-2 font-medium text-[#64748B]">Depreciation</th><th className="px-3 py-2 font-medium text-[#64748B]">Closing</th></tr></thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {asset.depreciations.map(d => (
                        <tr key={d.id}><td className="px-3 py-2">{fmtDate(d.periodStartDate)} — {fmtDate(d.periodEndDate)}</td>
                        <td className="px-3 py-2">{fmt(d.openingBookValue, asset.currency)}</td>
                        <td className="px-3 py-2 text-red-600">-{fmt(d.depreciationAmount, asset.currency)}</td>
                        <td className="px-3 py-2 font-medium">{fmt(d.closingBookValue, asset.currency)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="mt-4">
            <SectionCard title="Activity History">
              {asset.activities.length === 0 ? <EmptyState icon={Clock} title="No activity" /> : (
                <div className="divide-y divide-[#E2E8F0]">
                  {asset.activities.map(a => (
                    <div key={a.id} className="flex items-start gap-3 py-3">
                      <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#2563EB]" />
                      <div><p className="text-[13px] text-[#0F172A]">{a.description}</p>
                      <p className="text-[11px] text-[#94A3B8]">{a.actor ? `${a.actor.firstName} ${a.actor.lastName}` : 'System'} · {fmtDate(a.createdAt)}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}
