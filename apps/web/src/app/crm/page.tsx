'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';

interface CrmDashboard {
  kpis: {
    totalCustomers: number;
    totalLeads: number;
    openLeads: number;
    totalOpportunities: number;
    openOpportunities: number;
    wonOpportunities: number;
    lostOpportunities: number;
    totalContacts: number;
    pendingTasks: number;
    overdueTasks: number;
    totalPipelineValue: number;
    weightedPipelineValue: number;
  };
  recentActivities: Array<{
    id: string;
    activityType: string;
    subject: string;
    createdAt: string;
    actor: { firstName: string; lastName: string };
    customerProfile?: { customer: { name: string } };
  }>;
}

function formatCurrency(amount: number, currency = 'USD') {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 100000) return `${sign}${currency} ${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${sign}${currency} ${(abs / 1000).toFixed(1)}K`;
  return `${sign}${currency} ${(abs / 100).toFixed(2)}`;
}

export default function CrmOverviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState<CrmDashboard | null>(null);
  const [companyId, setCompanyId] = useState<string>('');

  useEffect(() => {
    const loadCompany = async () => {
      try {
        const res = await apiClient.get<{ id: string }[]>('/organization/companies');
        const companies = Array.isArray(res) ? res : [];
        if (companies.length > 0) setCompanyId(companies[0]!.id);
      } catch { /* no company */ }
    };
    loadCompany();
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<CrmDashboard>(`/crm/dashboard?companyId=${companyId}`);
      setDashboard(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load CRM dashboard');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const k = dashboard?.kpis;

  return (
    <div>
      <PageHeader
        title="CRM"
        description="Manage customers, leads, opportunities and the sales pipeline."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'CRM' }]}
        actions={
          <div className="flex gap-2">
            <button onClick={() => router.push('/crm/leads')} className="px-4 py-2 bg-[#2563EB] text-white text-[13px] font-medium rounded-md hover:bg-[#1D4ED8] transition-colors">
              New Lead
            </button>
            <button onClick={() => router.push('/crm/customers')} className="px-4 py-2 border border-[#E2E8F0] text-[#475569] text-[13px] font-medium rounded-md hover:bg-[#F8FAFC] transition-colors">
              Customers
            </button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[13px] text-[#DC2626]">{error}</div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-[#E2E8F0] bg-white p-3.5 animate-pulse">
                <div className="h-4 w-20 bg-[#F1F5F9] rounded mb-2" />
                <div className="h-6 w-24 bg-[#F1F5F9] rounded" />
              </div>
            ))
          : k && [
              { label: 'Customers', value: k.totalCustomers, icon: '🏢' },
              { label: 'Open Leads', value: k.openLeads, icon: '🎯' },
              { label: 'Open Opps', value: k.openOpportunities, icon: '💼' },
              { label: 'Won Opps', value: k.wonOpportunities, icon: '✅' },
              { label: 'Pipeline', value: formatCurrency(k.totalPipelineValue), icon: '💰' },
              { label: 'Weighted', value: formatCurrency(k.weightedPipelineValue), icon: '📊' },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-lg border border-[#E2E8F0] bg-white p-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] text-[#64748B]">{kpi.label}</p>
                    <p className="mt-1 text-[20px] font-semibold text-[#0F172A] leading-tight">{kpi.value}</p>
                  </div>
                  <span className="text-xl">{kpi.icon}</span>
                </div>
              </div>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Activities */}
        <SectionCard title="Recent Activities">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-[#F8FAFC] rounded animate-pulse" />
              ))}
            </div>
          ) : !dashboard?.recentActivities.length ? (
            <EmptyState title="No activities yet" description="Log your first activity to get started." />
          ) : (
            <div className="overflow-x-auto -mx-4 -mt-4">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#E2E8F0]">
                    <th className="text-left px-4 py-3 font-medium text-[#64748B]">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-[#64748B]">Subject</th>
                    <th className="text-left px-4 py-3 font-medium text-[#64748B]">Customer</th>
                    <th className="text-left px-4 py-3 font-medium text-[#64748B]">By</th>
                    <th className="text-left px-4 py-3 font-medium text-[#64748B]">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.recentActivities.map((a) => (
                    <tr key={a.id} className="border-b border-[#E2E8F0] last:border-b-0 hover:bg-[#F8FAFC]">
                      <td className="px-4 py-3"><StatusBadge status={a.activityType} /></td>
                      <td className="px-4 py-3 text-[#0F172A] font-medium">{a.subject}</td>
                      <td className="px-4 py-3 text-[#475569]">{a.customerProfile?.customer?.name || '—'}</td>
                      <td className="px-4 py-3 text-[#475569]">{a.actor.firstName} {a.actor.lastName}</td>
                      <td className="px-4 py-3 text-[#64748B]">{new Date(a.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {/* Tasks Overview */}
        <SectionCard title="Tasks Overview">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-[#F8FAFC] rounded animate-pulse" />
              ))}
            </div>
          ) : k ? (
            <div className="space-y-4 p-4">
              <div className="flex items-center justify-between p-3 bg-[#FFF7ED] rounded-lg border border-[#FED7AA]">
                <span className="text-[13px] text-[#9A3412] font-medium">Pending Tasks</span>
                <span className="text-[18px] font-bold text-[#C2410C]">{k.pendingTasks}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#FEF2F2] rounded-lg border border-[#FECACA]">
                <span className="text-[13px] text-[#991B1B] font-medium">Overdue Tasks</span>
                <span className="text-[18px] font-bold text-[#DC2626]">{k.overdueTasks}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#F0FDF4] rounded-lg border border-[#BBF7D0]">
                <span className="text-[13px] text-[#166534] font-medium">Total Contacts</span>
                <span className="text-[18px] font-bold text-[#16A34A]">{k.totalContacts}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#F0F9FF] rounded-lg border border-[#BAE6FD]">
                <span className="text-[13px] text-[#075985] font-medium">Lost Opportunities</span>
                <span className="text-[18px] font-bold text-[#0284C7]">{k.lostOpportunities}</span>
              </div>
            </div>
          ) : null}
        </SectionCard>
      </div>

      {/* Quick Links */}
      <SectionCard title="Quick Actions">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Customers', href: '/crm/customers', icon: '🏢' },
            { label: 'Leads', href: '/crm/leads', icon: '🎯' },
            { label: 'Opportunities', href: '/crm/opportunities', icon: '💼' },
            { label: 'Pipeline', href: '/crm/pipeline', icon: '📊' },
            { label: 'Activities', href: '/crm/activities', icon: '📞' },
          ].map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="flex items-center gap-3 p-3 border border-[#E2E8F0] rounded-lg text-left hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-colors"
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[13px] font-medium text-[#0F172A]">{item.label}</span>
            </button>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
