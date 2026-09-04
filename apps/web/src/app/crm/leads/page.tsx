'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';

interface Lead {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  source: string;
  status: string;
  rating: number | null;
  createdAt: string;
  owner: { id: string; firstName: string; lastName: string } | null;
  _count: { activities: number };
}

export default function CrmLeadsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [companyId, setCompanyId] = useState('');

  useEffect(() => {
    const loadCompany = async () => {
      try {
        const res = await apiClient.get<{ id: string }[]>('/organization/companies');
        const companies = Array.isArray(res) ? res : [];
        if (companies.length > 0) setCompanyId(companies[0]!.id);
      } catch {}
    };
    loadCompany();
  }, []);

  const loadLeads = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ companyId, page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const res = await apiClient.get<{ items: Lead[]; total: number }>(`/crm/leads?${params}`);
      setLeads(res.items || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [companyId, page, search, status]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  const qualifyLead = async (id: string) => {
    try {
      await apiClient.patch(`/crm/leads/${id}/qualify`, {});
      loadLeads();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to qualify lead');
    }
  };

  const convertLead = async (id: string) => {
    try {
      await apiClient.patch(`/crm/leads/${id}/convert`, {});
      loadLeads();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to convert lead');
    }
  };

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Track and convert potential business opportunities."
        breadcrumbs={[{ label: 'CRM', href: '/crm' }, { label: 'Leads' }]}
      />

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[13px] text-[#DC2626]">{error}</div>
      )}

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search leads..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 max-w-xs px-3 py-2 border border-[#DDD0BB] rounded-md text-[13px] focus:outline-none focus:ring-1 focus:ring-[#064E3B]"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-[#DDD0BB] rounded-md text-[13px] text-[#57534E]"
        >
          <option value="">All Statuses</option>
          <option value="NEW">New</option>
          <option value="CONTACTED">Contacted</option>
          <option value="QUALIFIED">Qualified</option>
          <option value="UNQUALIFIED">Unqualified</option>
          <option value="CONVERTED">Converted</option>
          <option value="LOST">Lost</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-[#DDD0BB]">
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-[#FBF5EC] rounded animate-pulse" />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <EmptyState title="No leads" description="Capture your first lead to start the pipeline." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#DDD0BB]">
                  <th className="text-left px-4 py-3 font-medium text-[#57534E]">Lead</th>
                  <th className="text-left px-4 py-3 font-medium text-[#57534E]">Company</th>
                  <th className="text-left px-4 py-3 font-medium text-[#57534E]">Source</th>
                  <th className="text-left px-4 py-3 font-medium text-[#57534E]">Owner</th>
                  <th className="text-center px-4 py-3 font-medium text-[#57534E]">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-[#57534E]">Rating</th>
                  <th className="text-left px-4 py-3 font-medium text-[#57534E]">Created</th>
                  <th className="text-left px-4 py-3 font-medium text-[#57534E]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-b border-[#DDD0BB] last:border-b-0 hover:bg-[#FBF5EC]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1C1917]">{l.firstName} {l.lastName || ''}</p>
                      {l.email && <p className="text-[12px] text-[#57534E]">{l.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-[#57534E]">{l.companyName || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={l.source} /></td>
                    <td className="px-4 py-3 text-[#57534E]">{l.owner ? `${l.owner.firstName} ${l.owner.lastName}` : '—'}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={l.status} /></td>
                    <td className="px-4 py-3 text-center">{l.rating ? '⭐'.repeat(l.rating) : '—'}</td>
                    <td className="px-4 py-3 text-[#57534E]">{new Date(l.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {(l.status === 'NEW' || l.status === 'CONTACTED') && (
                          <button onClick={() => qualifyLead(l.id)} className="px-2 py-1 text-[11px] bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] rounded hover:bg-[#DCFCE7]">
                            Qualify
                          </button>
                        )}
                        {l.status === 'QUALIFIED' && (
                          <button onClick={() => convertLead(l.id)} className="px-2 py-1 text-[11px] bg-[#064E3B] text-white rounded hover:bg-[#047857]">
                            Convert
                          </button>
                        )}
                        <button onClick={() => router.push(`/crm/leads?id=${l.id}`)} className="px-2 py-1 text-[11px] border border-[#DDD0BB] rounded hover:bg-[#FBF5EC]">
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > 20 && (
          <div className="px-4 py-3 border-t border-[#DDD0BB] flex items-center justify-between text-[12px] text-[#57534E]">
            <span>Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
              <button disabled={page * 20 >= total} onClick={() => setPage(page + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
