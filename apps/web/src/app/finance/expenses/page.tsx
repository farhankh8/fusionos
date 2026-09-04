'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';

interface Expense {
  id: string;
  expenseNumber: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  expenseDate: string;
  status: string;
  employee?: { id: string; firstName: string; lastName: string; employeeCode: string };
}

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100);
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ description: '', amount: 0, currency: 'USD', expenseDate: new Date().toISOString().split('T')[0], category: '', accountId: '' });
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

  const loadExpenses = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ companyId, page: String(page), limit: '15' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiClient.get<{ data: Expense[]; meta: { total: number; totalPages: number } }>(`/finance/expenses?${params.toString()}`);
      setExpenses(res.data || []);
      setMeta(res.meta || { total: 0, totalPages: 0 });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [companyId, page, statusFilter]);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await apiClient.post('/finance/expenses', { ...createForm, companyId });
      setShowCreate(false);
      setCreateForm({ description: '', amount: 0, currency: 'USD', expenseDate: new Date().toISOString().split('T')[0], category: '', accountId: '' });
      loadExpenses();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create expense');
    } finally {
      setCreating(false);
    }
  };

  const handleSubmit = async (id: string) => {
    try {
      await apiClient.patch(`/finance/expenses/${id}/review`, { action: 'APPROVED' });
      loadExpenses();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to review expense');
    }
  };

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Manage employee and operational expenses with approval workflow."
        breadcrumbs={[{ label: 'Finance', href: '/finance' }, { label: 'Expenses' }]}
        actions={
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-[#2563EB] text-white text-[13px] font-medium rounded-md hover:bg-[#1D4ED8] transition-colors">
            + New Expense
          </button>
        }
      />

      {error && <div className="mb-4 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[13px] text-[#DC2626]">{error}</div>}

      <div className="flex items-center gap-3 mb-4">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20">
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="POSTED">Posted</option>
        </select>
      </div>

      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-10 bg-[#F8FAFC] rounded animate-pulse" />)}
        </div>
      ) : expenses.length === 0 ? (
        <EmptyState title="No expenses" description="Create an expense to get started." />
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <th className="text-left px-4 py-3 font-medium text-[#64748B]">Number</th>
                <th className="text-left px-4 py-3 font-medium text-[#64748B]">Description</th>
                <th className="text-left px-4 py-3 font-medium text-[#64748B]">Category</th>
                <th className="text-right px-4 py-3 font-medium text-[#64748B]">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-[#64748B]">Date</th>
                <th className="text-center px-4 py-3 font-medium text-[#64748B]">Status</th>
                <th className="text-center px-4 py-3 font-medium text-[#64748B]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b border-[#E2E8F0] last:border-b-0 hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-mono font-medium text-[#2563EB]">{e.expenseNumber}</td>
                  <td className="px-4 py-3 text-[#475569] max-w-[200px] truncate">{e.description}</td>
                  <td className="px-4 py-3 text-[#64748B]">{e.category}</td>
                  <td className="px-4 py-3 text-right font-medium text-[#0F172A]">{formatCurrency(e.amount, e.currency)}</td>
                  <td className="px-4 py-3 text-[#475569]">{new Date(e.expenseDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={e.status} /></td>
                  <td className="px-4 py-3 text-center">
                    {e.status === 'SUBMITTED' && (
                      <button onClick={() => handleSubmit(e.id)} className="px-2 py-1 text-[11px] text-[#16A34A] hover:bg-[#F0FDF4] rounded font-medium">Approve</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {meta.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-[#E2E8F0] flex items-center justify-between text-[12px] text-[#64748B]">
              <span>Page {page} of {meta.totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="px-3 py-1 border border-[#E2E8F0] rounded disabled:opacity-50">Prev</button>
                <button onClick={() => setPage(Math.min(meta.totalPages, page + 1))} disabled={page >= meta.totalPages} className="px-3 py-1 border border-[#E2E8F0] rounded disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl w-[500px] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E2E8F0]">
              <h2 className="text-[16px] font-semibold text-[#0F172A]">New Expense</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#475569] mb-1">Description *</label>
                <input value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#475569] mb-1">Amount (cents) *</label>
                  <input type="number" value={createForm.amount || ''} onChange={(e) => setCreateForm({ ...createForm, amount: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#475569] mb-1">Category *</label>
                  <input value={createForm.category} onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" placeholder="e.g. Travel, Office" />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#475569] mb-1">Date *</label>
                <input type="date" value={createForm.expenseDate} onChange={(e) => setCreateForm({ ...createForm, expenseDate: e.target.value })} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#E2E8F0] flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-[#E2E8F0] text-[#475569] text-[13px] font-medium rounded-md">Cancel</button>
              <button onClick={handleCreate} disabled={creating || !createForm.description || !createForm.amount || !createForm.category} className="px-4 py-2 bg-[#2563EB] text-white text-[13px] font-medium rounded-md hover:bg-[#1D4ED8] disabled:opacity-50">
                {creating ? 'Creating...' : 'Create Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
