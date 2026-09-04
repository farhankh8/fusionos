'use client';

/**
 * FusionOS Teams Management Page
 * Enterprise team management with real API data.
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
import { UsersRound, GitBranch, Plus, Users } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  code?: string;
  description?: string;
  department?: { id: string; name: string };
  company?: { id: string; name: string };
  lead?: { id: string; firstName: string; lastName: string };
  memberCount?: number;
  status: string;
  createdAt: string;
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [kpiLoading, setKpiLoading] = useState(true);

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        page: page.toString(),
        limit: '12',
      };
      if (search) params['search'] = search;
      if (statusFilter) params['status'] = statusFilter;

      const responseData = await apiClient.get<{ data: Team[]; meta?: { total: number; totalPages: number } }>('/organization/teams', params);
      setTeams(responseData.data || []);
      setTotalPages(responseData.meta?.totalPages || 1);
      setTotalCount(responseData.meta?.total || 0);
    } catch {
      setTeams([]);
    } finally {
      setLoading(false);
      setKpiLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  return (
    <div className="min-h-full bg-[#FBF5EC]">
      <PageHeader
        title="Teams"
        description="Manage teams within departments"
        breadcrumbs={[{ label: 'Organization' }, { label: 'Teams' }]}
        actions={
          <button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#064E3B] px-3 text-[12px] font-medium text-white hover:bg-[#047857] transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Add Team
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
              <KpiCard label="Total Teams" value={totalCount} icon={UsersRound} iconBg="bg-[#D1FAE5]" iconColor="text-[#064E3B]" />
              <KpiCard label="Active" value={teams.filter(t => t.status === 'ACTIVE').length} icon={UsersRound} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
              <KpiCard label="Total Members" value={teams.reduce((sum, t) => sum + (t.memberCount || 0), 0)} icon={Users} iconBg="bg-violet-50" iconColor="text-violet-600" />
            </>
          )}
        </div>

        {/* Filters */}
        <FilterBar
          search={search}
          searchPlaceholder="Search teams..."
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
        ) : teams.length === 0 ? (
          <div className="overflow-hidden rounded-lg border border-[#DDD0BB] bg-white">
            <EmptyState
              icon={UsersRound}
              title="No teams found"
              description="Add your first team to get started."
              action={
                <button className="inline-flex items-center gap-1.5 rounded-md bg-[#064E3B] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#047857]">
                  <Plus className="h-3.5 w-3.5" />
                  Add Team
                </button>
              }
            />
          </div>
        ) : (
          <DataTable
            columns={[
              {
                key: 'name',
                label: 'Team',
                render: (item: Team) => (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D1FAE5]">
                      <UsersRound className="h-4 w-4 text-[#064E3B]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-[#1C1917]">{item.name}</p>
                      {item.code && <p className="text-[11px] text-[#57534E]">{item.code}</p>}
                    </div>
                  </div>
                ),
              },
              {
                key: 'department',
                label: 'Department',
                render: (item: Team) => (
                  <span className="text-[13px] text-[#57534E]">{item.department?.name || '—'}</span>
                ),
              },
              {
                key: 'lead',
                label: 'Team Lead',
                render: (item: Team) => (
                  <span className="text-[13px] text-[#57534E]">{item.lead ? `${item.lead.firstName} ${item.lead.lastName}` : '—'}</span>
                ),
              },
              {
                key: 'memberCount',
                label: 'Members',
                render: (item: Team) => (
                  <span className="text-[13px] font-medium text-[#1C1917]">{item.memberCount || 0}</span>
                ),
                align: 'right' as const,
              },
              {
                key: 'status',
                label: 'Status',
                render: (item: Team) => <StatusBadge status={item.status} />,
              },
            ]}
            data={teams}
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
