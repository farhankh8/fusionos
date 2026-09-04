'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';

interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  currency: string;
  isActive: boolean;
  glAccount: { code: string; name: string };
}

interface Account {
  id: string;
  code: string;
  name: string;
  accountType: string;
  isActive: boolean;
}

export default function BankingPage() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [glAccounts, setGlAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    currency: 'USD',
    glAccountId: '',
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

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError('');
    try {
      const [bankRes, accountRes] = await Promise.all([
        apiClient.get<BankAccount[]>(`/finance/bank-accounts?companyId=${companyId}`),
        apiClient.get<Account[]>(`/finance/accounts?companyId=${companyId}`),
      ]);
      setBankAccounts(Array.isArray(bankRes) ? bankRes : []);
      const allAccounts = Array.isArray(accountRes) ? accountRes : [];
      setGlAccounts(allAccounts.filter((a: Account) => a.accountType === 'ASSET' && a.isActive));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load banking data');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    setCreating(true);
    setCreateError('');
    try {
      await apiClient.post('/finance/bank-accounts', {
        ...form,
        companyId,
      });
      setShowCreate(false);
      setForm({ bankName: '', accountName: '', accountNumber: '', currency: 'USD', glAccountId: '' });
      loadData();
    } catch (err: any) {
      setCreateError(err?.response?.data?.message || 'Failed to create bank account');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Banking"
        description="Manage company bank accounts and track bank transactions."
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Banking' },
        ]}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-[#064E3B] text-white text-[13px] font-medium rounded-md hover:bg-[#047857] transition-colors"
          >
            + New Bank Account
          </button>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[13px] text-[#DC2626]">
          {error}
        </div>
      )}

      {/* Bank Accounts */}
      {loading ? (
        <div className="bg-white border border-[#DDD0BB] rounded-lg p-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-[#FBF5EC] rounded animate-pulse" />
          ))}
        </div>
      ) : bankAccounts.length === 0 ? (
        <EmptyState
          title="No bank accounts"
          description="Add a company bank account to start tracking cash transactions."
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-[#064E3B] text-white text-[13px] font-medium rounded-md hover:bg-[#047857]"
            >
              Add Bank Account
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bankAccounts.map((bank) => (
            <div
              key={bank.id}
              className="bg-white border border-[#DDD0BB] rounded-lg p-5 hover:border-[#A7F3D0] transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-[14px] font-semibold text-[#1C1917]">{bank.bankName}</h3>
                  <p className="text-[12px] text-[#57534E] mt-0.5">{bank.accountName}</p>
                </div>
                <StatusBadge status={bank.isActive ? 'ACTIVE' : 'INACTIVE'} />
              </div>
              <div className="space-y-2 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-[#57534E]">Account Number</span>
                  <span className="font-mono text-[#1C1917]">
                    {'••••' + bank.accountNumber.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#57534E]">Currency</span>
                  <span className="font-medium text-[#1C1917]">{bank.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#57534E]">GL Account</span>
                  <span className="font-mono text-[#064E3B]">
                    {bank.glAccount?.code} — {bank.glAccount?.name}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-[#F0F9FF] border border-[#BAE6FD] rounded-lg">
        <div className="flex items-start gap-3">
          <span className="text-[#0284C7] text-[16px]">ℹ️</span>
          <div>
            <h4 className="text-[13px] font-medium text-[#0C4A6E]">Bank Reconciliation</h4>
            <p className="text-[12px] text-[#0369A1] mt-0.5">
              Manual bank reconciliation foundation is available. Full bank statement import and 
              automatic matching will be available in a future release.
            </p>
          </div>
        </div>
      </div>

      {/* Create Bank Account Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl w-[520px] max-h-[85vh] overflow-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#DDD0BB]">
              <h2 className="text-[16px] font-semibold text-[#1C1917]">New Bank Account</h2>
            </div>
            <div className="p-6 space-y-4">
              {createError && (
                <div className="px-3 py-2 bg-[#FEF2F2] rounded-md text-[12px] text-[#DC2626]">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-[12px] font-medium text-[#57534E] mb-1">Bank Name *</label>
                <input
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  className="w-full px-3 py-2 border border-[#DDD0BB] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/20"
                  placeholder="e.g. Chase Bank"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#57534E] mb-1">Account Name *</label>
                <input
                  value={form.accountName}
                  onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                  className="w-full px-3 py-2 border border-[#DDD0BB] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/20"
                  placeholder="e.g. Operating Account"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#57534E] mb-1">Account Number *</label>
                  <input
                    value={form.accountNumber}
                    onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-[#DDD0BB] rounded-md text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-[#064E3B]/20"
                    placeholder="Account number"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#57534E] mb-1">Currency</label>
                  <input
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-[#DDD0BB] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/20"
                    maxLength={3}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#57534E] mb-1">GL Account *</label>
                <select
                  value={form.glAccountId}
                  onChange={(e) => setForm({ ...form, glAccountId: e.target.value })}
                  className="w-full px-3 py-2 border border-[#DDD0BB] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/20"
                >
                  <option value="">Select GL account</option>
                  {glAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
                <p className="text-[11px] text-[#57534E] mt-1">
                  Select the balance sheet account (usually Bank or Cash)
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#DDD0BB] flex justify-end gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 border border-[#DDD0BB] text-[#57534E] text-[13px] font-medium rounded-md hover:bg-[#FBF5EC]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !form.bankName || !form.accountName || !form.accountNumber || !form.glAccountId}
                className="px-4 py-2 bg-[#064E3B] text-white text-[13px] font-medium rounded-md hover:bg-[#047857] disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Bank Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
