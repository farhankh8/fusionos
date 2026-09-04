'use client';

/**
 * FusionOS Departments Management Page
 * Enterprise department management with real API data.
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
import { GitBranch, Building2, Plus, Users, MapPin } from 'lucide-react';

interface Department {
  id: string;
  name: string;
  code?: string;
  description?: string;
  company?: { id: string; name: string };
  branch?: { id: string; name: string };
  manager?: { id: string; firstName: string; lastName: string };
  employeeCount?: number;
  status: string;
  createdAt: string;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [kpiLoading, setKpiLoading] = useState(true);

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        page: page.toString(),
        limit: '12',
      };
      if (search) params['search'] = search;
      if (statusFilter) params['status'] = statusFilter;

      const responseData = await apiClient.get<{ data: Department[]; meta?: { total: number; totalPages: number } }>('/organization/departments', params);
      setDepartments(responseData.data || []);
      setTotalPages(responseData.meta?.totalPages || 1);
      setTotalCount(responseData.meta?.total || 0);
    } catch {
      setDepartments([]);
    } finally {
      setLoading(false);
      setKpiLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  return (
    <div className="min-h-full bg-[#FBF5EC]">
      <PageHeader
        title="Departments"
        description="Manage organizational departments"
        breadcrumbs={[{ label: 'Organization' }, { label: 'Departments' }]}
        actions={
          <button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#064E3B] px-3 text-[12px] font-medium text-white hover:bg-[#047857] transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Add Department
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
              <KpiCard label="Total Departments" value={totalCount} icon={GitBranch} iconBg="bg-[#D1FAE5]" iconColor="text-[#064E3B]" />
              <KpiCard label="Active" value={departments.filter(d => d.status === 'ACTIVE').length} icon={GitBranch} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
              <KpiCard label="Total Employees" value={departments.reduce((sum, d) => sum + (d.employeeCount || 0), 0)} icon={Users} iconBg="bg-violet-50" iconColor="text-violet-600" />
            </>
          )}
        </div>

        {/* Filters */}
        <FilterBar
          search={search}
          searchPlaceholder="Search departments..."
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
        ) : departments.length === 0 ? (
          <div className="overflow-hidden rounded-lg border border-[#DDD0BB] bg-white">
            <EmptyState
              icon={GitBranch}
              title="No departments found"
              description="Add your first department to get started."
              action={
                <button className="inline-flex items-center gap-1.5 rounded-md bg-[#064E3B] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#047857]">
                  <Plus className="h-3.5 w-3.5" />
                  Add Department
                </button>
              }
            />
          </div>
        ) : (
          <DataTable
            columns={[
              {
                key: 'name',
                label: 'Department',
                render: (item: Department) => (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D1FAE5]">
                      <GitBranch className="h-4 w-4 text-[#064E3B]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-[#1C1917]">{item.name}</p>
                      {item.code && <p className="text-[11px] text-[#57534E]">{item.code}</p>}
                    </div>
                  </div>
                ),
              },
              {
                key: 'company',
                label: 'Company',
                render: (item: Department) => (
                  <span className="text-[13px] text-[#57534E]">{item.company?.name || '—'}</span>
                ),
              },
              {
                key: 'branch',
                label: 'Branch',
                render: (item: Department) => (
                  <span className="text-[13px] text-[#57534E]">{item.branch?.name || '—'}</span>
                ),
              },
              {
                key: 'manager',
                label: 'Manager',
                render: (item: Department) => (
                  <span className="text-[13px] text-[#57534E]">{item.manager ? `${item.manager.firstName} ${item.manager.lastName}` : '—'}</span>
                ),
              },
              {
                key: 'employeeCount',
                label: 'Employees',
                render: (item: Department) => (
                  <span className="text-[13px] font-medium text-[#1C1917]">{item.employeeCount || 0}</span>
                ),
                align: 'right' as const,
              },
              {
                key: 'status',
                label: 'Status',
                render: (item: Department) => <StatusBadge status={item.status} />,
              },
            ]}
            data={departments}
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
