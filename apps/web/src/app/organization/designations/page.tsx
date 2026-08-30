'use client';

/**
 * FusionOS Designations Management Page
 * Enterprise job designation management with real API data.
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
import { BadgeCheck, Plus, Building2, Users, Layers } from 'lucide-react';

interface Designation {
  id: string;
  name: string;
  code?: string;
  level?: string;
  description?: string;
  company?: { id: string; name: string };
  employeeCount?: number;
  isActive: boolean;
  createdAt: string;
}

export default function DesignationsPage() {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [kpiLoading, setKpiLoading] = useState(true);

  const fetchDesignations = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        page: page.toString(),
        limit: '12',
      };
      if (search) params['search'] = search;
      if (activeFilter) params['isActive'] = activeFilter;

      const responseData = await apiClient.get<{ data: Designation[]; meta?: { total: number; totalPages: number } }>('/organization/designations', params);
      setDesignations(responseData.data || []);
      setTotalPages(responseData.meta?.totalPages || 1);
      setTotalCount(responseData.meta?.total || 0);
    } catch {
      setDesignations([]);
    } finally {
      setLoading(false);
      setKpiLoading(false);
    }
  }, [page, search, activeFilter]);

  useEffect(() => { fetchDesignations(); }, [fetchDesignations]);

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <PageHeader
        title="Designations"
        description="Manage job designations and roles"
        breadcrumbs={[{ label: 'Organization' }, { label: 'Designations' }]}
        actions={
          <button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#2563EB] px-3 text-[12px] font-medium text-white hover:bg-[#1D4ED8] transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Add Designation
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
              <KpiCard label="Total Designations" value={totalCount} icon={BadgeCheck} iconBg="bg-[#EFF6FF]" iconColor="text-[#2563EB]" />
              <KpiCard label="Active" value={designations.filter(d => d.isActive).length} icon={BadgeCheck} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
              <KpiCard label="Total Employees" value={designations.reduce((sum, d) => sum + (d.employeeCount || 0), 0)} icon={Users} iconBg="bg-violet-50" iconColor="text-violet-600" />
            </>
          )}
        </div>

        {/* Filters */}
        <FilterBar
          search={search}
          searchPlaceholder="Search designations..."
          onSearchChange={(val) => { setSearch(val); setPage(1); }}
          filters={[
            {
              key: 'active',
              label: 'All Status',
              value: activeFilter,
              options: [
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' },
              ],
              onChange: (val) => { setActiveFilter(val); setPage(1); },
            },
          ]}
          activeFilterCount={activeFilter ? 1 : 0}
          onClearFilters={() => { setActiveFilter(''); setSearch(''); setPage(1); }}
        />

        {/* Table */}
        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : designations.length === 0 ? (
          <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
            <EmptyState
              icon={BadgeCheck}
              title="No designations found"
              description="Add your first designation to get started."
              action={
                <button className="inline-flex items-center gap-1.5 rounded-md bg-[#2563EB] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#1D4ED8]">
                  <Plus className="h-3.5 w-3.5" />
                  Add Designation
                </button>
              }
            />
          </div>
        ) : (
          <DataTable
            columns={[
              {
                key: 'name',
                label: 'Designation',
                render: (item: Designation) => (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF6FF]">
                      <BadgeCheck className="h-4 w-4 text-[#2563EB]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-[#0F172A]">{item.name}</p>
                      {item.code && <p className="text-[11px] text-[#64748B]">{item.code}</p>}
                    </div>
                  </div>
                ),
              },
              {
                key: 'level',
                label: 'Level',
                render: (item: Designation) => (
                  <span className="text-[13px] text-[#475569]">{item.level || '—'}</span>
                ),
              },
              {
                key: 'company',
                label: 'Company',
                render: (item: Designation) => (
                  <span className="text-[13px] text-[#475569]">{item.company?.name || '—'}</span>
                ),
              },
              {
                key: 'employeeCount',
                label: 'Employees',
                render: (item: Designation) => (
                  <span className="text-[13px] font-medium text-[#0F172A]">{item.employeeCount || 0}</span>
                ),
                align: 'right' as const,
              },
              {
                key: 'status',
                label: 'Status',
                render: (item: Designation) => (
                  <StatusBadge status={item.isActive ? 'ACTIVE' : 'INACTIVE'} />
                ),
              },
            ]}
            data={designations}
            page={page}
            totalPages={totalPages}
            total={totalCount}
            limit={12}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
