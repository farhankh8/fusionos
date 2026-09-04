'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';

function formatCurrency(amount: number, currency = 'USD') { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100); }

interface Customer { id: string; name: string; code: string; email?: string; phone?: string; currency: string; }
interface Invoice { id: string; invoiceNumber: string; description: string; amount: number; outstandingAmount: number; currency: string; status: string; issuedDate: string; dueDate: string; customer: { name: string; code: string }; }

export default function ReceivablesPage() {
  const [tab, setTab] = useState<'customers' | 'invoices'>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState('');
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [cForm, setCForm] = useState({ name: '', code: '', email: '', phone: '', currency: 'USD' });
  const [iForm, setIForm] = useState({ customerId: '', description: '', amount: 0, currency: 'USD', issuedDate: new Date().toISOString().split('T')[0], dueDate: '' });

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

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [cRes, iRes] = await Promise.all([
        apiClient.get<Customer[]>(`/finance/customers?companyId=${companyId}`),
        apiClient.get<{ data: Invoice[] }>(`/finance/invoices?companyId=${companyId}`),
      ]);
      setCustomers(Array.isArray(cRes) ? cRes : []);
      setInvoices(iRes.data || []);
    } catch {} finally { setLoading(false); }
  }, [companyId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateCustomer = async () => {
    try {
      await apiClient.post('/finance/customers', { ...cForm, companyId });
      setShowCreateCustomer(false); setCForm({ name: '', code: '', email: '', phone: '', currency: 'USD' }); loadData();
    } catch (err: any) { alert(err?.response?.data?.message || 'Failed'); }
  };

  const handleCreateInvoice = async () => {
    try {
      await apiClient.post('/finance/invoices', { ...iForm, companyId });
      setShowCreateInvoice(false); setIForm({ customerId: '', description: '', amount: 0, currency: 'USD', issuedDate: new Date().toISOString().split('T')[0], dueDate: '' }); loadData();
    } catch (err: any) { alert(err?.response?.data?.message || 'Failed'); }
  };

  return (
    <div>
      <PageHeader title="Accounts Receivable" description="Manage customers, invoices, and receivable aging." breadcrumbs={[{ label: 'Finance', href: '/finance' }, { label: 'Receivables' }]}
        actions={<div className="flex gap-2">
          <button onClick={() => setShowCreateCustomer(true)} className="px-4 py-2 bg-[#2563EB] text-white text-[13px] font-medium rounded-md hover:bg-[#1D4ED8]">+ Customer</button>
          <button onClick={() => setShowCreateInvoice(true)} className="px-4 py-2 border border-[#E2E8F0] text-[#475569] text-[13px] font-medium rounded-md hover:bg-[#F8FAFC]">+ Invoice</button>
        </div>}
      />
      <div className="flex gap-1 mb-4 bg-white border border-[#E2E8F0] rounded-lg p-1 w-fit">
        <button onClick={() => setTab('customers')} className={`px-4 py-2 text-[13px] font-medium rounded-md ${tab === 'customers' ? 'bg-[#2563EB] text-white' : 'text-[#475569] hover:bg-[#F8FAFC]'}`}>Customers</button>
        <button onClick={() => setTab('invoices')} className={`px-4 py-2 text-[13px] font-medium rounded-md ${tab === 'invoices' ? 'bg-[#2563EB] text-white' : 'text-[#475569] hover:bg-[#F8FAFC]'}`}>Invoices</button>
      </div>

      {loading ? <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-[#F8FAFC] rounded animate-pulse" />)}</div>
      : tab === 'customers' ? (
        customers.length === 0 ? <EmptyState title="No customers" description="Add a customer to start managing receivables." /> :
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          <table className="w-full text-[13px]"><thead><tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <th className="text-left px-4 py-3 font-medium text-[#64748B]">Code</th>
            <th className="text-left px-4 py-3 font-medium text-[#64748B]">Name</th>
            <th className="text-left px-4 py-3 font-medium text-[#64748B]">Email</th>
            <th className="text-left px-4 py-3 font-medium text-[#64748B]">Currency</th>
          </tr></thead><tbody>
            {customers.map((c) => <tr key={c.id} className="border-b border-[#E2E8F0] last:border-b-0 hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 font-mono font-medium text-[#2563EB]">{c.code}</td>
              <td className="px-4 py-3 text-[#0F172A]">{c.name}</td>
              <td className="px-4 py-3 text-[#475569]">{c.email || '—'}</td>
              <td className="px-4 py-3 text-[#64748B]">{c.currency}</td>
            </tr>)}
          </tbody></table>
        </div>
      ) : (
        invoices.length === 0 ? <EmptyState title="No invoices" description="Create an invoice to start tracking receivables." /> :
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          <table className="w-full text-[13px]"><thead><tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <th className="text-left px-4 py-3 font-medium text-[#64748B]">Invoice #</th>
            <th className="text-left px-4 py-3 font-medium text-[#64748B]">Customer</th>
            <th className="text-right px-4 py-3 font-medium text-[#64748B]">Amount</th>
            <th className="text-right px-4 py-3 font-medium text-[#64748B]">Outstanding</th>
            <th className="text-left px-4 py-3 font-medium text-[#64748B]">Due Date</th>
            <th className="text-center px-4 py-3 font-medium text-[#64748B]">Status</th>
          </tr></thead><tbody>
            {invoices.map((inv) => <tr key={inv.id} className="border-b border-[#E2E8F0] last:border-b-0 hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 font-mono font-medium text-[#2563EB]">{inv.invoiceNumber}</td>
              <td className="px-4 py-3 text-[#0F172A]">{inv.customer?.name}</td>
              <td className="px-4 py-3 text-right font-medium text-[#0F172A]">{formatCurrency(inv.amount, inv.currency)}</td>
              <td className="px-4 py-3 text-right font-medium text-[#0F172A]">{formatCurrency(inv.outstandingAmount, inv.currency)}</td>
              <td className="px-4 py-3 text-[#475569]">{new Date(inv.dueDate).toLocaleDateString()}</td>
              <td className="px-4 py-3 text-center"><StatusBadge status={inv.status} /></td>
            </tr>)}
          </tbody></table>
        </div>
      )}

      {showCreateCustomer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreateCustomer(false)}>
          <div className="bg-white rounded-xl w-[460px] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E2E8F0]"><h2 className="text-[16px] font-semibold text-[#0F172A]">New Customer</h2></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[12px] font-medium text-[#475569] mb-1">Name *</label><input value={cForm.name} onChange={(e) => setCForm({ ...cForm, name: e.target.value })} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" /></div>
                <div><label className="block text-[12px] font-medium text-[#475569] mb-1">Code *</label><input value={cForm.code} onChange={(e) => setCForm({ ...cForm, code: e.target.value })} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" /></div>
              </div>
              <div><label className="block text-[12px] font-medium text-[#475569] mb-1">Email</label><input type="email" value={cForm.email} onChange={(e) => setCForm({ ...cForm, email: e.target.value })} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" /></div>
            </div>
            <div className="px-6 py-4 border-t border-[#E2E8F0] flex justify-end gap-3">
              <button onClick={() => setShowCreateCustomer(false)} className="px-4 py-2 border border-[#E2E8F0] text-[#475569] text-[13px] font-medium rounded-md">Cancel</button>
              <button onClick={handleCreateCustomer} disabled={!cForm.name || !cForm.code} className="px-4 py-2 bg-[#2563EB] text-white text-[13px] font-medium rounded-md hover:bg-[#1D4ED8] disabled:opacity-50">Create</button>
            </div>
          </div>
        </div>
      )}

      {showCreateInvoice && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreateInvoice(false)}>
          <div className="bg-white rounded-xl w-[460px] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E2E8F0]"><h2 className="text-[16px] font-semibold text-[#0F172A]">New Invoice</h2></div>
            <div className="p-6 space-y-4">
              <div><label className="block text-[12px] font-medium text-[#475569] mb-1">Customer *</label>
                <select value={iForm.customerId} onChange={(e) => setIForm({ ...iForm, customerId: e.target.value })} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20">
                  <option value="">Select customer</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                </select>
              </div>
              <div><label className="block text-[12px] font-medium text-[#475569] mb-1">Description</label><input value={iForm.description} onChange={(e) => setIForm({ ...iForm, description: e.target.value })} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[12px] font-medium text-[#475569] mb-1">Amount (cents) *</label><input type="number" value={iForm.amount || ''} onChange={(e) => setIForm({ ...iForm, amount: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" /></div>
                <div><label className="block text-[12px] font-medium text-[#475569] mb-1">Due Date *</label><input type="date" value={iForm.dueDate} onChange={(e) => setIForm({ ...iForm, dueDate: e.target.value })} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" /></div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#E2E8F0] flex justify-end gap-3">
              <button onClick={() => setShowCreateInvoice(false)} className="px-4 py-2 border border-[#E2E8F0] text-[#475569] text-[13px] font-medium rounded-md">Cancel</button>
              <button onClick={handleCreateInvoice} disabled={!iForm.customerId || !iForm.amount || !iForm.dueDate} className="px-4 py-2 bg-[#2563EB] text-white text-[13px] font-medium rounded-md hover:bg-[#1D4ED8] disabled:opacity-50">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
