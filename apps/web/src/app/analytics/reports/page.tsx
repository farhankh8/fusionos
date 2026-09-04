'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { FileText, ArrowLeft, Plus, Trash2 } from 'lucide-react';

interface Report { id: string; name: string; description?: string; domain: string; createdAt: string; }

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', domain: 'finance' });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => { try { setLoading(true); const r = await apiClient.get<{ data: Report[] }>('/analytics/reports'); setReports(r.data || []); } catch {} finally { setLoading(false); } }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    try { await apiClient.post('/analytics/reports', form); setShowCreate(false); setForm({ name: '', description: '', domain: 'finance' }); fetchData(); } catch {} finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => { try { await apiClient.delete(`/analytics/reports/${id}`); fetchData(); } catch {} };

  const inputCls = 'w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#0F172A] outline-none focus:border-[#2563EB]';

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <PageHeader title="Saved Reports" description="Manage your saved analytics report configurations"
        breadcrumbs={[{ label: 'Analytics', href: '/analytics' }, { label: 'Reports' }]}
        actions={<div className="flex gap-2">
          <button onClick={() => window.history.back()} className="flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-[12px] font-medium text-[#64748B] hover:bg-[#F8FAFC]"><ArrowLeft className="h-3.5 w-3.5" />Back</button>
          <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1.5 rounded-md bg-[#2563EB] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#1D4ED8]"><Plus className="h-3.5 w-3.5" />New Report</button>
        </div>} />
      <div className="px-5 py-4 lg:px-6">
        {showCreate && (
          <form onSubmit={handleCreate} className="mb-4 rounded-lg border border-[#E2E8F0] bg-white p-4">
            <h3 className="mb-3 text-[13px] font-semibold text-[#0F172A]">Create Report</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div><label className="block text-[12px] font-medium text-[#64748B] mb-1">Name *</label><input className={inputCls} value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} required /></div>
              <div><label className="block text-[12px] font-medium text-[#64748B] mb-1">Description</label><input className={inputCls} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} /></div>
              <div><label className="block text-[12px] font-medium text-[#64748B] mb-1">Domain</label><select className={inputCls} value={form.domain} onChange={e => setForm(p => ({...p, domain: e.target.value}))}>
                {['finance','workforce','attendance','leave','payroll','crm','projects','assets'].map(d => <option key={d} value={d}>{d}</option>)}
              </select></div>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="submit" disabled={saving} className="rounded-md bg-[#2563EB] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#1D4ED8] disabled:opacity-50">{saving ? 'Creating...' : 'Create'}</button>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-[12px] font-medium text-[#64748B]">Cancel</button>
            </div>
          </form>
        )}

        <div className="rounded-lg border border-[#E2E8F0] bg-white">
          {loading ? <div className="p-8 text-center"><div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-[#E2E8F0] border-t-[#2563EB]" /></div> :
            reports.length === 0 ? <EmptyState icon={FileText} title="No saved reports" description="Create a report to save your analytics configuration." /> : (
            <div className="divide-y divide-[#E2E8F0]">{reports.map(r => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3">
                <div><p className="text-[13px] font-medium text-[#0F172A]">{r.name}</p><p className="text-[11px] text-[#64748B]">{r.domain} · {new Date(r.createdAt).toLocaleDateString()}</p></div>
                <button onClick={() => handleDelete(r.id)} className="rounded p-1.5 text-[#94A3B8] hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}</div>
          )}
        </div>
      </div>
    </div>
  );
}
