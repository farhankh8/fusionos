'use client';

/**
 * FusionOS Projects List Page
 * Enterprise project workspace.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { KpiSkeleton } from '@/components/ui/skeleton';
import { FolderKanban, CheckCircle2, Clock, AlertTriangle, Plus } from 'lucide-react';

interface Project {
  id: string;
  code: string;
  name: string;
  status: string;
  progress: number;
  currency: string;
  budgetAmount: number | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  createdAt: string;
  projectManager?: { id: string; firstName: string; lastName: string } | null;
  customer?: { id: string; name: string } | null;
  _count: { members: number; tasks: number; milestones: number };
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [companyId, setCompanyId] = useState('');
  const [kpis, setKpis] = useState({ totalProjects: 0, activeProjects: 0, completedProjects: 0, onHoldProjects: 0, totalTasks: 0, openTasks: 0, completedTasks: 0, overdueTasks: 0, totalHours: 0, billableHours: 0 });
  const [kpiLoading, setKpiLoading] = useState(true);

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

  const loadProjects = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { companyId, page: page.toString(), limit: '15' };
      if (search) params['search'] = search;
      if (statusFilter) params['status'] = statusFilter;
      const res = await apiClient.get<{ items: Project[]; total: number; totalPages: number }>(`/projects?${new URLSearchParams(params)}`);
      setProjects(res.items || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.total || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [companyId, page, search, statusFilter]);

  const loadKpis = useCallback(async () => {
    if (!companyId) return;
    setKpiLoading(true);
    try {
      const res = await apiClient.get<{ kpis: typeof kpis }>(`/projects/dashboard?companyId=${companyId}`);
      setKpis(res.kpis);
    } catch {}
    setKpiLoading(false);
  }, [companyId]);

  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => { loadKpis(); }, [loadKpis]);

  return (
    <div className="min-h-full bg-[#FBF5EC]">
      <PageHeader
        title="Projects"
        description="Manage projects, tasks, milestones and team delivery"
        breadcrumbs={[{ label: 'Business' }, { label: 'Projects' }]}
        actions={
          <button
            onClick={() => router.push('/projects/new')}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#064E3B] px-3 text-[12px] font-medium text-white hover:bg-[#047857] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Project
          </button>
        }
      />

      <div className="px-5 py-4 lg:px-6">
        {/* KPI Row */}
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {kpiLoading ? (
            Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)
          ) : (
            <>
              <KpiCard label="Total Projects" value={kpis.totalProjects} icon={FolderKanban} iconBg="bg-[#D1FAE5]" iconColor="text-[#064E3B]" />
              <KpiCard label="Active" value={kpis.activeProjects} icon={Clock} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
              <KpiCard label="Completed" value={kpis.completedProjects} icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
              <KpiCard label="Open Tasks" value={kpis.openTasks} icon={FolderKanban} iconBg="bg-amber-50" iconColor="text-amber-600" />
              <KpiCard label="Overdue Tasks" value={kpis.overdueTasks} icon={AlertTriangle} iconBg="bg-red-50" iconColor="text-red-600" />
            </>
          )}
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="h-8 w-[280px] rounded-md border border-[#DDD0BB] bg-white px-3 text-[13px] text-[#1C1917] placeholder:text-[#8E7E68] focus:border-[#064E3B] focus:outline-none focus:ring-1 focus:ring-[#064E3B]"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-8 rounded-md border border-[#DDD0BB] bg-white px-2.5 text-[12px] text-[#1C1917]"
          >
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="PLANNED">Planned</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          {(search || statusFilter) && (
            <button onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }} className="text-[12px] text-[#064E3B] hover:text-[#047857]">
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="rounded-lg border border-[#DDD0BB] bg-white p-8">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-[#FBF5EC] rounded animate-pulse" />)}
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-lg border border-[#DDD0BB] bg-white">
            <EmptyState
              icon={FolderKanban}
              title="No projects found"
              description="Create your first project to get started."
              action={
                <button
                  onClick={() => router.push('/projects/new')}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#064E3B] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#047857]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Project
                </button>
              }
            />
          </div>
        ) : (
          <div className="rounded-lg border border-[#DDD0BB] bg-white overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#DDD0BB] bg-[#FBF5EC]">
                  <th className="text-left px-4 py-2.5 font-medium text-[#57534E]">Project</th>
                  <th className="text-left px-4 py-2.5 font-medium text-[#57534E]">Code</th>
                  <th className="text-left px-4 py-2.5 font-medium text-[#57534E]">Manager</th>
                  <th className="text-left px-4 py-2.5 font-medium text-[#57534E]">Customer</th>
                  <th className="text-center px-4 py-2.5 font-medium text-[#57534E]">Status</th>
                  <th className="text-center px-4 py-2.5 font-medium text-[#57534E]">Progress</th>
                  <th className="text-center px-4 py-2.5 font-medium text-[#57534E]">Tasks</th>
                  <th className="text-center px-4 py-2.5 font-medium text-[#57534E]">Team</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5E6CC]">
                {projects.map((p) => (
                  <tr
                    key={p.id}
                    className="cursor-pointer hover:bg-[#FBF5EC] transition-colors"
                    onClick={() => router.push(`/projects/${p.id}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1C1917]">{p.name}</p>
                      {p.plannedEndDate && (
                        <p className="text-[11px] text-[#57534E]">
                          Due {new Date(p.plannedEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-[#F5E6CC] px-1.5 py-0.5 text-[11px] font-mono text-[#57534E]">{p.code}</span>
                    </td>
                    <td className="px-4 py-3 text-[#57534E]">
                      {p.projectManager ? `${p.projectManager.firstName} ${p.projectManager.lastName}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-[#57534E]">{p.customer?.name || '—'}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-[#DDD0BB]">
                          <div className="h-1.5 rounded-full bg-[#064E3B]" style={{ width: `${p.progress}%` }} />
                        </div>
                        <span className="text-[11px] text-[#57534E]">{p.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-[#57534E]">{p._count.tasks}</td>
                    <td className="px-4 py-3 text-center text-[#57534E]">{p._count.members}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#DDD0BB] px-4 py-3 text-[12px] text-[#57534E]">
                <span>Showing {((page - 1) * 15) + 1}–{Math.min(page * 15, totalCount)} of {totalCount}</span>
                <div className="flex gap-1">
                  <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#DDD0BB] disabled:opacity-40">←</button>
                  <span className="px-2 text-[12px]">{page} / {totalPages}</span>
                  <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#DDD0BB] disabled:opacity-40">→</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
