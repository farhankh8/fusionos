'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, Archive, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

interface WorkflowDetail {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  currentVersion: {
    id: string;
    versionNumber: number;
    triggerConfig: Record<string, unknown>;
    conditionConfig: Record<string, unknown> | null;
    actionsConfig: Record<string, unknown>[];
    publishedAt: string | null;
  } | null;
  versions: Array<{
    id: string;
    versionNumber: number;
    status: string;
    publishedAt: string | null;
    createdAt: string;
    triggerConfig: Record<string, unknown>;
  }>;
  createdBy: { id: string; firstName: string; lastName: string; email: string };
  _count: { executions: number };
}

interface Execution {
  id: string;
  triggerEventType: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
  createdAt: string;
}

export default function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [workflow, setWorkflow] = useState<WorkflowDetail | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'versions' | 'executions'>('overview');

  useEffect(() => {
    async function load() {
      try {
        const [wfRes, execRes] = await Promise.all([
          fetch(`/api/v1/automation/workflows/${id}`).then(r => r.json()),
          fetch(`/api/v1/automation/executions?workflowId=${id}&limit=20`).then(r => r.json()),
        ]);
        if (wfRes.data) setWorkflow(wfRes.data);
        if (execRes.data) setExecutions(execRes.data);
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleLifecycleAction = async (action: string) => {
    try {
      await fetch(`/api/v1/automation/workflows/${id}/${action}`, { method: 'POST' });
      // Reload
      const res = await fetch(`/api/v1/automation/workflows/${id}`).then(r => r.json());
      if (res.data) setWorkflow(res.data);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <PageHeader title="Loading..." breadcrumbs={[{ label: 'Automation', href: '/automation' }, { label: 'Workflow' }]} />
        <div className="p-5 lg:p-6 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <PageHeader title="Workflow Not Found" breadcrumbs={[{ label: 'Automation', href: '/automation' }, { label: 'Not Found' }]} />
        <div className="p-5 lg:p-6">
          <EmptyState
            icon={Zap}
            title="Workflow not found"
            description="The workflow you're looking for doesn't exist or has been removed."
            action={
              <Link href="/automation/workflows" className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#1D4ED8]">
                <ArrowLeft className="h-4 w-4" /> Back to Workflows
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const lifecycleActions = (
    <div className="flex items-center gap-2">
      {workflow.status === 'DRAFT' && (
        <button onClick={() => handleLifecycleAction('publish')} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-emerald-700">
          <Play className="h-3.5 w-3.5" /> Publish
        </button>
      )}
      {workflow.status === 'PUBLISHED' && (
        <button onClick={() => handleLifecycleAction('pause')} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-amber-700">
          <Pause className="h-3.5 w-3.5" /> Pause
        </button>
      )}
      {workflow.status === 'PAUSED' && (
        <button onClick={() => handleLifecycleAction('resume')} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-emerald-700">
          <Play className="h-3.5 w-3.5" /> Resume
        </button>
      )}
      {workflow.status !== 'ARCHIVED' && (
        <button onClick={() => handleLifecycleAction('archive')} className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-[12px] font-medium text-[#64748B] hover:bg-[#F1F5F9]">
          <Archive className="h-3.5 w-3.5" /> Archive
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PageHeader
        title={workflow.name}
        description={workflow.description ?? undefined}
        breadcrumbs={[
          { label: 'Automation', href: '/automation' },
          { label: 'Workflows', href: '/automation/workflows' },
          { label: workflow.name },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={workflow.status} />
            {lifecycleActions}
          </div>
        }
      />

      <div className="p-5 lg:p-6">
        {/* Tabs */}
        <div className="mb-4 flex gap-1 border-b border-[#E2E8F0]">
          {(['overview', 'versions', 'executions'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-[#2563EB] text-[#2563EB]'
                  : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
              <h3 className="text-[14px] font-semibold text-[#0F172A] mb-3">Workflow Details</h3>
              <dl className="grid grid-cols-2 gap-4 text-[13px]">
                <div>
                  <dt className="text-[#94A3B8]">Status</dt>
                  <dd className="mt-0.5 font-medium text-[#0F172A]"><StatusBadge status={workflow.status} /></dd>
                </div>
                <div>
                  <dt className="text-[#94A3B8]">Trigger</dt>
                  <dd className="mt-0.5 font-medium text-[#0F172A]">{getTriggerLabel(workflow.currentVersion?.triggerConfig as Record<string, unknown> | null)}</dd>
                </div>
                <div>
                  <dt className="text-[#94A3B8]">Created By</dt>
                  <dd className="mt-0.5 font-medium text-[#0F172A]">{workflow.createdBy.firstName} {workflow.createdBy.lastName}</dd>
                </div>
                <div>
                  <dt className="text-[#94A3B8]">Total Executions</dt>
                  <dd className="mt-0.5 font-medium text-[#0F172A]">{workflow._count.executions}</dd>
                </div>
                <div>
                  <dt className="text-[#94A3B8]">Created</dt>
                  <dd className="mt-0.5 font-medium text-[#0F172A]">{new Date(workflow.createdAt).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-[#94A3B8]">Updated</dt>
                  <dd className="mt-0.5 font-medium text-[#0F172A]">{new Date(workflow.updatedAt).toLocaleString()}</dd>
                </div>
              </dl>
            </div>

            {/* Current Version Config */}
            {workflow.currentVersion && (
              <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
                <h3 className="text-[14px] font-semibold text-[#0F172A] mb-3">
                  Current Version (v{workflow.currentVersion.versionNumber})
                </h3>
                <div className="space-y-3">
                  {/* Trigger */}
                  <div className="rounded-lg bg-[#F8FAFC] p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-1">Trigger</p>
                    <p className="text-[13px] text-[#0F172A]">{getTriggerLabel(workflow.currentVersion.triggerConfig as Record<string, unknown>)}</p>
                  </div>

                  {/* Conditions */}
                  <div className="rounded-lg bg-[#F8FAFC] p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-1">Conditions</p>
                    {workflow.currentVersion.conditionConfig ? (
                      <p className="text-[13px] text-[#0F172A]">
                        {(workflow.currentVersion.conditionConfig as Record<string, unknown>)['logic'] as string ?? 'AND'} conditions configured
                      </p>
                    ) : (
                      <p className="text-[13px] text-[#94A3B8]">No conditions (always runs)</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="rounded-lg bg-[#F8FAFC] p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-1">Actions</p>
                    <div className="space-y-1">
                      {(workflow.currentVersion.actionsConfig as Array<Record<string, unknown>>).map((action, i) => (
                        <p key={i} className="text-[13px] text-[#0F172A]">
                          {i + 1}. {String(action['type']).replace(/_/g, ' ')}
                        </p>
                      ))}
                      {(workflow.currentVersion.actionsConfig as Array<Record<string, unknown>>).length === 0 && (
                        <p className="text-[13px] text-[#94A3B8]">No actions configured</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Versions Tab */}
        {activeTab === 'versions' && (
          <div className="rounded-lg border border-[#E2E8F0] bg-white">
            {workflow.versions.length === 0 ? (
              <EmptyState title="No versions" description="Save a configuration to create a version." />
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Version</th>
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Status</th>
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Created</th>
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Published</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {workflow.versions.map((v) => (
                    <tr key={v.id}>
                      <td className="px-5 py-3 text-[13px] font-medium text-[#0F172A]">v{v.versionNumber}</td>
                      <td className="px-5 py-3"><StatusBadge status={v.status} /></td>
                      <td className="px-5 py-3 text-[12px] text-[#64748B]">{new Date(v.createdAt).toLocaleString()}</td>
                      <td className="px-5 py-3 text-[12px] text-[#64748B]">
                        {v.publishedAt ? new Date(v.publishedAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Executions Tab */}
        {activeTab === 'executions' && (
          <div className="rounded-lg border border-[#E2E8F0] bg-white">
            {executions.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No executions yet"
                description="This workflow hasn't been triggered yet."
              />
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Execution</th>
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Status</th>
                    <th className="hidden md:table-cell px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Trigger</th>
                    <th className="hidden lg:table-cell px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Duration</th>
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {executions.map((exec) => (
                    <tr key={exec.id} className="hover:bg-[#F8FAFC]">
                      <td className="px-5 py-3">
                        <Link href={`/automation/executions/${exec.id}`} className="text-[13px] font-medium text-[#2563EB] hover:text-[#1D4ED8]">
                          {exec.id.slice(0, 8)}...
                        </Link>
                      </td>
                      <td className="px-5 py-3"><StatusBadge status={exec.status} /></td>
                      <td className="hidden md:table-cell px-5 py-3 text-[12px] text-[#64748B]">{exec.triggerEventType}</td>
                      <td className="hidden lg:table-cell px-5 py-3 text-[12px] text-[#64748B]">
                        {exec.duration ? `${exec.duration}ms` : '—'}
                      </td>
                      <td className="px-5 py-3 text-[12px] text-[#64748B]">{new Date(exec.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
