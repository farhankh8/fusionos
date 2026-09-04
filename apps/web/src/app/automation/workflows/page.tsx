'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, Plus, Search, MoreVertical, Play, Pause, Archive, Trash2, Eye } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  currentVersion: { triggerConfig: Record<string, unknown>; versionNumber: number } | null;
  createdBy: { id: string; firstName: string; lastName: string; email: string };
  executionCount: number;
  successRate: number | null;
  lastExecution: string | null;
}

export default function WorkflowsListPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const loadWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '50');

      const res = await fetch(`/api/v1/automation/workflows?${params}`);
      const data = await res.json();
      setWorkflows(data.data ?? []);
    } catch {
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const handleAction = async (id: string, action: string) => {
    setOpenMenu(null);
    try {
      await fetch(`/api/v1/automation/workflows/${id}/${action}`, { method: 'POST' });
      loadWorkflows();
    } catch {
      // Silent fail
    }
  };

  const handleDelete = async (id: string) => {
    setOpenMenu(null);
    if (!confirm('Are you sure you want to delete this draft workflow?')) return;
    try {
      await fetch(`/api/v1/automation/workflows/${id}`, { method: 'DELETE' });
      loadWorkflows();
    } catch {
      // Silent fail
    }
  };

  const getTriggerLabel = (config: Record<string, unknown> | null): string => {
    if (!config) return 'Not configured';
    const entityType = config['entityType'] as string;
    const eventType = config['eventType'] as string;
    if (!entityType || !eventType) return 'Not configured';
    return `${entityType} → ${String(eventType).split('.').pop()}`;
  };

  return (
    <div className="min-h-screen bg-[#FBF5EC]">
      <PageHeader
        title="Automation"
        description="Automate repetitive business processes across FusionOS"
        breadcrumbs={[
          { label: 'Automation', href: '/automation' },
          { label: 'Workflows' },
        ]}
        actions={
          <Link
            href="/automation/workflows/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[#064E3B] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#047857] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Workflow
          </Link>
        }
      />

      <div className="p-5 lg:p-6">
        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E7E68]" />
            <input
              type="text"
              placeholder="Search workflows..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[#DDD0BB] bg-white py-2 pl-9 pr-4 text-[13px] text-[#1C1917] placeholder-[#8E7E68] focus:border-[#064E3B] focus:outline-none focus:ring-1 focus:ring-[#064E3B]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[#DDD0BB] bg-white px-3 py-2 text-[13px] text-[#1C1917] focus:border-[#064E3B] focus:outline-none focus:ring-1 focus:ring-[#064E3B]"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="PAUSED">Paused</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-[#DDD0BB] bg-white overflow-hidden">
          {loading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : workflows.length === 0 ? (
            <EmptyState
              icon={Zap}
              title="No workflows found"
              description="Create your first automation workflow to get started."
              action={
                <Link
                  href="/automation/workflows/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#064E3B] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#047857] transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Create Workflow
                </Link>
              }
            />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#DDD0BB] bg-[#FBF5EC]">
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#57534E]">Workflow</th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#57534E]">Status</th>
                  <th className="hidden md:table-cell px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#57534E]">Trigger</th>
                  <th className="hidden lg:table-cell px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#57534E]">Executions</th>
                  <th className="hidden lg:table-cell px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#57534E]">Success Rate</th>
                  <th className="hidden xl:table-cell px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#57534E]">Updated</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-[#57534E]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5E6CC]">
                {workflows.map((wf) => (
                  <tr key={wf.id} className="hover:bg-[#FBF5EC] transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/automation/workflows/${wf.id}`} className="block">
                        <p className="text-[13px] font-medium text-[#1C1917] hover:text-[#064E3B]">{wf.name}</p>
                        {wf.description && (
                          <p className="text-[11px] text-[#8E7E68] truncate max-w-[300px]">{wf.description}</p>
                        )}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={wf.status} />
                    </td>
                    <td className="hidden md:table-cell px-5 py-3">
                      <span className="text-[12px] text-[#57534E]">{getTriggerLabel(wf.currentVersion?.triggerConfig as Record<string, unknown> | null)}</span>
                    </td>
                    <td className="hidden lg:table-cell px-5 py-3">
                      <span className="text-[12px] font-medium text-[#1C1917]">{wf.executionCount}</span>
                    </td>
                    <td className="hidden lg:table-cell px-5 py-3">
                      {wf.successRate !== null ? (
                        <span className={`text-[12px] font-medium ${wf.successRate >= 90 ? 'text-emerald-600' : wf.successRate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                          {wf.successRate}%
                        </span>
                      ) : (
                        <span className="text-[12px] text-[#8E7E68]">—</span>
                      )}
                    </td>
                    <td className="hidden xl:table-cell px-5 py-3">
                      <span className="text-[12px] text-[#8E7E68]">
                        {new Date(wf.updatedAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setOpenMenu(openMenu === wf.id ? null : wf.id)}
                          className="rounded p-1 text-[#8E7E68] hover:bg-[#F5E6CC] hover:text-[#1C1917] transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {openMenu === wf.id && (
                          <div className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-[#DDD0BB] bg-white py-1 shadow-lg">
                            <button
                              onClick={() => { setOpenMenu(null); router.push(`/automation/workflows/${wf.id}`); }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-[#1C1917] hover:bg-[#F5E6CC]"
                            >
                              <Eye className="h-3.5 w-3.5" /> View Details
                            </button>
                            {wf.status === 'DRAFT' && (
                              <button
                                onClick={() => handleAction(wf.id, 'publish')}
                                className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-[#1C1917] hover:bg-[#F5E6CC]"
                              >
                                <Play className="h-3.5 w-3.5 text-emerald-600" /> Publish
                              </button>
                            )}
                            {wf.status === 'PUBLISHED' && (
                              <button
                                onClick={() => handleAction(wf.id, 'pause')}
                                className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-[#1C1917] hover:bg-[#F5E6CC]"
                              >
                                <Pause className="h-3.5 w-3.5 text-amber-600" /> Pause
                              </button>
                            )}
                            {wf.status === 'PAUSED' && (
                              <button
                                onClick={() => handleAction(wf.id, 'resume')}
                                className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-[#1C1917] hover:bg-[#F5E6CC]"
                              >
                                <Play className="h-3.5 w-3.5 text-emerald-600" /> Resume
                              </button>
                            )}
                            {wf.status !== 'ARCHIVED' && wf.status !== 'DRAFT' && (
                              <button
                                onClick={() => handleAction(wf.id, 'archive')}
                                className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-[#1C1917] hover:bg-[#F5E6CC]"
                              >
                                <Archive className="h-3.5 w-3.5 text-[#57534E]" /> Archive
                              </button>
                            )}
                            {wf.status === 'DRAFT' && wf.executionCount === 0 && (
                              <button
                                onClick={() => handleDelete(wf.id)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
