'use client';

/**
 * FusionOS Notifications Center
 *
 * Full notification list with category/type/severity filters,
 * unread indicator, mark as read/unread, and pagination.
 * Uses real API data — no fake data.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionCard } from '@/components/ui/section-card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell,
  BellOff,
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle,
  Clock,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CRITICAL';
  category: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  readAt?: string;
  createdAt: string;
}

interface NotificationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'LEAVE', label: 'Leave' },
  { value: 'PAYROLL', label: 'Payroll' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'CRM', label: 'CRM' },
  { value: 'PROJECTS', label: 'Projects' },
  { value: 'DOCUMENTS', label: 'Documents' },
  { value: 'PEOPLE', label: 'People' },
  { value: 'ATTENDANCE', label: 'Attendance' },
  { value: 'SYSTEM', label: 'System' },
];

const SEVERITIES = [
  { value: '', label: 'All Severities' },
  { value: 'INFO', label: 'Info' },
  { value: 'SUCCESS', label: 'Success' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'ERROR', label: 'Error' },
  { value: 'CRITICAL', label: 'Critical' },
];

function getSeverityIcon(severity: string) {
  switch (severity) {
    case 'SUCCESS': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case 'WARNING': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'ERROR': return <XCircle className="h-4 w-4 text-red-500" />;
    case 'CRITICAL': return <AlertCircle className="h-4 w-4 text-red-600" />;
    default: return <Info className="h-4 w-4 text-blue-500" />;
  }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [meta, setMeta] = useState<NotificationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params: Record<string, string> = {
        page: String(page),
        limit: '20',
      };
      if (unreadOnly) params.unreadOnly = 'true';
      if (category) params.category = category;
      if (severity) params.severity = severity;

      const result = await apiClient.get<{ data: Notification[]; meta: NotificationMeta }>('/notifications', params);
      setNotifications(result.data || []);
      setMeta(result.meta || null);
    } catch (err) {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [page, unreadOnly, category, severity]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n),
      );
    } catch { /* silent */ }
  };

  const handleMarkAsUnread = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/unread`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, readAt: undefined } : n),
      );
    } catch { /* silent */ }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAll(true);
      await apiClient.post('/notifications/read-all');
      setNotifications(prev =>
        prev.map(n => ({ ...n, readAt: n.readAt || new Date().toISOString() })),
      );
    } catch { /* silent */ } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.readAt) {
      handleMarkAsRead(notification.id);
    }
    // Navigate to action URL if available
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const resetFilters = () => {
    setPage(1);
    setUnreadOnly(false);
    setCategory('');
    setSeverity('');
  };

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <PageHeader
        title="Notifications"
        description="View and manage your notifications"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllAsRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-[12px] font-medium text-[#64748B] transition-colors hover:bg-[#F8FAFC] disabled:opacity-50"
            >
              {markingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Mark all read
            </button>
          </div>
        }
      />

      <div className="px-5 py-4 lg:px-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <div className="flex items-center gap-2 text-[13px] text-red-800">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-[12px] text-[#64748B]">
            <Filter className="h-3.5 w-3.5" />
            Filters:
          </div>
          <button
            onClick={() => { setUnreadOnly(!unreadOnly); setPage(1); }}
            className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
              unreadOnly
                ? 'bg-[#2563EB] text-white'
                : 'border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]'
            }`}
          >
            {unreadOnly ? 'Unread Only' : 'All'}
          </button>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="rounded-md border border-[#E2E8F0] bg-white px-2.5 py-1 text-[12px] text-[#64748B] outline-none focus:border-[#2563EB]"
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <select
            value={severity}
            onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
            className="rounded-md border border-[#E2E8F0] bg-white px-2.5 py-1 text-[12px] text-[#64748B] outline-none focus:border-[#2563EB]"
          >
            {SEVERITIES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          {(unreadOnly || category || severity) && (
            <button
              onClick={resetFilters}
              className="text-[12px] text-[#2563EB] hover:text-[#1D4ED8]"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Notification List */}
        <SectionCard title="Notifications">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-[#E2E8F0] p-3">
                  <Skeleton className="h-4 w-4 shrink-0 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-48" />
                    <Skeleton className="h-3 w-72" />
                  </div>
                  <Skeleton className="h-3 w-12 shrink-0" />
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={BellOff}
              title="No notifications"
              description={unreadOnly ? "You're all caught up." : "No notifications yet."}
            />
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 p-3 transition-colors cursor-pointer ${
                    !notification.readAt
                      ? 'bg-blue-50/50 hover:bg-blue-50'
                      : 'hover:bg-[#F8FAFC]'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {/* Severity Icon */}
                  <div className="mt-0.5 shrink-0">
                    {getSeverityIcon(notification.severity)}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-[13px] truncate ${
                        !notification.readAt ? 'font-semibold text-[#0F172A]' : 'font-medium text-[#475569]'
                      }`}>
                        {notification.title}
                      </p>
                      <span className="shrink-0 rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[9px] font-medium text-[#64748B]">
                        {notification.category}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12px] text-[#64748B] line-clamp-2">
                      {notification.body}
                    </p>
                  </div>

                  {/* Timestamp + Unread dot */}
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[11px] text-[#94A3B8]">
                      {formatDate(notification.createdAt)}
                    </span>
                    {!notification.readAt && (
                      <div className="h-2 w-2 rounded-full bg-[#2563EB]" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        notification.readAt
                          ? handleMarkAsUnread(notification.id)
                          : handleMarkAsRead(notification.id);
                      }}
                      className="text-[11px] text-[#94A3B8] hover:text-[#2563EB]"
                    >
                      {notification.readAt ? 'Mark unread' : 'Mark read'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#E2E8F0] px-4 py-3">
              <p className="text-[12px] text-[#64748B]">
                Showing {((meta.page - 1) * meta.limit) + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={!meta.hasPrevious}
                  className="flex h-7 w-7 items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="px-2 text-[12px] text-[#64748B]">
                  Page {meta.page} of {meta.totalPages}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!meta.hasNext}
                  className="flex h-7 w-7 items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
