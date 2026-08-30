'use client';

/**
 * FusionOS Branches Management Page
 * Enterprise branch/workspace management with real API data.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { FilterBar } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { KpiSkeleton, TableSkeleton } from '@/components/ui/skeleton';
import { MapPin, Building2, Plus, Globe, Phone } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  company?: { id: string; name: string };
  status: string;
  createdAt: string;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  const fetchBranches = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        page: page.toString(),
        limit: '12',
      };
      if (search) params['search'] = search;
      if (statusFilter) params['status'] = statusFilter;

      const responseData = await apiClient.get<{ data: Branch[]; meta?: { total: number; totalPages: number } }>('/organization/branches', params);
      setBranches(responseData.data || []);
      setTotalPages(responseData.meta?.totalPages || 1);
      setTotalCount(responseData.meta?.total || 0);
    } catch {
      setBranches([]);
    } finally {
      setLoading(false);
      setKpiLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  /* ── Detail View ────────────────────────────────────────────────────────── */

  if (selectedBranch) {
    return (
      <div className="min-h-full bg-[#F8FAFC]">
        <PageHeader
          title="Branch Details"
          description={selectedBranch.name}
          breadcrumbs={[
            { label: 'Organization' },
            { label: 'Branches', onClick: () => setSelectedBranch(null) },
            { label: 'Details' },
          ]}
          actions={
            <button
              onClick={() => setSelectedBranch(null)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#E2E8F0] px-3 text-[12px] font-medium text-[#64748B] hover:bg-[#F8FAFC] transition-colors"
            >
              Back to List
            </button>
          }
        />
        <div className="p-5 lg:p-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-[#E2E8F0] bg-white">
              <div className="border-b border-[#E2E8F0] px-4 py-3">
                <h2 className="text-[13px] font-semibold text-[#0F172A]">Branch Information</h2>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EFF6FF]">
                    <MapPin className="h-5 w-5 text-[#2563EB]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[#0F172A]">{selectedBranch.name}</p>
                    {selectedBranch.code && <p className="text-[12px] text-[#64748B]">{selectedBranch.code}</p>}
                  </div>
                </div>
                <div className="border-t border-[#E2E8F0] pt-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[12px] text-[#64748B]">Company</span>
                    <span className="text-[12px] font-medium text-[#0F172A]">{selectedBranch.company?.name || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[12px] text-[#64748B]">Status</span>
                    <StatusBadge status={selectedBranch.status} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[12px] text-[#64748B]">Created</span>
                    <span className="text-[12px] font-medium text-[#0F172A]">{new Date(selectedBranch.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[#E2E8F0] bg-white">
              <div className="border-b border-[#E2E8F0] px-4 py-3">
                <h2 className="text-[13px] font-semibold text-[#0F172A]">Location & Contact</h2>
              </div>
              <div className="p-4 space-y-3">
                {selectedBranch.email && (
                  <div className="flex items-center gap-2.5">
                    <Globe className="h-4 w-4 text-[#64748B]" />
                    <span className="text-[13px] text-[#475569]">{selectedBranch.email}</span>
                  </div>
                )}
                {selectedBranch.phone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 text-[#64748B]" />
                    <span className="text-[13px] text-[#475569]">{selectedBranch.phone}</span>
                  </div>
                )}
                {selectedBranch.address && (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 text-[#64748B] mt-0.5" />
                    <div className="text-[13px] text-[#475569]">
                      <p>{selectedBranch.address}</p>
                      {selectedBranch.city && <p>{selectedBranch.city}{selectedBranch.state ? `, ${selectedBranch.state}` : ''}</p>}
                      {selectedBranch.country && <p>{selectedBranch.country}</p>}
                    </div>
                  </div>
                )}
                {!selectedBranch.email && !selectedBranch.phone && !selectedBranch.address && (
                  <p className="text-[12px] text-[#94A3B8]">No location information available</p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-[#E2E8F0] bg-white">
              <div className="border-b border-[#E2E8F0] px-4 py-3">
                <h2 className="text-[13px] font-semibold text-[#0F172A]">Quick Stats</h2>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EFF6FF]">
                    <Building2 className="h-4.5 w-4.5 text-[#2563EB]" />
                  </div>
                  <div>
                    <p className="text-[11px] text-[#64748B]">Company</p>
                    <p className="text-[13px] font-medium text-[#0F172A]">{selectedBranch.company?.name || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── List View ──────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <PageHeader
        title="Branches"
        description="Manage office locations and branches"
        breadcrumbs={[{ label: 'Organization' }, { label: 'Branches' }]}
        actions={
          <button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#2563EB] px-3 text-[12px] font-medium text-white hover:bg-[#1D4ED8] transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Add Branch
          </button>
        }
      />

      <div className="px-5 py-4 lg:px-6">
        {/* KPI Row */}
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {kpiLoading ? (
            Array.from({ length: 3 }).map((_, i) => <KpiSkeleton key={i} />)
          ) : (
            <>
              <KpiCard label="Total Branches" value={totalCount} icon={MapPin} iconBg="bg-[#EFF6FF]" iconColor="text-[#2563EB]" />
              <KpiCard label="Active" value={branches.filter(b => b.status === 'ACTIVE').length} icon={Globe} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
              <KpiCard label="Inactive" value={branches.filter(b => b.status === 'INACTIVE').length} icon={MapPin} iconBg="bg-gray-50" iconColor="text-gray-600" />
            </>
          )}
        </div>

        {/* Filters */}
        <FilterBar
          search={search}
          searchPlaceholder="Search branches..."
          onSearchChange={(val) => { setSearch(val); setPage(1); }}
          filters={[
            {
              key: 'status',
              label: 'All Status',
              value: statusFilter,
              options: [
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
              ],
              onChange: (val) => { setStatusFilter(val); setPage(1); },
            },
          ]}
          activeFilterCount={statusFilter ? 1 : 0}
          onClearFilters={() => { setStatusFilter(''); setSearch(''); setPage(1); }}
        />

        {/* Table */}
        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : branches.length === 0 ? (
          <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
            <EmptyState
              icon={MapPin}
              title="No branches found"
              description="Add your first branch to get started."
              action={
                <button className="inline-flex items-center gap-1.5 rounded-md bg-[#2563EB] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#1D4ED8]">
                  <Plus className="h-3.5 w-3.5" />
                  Add Branch
                </button>
              }
            />
          </div>
        ) : (
          <DataTable
            columns={[
              {
                key: 'name',
                label: 'Branch',
                render: (item: Branch) => (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF6FF]">
                      <MapPin className="h-4 w-4 text-[#2563EB]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-[#0F172A]">{item.name}</p>
                      {item.code && <p className="text-[11px] text-[#64748B]">{item.code}</p>}
                    </div>
                  </div>
                ),
              },
              {
                key: 'company',
                label: 'Company',
                render: (item: Branch) => (
                  <span className="text-[13px] text-[#475569]">{item.company?.name || '—'}</span>
                ),
              },
              {
                key: 'location',
                label: 'Location',
                render: (item: Branch) => (
                  <span className="text-[13px] text-[#475569]">{item.city ? `${item.city}, ${item.country || ''}` : item.country || '—'}</span>
                ),
              },
              {
                key: 'phone',
                label: 'Phone',
                render: (item: Branch) => (
                  <span className="text-[13px] text-[#475569]">{item.phone || '—'}</span>
                ),
              },
              {
                key: 'status',
                label: 'Status',
                render: (item: Branch) => <StatusBadge status={item.status} />,
              },
            ]}
            data={branches}
            page={page}
            totalPages={totalPages}
            total={totalCount}
            limit={12}
            onPageChange={setPage}
            onRowClick={(item) => setSelectedBranch(item)}
          />
        )}
      </div>
    </div>
  );
}
