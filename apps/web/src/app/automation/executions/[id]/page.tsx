'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCw, XCircle, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

interface StepExecution {
  id: string;
  stepNumber: number;
  actionType: string;
  status: string;
  result: Record<string, unknown> | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
}

interface ExecutionDetail {
  id: string;
  triggerEventType: string;
  triggerEntityType: string | null;
  triggerEntityId: string | null;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
  error: string | null;
  correlationId: string | null;
  attemptCount: number;
  maxAttempts: number;
  createdAt: string;
  workflow: { id: string; name: string; status: string };
  workflowVersion: { versionNumber: number; triggerConfig: Record<string, unknown>; actionsConfig: Record<string, unknown>[] };
  steps: StepExecution[];
  approvals: Array<{
    id: string;
    status: string;
    reason: string | null;
    comment: string | null;
    decisionAt: string | null;
    createdAt: string;
  }>;
}

export default function ExecutionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [execution, setExecution] = useState<ExecutionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/automation/executions/${id}`);
        const data = await res.json();
        setExecution(data);
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleRetry = async () => {
    try {
      await fetch(`/api/v1/automation/executions/${id}/retry`, { method: 'POST' });
      const res = await fetch(`/api/v1/automation/executions/${id}`);
      const data = await res.json();
      setExecution(data);
    } catch {
      // Silent fail
    }
  };

  const handleCancel = async () => {
    try {
      await fetch(`/api/v1/automation/executions/${id}/cancel`, { method: 'POST' });
      const res = await fetch(`/api/v1/automation/executions/${id}`);
      const data = await res.json();
      setExecution(data);
    } catch {
      // Silent fail
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <PageHeader title="Loading..." breadcrumbs={[{ label: 'Automation', href: '/automation' }, { label: 'Execution' }]} />
        <div className="p-5 lg:p-6 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <PageHeader title="Execution Not Found" breadcrumbs={[{ label: 'Automation', href: '/automation' }, { label: 'Not Found' }]} />
        <div className="p-5 lg:p-6">
          <EmptyState
            icon={Clock}
            title="Execution not found"
            description="This execution record doesn't exist or you don't have access."
            action={
              <Link href="/automation/executions" className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#1D4ED8]">
                <ArrowLeft className="h-4 w-4" /> Back to Executions
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PageHeader
        title={`Execution ${execution.id.slice(0, 8)}...`}
        breadcrumbs={[
          { label: 'Automation', href: '/automation' },
          { label: 'Executions', href: '/automation/executions' },
          { label: execution.id.slice(0, 8) },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={execution.status} />
            {execution.status === 'FAILED' && execution.attemptCount < execution.maxAttempts && (
              <button
                onClick={handleRetry}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#1D4ED8]"
              >
                <RotateCw className="h-3.5 w-3.5" /> Retry
              </button>
            )}
            {(execution.status === 'PENDING' || execution.status === 'RUNNING') && (
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-[12px] font-medium text-red-600 hover:bg-red-50"
              >
                <XCircle className="h-3.5 w-3.5" /> Cancel
              </button>
            )}
          </div>
        }
      />

      <div className="p-5 lg:p-6 space-y-4">
        {/* Execution Info */}
        <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
          <h3 className="text-[14px] font-semibold text-[#0F172A] mb-3">Execution Details</h3>
          <dl className="grid grid-cols-2 gap-4 text-[13px] md:grid-cols-4">
            <div>
              <dt className="text-[#94A3B8]">Workflow</dt>
              <dd className="mt-0.5 font-medium text-[#0F172A]">
                <Link href={`/automation/workflows/${execution.workflow.id}`} className="text-[#2563EB] hover:text-[#1D4ED8]">
                  {execution.workflow.name}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-[#94A3B8]">Version</dt>
              <dd className="mt-0.5 font-medium text-[#0F172A]">v{execution.workflowVersion.versionNumber}</dd>
            </div>
            <div>
              <dt className="text-[#94A3B8]">Trigger</dt>
              <dd className="mt-0.5 font-medium text-[#0F172A]">{execution.triggerEventType}</dd>
            </div>
            <div>
              <dt className="text-[#94A3B8]">Status</dt>
              <dd className="mt-0.5"><StatusBadge status={execution.status} /></dd>
            </div>
            <div>
              <dt className="text-[#94A3B8]">Started</dt>
              <dd className="mt-0.5 font-medium text-[#0F172A]">
                {execution.startedAt ? new Date(execution.startedAt).toLocaleString() : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[#94A3B8]">Completed</dt>
              <dd className="mt-0.5 font-medium text-[#0F172A]">
                {execution.completedAt ? new Date(execution.completedAt).toLocaleString() : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[#94A3B8]">Duration</dt>
              <dd className="mt-0.5 font-medium text-[#0F172A]">
                {execution.duration ? `${execution.duration}ms` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[#94A3B8]">Attempts</dt>
              <dd className="mt-0.5 font-medium text-[#0F172A]">
                {execution.attemptCount} / {execution.maxAttempts}
              </dd>
            </div>
          </dl>

          {execution.error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3">
              <p className="text-[12px] font-medium text-red-700">Error</p>
              <p className="mt-1 text-[12px] text-red-600">{execution.error}</p>
            </div>
          )}
        </div>

        {/* Step Timeline */}
        <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
          <h3 className="text-[14px] font-semibold text-[#0F172A] mb-4">Step Timeline</h3>

          {execution.steps.length === 0 ? (
            <p className="text-[13px] text-[#94A3B8]">No steps executed yet.</p>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[15px] top-0 bottom-0 w-px bg-[#E2E8F0]" />

              <div className="space-y-4">
                {execution.steps.map((step) => {
                  const isSucceeded = step.status === 'SUCCEEDED';
                  const isFailed = step.status === 'FAILED';
                  const isRunning = step.status === 'RUNNING';

                  return (
                    <div key={step.id} className="relative flex gap-4">
                      {/* Icon */}
                      <div className="relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-2 border-white bg-white">
                        {isSucceeded ? (
                          <CheckCircle className="h-[18px] w-[18px] text-emerald-500" />
                        ) : isFailed ? (
                          <AlertCircle className="h-[18px] w-[18px] text-red-500" />
                        ) : isRunning ? (
                          <Clock className="h-[18px] w-[18px] text-blue-500 animate-pulse" />
                        ) : (
                          <div className="h-[18px] w-[18px] rounded-full border-2 border-[#E2E8F0]" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-[#0F172A]">
                            Step {step.stepNumber}: {step.actionType.replace(/_/g, ' ')}
                          </span>
                          <StatusBadge status={step.status} />
                          {step.duration && (
                            <span className="text-[11px] text-[#94A3B8]">{step.duration}ms</span>
                          )}
                        </div>
                        {step.error && (
                          <p className="mt-1 text-[12px] text-red-600">{step.error}</p>
                        )}
                        {step.result && (
                          <p className="mt-1 text-[11px] text-[#94A3B8]">
                            Result: {JSON.stringify(step.result)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Approvals */}
        {execution.approvals.length > 0 && (
          <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
            <h3 className="text-[14px] font-semibold text-[#0F172A] mb-3">Approvals</h3>
            <div className="space-y-2">
              {execution.approvals.map((approval) => (
                <div key={approval.id} className="flex items-center justify-between rounded-lg bg-[#F8FAFC] p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={approval.status} />
                      {approval.reason && (
                        <span className="text-[12px] text-[#64748B]">{approval.reason}</span>
                      )}
                    </div>
                    {approval.comment && (
                      <p className="mt-1 text-[12px] text-[#0F172A]">{approval.comment}</p>
                    )}
                  </div>
                  <span className="text-[11px] text-[#94A3B8]">
                    {approval.decisionAt ? new Date(approval.decisionAt).toLocaleString() : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
