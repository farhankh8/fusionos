'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';

function formatCurrency(amount: number, currency = 'USD') { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100); }

interface Vendor { id: string; name: string; code: string; email?: string; currency: string; }
interface Bill { id: string; billNumber: string; description: string; amount: number; outstandingAmount: number; currency: string; status: string; receivedDate: string; dueDate: string; vendor: { name: string; code: string }; }

export default function PayablesPage() {
  const [tab, setTab] = useState<'vendors' | 'bills'>('vendors');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState('');
  const [showCreateVendor, setShowCreateVendor] = useState(false);
  const [showCreateBill, setShowCreateBill] = useState(false);
  const [vForm, setVForm] = useState({ name: '', code: '', email: '', currency: 'USD' });
  const [bForm, setBForm] = useState({ vendorId: '', description: '', amount: 0, currency: 'USD', receivedDate: new Date().toISOString().split('T')[0], dueDate: '' });

  useEffect(() => {
    const load = async () => { try { const res = await apiClient.get<{ id: string }[]>('/organization/companies'); const companies = Array.isArray(res) ? res : []; if (companies.length > 0) setCompanyId(companies[0]!.id); } catch {} }; load();
  }, []);

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [vRes, bRes] = await Promise.all([
        apiClient.get<Vendor[]>(`/finance/vendors?companyId=${companyId}`),
        apiClient.get<{ data: Bill[] }>(`/finance/bills?companyId=${companyId}`),
      ]);
      setVendors(Array.isArray(vRes) ? vRes : []);
      setBills(bRes.data || []);
    } catch {} finally { setLoading(false); }
  }, [companyId]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div>
      <PageHeader title="Accounts Payable" description="Manage vendors, bills, and payables aging." breadcrumbs={[{ label: 'Finance', href: '/finance' }, { label: 'Payables' }]}
        actions={<div className="flex gap-2">
          <button onClick={() => setShowCreateVendor(true)} className="px-4 py-2 bg-[#2563EB] text-white text-[13px] font-medium rounded-md hover:bg-[#1D4ED8]">+ Vendor</button>
          <button onClick={() => setShowCreateBill(true)} className="px-4 py-2 border border-[#E2E8F0] text-[#475569] text-[13px] font-medium rounded-md hover:bg-[#F8FAFC]">+ Bill</button>
        </div>}
      />
      <div className="flex gap-1 mb-4 bg-white border border-[#E2E8F0] rounded-lg p-1 w-fit">
        <button onClick={() => setTab('vendors')} className={`px-4 py-2 text-[13px] font-medium rounded-md ${tab === 'vendors' ? 'bg-[#2563EB] text-white' : 'text-[#475569] hover:bg-[#F8FAFC]'}`}>Vendors</button>
        <button onClick={() => setTab('bills')} className={`px-4 py-2 text-[13px] font-medium rounded-md ${tab === 'bills' ? 'bg-[#2563EB] text-white' : 'text-[#475569] hover:bg-[#F8FAFC]'}`}>Bills</button>
      </div>

      {loading ? <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-[#F8FAFC] rounded animate-pulse" />)}</div>
      : tab === 'vendors' ? (
        vendors.length === 0 ? <EmptyState title="No vendors" description="Add a vendor to start managing payables." /> :
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          <table className="w-full text-[13px]"><thead><tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <th className="text-left px-4 py-3 font-medium text-[#64748B]">Code</th><th className="text-left px-4 py-3 font-medium text-[#64748B]">Name</th><th className="text-left px-4 py-3 font-medium text-[#64748B]">Email</th><th className="text-left px-4 py-3 font-medium text-[#64748B]">Currency</th>
          </tr></thead><tbody>
            {vendors.map((v) => <tr key={v.id} className="border-b border-[#E2E8F0] last:border-b-0 hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 font-mono font-medium text-[#2563EB]">{v.code}</td><td className="px-4 py-3 text-[#0F172A]">{v.name}</td><td className="px-4 py-3 text-[#475569]">{v.email || '—'}</td><td className="px-4 py-3 text-[#64748B]">{v.currency}</td>
            </tr>)}
          </tbody></table>
        </div>
      ) : (
        bills.length === 0 ? <EmptyState title="No bills" description="Create a bill to start tracking payables." /> :
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          <table className="w-full text-[13px]"><thead><tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <th className="text-left px-4 py-3 font-medium text-[#64748B]">Bill #</th><th className="text-left px-4 py-3 font-medium text-[#64748B]">Vendor</th><th className="text-right px-4 py-3 font-medium text-[#64748B]">Amount</th><th className="text-right px-4 py-3 font-medium text-[#64748B]">Outstanding</th><th className="text-left px-4 py-3 font-medium text-[#64748B]">Due Date</th><th className="text-center px-4 py-3 font-medium text-[#64748B]">Status</th>
          </tr></thead><tbody>
            {bills.map((b) => <tr key={b.id} className="border-b border-[#E2E8F0] last:border-b-0 hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 font-mono font-medium text-[#2563EB]">{b.billNumber}</td><td className="px-4 py-3 text-[#0F172A]">{b.vendor?.name}</td><td className="px-4 py-3 text-right font-medium text-[#0F172A]">{formatCurrency(b.amount, b.currency)}</td><td className="px-4 py-3 text-right font-medium text-[#0F172A]">{formatCurrency(b.outstandingAmount, b.currency)}</td><td className="px-4 py-3 text-[#475569]">{new Date(b.dueDate).toLocaleDateString()}</td><td className="px-4 py-3 text-center"><StatusBadge status={b.status} /></td>
            </tr>)}
          </tbody></table>
        </div>
      )}

      {showCreateVendor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreateVendor(false)}>
          <div className="bg-white rounded-xl w-[460px] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E2E8F0]"><h2 className="text-[16px] font-semibold text-[#0F172A]">New Vendor</h2></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[12px] font-medium text-[#475569] mb-1">Name *</label><input value={vForm.name} onChange={(e) => setVForm({ ...vForm, name: e.target.value })} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" /></div>
                <div><label className="block text-[12px] font-medium text-[#475569] mb-1">Code *</label><input value={vForm.code} onChange={(e) => setVForm({ ...vForm, code: e.target.value })} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" /></div>
              </div>
              <div><label className="block text-[12px] font-medium text-[#475569] mb-1">Email</label><input type="email" value={vForm.email} onChange={(e) => setVForm({ ...vForm, email: e.target.value })} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" /></div>
            </div>
            <div className="px-6 py-4 border-t border-[#E2E8F0] flex justify-end gap-3">
              <button onClick={() => setShowCreateVendor(false)} className="px-4 py-2 border border-[#E2E8F0] text-[#475569] text-[13px] font-medium rounded-md">Cancel</button>
              <button onClick={async () => { try { await apiClient.post('/finance/vendors', { ...vForm, companyId }); setShowCreateVendor(false); setVForm({ name: '', code: '', email: '', currency: 'USD' }); loadData(); } catch (err: any) { alert(err?.response?.data?.message || 'Failed'); } }} disabled={!vForm.name || !vForm.code} className="px-4 py-2 bg-[#2563EB] text-white text-[13px] font-medium rounded-md hover:bg-[#1D4ED8] disabled:opacity-50">Create</button>
            </div>
          </div>
        </div>
      )}

      {showCreateBill && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreateBill(false)}>
          <div className="bg-white rounded-xl w-[460px] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E2E8F0]"><h2 className="text-[16px] font-semibold text-[#0F172A]">New Bill</h2></div>
            <div className="p-6 space-y-4">
              <div><label className="block text-[12px] font-medium text-[#475569] mb-1">Vendor *</label>
                <select value={bForm.vendorId} onChange={(e) => setBForm({ ...bForm, vendorId: e.target.value })} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20">
                  <option value="">Select vendor</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.code} — {v.name}</option>)}
                </select>
              </div>
              <div><label className="block text-[12px] font-medium text-[#475569] mb-1">Description</label><input value={bForm.description} onChange={(e) => setBForm({ ...bForm, description: e.target.value })} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[12px] font-medium text-[#475569] mb-1">Amount (cents) *</label><input type="number" value={bForm.amount || ''} onChange={(e) => setBForm({ ...bForm, amount: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" /></div>
                <div><label className="block text-[12px] font-medium text-[#475569] mb-1">Due Date *</label><input type="date" value={bForm.dueDate} onChange={(e) => setBForm({ ...bForm, dueDate: e.target.value })} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" /></div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#E2E8F0] flex justify-end gap-3">
              <button onClick={() => setShowCreateBill(false)} className="px-4 py-2 border border-[#E2E8F0] text-[#475569] text-[13px] font-medium rounded-md">Cancel</button>
              <button onClick={async () => { try { await apiClient.post('/finance/bills', { ...bForm, companyId }); setShowCreateBill(false); setBForm({ vendorId: '', description: '', amount: 0, currency: 'USD', receivedDate: new Date().toISOString().split('T')[0], dueDate: '' }); loadData(); } catch (err: any) { alert(err?.response?.data?.message || 'Failed'); } }} disabled={!bForm.vendorId || !bForm.amount || !bForm.dueDate} className="px-4 py-2 bg-[#2563EB] text-white text-[13px] font-medium rounded-md hover:bg-[#1D4ED8] disabled:opacity-50">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
