'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';

interface Activity {
  id: string;
  activityType: string;
  subject: string;
  description: string | null;
  createdAt: string;
  completedAt: string | null;
  actor: { id: string; firstName: string; lastName: string };
  customerProfile?: { customer: { name: string } };
}

const ACTIVITY_ICONS: Record<string, string> = {
  CALL: '📞',
  EMAIL: '📧',
  MEETING: '🤝',
  NOTE: '📝',
  TASK: '✅',
  FOLLOW_UP: '🔄',
};

export default function CrmActivitiesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activityType, setActivityType] = useState('');
  const [companyId, setCompanyId] = useState('');

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

  const loadActivities = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ companyId, page: String(page), limit: '20' });
      if (activityType) params.set('activityType', activityType);
      const res = await apiClient.get<{ items: Activity[]; total: number }>(`/crm/activities?${params}`);
      setActivities(res.items || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  }, [companyId, page, activityType]);

  useEffect(() => { loadActivities(); }, [loadActivities]);

  return (
    <div>
      <PageHeader
        title="Activities"
        description="Track all customer interactions and follow-ups."
        breadcrumbs={[{ label: 'CRM', href: '/crm' }, { label: 'Activities' }]}
      />

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[13px] text-[#DC2626]">{error}</div>
      )}

      <div className="flex gap-3 mb-4">
        <select
          value={activityType}
          onChange={(e) => { setActivityType(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-[#DDD0BB] rounded-md text-[13px] text-[#57534E]"
        >
          <option value="">All Types</option>
          <option value="CALL">Call</option>
          <option value="EMAIL">Email</option>
          <option value="MEETING">Meeting</option>
          <option value="NOTE">Note</option>
          <option value="TASK">Task</option>
          <option value="FOLLOW_UP">Follow Up</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-[#DDD0BB]">
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-[#FBF5EC] rounded animate-pulse" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <EmptyState title="No activities" description="Log your first customer activity to get started." />
        ) : (
          <div className="divide-y divide-[#DDD0BB]">
            {activities.map((a) => (
              <div key={a.id} className="flex gap-4 px-4 py-4 hover:bg-[#FBF5EC] transition-colors">
                <div className="text-xl mt-0.5">{ACTIVITY_ICONS[a.activityType] || '📋'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={a.activityType} />
                    {a.completedAt && (
                      <span className="text-[11px] px-1.5 py-0.5 bg-[#F0FDF4] text-[#16A34A] rounded">Completed</span>
                    )}
                  </div>
                  <p className="text-[13px] font-medium text-[#1C1917]">{a.subject}</p>
                  {a.description && (
                    <p className="text-[12px] text-[#57534E] mt-0.5 line-clamp-2">{a.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-[12px] text-[#57534E]">
                    <span>{a.actor.firstName} {a.actor.lastName}</span>
                    {a.customerProfile?.customer?.name && (
                      <>
                        <span>•</span>
                        <span>{a.customerProfile.customer.name}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{new Date(a.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {total > 20 && (
          <div className="px-4 py-3 border-t border-[#DDD0BB] flex items-center justify-between text-[12px] text-[#57534E]">
            <span>Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
              <button disabled={page * 20 >= total} onClick={() => setPage(page + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
