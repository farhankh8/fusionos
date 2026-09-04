'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Zap, PlayCircle, FileEdit, Pause, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardData {
  activeWorkflows: number;
  draftWorkflows: number;
  pausedWorkflows: number;
  executionsToday: number;
  successfulExecutions: number;
  failedExecutions: number;
  pendingApprovals: number;
}

interface RecentExecution {
  id: string;
  workflow: { id: string; name: string };
  status: string;
  triggerEventType: string;
  createdAt: string;
}

export default function AutomationDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [recentExecutions, setRecentExecutions] = useState<RecentExecution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [dashRes, execRes] = await Promise.all([
          fetch('/api/v1/automation/dashboard').then(r => r.json()),
          fetch('/api/v1/automation/executions?limit=5').then(r => r.json()),
        ]);
        if (dashRes.data) setDashboard(dashRes.data);
        if (execRes.data) setRecentExecutions(execRes.data);
      } catch {
        // Silent fail — show empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PageHeader
        title="Automation"
        description="Automate repetitive business processes across FusionOS"
        actions={
          <Link
            href="/automation/workflows/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#1D4ED8] transition-colors"
          >
            <Zap className="h-4 w-4" />
            Create Workflow
          </Link>
        }
      />

      <div className="p-5 lg:p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {loading ? (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-[#E2E8F0] bg-white p-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="mt-2 h-7 w-16" />
                </div>
              ))}
            </>
          ) : (
            <>
              <KpiCard
                label="Active Workflows"
                value={dashboard?.activeWorkflows ?? 0}
                icon={PlayCircle}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
              />
              <KpiCard
                label="Draft Workflows"
                value={dashboard?.draftWorkflows ?? 0}
                icon={FileEdit}
                iconBg="bg-amber-50"
                iconColor="text-amber-600"
              />
              <KpiCard
                label="Paused Workflows"
                value={dashboard?.pausedWorkflows ?? 0}
                icon={Pause}
                iconBg="bg-slate-50"
                iconColor="text-slate-600"
              />
              <KpiCard
                label="Executions Today"
                value={dashboard?.executionsToday ?? 0}
                icon={Clock}
                iconBg="bg-blue-50"
                iconColor="text-blue-600"
                subtitle={`${dashboard?.successfulExecutions ?? 0} succeeded · ${dashboard?.failedExecutions ?? 0} failed`}
              />
            </>
          )}
        </div>

        {/* Quick Stats Row */}
        {!loading && (
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
            <KpiCard
              label="Successful Executions"
              value={dashboard?.successfulExecutions ?? 0}
              icon={CheckCircle}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
            />
            <KpiCard
              label="Failed Executions"
              value={dashboard?.failedExecutions ?? 0}
              icon={XCircle}
              iconBg="bg-red-50"
              iconColor="text-red-600"
            />
            <KpiCard
              label="Pending Approvals"
              value={dashboard?.pendingApprovals ?? 0}
              icon={Clock}
              iconBg="bg-purple-50"
              iconColor="text-purple-600"
            />
          </div>
        )}

        {/* Recent Executions */}
        <div className="mt-6 rounded-lg border border-[#E2E8F0] bg-white">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-3">
            <h2 className="text-[14px] font-semibold text-[#0F172A]">Recent Executions</h2>
            <Link
              href="/automation/executions"
              className="text-[12px] font-medium text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recentExecutions.length === 0 ? (
            <EmptyState
              icon={Zap}
              title="No executions yet"
              description="Create and publish a workflow to see execution history here."
            />
          ) : (
            <div className="divide-y divide-[#F1F5F9]">
              {recentExecutions.map((exec) => (
                <Link
                  key={exec.id}
                  href={`/automation/executions/${exec.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[#0F172A] truncate">
                        {exec.workflow?.name ?? 'Unknown Workflow'}
                      </p>
                      <p className="text-[11px] text-[#94A3B8]">
                        {exec.triggerEventType}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={exec.status} />
                    <span className="text-[11px] text-[#94A3B8] whitespace-nowrap">
                      {new Date(exec.createdAt).toLocaleString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
