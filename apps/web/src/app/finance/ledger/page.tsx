'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';

function formatCurrency(amount: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100); }

interface LedgerEntry {
  id: string;
  lineNumber: number;
  description: string;
  debit: number;
  credit: number;
  currency: string;
  reference?: string;
  account: { code: string; name: string; accountType: string };
  journalEntry: { journalNumber: string; postingDate: string; description: string };
}

export default function LedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });

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

  const loadLedger = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ companyId, page: String(page), limit: '30' });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await apiClient.get<{ data: LedgerEntry[]; meta: { total: number; totalPages: number } }>(`/finance/ledger?${params.toString()}`);
      setEntries(res.data || []);
      setMeta(res.meta || { total: 0, totalPages: 0 });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load ledger');
    } finally {
      setLoading(false);
    }
  }, [companyId, page, startDate, endDate]);

  useEffect(() => { loadLedger(); }, [loadLedger]);

  return (
    <div>
      <PageHeader title="General Ledger" description="View all posted accounting transactions by account and date." breadcrumbs={[{ label: 'Finance', href: '/finance' }, { label: 'General Ledger' }]} />
      {error && <div className="mb-4 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[13px] text-[#DC2626]">{error}</div>}
      <div className="flex items-center gap-3 mb-4">
        <input type="text" placeholder="Search reference..." value={search} onChange={(e) => setSearch(e.target.value)} className="px-3 py-2 border border-[#DDD0BB] rounded-md text-[13px] w-[200px] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/20" />
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border border-[#DDD0BB] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/20" />
        <span className="text-[12px] text-[#57534E]">to</span>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border border-[#DDD0BB] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/20" />
      </div>
      {loading ? (
        <div className="bg-white border border-[#DDD0BB] rounded-lg p-6 space-y-3">{Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-8 bg-[#FBF5EC] rounded animate-pulse" />)}</div>
      ) : entries.length === 0 ? (
        <EmptyState title="No ledger entries" description="Posted journal entries will appear here." />
      ) : (
        <div className="bg-white border border-[#DDD0BB] rounded-lg overflow-hidden">
          <table className="w-full text-[12px]">
            <thead><tr className="border-b border-[#DDD0BB] bg-[#FBF5EC]">
              <th className="text-left px-4 py-3 font-medium text-[#57534E]">Date</th>
              <th className="text-left px-4 py-3 font-medium text-[#57534E]">Journal</th>
              <th className="text-left px-4 py-3 font-medium text-[#57534E]">Account</th>
              <th className="text-left px-4 py-3 font-medium text-[#57534E]">Description</th>
              <th className="text-right px-4 py-3 font-medium text-[#57534E]">Debit</th>
              <th className="text-right px-4 py-3 font-medium text-[#57534E]">Credit</th>
            </tr></thead>
            <tbody>
              {entries.filter(e => !search || e.reference?.toLowerCase().includes(search.toLowerCase()) || e.journalEntry.journalNumber.toLowerCase().includes(search.toLowerCase())).map((e) => (
                <tr key={e.id} className="border-b border-[#DDD0BB] last:border-b-0 hover:bg-[#FBF5EC]">
                  <td className="px-4 py-2 text-[#57534E]">{new Date(e.journalEntry.postingDate).toLocaleDateString()}</td>
                  <td className="px-4 py-2 font-mono text-[#064E3B]">{e.journalEntry.journalNumber}</td>
                  <td className="px-4 py-2 font-mono text-[#1C1917]">{e.account.code} — {e.account.name}</td>
                  <td className="px-4 py-2 text-[#57534E] max-w-[250px] truncate">{e.description}</td>
                  <td className="px-4 py-2 text-right font-medium text-[#1C1917]">{e.debit > 0 ? formatCurrency(e.debit) : '—'}</td>
                  <td className="px-4 py-2 text-right font-medium text-[#1C1917]">{e.credit > 0 ? formatCurrency(e.credit) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {meta.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-[#DDD0BB] flex items-center justify-between text-[12px] text-[#57534E]">
              <span>Page {page} of {meta.totalPages} ({meta.total} entries)</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="px-3 py-1 border border-[#DDD0BB] rounded disabled:opacity-50">Prev</button>
                <button onClick={() => setPage(Math.min(meta.totalPages, page + 1))} disabled={page >= meta.totalPages} className="px-3 py-1 border border-[#DDD0BB] rounded disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
