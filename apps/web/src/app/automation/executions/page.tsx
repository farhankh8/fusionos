'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

interface Execution {
  id: string;
  triggerEventType: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
  attemptCount: number;
  createdAt: string;
  workflow: { id: string; name: string };
}

export default function ExecutionsListPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams({ limit: '50' });
        if (statusFilter) params.set('status', statusFilter);
        const res = await fetch(`/api/v1/automation/executions?${params}`);
        const data = await res.json();
        setExecutions(data.data ?? []);
      } catch {
        setExecutions([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [statusFilter]);

  return (
    <div className="min-h-screen bg-[#FBF5EC]">
      <PageHeader
        title="Executions"
        description="Workflow execution history across all automation workflows"
        breadcrumbs={[
          { label: 'Automation', href: '/automation' },
          { label: 'Executions' },
        ]}
      />

      <div className="p-5 lg:p-6">
        <div className="mb-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[#DDD0BB] bg-white px-3 py-2 text-[13px] text-[#1C1917] focus:border-[#064E3B] focus:outline-none focus:ring-1 focus:ring-[#064E3B]"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="RUNNING">Running</option>
            <option value="SUCCEEDED">Succeeded</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="SKIPPED">Skipped</option>
          </select>
        </div>

        <div className="rounded-lg border border-[#DDD0BB] bg-white overflow-hidden">
          {loading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : executions.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No executions found"
              description="Workflow executions will appear here once workflows are triggered."
            />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#DDD0BB] bg-[#FBF5EC]">
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#57534E]">Execution</th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#57534E]">Workflow</th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#57534E]">Status</th>
                  <th className="hidden md:table-cell px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#57534E]">Trigger</th>
                  <th className="hidden lg:table-cell px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#57534E]">Duration</th>
                  <th className="hidden lg:table-cell px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#57534E]">Attempt</th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#57534E]">Date</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-[#57534E]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5E6CC]">
                {executions.map((exec) => (
                  <tr key={exec.id} className="hover:bg-[#FBF5EC] transition-colors">
                    <td className="px-5 py-3 text-[12px] text-[#57534E] font-mono">{exec.id.slice(0, 8)}...</td>
                    <td className="px-5 py-3">
                      <Link href={`/automation/workflows/${exec.workflow?.id}`} className="text-[13px] font-medium text-[#064E3B] hover:text-[#047857]">
                        {exec.workflow?.name ?? 'Unknown'}
                      </Link>
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={exec.status} /></td>
                    <td className="hidden md:table-cell px-5 py-3 text-[12px] text-[#57534E]">{exec.triggerEventType}</td>
                    <td className="hidden lg:table-cell px-5 py-3 text-[12px] text-[#57534E]">
                      {exec.duration ? `${exec.duration}ms` : '—'}
                    </td>
                    <td className="hidden lg:table-cell px-5 py-3 text-[12px] text-[#57534E]">
                      {exec.attemptCount}
                    </td>
                    <td className="px-5 py-3 text-[12px] text-[#57534E] whitespace-nowrap">
                      {new Date(exec.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/automation/executions/${exec.id}`} className="text-[12px] text-[#064E3B] hover:text-[#047857]">
                        Details →
                      </Link>
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
