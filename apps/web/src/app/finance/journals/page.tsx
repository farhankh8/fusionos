'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';

interface JournalLine {
  accountId: string;
  description: string;
  debit: number;
  credit: number;
  account: { code: string; name: string };
}

interface JournalEntry {
  id: string;
  journalNumber: string;
  postingDate: string;
  documentDate: string;
  entryType: string;
  description: string;
  status: string;
  currency: string;
  totalDebit: number;
  totalCredit: number;
  createdBy: string;
  postedBy?: string;
  postedAt?: string;
  lines: JournalLine[];
}

interface Account { id: string; code: string; name: string; allowManualPosting: boolean; isActive: boolean; }

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100);
}

export default function JournalsPage() {
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });

  const [form, setForm] = useState({
    postingDate: new Date().toISOString().split('T')[0],
    documentDate: new Date().toISOString().split('T')[0],
    description: '',
    currency: 'USD',
    lines: [
      { accountId: '', description: '', debit: 0, credit: 0 },
      { accountId: '', description: '', debit: 0, credit: 0 },
    ] as Array<{ accountId: string; description: string; debit: number; credit: number }>,
  });

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

  const loadJournals = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ companyId, page: String(page), limit: '15' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiClient.get<{ data: JournalEntry[]; meta: { total: number; totalPages: number } }>(`/finance/journals?${params.toString()}`);
      setJournals(res.data || []);
      setMeta(res.meta || { total: 0, totalPages: 0 });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load journals');
    } finally {
      setLoading(false);
    }
  }, [companyId, page, statusFilter]);

  useEffect(() => { loadJournals(); }, [loadJournals]);

  const loadAccounts = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await apiClient.get<Account[]>(`/finance/accounts?companyId=${companyId}`);
      setAccounts((Array.isArray(res) ? res : []).filter((a: Account) => a.allowManualPosting && a.isActive));
    } catch {}
  }, [companyId]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const totalDebit = form.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = form.lines.reduce((s, l) => s + l.credit, 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const addLine = () => setForm({ ...form, lines: [...form.lines, { accountId: '', description: '', debit: 0, credit: 0 }] });
  const removeLine = (idx: number) => setForm({ ...form, lines: form.lines.filter((_, i) => i !== idx) });
  const updateLine = (idx: number, field: string, value: any) => {
    const lines = [...form.lines];
    (lines[idx] as any)[field] = field === 'debit' || field === 'credit' ? Math.max(0, parseInt(value) || 0) : value;
    setForm({ ...form, lines });
  };

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const handleCreate = async () => {
    setCreating(true);
    setCreateError('');
    try {
      const res = await apiClient.post<JournalEntry>('/finance/journals', {
        companyId,
        postingDate: form.postingDate,
        documentDate: form.documentDate,
        description: form.description,
        currency: form.currency,
        lines: form.lines.map((l) => ({
          accountId: l.accountId,
          description: l.description,
          debit: l.debit,
          credit: l.credit,
        })),
      });
      setShowCreate(false);
      setSelectedJournal(res);
      loadJournals();
    } catch (err: any) {
      setCreateError(err?.response?.data?.message || 'Failed to create journal');
    } finally {
      setCreating(false);
    }
  };

  const handlePost = async (id: string) => {
    try {
      await apiClient.patch(`/finance/journals/${id}/post`);
      loadJournals();
      if (selectedJournal?.id === id) setSelectedJournal(null);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to post journal');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await apiClient.patch(`/finance/journals/${id}/approve`);
      loadJournals();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to approve journal');
    }
  };

  return (
    <div>
      <PageHeader
        title="Journal Entries"
        description="Create, approve, and post double-entry accounting journals."
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Journal Entries' },
        ]}
        actions={
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-[#2563EB] text-white text-[13px] font-medium rounded-md hover:bg-[#1D4ED8] transition-colors">
            + New Journal
          </button>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[13px] text-[#DC2626]">{error}</div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20">
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="APPROVED">Approved</option>
          <option value="POSTED">Posted</option>
          <option value="REVERSED">Reversed</option>
          <option value="VOIDED">Voided</option>
        </select>
      </div>

      {/* Journals Table */}
      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-10 bg-[#F8FAFC] rounded animate-pulse" />)}
        </div>
      ) : journals.length === 0 ? (
        <EmptyState title="No journal entries" description="Create your first journal entry to start recording transactions." action={
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-[#2563EB] text-white text-[13px] font-medium rounded-md hover:bg-[#1D4ED8]">Create Journal</button>
        } />
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <th className="text-left px-4 py-3 font-medium text-[#64748B]">Journal #</th>
                <th className="text-left px-4 py-3 font-medium text-[#64748B]">Date</th>
                <th className="text-left px-4 py-3 font-medium text-[#64748B]">Type</th>
                <th className="text-left px-4 py-3 font-medium text-[#64748B]">Description</th>
                <th className="text-right px-4 py-3 font-medium text-[#64748B]">Debit</th>
                <th className="text-right px-4 py-3 font-medium text-[#64748B]">Credit</th>
                <th className="text-center px-4 py-3 font-medium text-[#64748B]">Status</th>
                <th className="text-center px-4 py-3 font-medium text-[#64748B]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {journals.map((j) => (
                <tr key={j.id} className="border-b border-[#E2E8F0] last:border-b-0 hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-mono font-medium text-[#2563EB] cursor-pointer" onClick={() => setSelectedJournal(j)}>{j.journalNumber}</td>
                  <td className="px-4 py-3 text-[#475569]">{new Date(j.postingDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-[#64748B] text-[12px]">{j.entryType}</td>
                  <td className="px-4 py-3 text-[#475569] max-w-[250px] truncate">{j.description}</td>
                  <td className="px-4 py-3 text-right font-medium text-[#0F172A]">{formatCurrency(j.totalDebit, j.currency)}</td>
                  <td className="px-4 py-3 text-right font-medium text-[#0F172A]">{formatCurrency(j.totalCredit, j.currency)}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={j.status} /></td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {j.status === 'DRAFT' && (
                        <button onClick={() => handleApprove(j.id)} className="px-2 py-1 text-[11px] text-[#2563EB] hover:bg-[#EFF6FF] rounded">Approve</button>
                      )}
                      {j.status === 'APPROVED' && (
                        <button onClick={() => handlePost(j.id)} className="px-2 py-1 text-[11px] text-[#16A34A] hover:bg-[#F0FDF4] rounded font-medium">Post</button>
                      )}
                      <button onClick={() => setSelectedJournal(j)} className="px-2 py-1 text-[11px] text-[#64748B] hover:bg-[#F8FAFC] rounded">View</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-[#E2E8F0] flex items-center justify-between text-[12px] text-[#64748B]">
              <span>Page {page} of {meta.totalPages} ({meta.total} entries)</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="px-3 py-1 border border-[#E2E8F0] rounded disabled:opacity-50">Prev</button>
                <button onClick={() => setPage(Math.min(meta.totalPages, page + 1))} disabled={page >= meta.totalPages} className="px-3 py-1 border border-[#E2E8F0] rounded disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Journal Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl w-[700px] max-h-[85vh] overflow-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E2E8F0]">
              <h2 className="text-[16px] font-semibold text-[#0F172A]">New Journal Entry</h2>
            </div>
            <div className="p-6 space-y-4">
              {createError && <div className="px-3 py-2 bg-[#FEF2F2] rounded-md text-[12px] text-[#DC2626]">{createError}</div>}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#475569] mb-1">Posting Date *</label>
                  <input type="date" value={form.postingDate} onChange={(e) => setForm({ ...form, postingDate: e.target.value })} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#475569] mb-1">Currency</label>
                  <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" maxLength={3} />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#475569] mb-1">Description</label>
                  <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" />
                </div>
              </div>

              {/* Lines */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[13px] font-medium text-[#0F172A]">Journal Lines</h3>
                  <button onClick={addLine} className="text-[12px] text-[#2563EB] hover:underline">+ Add Line</button>
                </div>
                <div className="space-y-2">
                  {form.lines.map((line, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select value={line.accountId} onChange={(e) => updateLine(idx, 'accountId', e.target.value)} className="flex-1 px-3 py-2 border border-[#E2E8F0] rounded-md text-[12px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20">
                        <option value="">Select account</option>
                        {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                      </select>
                      <input value={line.description} onChange={(e) => updateLine(idx, 'description', e.target.value)} placeholder="Description" className="flex-1 px-3 py-2 border border-[#E2E8F0] rounded-md text-[12px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" />
                      <input type="number" value={line.debit || ''} onChange={(e) => updateLine(idx, 'debit', e.target.value)} placeholder="Debit" className="w-[100px] px-3 py-2 border border-[#E2E8F0] rounded-md text-[12px] text-right focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" />
                      <input type="number" value={line.credit || ''} onChange={(e) => updateLine(idx, 'credit', e.target.value)} placeholder="Credit" className="w-[100px] px-3 py-2 border border-[#E2E8F0] rounded-md text-[12px] text-right focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" />
                      {form.lines.length > 2 && (
                        <button onClick={() => removeLine(idx)} className="text-[#DC2626] hover:bg-[#FEF2F2] rounded p-1 text-[14px]">×</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <div className="flex gap-6 text-[13px]">
                  <span className="text-[#64748B]">Total Debit: <span className="font-medium text-[#0F172A]">{formatCurrency(totalDebit, form.currency)}</span></span>
                  <span className="text-[#64748B]">Total Credit: <span className="font-medium text-[#0F172A]">{formatCurrency(totalCredit, form.currency)}</span></span>
                  <span className="text-[#64748B]">Difference: <span className={`font-medium ${isBalanced ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>{formatCurrency(totalDebit - totalCredit, form.currency)}</span></span>
                </div>
                <span className={`text-[12px] font-medium px-2 py-0.5 rounded ${isBalanced ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-[#FEF2F2] text-[#DC2626]'}`}>
                  {isBalanced ? '✓ BALANCED' : '✗ UNBALANCED'}
                </span>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#E2E8F0] flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-[#E2E8F0] text-[#475569] text-[13px] font-medium rounded-md hover:bg-[#F8FAFC]">Cancel</button>
              <button onClick={handleCreate} disabled={creating || !isBalanced} className="px-4 py-2 bg-[#2563EB] text-white text-[13px] font-medium rounded-md hover:bg-[#1D4ED8] disabled:opacity-50">
                {creating ? 'Creating...' : 'Save Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Journal Detail */}
      {selectedJournal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSelectedJournal(null)}>
          <div className="bg-white rounded-xl w-[680px] max-h-[85vh] overflow-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-[#0F172A]">{selectedJournal.journalNumber}</h2>
                <p className="text-[12px] text-[#64748B]">{selectedJournal.description}</p>
              </div>
              <StatusBadge status={selectedJournal.status} />
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-4 text-[13px]">
                <div><span className="text-[#64748B]">Date:</span> <span className="ml-1 text-[#0F172A]">{new Date(selectedJournal.postingDate).toLocaleDateString()}</span></div>
                <div><span className="text-[#64748B]">Type:</span> <span className="ml-1 text-[#0F172A]">{selectedJournal.entryType}</span></div>
                <div><span className="text-[#64748B]">Currency:</span> <span className="ml-1 text-[#0F172A]">{selectedJournal.currency}</span></div>
              </div>

              <table className="w-full text-[12px] mb-4">
                <thead>
                  <tr className="border-b border-[#E2E8F0]">
                    <th className="text-left px-3 py-2 font-medium text-[#64748B]">Account</th>
                    <th className="text-left px-3 py-2 font-medium text-[#64748B]">Description</th>
                    <th className="text-right px-3 py-2 font-medium text-[#64748B]">Debit</th>
                    <th className="text-right px-3 py-2 font-medium text-[#64748B]">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedJournal.lines || []).map((l, idx) => (
                    <tr key={idx} className="border-b border-[#E2E8F0] last:border-b-0">
                      <td className="px-3 py-2 font-mono text-[#0F172A]">{l.account?.code} — {l.account?.name}</td>
                      <td className="px-3 py-2 text-[#475569]">{l.description}</td>
                      <td className="px-3 py-2 text-right font-medium text-[#0F172A]">{l.debit > 0 ? formatCurrency(l.debit, selectedJournal.currency) : '—'}</td>
                      <td className="px-3 py-2 text-right font-medium text-[#0F172A]">{l.credit > 0 ? formatCurrency(l.credit, selectedJournal.currency) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#CBD5E1] font-medium">
                    <td colSpan={2} className="px-3 py-2 text-right text-[#0F172A]">Total</td>
                    <td className="px-3 py-2 text-right text-[#0F172A]">{formatCurrency(selectedJournal.totalDebit, selectedJournal.currency)}</td>
                    <td className="px-3 py-2 text-right text-[#0F172A]">{formatCurrency(selectedJournal.totalCredit, selectedJournal.currency)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-[#E2E8F0] flex justify-end gap-3">
              {selectedJournal.status === 'DRAFT' && (
                <button onClick={() => { handleApprove(selectedJournal.id); setSelectedJournal(null); }} className="px-4 py-2 bg-[#2563EB] text-white text-[13px] font-medium rounded-md hover:bg-[#1D4ED8]">Approve</button>
              )}
              {selectedJournal.status === 'APPROVED' && (
                <button onClick={() => { handlePost(selectedJournal.id); setSelectedJournal(null); }} className="px-4 py-2 bg-[#16A34A] text-white text-[13px] font-medium rounded-md hover:bg-[#15803D]">Post</button>
              )}
              <button onClick={() => setSelectedJournal(null)} className="px-4 py-2 border border-[#E2E8F0] text-[#475569] text-[13px] font-medium rounded-md hover:bg-[#F8FAFC]">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
