'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';

interface FinanceDashboard {
  cashBank: number;
  receivables: number;
  payables: number;
  revenue: number;
  expenses: number;
  netProfit: number;
  pendingApprovals: number;
  periodStart: string;
  periodEnd: string;
}

interface JournalEntry {
  id: string;
  journalNumber: string;
  postingDate: string;
  description: string;
  status: string;
  totalDebit: number;
  totalCredit: number;
  currency: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
  accountType: string;
}

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100);
}

function formatCompactCurrency(amount: number, currency = 'USD') {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 100000) return `${sign}${currency} ${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${sign}${currency} ${(abs / 1000).toFixed(1)}K`;
  return formatCurrency(amount, currency);
}

export default function FinanceOverviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState<FinanceDashboard | null>(null);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [companyId, setCompanyId] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  // Load company
  useEffect(() => {
    const loadCompany = async () => {
      try {
        const res = await apiClient.get<{ id: string }[]>('/organization/companies');
        const companies = Array.isArray(res) ? res : [];
        if (companies.length > 0) {
          setCompanyId(companies[0]!.id);
          setSelectedCompanyId(companies[0]!.id);
        }
      } catch {
        // no company
      }
    };
    loadCompany();
  }, []);

  // Load dashboard data
  const loadDashboard = useCallback(async () => {
    if (!selectedCompanyId) return;
    setLoading(true);
    setError('');
    try {
      const [dashRes, journalRes, accountRes] = await Promise.all([
        apiClient.get<FinanceDashboard>(`/finance/dashboard?companyId=${selectedCompanyId}`),
        apiClient.get<{ data: JournalEntry[] }>(`/finance/journals?companyId=${selectedCompanyId}&limit=10`),
        apiClient.get<Account[]>(`/finance/accounts?companyId=${selectedCompanyId}`),
      ]);
      setDashboard(dashRes);
      setJournals(journalRes.data || []);
      setAccounts(Array.isArray(accountRes) ? accountRes : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load finance dashboard');
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const kpis = dashboard
    ? [
        { label: 'Cash & Bank', value: formatCompactCurrency(dashboard.cashBank), icon: '🏦' },
        { label: 'Receivables', value: formatCompactCurrency(dashboard.receivables), icon: '📈' },
        { label: 'Payables', value: formatCompactCurrency(dashboard.payables), icon: '📉' },
        { label: 'Revenue', value: formatCompactCurrency(dashboard.revenue), icon: '💰' },
        { label: 'Expenses', value: formatCompactCurrency(dashboard.expenses), icon: '💸' },
        { label: 'Net Profit', value: formatCompactCurrency(dashboard.netProfit), icon: '📊' },
      ]
    : [];

  return (
    <div>
      <PageHeader
        title="Finance"
        description="Monitor financial performance, cash position and outstanding transactions."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance' },
        ]}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/finance/journals')}
              className="px-4 py-2 bg-[#064E3B] text-white text-[13px] font-medium rounded-md hover:bg-[#047857] transition-colors"
            >
              New Journal
            </button>
            <button
              onClick={() => router.push('/finance/expenses')}
              className="px-4 py-2 border border-[#DDD0BB] text-[#57534E] text-[13px] font-medium rounded-md hover:bg-[#FBF5EC] transition-colors"
            >
              New Expense
            </button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[13px] text-[#DC2626]">
          {error}
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-[#DDD0BB] bg-white p-3.5 animate-pulse">
                <div className="h-4 w-20 bg-[#F5E6CC] rounded mb-2" />
                <div className="h-6 w-24 bg-[#F5E6CC] rounded" />
              </div>
            ))
          : kpis.map((kpi) => (
              <div key={kpi.label} className="rounded-lg border border-[#DDD0BB] bg-white p-3.5">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-[#57534E]">{kpi.label}</p>
                    <p className="mt-1 text-[20px] font-semibold text-[#1C1917] leading-tight">{kpi.value}</p>
                  </div>
                  <span className="text-xl">{kpi.icon}</span>
                </div>
              </div>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Journals */}
        <SectionCard title="Recent Journal Entries">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-[#FBF5EC] rounded animate-pulse" />
              ))}
            </div>
          ) : journals.length === 0 ? (
            <EmptyState title="No journal entries" description="Create your first journal entry to get started." />
          ) : (
            <div className="overflow-x-auto -mx-4 -mt-4">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#DDD0BB]">
                    <th className="text-left px-4 py-3 font-medium text-[#57534E]">Journal</th>
                    <th className="text-left px-4 py-3 font-medium text-[#57534E]">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-[#57534E]">Description</th>
                    <th className="text-right px-4 py-3 font-medium text-[#57534E]">Amount</th>
                    <th className="text-center px-4 py-3 font-medium text-[#57534E]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {journals.map((j) => (
                    <tr
                      key={j.id}
                      className="border-b border-[#DDD0BB] last:border-b-0 hover:bg-[#FBF5EC] cursor-pointer"
                      onClick={() => router.push(`/finance/journals?id=${j.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-[#1C1917]">{j.journalNumber}</td>
                      <td className="px-4 py-3 text-[#57534E]">{new Date(j.postingDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-[#57534E] max-w-[200px] truncate">{j.description}</td>
                      <td className="px-4 py-3 text-right font-medium text-[#1C1917]">{formatCurrency(j.totalDebit, j.currency)}</td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={j.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {/* Account Summary */}
        <SectionCard title="Account Summary">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-[#FBF5EC] rounded animate-pulse" />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <EmptyState
              title="No accounts configured"
              description="Seed the default chart of accounts to get started."
              action={
                <button
                  onClick={async () => {
                    try {
                      await apiClient.post('/finance/accounts/seed', { companyId: selectedCompanyId });
                      loadDashboard();
                    } catch {}
                  }}
                  className="px-4 py-2 bg-[#064E3B] text-white text-[13px] font-medium rounded-md hover:bg-[#047857]"
                >
                  Seed Default Accounts
                </button>
              }
            />
          ) : (
            <div className="overflow-x-auto -mx-4 -mt-4">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#DDD0BB]">
                    <th className="text-left px-4 py-3 font-medium text-[#57534E]">Code</th>
                    <th className="text-left px-4 py-3 font-medium text-[#57534E]">Account</th>
                    <th className="text-left px-4 py-3 font-medium text-[#57534E]">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.slice(0, 10).map((a) => (
                    <tr key={a.id} className="border-b border-[#DDD0BB] last:border-b-0 hover:bg-[#FBF5EC]">
                      <td className="px-4 py-3 font-mono font-medium text-[#1C1917]">{a.code}</td>
                      <td className="px-4 py-3 text-[#57534E]">{a.name}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={a.accountType} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {accounts.length > 10 && (
                <div className="px-4 py-3 text-[12px] text-[#57534E] border-t border-[#DDD0BB]">
                  Showing 10 of {accounts.length} accounts.{' '}
                  <button
                    onClick={() => router.push('/finance/accounts')}
                    className="text-[#064E3B] hover:underline"
                  >
                    View all
                  </button>
                </div>
              )}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Quick Links */}
      <SectionCard title="Quick Actions">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Chart of Accounts', href: '/finance/accounts', icon: '📋' },
            { label: 'Journal Entries', href: '/finance/journals', icon: '📒' },
            { label: 'General Ledger', href: '/finance/ledger', icon: '📖' },
            { label: 'Reports', href: '/finance/reports', icon: '📑' },
            { label: 'Expenses', href: '/finance/expenses', icon: '💸' },
            { label: 'Receivables', href: '/finance/receivables', icon: '📈' },
            { label: 'Payables', href: '/finance/payables', icon: '📉' },
            { label: 'Payments', href: '/finance/payments', icon: '💳' },
          ].map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="flex items-center gap-3 p-3 border border-[#DDD0BB] rounded-lg text-left hover:bg-[#FBF5EC] hover:border-[#A7F3D0] transition-colors"
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[13px] font-medium text-[#1C1917]">{item.label}</span>
            </button>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
