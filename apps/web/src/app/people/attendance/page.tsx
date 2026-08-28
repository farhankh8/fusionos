'use client';

/**
 * FusionOS Attendance Page
 *
 * Production-oriented attendance management:
 * - Clock in / Clock out controls
 * - Break start / end
 * - Today's attendance status
 * - Attendance history with filtering
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  LogIn,
  LogOut,
  Coffee,
  Play,
  Square,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Timer,
  Users,
} from 'lucide-react';

interface AttendanceEvent {
  id: string;
  eventType: string;
  eventTime: string;
  source: string;
  notes?: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  recordStatus: string;
  firstClockIn?: string;
  lastClockOut?: string;
  totalWorkedMinutes: number;
  totalBreakMinutes: number;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  overtimeMinutes: number;
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    department?: { name: string };
    branch?: { name: string };
  };
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function getStatusColor(status: string) {
  switch (status) {
    case 'PRESENT': return 'bg-success/10 text-success';
    case 'LATE': return 'bg-warning/10 text-warning';
    case 'EARLY_DEPARTURE': return 'bg-warning/10 text-warning';
    case 'OVERTIME': return 'bg-info/10 text-info';
    case 'HALF_DAY': return 'bg-warning/10 text-warning';
    case 'ABSENT': return 'bg-destructive/10 text-destructive';
    case 'ON_LEAVE': return 'bg-muted text-muted-foreground';
    case 'HOLIDAY': return 'bg-muted text-muted-foreground';
    case 'WEEK_OFF': return 'bg-muted text-muted-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
}

export default function AttendancePage() {
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [todayEvents, setTodayEvents] = useState<AttendanceEvent[]>([]);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [historyMeta, setHistoryMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);

  // Fetch today's attendance
  const fetchToday = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
      const res = await fetch('http://localhost:3001/api/v1/attendance/today', {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to fetch today');
      const data = await res.json();
      setTodayAttendance(data.attendance);
      setTodayEvents(data.events ?? []);
    } catch {
      // Employee may not have an employee record linked
      setTodayAttendance(null);
      setTodayEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
      const params = new URLSearchParams({ page: String(historyPage), limit: '10' });
      const res = await fetch(`http://localhost:3001/api/v1/attendance?${params}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setHistory(data.data ?? []);
      setHistoryMeta(data.meta ?? null);
    } catch {
      setHistory([]);
    }
  }, [historyPage]);

  useEffect(() => { fetchToday(); fetchHistory(); }, [fetchToday, fetchHistory]);

  const handleClockIn = async () => {
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
      const res = await fetch('http://localhost:3001/api/v1/attendance/clock-in', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'WEB' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? 'Clock in failed');
      }
      setSuccess('Clocked in successfully');
      await fetchToday();
      await fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clock in failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
      const res = await fetch('http://localhost:3001/api/v1/attendance/clock-out', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'WEB' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? 'Clock out failed');
      }
      setSuccess('Clocked out successfully');
      await fetchToday();
      await fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clock out failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBreakStart = async () => {
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
      const res = await fetch('http://localhost:3001/api/v1/attendance/break-start', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'WEB' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? 'Break start failed');
      }
      setSuccess('Break started');
      await fetchToday();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Break start failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBreakEnd = async () => {
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
      const res = await fetch('http://localhost:3001/api/v1/attendance/break-end', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'WEB' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? 'Break end failed');
      }
      setSuccess('Break ended');
      await fetchToday();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Break end failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Determine current state from events
  const hasClockedIn = todayEvents.some((e) => e.eventType === 'CLOCK_IN');
  const hasClockedOut = todayEvents.some((e) => e.eventType === 'CLOCK_OUT');
  const lastBreakEvent = todayEvents.filter((e) => e.eventType === 'BREAK_START' || e.eventType === 'BREAK_END').pop();
  const onBreak = lastBreakEvent?.eventType === 'BREAK_START';

  if (loading) {
    return (
      <div className="min-h-full bg-background">
        <div className="p-4 lg:p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-[13px] text-muted-foreground">Loading attendance...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="p-4 lg:p-6">
        {/* Page Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-foreground">Attendance</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Track daily attendance and work hours</p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <p className="text-[13px] text-destructive">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-3 rounded-lg border border-success/20 bg-success/5 p-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            <p className="text-[13px] text-success">{success}</p>
          </div>
        )}

        <div className="grid gap-3 lg:grid-cols-3">
          {/* Clock Controls — spans 1 col */}
          <div className="rounded-lg border border-border">
            <div className="border-b border-border px-4 py-2.5">
              <h2 className="text-[13px] font-semibold text-foreground">Clock Controls</h2>
            </div>
            <div className="p-4 space-y-3">
              {/* Status */}
              <div className="text-center">
                <p className="text-[12px] text-muted-foreground">Current Status</p>
                <p className="text-[14px] font-semibold text-foreground mt-0.5">
                  {hasClockedIn && !hasClockedOut ? (
                    onBreak ? 'On Break' : 'Clocked In'
                  ) : hasClockedOut ? (
                    'Clocked Out'
                  ) : (
                    'Not Clocked In'
                  )}
                </p>
                {todayAttendance?.firstClockIn && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    In: {formatTime(todayAttendance.firstClockIn)}
                    {todayAttendance.lastClockOut && ` · Out: ${formatTime(todayAttendance.lastClockOut)}`}
                  </p>
                )}
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleClockIn}
                  disabled={actionLoading || hasClockedIn}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-success/10 text-[13px] font-medium text-success hover:bg-success/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Clock In
                </button>
                <button
                  onClick={handleClockOut}
                  disabled={actionLoading || !hasClockedIn || hasClockedOut}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-destructive/10 text-[13px] font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Clock Out
                </button>
                <button
                  onClick={handleBreakStart}
                  disabled={actionLoading || !hasClockedIn || hasClockedOut || onBreak}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border text-[13px] font-medium text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Coffee className="h-3.5 w-3.5" />
                  Break Start
                </button>
                <button
                  onClick={handleBreakEnd}
                  disabled={actionLoading || !onBreak}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border text-[13px] font-medium text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Square className="h-3.5 w-3.5" />
                  Break End
                </button>
              </div>
            </div>
          </div>

          {/* Today's Summary — spans 2 cols */}
          <div className="lg:col-span-2 rounded-lg border border-border">
            <div className="border-b border-border px-4 py-2.5">
              <h2 className="text-[13px] font-semibold text-foreground">Today&apos;s Summary</h2>
            </div>
            {todayAttendance ? (
              <>
                <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
                  <StatCard icon={Timer} label="Worked" value={formatMinutes(todayAttendance.totalWorkedMinutes)} />
                  <StatCard icon={Coffee} label="Breaks" value={formatMinutes(todayAttendance.totalBreakMinutes)} />
                  <StatCard icon={Clock} label="Late" value={todayAttendance.lateMinutes > 0 ? formatMinutes(todayAttendance.lateMinutes) : '—'} />
                  <StatCard icon={Clock} label="Overtime" value={todayAttendance.overtimeMinutes > 0 ? formatMinutes(todayAttendance.overtimeMinutes) : '—'} />
                </div>
                {/* Events Timeline */}
                {todayEvents.length > 0 && (
                  <div className="border-t border-border px-4 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Events</p>
                    <div className="space-y-1.5">
                      {todayEvents.map((event) => (
                        <div key={event.id} className="flex items-center gap-2 text-[12px]">
                          <span className={`inline-flex h-4 items-center rounded px-1 text-[9px] font-medium ${
                            event.eventType === 'CLOCK_IN' ? 'bg-success/10 text-success' :
                            event.eventType === 'CLOCK_OUT' ? 'bg-destructive/10 text-destructive' :
                            event.eventType === 'BREAK_START' || event.eventType === 'BREAK_END' ? 'bg-warning/10 text-warning' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {event.eventType.replace('_', ' ')}
                          </span>
                          <span className="text-foreground">{formatTime(event.eventTime)}</span>
                          <span className="text-muted-foreground">· {event.source}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center">
                <Clock className="mx-auto h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
                <p className="mt-1 text-[13px] text-muted-foreground">No attendance record for today</p>
                <p className="text-[11px] text-muted-foreground">Clock in to start tracking</p>
              </div>
            )}
          </div>
        </div>

        {/* Attendance History */}
        <div className="mt-3 rounded-lg border border-border">
          <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-foreground">Attendance History</h2>
            <span className="text-[11px] text-muted-foreground">{historyMeta?.total ?? 0} records</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Clock In</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Clock Out</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Worked</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Break</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Late</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <Calendar className="mx-auto h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
                    <p className="mt-1 text-[13px] text-muted-foreground">No attendance history</p>
                  </td>
                </tr>
              ) : (
                history.map((record) => (
                  <tr key={record.id} className="transition-colors duration-120 hover:bg-muted/50">
                    <td className="px-4 py-2.5 text-[13px] text-foreground">
                      {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex h-5 items-center rounded px-1.5 text-[10px] font-medium ${getStatusColor(record.status)}`}>
                        {record.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{formatTime(record.firstClockIn)}</td>
                    <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{formatTime(record.lastClockOut)}</td>
                    <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{formatMinutes(record.totalWorkedMinutes)}</td>
                    <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{formatMinutes(record.totalBreakMinutes)}</td>
                    <td className="px-4 py-2.5 text-[13px] text-muted-foreground">
                      {record.lateMinutes > 0 ? formatMinutes(record.lateMinutes) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {historyMeta && historyMeta.totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[12px] text-muted-foreground">
              Showing {((historyMeta.page - 1) * historyMeta.limit) + 1}–{Math.min(historyMeta.page * historyMeta.limit, historyMeta.total)} of {historyMeta.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setHistoryPage((p) => p - 1)}
                disabled={!historyMeta.hasPrevious}
                className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 text-[12px] text-muted-foreground">{historyMeta.page} / {historyMeta.totalPages}</span>
              <button
                onClick={() => setHistoryPage((p) => p + 1)}
                disabled={!historyMeta.hasNext}
                className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1 text-[14px] font-semibold text-foreground">{value}</p>
    </div>
  );
}
