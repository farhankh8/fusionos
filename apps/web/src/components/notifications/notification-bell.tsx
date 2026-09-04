'use client';

/**
 * FusionOS Notification Bell
 *
 * Header notification bell with live unread count, dropdown popover,
 * and mark-as-read functionality. Uses the central notification API.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Bell, CheckCircle2, Info, AlertTriangle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CRITICAL';
  category: string;
  actionUrl?: string;
  readAt?: string;
  createdAt: string;
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case 'SUCCESS': return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    case 'WARNING': return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
    case 'ERROR': return <XCircle className="h-3.5 w-3.5 text-red-500" />;
    case 'CRITICAL': return <AlertCircle className="h-3.5 w-3.5 text-red-600" />;
    default: return <Info className="h-3.5 w-3.5 text-blue-500" />;
  }
}

function formatTimeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCount, setFetchingCount] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const countIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const result = await apiClient.get<{ unreadCount: number }>('/notifications/unread-count');
      setUnreadCount(result.unreadCount || 0);
    } catch {
      // Silently fail — notification bell is non-critical
    } finally {
      setFetchingCount(false);
    }
  }, []);

  // Fetch initial count
  useEffect(() => {
    fetchUnreadCount();
    // Poll for unread count every 60 seconds
    countIntervalRef.current = setInterval(fetchUnreadCount, 60000);
    return () => {
      if (countIntervalRef.current) clearInterval(countIntervalRef.current);
    };
  }, [fetchUnreadCount]);

  // Fetch recent notifications when dropdown opens
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    apiClient.get<{ data: Notification[] }>('/notifications', { limit: '8', unreadOnly: 'false' })
      .then(result => setNotifications(result.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setMarkingAll(true);
      await apiClient.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
      setUnreadCount(0);
    } catch { /* silent */ } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.readAt) {
      // Mark as read without needing a real event
      apiClient.patch(`/notifications/${notification.id}/read`).then(() => {
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }).catch(() => {});
    }
    setIsOpen(false);
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const handleViewAll = () => {
    setIsOpen(false);
    router.push('/notifications');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#DC2626] px-1 text-[9px] font-semibold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-[#E2E8F0] bg-white shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-semibold text-[#0F172A]">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[#EFF6FF] px-1.5 py-0.5 text-[10px] font-medium text-[#2563EB]">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markingAll}
                className="flex items-center gap-1 text-[12px] text-[#2563EB] hover:text-[#1D4ED8] disabled:opacity-50"
              >
                {markingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#94A3B8]" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="mx-auto mb-2 h-8 w-8 text-[#E2E8F0]" />
                <p className="text-[13px] text-[#64748B]">No notifications yet</p>
              </div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-2.5 border-b border-[#E2E8F0] px-4 py-2.5 transition-colors cursor-pointer ${
                      !notification.readAt ? 'bg-blue-50/40 hover:bg-blue-50' : 'hover:bg-[#F8FAFC]'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="mt-0.5 shrink-0">
                      {getSeverityIcon(notification.severity)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[12px] truncate ${
                        !notification.readAt ? 'font-semibold text-[#0F172A]' : 'text-[#475569]'
                      }`}>
                        {notification.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#94A3B8] line-clamp-1">
                        {notification.body}
                      </p>
                      <span className="mt-0.5 inline-block text-[10px] text-[#94A3B8]">
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                    </div>
                    {!notification.readAt && (
                      <button
                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                        className="mt-0.5 shrink-0 rounded p-0.5 text-[#94A3B8] hover:text-[#2563EB]"
                        title="Mark as read"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-[#E2E8F0] px-4 py-2.5">
              <button
                onClick={handleViewAll}
                className="w-full text-center text-[12px] font-medium text-[#2563EB] hover:text-[#1D4ED8]"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
