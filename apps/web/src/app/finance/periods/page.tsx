'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';

interface Period {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  isFiscalYearEnd: boolean;
}

export default function PeriodsPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get<{ id: string }[]>('/organization/companies');
        const companies = Array.isArray(res) ? res : [];
        if (companies.length > 0) setCompanyId(companies[0]!.id);
      } catch {}
    };
    load();
  }, []);

  const loadPeriods = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await apiClient.get<Period[]>(`/finance/periods?companyId=${companyId}`);
      setPeriods(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load periods');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { loadPeriods(); }, [loadPeriods]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await apiClient.post('/finance/periods', { ...form, companyId });
      setShowCreate(false);
      setForm({ name: '', startDate: '', endDate: '' });
      loadPeriods();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create period');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = async (id: string) => {
    if (!confirm('Close this period? No further postings will be allowed.')) return;
    try {
      await apiClient.patch(`/finance/periods/${id}/close`);
      loadPeriods();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to close period');
    }
  };

  return (
    <div>
      <PageHeader title="Fiscal Periods" description="Manage accounting periods and fiscal year boundaries." breadcrumbs={[{ label: 'Finance', href: '/finance' }, { label: 'Fiscal Periods' }]}
        actions={<button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-[#2563EB] text-white text-[13px] font-medium rounded-md hover:bg-[#1D4ED8]">+ New Period</button>}
      />
      {error && <div className="mb-4 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[13px] text-[#DC2626]">{error}</div>}
      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-[#F8FAFC] rounded animate-pulse" />)}</div>
      ) : periods.length === 0 ? (
        <EmptyState title="No periods" description="Create an accounting period to start recording transactions." />
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          <table className="w-full text-[13px]">
            <thead><tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <th className="text-left px-4 py-3 font-medium text-[#64748B]">Period</th>
              <th className="text-left px-4 py-3 font-medium text-[#64748B]">Start Date</th>
              <th className="text-left px-4 py-3 font-medium text-[#64748B]">End Date</th>
              <th className="text-center px-4 py-3 font-medium text-[#64748B]">Status</th>
              <th className="text-center px-4 py-3 font-medium text-[#64748B]">Actions</th>
            </tr></thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.id} className="border-b border-[#E2E8F0] last:border-b-0 hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-medium text-[#0F172A]">{p.name}</td>
                  <td className="px-4 py-3 text-[#475569]">{new Date(p.startDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-[#475569]">{new Date(p.endDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-center">
                    {p.status === 'OPEN' && (
                      <button onClick={() => handleClose(p.id)} className="px-2 py-1 text-[11px] text-[#DC2626] hover:bg-[#FEF2F2] rounded">Close Period</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl w-[460px] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E2E8F0]"><h2 className="text-[16px] font-semibold text-[#0F172A]">New Accounting Period</h2></div>
            <div className="p-6 space-y-4">
              <div><label className="block text-[12px] font-medium text-[#475569] mb-1">Period Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" placeholder="e.g. January 2026" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[12px] font-medium text-[#475569] mb-1">Start Date *</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" /></div>
                <div><label className="block text-[12px] font-medium text-[#475569] mb-1">End Date *</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" /></div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#E2E8F0] flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-[#E2E8F0] text-[#475569] text-[13px] font-medium rounded-md">Cancel</button>
              <button onClick={handleCreate} disabled={creating || !form.name || !form.startDate || !form.endDate} className="px-4 py-2 bg-[#2563EB] text-white text-[13px] font-medium rounded-md hover:bg-[#1D4ED8] disabled:opacity-50">
                {creating ? 'Creating...' : 'Create Period'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
