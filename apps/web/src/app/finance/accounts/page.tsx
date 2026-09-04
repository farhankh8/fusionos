'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';

interface Account {
  id: string;
  code: string;
  name: string;
  description?: string;
  accountType: string;
  accountSubtype: string;
  normalBalance: string;
  currency: string;
  isActive: boolean;
  allowManualPosting: boolean;
  isSystemAccount: boolean;
  parentId?: string;
  parent?: { id: string; code: string; name: string };
  children?: Account[];
}

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  ASSET: '#064E3B',
  LIABILITY: '#DC2626',
  EQUITY: '#7C3AED',
  INCOME: '#16A34A',
  EXPENSE: '#D97706',
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [createForm, setCreateForm] = useState({
    code: '',
    name: '',
    description: '',
    accountType: 'ASSET',
    accountSubtype: 'OTHER',
    normalBalance: 'DEBIT',
    parentId: '',
    currency: 'USD',
    allowManualPosting: true,
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get<{ id: string }[]>('/organization/companies');
        const companies = Array.isArray(res) ? res : [];
        if (companies.length > 0) {
          setCompanyId(companies[0]!.id);
        }
      } catch {}
    };
    load();
  }, []);

  const loadAccounts = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<Account[]>(`/finance/accounts?companyId=${companyId}`);
      setAccounts(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const handleCreate = async () => {
    setCreating(true);
    setCreateError('');
    try {
      await apiClient.post('/finance/accounts', {
        ...createForm,
        companyId,
        parentId: createForm.parentId || undefined,
      });
      setShowCreate(false);
      setCreateForm({ code: '', name: '', description: '', accountType: 'ASSET', accountSubtype: 'OTHER', normalBalance: 'DEBIT', parentId: '', currency: 'USD', allowManualPosting: true });
      loadAccounts();
    } catch (err: any) {
      setCreateError(err?.response?.data?.message || 'Failed to create account');
    } finally {
      setCreating(false);
    }
  };

  // Build tree structure
  const buildTree = (items: Account[]): Account[] => {
    const map = new Map<string, Account>();
    const roots: Account[] = [];
    items.forEach((a) => map.set(a.id, { ...a, children: [] }));
    items.forEach((a) => {
      if (a.parentId && map.has(a.parentId)) {
        map.get(a.parentId)!.children!.push(map.get(a.id)!);
      } else {
        roots.push(map.get(a.id)!);
      }
    });
    return roots;
  };

  const filteredAccounts = accounts.filter((a) => {
    const matchSearch = !search || a.code.toLowerCase().includes(search.toLowerCase()) || a.name.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || a.accountType === filterType;
    return matchSearch && matchType;
  });

  const tree = buildTree(filteredAccounts);

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  const flatAccountOptions = accounts.filter((a) => a.allowManualPosting && a.id !== createForm.parentId);

  return (
    <div>
      <PageHeader
        title="Chart of Accounts"
        description="Manage your company's accounts organized by type and hierarchy."
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Chart of Accounts' },
        ]}
        actions={
          <div className="flex gap-2">
            <button
              onClick={async () => {
                try {
                  await apiClient.post('/finance/accounts/seed', { companyId });
                  loadAccounts();
                } catch {}
              }}
              className="px-4 py-2 border border-[#DDD0BB] text-[#57534E] text-[13px] font-medium rounded-md hover:bg-[#FBF5EC] transition-colors"
            >
              Seed Defaults
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-[#064E3B] text-white text-[13px] font-medium rounded-md hover:bg-[#047857] transition-colors"
            >
              + New Account
            </button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[13px] text-[#DC2626]">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search accounts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-[#DDD0BB] rounded-md text-[13px] w-[280px] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/20 focus:border-[#064E3B]"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-[#DDD0BB] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/20 focus:border-[#064E3B]"
        >
          <option value="">All Types</option>
          <option value="ASSET">Asset</option>
          <option value="LIABILITY">Liability</option>
          <option value="EQUITY">Equity</option>
          <option value="INCOME">Income</option>
          <option value="EXPENSE">Expense</option>
        </select>
      </div>

      {/* Accounts Table */}
      {loading ? (
        <div className="bg-white border border-[#DDD0BB] rounded-lg p-6 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 bg-[#FBF5EC] rounded animate-pulse" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState
          title="No accounts configured"
          description="Seed the default chart of accounts or create a new account to get started."
          action={
            <div className="flex gap-2">
              <button onClick={() => {}} className="px-4 py-2 bg-[#064E3B] text-white text-[13px] font-medium rounded-md hover:bg-[#047857]">
                Seed Defaults
              </button>
              <button onClick={() => setShowCreate(true)} className="px-4 py-2 border border-[#DDD0BB] text-[#57534E] text-[13px] font-medium rounded-md hover:bg-[#FBF5EC]">
                Create Account
              </button>
            </div>
          }
        />
      ) : (
        <div className="bg-white border border-[#DDD0BB] rounded-lg overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#DDD0BB] bg-[#FBF5EC]">
                <th className="text-left px-4 py-3 font-medium text-[#57534E]">Code</th>
                <th className="text-left px-4 py-3 font-medium text-[#57534E]">Account Name</th>
                <th className="text-left px-4 py-3 font-medium text-[#57534E]">Type</th>
                <th className="text-left px-4 py-3 font-medium text-[#57534E]">Subtype</th>
                <th className="text-center px-4 py-3 font-medium text-[#57534E]">Balance</th>
                <th className="text-center px-4 py-3 font-medium text-[#57534E]">Status</th>
              </tr>
            </thead>
            <tbody>
              {tree.map((account) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  depth={0}
                  expanded={expanded}
                  onToggle={toggleExpand}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Account Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl w-[520px] max-h-[85vh] overflow-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#DDD0BB]">
              <h2 className="text-[16px] font-semibold text-[#1C1917]">New Account</h2>
            </div>
            <div className="p-6 space-y-4">
              {createError && (
                <div className="px-3 py-2 bg-[#FEF2F2] rounded-md text-[12px] text-[#DC2626]">{createError}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#57534E] mb-1">Code *</label>
                  <input value={createForm.code} onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })} className="w-full px-3 py-2 border border-[#DDD0BB] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/20" placeholder="e.g. 1100" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#57534E] mb-1">Name *</label>
                  <input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="w-full px-3 py-2 border border-[#DDD0BB] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/20" placeholder="e.g. Cash" />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#57534E] mb-1">Description</label>
                <input value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} className="w-full px-3 py-2 border border-[#DDD0BB] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#57534E] mb-1">Type *</label>
                  <select value={createForm.accountType} onChange={(e) => setCreateForm({ ...createForm, accountType: e.target.value })} className="w-full px-3 py-2 border border-[#DDD0BB] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/20">
                    <option value="ASSET">Asset</option>
                    <option value="LIABILITY">Liability</option>
                    <option value="EQUITY">Equity</option>
                    <option value="INCOME">Income</option>
                    <option value="EXPENSE">Expense</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#57534E] mb-1">Normal Balance *</label>
                  <select value={createForm.normalBalance} onChange={(e) => setCreateForm({ ...createForm, normalBalance: e.target.value })} className="w-full px-3 py-2 border border-[#DDD0BB] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/20">
                    <option value="DEBIT">Debit</option>
                    <option value="CREDIT">Credit</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#57534E] mb-1">Parent Account</label>
                  <select value={createForm.parentId} onChange={(e) => setCreateForm({ ...createForm, parentId: e.target.value })} className="w-full px-3 py-2 border border-[#DDD0BB] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/20">
                    <option value="">None (Root)</option>
                    {flatAccountOptions.map((a) => (
                      <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#57534E] mb-1">Currency</label>
                  <input value={createForm.currency} onChange={(e) => setCreateForm({ ...createForm, currency: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border border-[#DDD0BB] rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/20" maxLength={3} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-[13px] text-[#57534E]">
                <input
                  type="checkbox"
                  checked={createForm.allowManualPosting}
                  onChange={(e) => setCreateForm({ ...createForm, allowManualPosting: e.target.checked })}
                  className="rounded border-[#DDD0BB]"
                />
                Allow manual posting
              </label>
            </div>
            <div className="px-6 py-4 border-t border-[#DDD0BB] flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-[#DDD0BB] text-[#57534E] text-[13px] font-medium rounded-md hover:bg-[#FBF5EC]">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !createForm.code || !createForm.name}
                className="px-4 py-2 bg-[#064E3B] text-white text-[13px] font-medium rounded-md hover:bg-[#047857] disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountRow({ account, depth, expanded, onToggle }: { account: Account; depth: number; expanded: Set<string>; onToggle: (id: string) => void }) {
  const hasChildren = account.children && account.children.length > 0;
  const isExpanded = expanded.has(account.id);
  const indent = depth * 24;

  return (
    <>
      <tr className="border-b border-[#DDD0BB] last:border-b-0 hover:bg-[#FBF5EC]">
        <td className="px-4 py-3">
          <div className="flex items-center" style={{ paddingLeft: indent }}>
            {hasChildren ? (
              <button onClick={() => onToggle(account.id)} className="mr-2 text-[#57534E] hover:text-[#1C1917] text-[12px] w-4">
                {isExpanded ? '▼' : '▶'}
              </button>
            ) : (
              <span className="mr-2 w-4" />
            )}
            <span className="font-mono font-medium text-[#1C1917]">{account.code}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-[#57534E]">{account.name}</td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium" style={{ backgroundColor: `${ACCOUNT_TYPE_COLORS[account.accountType]}15`, color: ACCOUNT_TYPE_COLORS[account.accountType] || '#57534E' }}>
            {account.accountType}
          </span>
        </td>
        <td className="px-4 py-3 text-[#57534E] text-[12px]">{account.accountSubtype?.replace(/_/g, ' ') || '—'}</td>
        <td className="px-4 py-3 text-center text-[12px] font-medium text-[#57534E]">{account.normalBalance}</td>
        <td className="px-4 py-3 text-center">
          <StatusBadge status={account.isActive ? 'ACTIVE' : 'INACTIVE'} />
        </td>
      </tr>
      {hasChildren && isExpanded && account.children!.map((child) => (
        <AccountRow key={child.id} account={child} depth={depth + 1} expanded={expanded} onToggle={onToggle} />
      ))}
    </>
  );
}
