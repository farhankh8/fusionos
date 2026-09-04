'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';

interface Opportunity {
  id: string;
  name: string;
  stage: string;
  status: string;
  amount: number;
  currency: string;
  probability: number;
  expectedCloseDate: string | null;
  createdAt: string;
  customerProfile: { customer: { name: string } };
  owner: { id: string; firstName: string; lastName: string } | null;
}

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100);
}

const STAGES = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];

export default function CrmOpportunitiesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [stage, setStage] = useState('');
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

  const loadOpps = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ companyId, page: String(page), limit: '20' });
      if (stage) params.set('stage', stage);
      const res = await apiClient.get<{ items: Opportunity[]; total: number }>(`/crm/opportunities?${params}`);
      setOpps(res.items || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  }, [companyId, page, stage]);

  useEffect(() => { loadOpps(); }, [loadOpps]);

  const changeStage = async (id: string, newStage: string) => {
    try {
      await apiClient.patch(`/crm/opportunities/${id}/stage`, { stage: newStage });
      loadOpps();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to change stage');
    }
  };

  const getNextStage = (current: string): string | null => {
    const idx = STAGES.indexOf(current);
    if (idx < 0 || idx >= STAGES.length - 2) return null;
    return STAGES[idx + 1] ?? null;
  };

  return (
    <div>
      <PageHeader
        title="Opportunities"
        description="Track sales opportunities through the pipeline."
        breadcrumbs={[{ label: 'CRM', href: '/crm' }, { label: 'Opportunities' }]}
      />

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[13px] text-[#DC2626]">{error}</div>
      )}

      <div className="flex gap-3 mb-4">
        <select
          value={stage}
          onChange={(e) => { setStage(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] text-[#475569]"
        >
          <option value="">All Stages</option>
          {STAGES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-lg border border-[#E2E8F0]">
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-[#F8FAFC] rounded animate-pulse" />
            ))}
          </div>
        ) : opps.length === 0 ? (
          <EmptyState title="No opportunities" description="Create your first opportunity to start tracking." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#E2E8F0]">
                  <th className="text-left px-4 py-3 font-medium text-[#64748B]">Opportunity</th>
                  <th className="text-left px-4 py-3 font-medium text-[#64748B]">Customer</th>
                  <th className="text-center px-4 py-3 font-medium text-[#64748B]">Stage</th>
                  <th className="text-right px-4 py-3 font-medium text-[#64748B]">Amount</th>
                  <th className="text-center px-4 py-3 font-medium text-[#64748B]">Probability</th>
                  <th className="text-left px-4 py-3 font-medium text-[#64748B]">Owner</th>
                  <th className="text-left px-4 py-3 font-medium text-[#64748B]">Close Date</th>
                  <th className="text-left px-4 py-3 font-medium text-[#64748B]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {opps.map((o) => {
                  const next = getNextStage(o.stage);
                  return (
                    <tr key={o.id} className="border-b border-[#E2E8F0] last:border-b-0 hover:bg-[#F8FAFC]">
                      <td className="px-4 py-3 font-medium text-[#0F172A]">{o.name}</td>
                      <td className="px-4 py-3 text-[#475569]">{o.customerProfile?.customer?.name || '—'}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={o.stage} /></td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(o.amount, o.currency)}</td>
                      <td className="px-4 py-3 text-center">{o.probability}%</td>
                      <td className="px-4 py-3 text-[#475569]">{o.owner ? `${o.owner.firstName} ${o.owner.lastName}` : '—'}</td>
                      <td className="px-4 py-3 text-[#64748B]">{o.expectedCloseDate ? new Date(o.expectedCloseDate).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {next && o.status === 'OPEN' && (
                            <button
                              onClick={() => changeStage(o.id, next)}
                              className="px-2 py-1 text-[11px] bg-[#2563EB] text-white rounded hover:bg-[#1D4ED8]"
                            >
                              → {next.replace('_', ' ')}
                            </button>
                          )}
                          <button onClick={() => router.push(`/crm/opportunities?id=${o.id}`)} className="px-2 py-1 text-[11px] border border-[#E2E8F0] rounded hover:bg-[#F8FAFC]">
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {total > 20 && (
          <div className="px-4 py-3 border-t border-[#E2E8F0] flex items-center justify-between text-[12px] text-[#64748B]">
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
