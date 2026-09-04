'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';

interface CustomerProfile {
  id: string;
  customerType: string;
  customerSegment: string;
  lifecycleStage: string;
  industry: string | null;
  rating: number | null;
  ownerId: string | null;
  createdAt: string;
  customer: { id: string; name: string; email: string | null; phone: string | null };
  owner: { id: string; firstName: string; lastName: string } | null;
  _count: { contacts: number; opportunities: number; activities: number };
}

export default function CrmCustomersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [companyId, setCompanyId] = useState('');

  useEffect(() => {
    const loadCompany = async () => {
      try {
        const res = await apiClient.get<{ id: string }[]>('/organization/companies');
        const companies = Array.isArray(res) ? res : [];
        if (companies.length > 0) setCompanyId(companies[0]!.id);
      } catch {}
    };
    loadCompany();
  }, []);

  const loadCustomers = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ companyId, page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const res = await apiClient.get<{ items: CustomerProfile[]; total: number }>(`/crm/customer-profiles?${params}`);
      setCustomers(res.items || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [companyId, page, search, status]);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage your customer relationships."
        breadcrumbs={[{ label: 'CRM', href: '/crm' }, { label: 'Customers' }]}
      />

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[13px] text-[#DC2626]">{error}</div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 max-w-xs px-3 py-2 border border-[#DDD0BB] rounded-md text-[13px] focus:outline-none focus:ring-1 focus:ring-[#064E3B]"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-[#DDD0BB] rounded-md text-[13px] text-[#57534E]"
        >
          <option value="">All Stages</option>
          <option value="LEAD">Lead</option>
          <option value="PROSPECT">Prospect</option>
          <option value="CUSTOMER">Customer</option>
          <option value="INACTIVE">Inactive</option>
          <option value="CHURNED">Churned</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-[#DDD0BB]">
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-[#FBF5EC] rounded animate-pulse" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <EmptyState title="No customers" description="Create a customer profile to get started." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#DDD0BB]">
                  <th className="text-left px-4 py-3 font-medium text-[#57534E]">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-[#57534E]">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-[#57534E]">Industry</th>
                  <th className="text-left px-4 py-3 font-medium text-[#57534E]">Stage</th>
                  <th className="text-left px-4 py-3 font-medium text-[#57534E]">Owner</th>
                  <th className="text-center px-4 py-3 font-medium text-[#57534E]">Opps</th>
                  <th className="text-center px-4 py-3 font-medium text-[#57534E]">Rating</th>
                  <th className="text-left px-4 py-3 font-medium text-[#57534E]">Created</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[#DDD0BB] last:border-b-0 hover:bg-[#FBF5EC] cursor-pointer"
                    onClick={() => router.push(`/crm/customers?id=${c.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-[#1C1917]">{c.customer.name}</p>
                        {c.customer.email && <p className="text-[12px] text-[#57534E]">{c.customer.email}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={c.customerType} /></td>
                    <td className="px-4 py-3 text-[#57534E]">{c.industry || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.lifecycleStage} /></td>
                    <td className="px-4 py-3 text-[#57534E]">{c.owner ? `${c.owner.firstName} ${c.owner.lastName}` : '—'}</td>
                    <td className="px-4 py-3 text-center font-medium">{c._count.opportunities}</td>
                    <td className="px-4 py-3 text-center">{c.rating ? '⭐'.repeat(c.rating) : '—'}</td>
                    <td className="px-4 py-3 text-[#57534E]">{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="px-4 py-3 border-t border-[#DDD0BB] flex items-center justify-between text-[12px] text-[#57534E]">
            <span>Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
              <button disabled={page * 20 >= total} onClick={() => setPage(page + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
