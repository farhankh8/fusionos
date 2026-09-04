'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100);
}

interface Payment {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  reference?: string;
  description?: string;
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CARD', label: 'Card' },
  { value: 'OTHER', label: 'Other' },
];

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    amount: 0,
    currency: 'USD',
    paymentMethod: 'BANK_TRANSFER',
    reference: '',
    description: '',
    vendorId: '',
    customerId: '',
    invoiceId: '',
    billId: '',
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

  const loadPayments = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ companyId, page: String(page), limit: '15' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiClient.get<{ data: Payment[]; meta: { total: number; totalPages: number } }>(`/finance/payments?${params.toString()}`);
      setPayments(res.data || []);
      setMeta(res.meta || { total: 0, totalPages: 0 });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [companyId, page, statusFilter]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await apiClient.post('/finance/payments', {
        ...form,
        companyId,
        vendorId: form.vendorId || undefined,
        customerId: form.customerId || undefined,
        invoiceId: form.invoiceId || undefined,
        billId: form.billId || undefined,
      });
      setShowCreate(false);
      setForm({
        paymentDate: new Date().toISOString().split('T')[0],
        amount: 0,
        currency: 'USD',
        paymentMethod: 'BANK_TRANSFER',
        reference: '',
        description: '',
        vendorId: '',
        customerId: '',
        invoiceId: '',
        billId: '',
      });
      loadPayments();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create payment');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Record and track outgoing payments to vendors and incoming payments from customers."
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Payments' },
        ]}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-[#2563EB] text-white text-[13px] font-medium rounded-md hover:bg-[#1D4ED8] transition-colors"
          >
            + New Payment
          </button>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[13px] text-[#DC2626]">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
          <option value="VOID">Void</option>
        </select>
      </div>

      {/* Payments Table */}
      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 bg-[#F8FAFC] rounded animate-pulse" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <EmptyState
          title="No payments"
          description="Record a payment to start tracking transactions."
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-[#2563EB] text-white text-[13px] font-medium rounded-md hover:bg-[#1D4ED8]"
            >
              Create Payment
            </button>
          }
        />
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <th className="text-left px-4 py-3 font-medium text-[#64748B]">Payment #</th>
                <th className="text-left px-4 py-3 font-medium text-[#64748B]">Date</th>
                <th className="text-left px-4 py-3 font-medium text-[#64748B]">Method</th>
                <th className="text-left px-4 py-3 font-medium text-[#64748B]">Description</th>
                <th className="text-left px-4 py-3 font-medium text-[#64748B]">Reference</th>
                <th className="text-right px-4 py-3 font-medium text-[#64748B]">Amount</th>
                <th className="text-center px-4 py-3 font-medium text-[#64748B]">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-[#E2E8F0] last:border-b-0 hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-mono font-medium text-[#2563EB]">{p.paymentNumber}</td>
                  <td className="px-4 py-3 text-[#475569]">{new Date(p.paymentDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-[#64748B]">{p.paymentMethod.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-[#475569] max-w-[200px] truncate">{p.description || '—'}</td>
                  <td className="px-4 py-3 text-[#64748B] font-mono text-[12px]">{p.reference || '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-[#0F172A]">{formatCurrency(p.amount, p.currency)}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-[#E2E8F0] flex items-center justify-between text-[12px] text-[#64748B]">
              <span>Page {page} of {meta.totalPages} ({meta.total} payments)</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="px-3 py-1 border border-[#E2E8F0] rounded disabled:opacity-50">Prev</button>
                <button onClick={() => setPage(Math.min(meta.totalPages, page + 1))} disabled={page >= meta.totalPages} className="px-3 py-1 border border-[#E2E8F0] rounded disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Payment Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl w-[520px] max-h-[85vh] overflow-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E2E8F0]">
              <h2 className="text-[16px] font-semibold text-[#0F172A]">New Payment</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#475569] mb-1">Payment Date *</label>
                  <input
                    type="date"
                    value={form.paymentDate}
                    onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#475569] mb-1">Payment Method *</label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#475569] mb-1">Amount (cents) *</label>
                  <input
                    type="number"
                    value={form.amount || ''}
                    onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    placeholder="e.g. 50000 for $500.00"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#475569] mb-1">Currency</label>
                  <input
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    maxLength={3}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#475569] mb-1">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                  placeholder="Payment description"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#475569] mb-1">Reference</label>
                <input
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                  placeholder="Check number, transaction ID, etc."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#E2E8F0] flex justify-end gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 border border-[#E2E8F0] text-[#475569] text-[13px] font-medium rounded-md hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !form.amount || !form.paymentDate}
                className="px-4 py-2 bg-[#2563EB] text-white text-[13px] font-medium rounded-md hover:bg-[#1D4ED8] disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
