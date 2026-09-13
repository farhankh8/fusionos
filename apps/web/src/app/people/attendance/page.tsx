'use client';

/**
 * FusionOS Attendance Page
 * Enterprise attendance management workspace.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { FilterBar } from '@/components/ui/filter-bar';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { KpiSkeleton, TableSkeleton } from '@/components/ui/skeleton';
import { Clock, Users, UserCheck, UserX, CalendarOff, AlertTriangle, Plus } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employee?: { id: string; firstName: string; lastName: string; employeeCode: string; department?: { name: string } };
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
}

const STATUS_TABS = [
  { id: 'all', label: 'All Attendance' },
  { id: 'today', label: "Today's Attendance" },
  { id: 'exceptions', label: 'Exceptions' },
];

const STATUS_OPTIONS = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'HALF_DAY', label: 'Half Day' },
  { value: 'LATE', label: 'Late' },
  { value: 'ON_LEAVE', label: 'On Leave' },
  { value: 'INCOMPLETE', label: 'Incomplete' },
];

export default function AttendancePage() {
  const router = useRouter();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [kpis, setKpis] = useState({
    present: 0,
    absent: 0,
    onLeave: 0,
    halfDay: 0,
    late: 0,
    total: 0,
  });
  const [kpiLoading, setKpiLoading] = useState(true);

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        page: page.toString(),
        limit: '15',
      };
      if (search) params['search'] = search;
      if (statusFilter) params['status'] = statusFilter;

      const responseData = await apiClient.get<{ data: AttendanceRecord[]; meta?: { total: number; totalPages: number } }>('/attendance', params);
      setRecords(responseData.data || []);
      setTotalPages(responseData.meta?.totalPages || 1);
      setTotalCount(responseData.meta?.total || 0);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  const fetchKpis = useCallback(async () => {
    try {
      setKpiLoading(true);
      // Try to get today's attendance summary
      try {
        const todayData = await apiClient.get<{ data?: AttendanceRecord | AttendanceRecord[] }>('/attendance/today');
        const todayRecords: AttendanceRecord[] = todayData.data
          ? Array.isArray(todayData.data) ? todayData.data : [todayData.data]
          : [];
        const present = todayRecords.filter((r) => r.status === 'PRESENT').length;
        const absent = todayRecords.filter((r) => r.status === 'ABSENT').length;
        const onLeave = todayRecords.filter((r) => r.status === 'ON_LEAVE').length;
        const halfDay = todayRecords.filter((r) => r.status === 'HALF_DAY').length;
        const late = todayRecords.filter((r) => r.status === 'LATE').length;
        setKpis({ present, absent, onLeave, halfDay, late, total: todayRecords.length });
      } catch {
        // Today endpoint may not be available
      }

      // Get total employee count for context
      try {
        const empData = await apiClient.get<{ meta?: { total: number } }>('/employees', { page: '1', limit: '1' });
        setKpis(prev => ({ ...prev, total: empData.meta?.total || prev.total }));
      } catch {
        // Employee data unavailable
      }
    } catch {
      // KPI data unavailable
    } finally {
      setKpiLoading(false);
    }
  }, []);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);
  useEffect(() => { fetchKpis(); }, [fetchKpis]);

  const formatTime = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (minutes: number) => {
    if (!minutes) return '0h';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const columns = [
    {
      key: 'employee',
      label: 'Employee',
      render: (item: AttendanceRecord) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#064E3B] text-[11px] font-semibold text-white">
            {item.employee?.firstName?.charAt(0)}{item.employee?.lastName?.charAt(0)}
          </div>
          <div>
            <p className="text-[13px] font-medium text-[#1C1917]">
              {item.employee?.firstName} {item.employee?.lastName}
            </p>
            <p className="text-[11px] text-[#57534E]">{item.employee?.employeeCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      render: (item: AttendanceRecord) => (
        <span className="text-[13px] text-[#57534E]">
          {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'clockIn',
      label: 'Clock In',
      render: (item: AttendanceRecord) => (
        <span className="text-[13px] font-medium text-emerald-600">{formatTime(item.firstClockIn)}</span>
      ),
    },
    {
      key: 'clockOut',
      label: 'Clock Out',
      render: (item: AttendanceRecord) => (
        <span className="text-[13px] font-medium text-red-600">{formatTime(item.lastClockOut)}</span>
      ),
    },
    {
      key: 'worked',
      label: 'Worked',
      render: (item: AttendanceRecord) => (
        <span className="text-[13px] font-semibold text-[#1C1917]">{formatDuration(item.totalWorkedMinutes)}</span>
      ),
      align: 'right' as const,
    },
    {
      key: 'overtime',
      label: 'Overtime',
      render: (item: AttendanceRecord) => (
        <span className="text-[13px] text-purple-600">{item.overtimeMinutes > 0 ? formatDuration(item.overtimeMinutes) : '—'}</span>
      ),
      align: 'right' as const,
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: AttendanceRecord) => <StatusBadge status={item.status} />,
    },
    {
      key: 'recordStatus',
      label: 'Record',
      render: (item: AttendanceRecord) => (
        <span className="text-[11px] text-[#57534E]">{item.recordStatus || '—'}</span>
      ),
    },
  ];

  return (
    <div className="min-h-full bg-[#FBF5EC]">
      <PageHeader
        title="Attendance"
        description="Manage employee attendance, working hours and attendance events"
        breadcrumbs={[{ label: 'People' }, { label: 'Attendance' }]}
        actions={
          <button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#064E3B] px-3 text-[12px] font-medium text-white hover:bg-[#047857] transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Clock In
          </button>
        }
      />

      <div className="px-5 py-4 lg:px-6">
        {/* KPI Row */}
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {kpiLoading ? (
            Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)
          ) : (
            <>
              <KpiCard label="Present Today" value={kpis.present} icon={UserCheck} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
              <KpiCard label="Absent Today" value={kpis.absent} icon={UserX} iconBg="bg-red-50" iconColor="text-red-600" />
              <KpiCard label="On Leave" value={kpis.onLeave} icon={CalendarOff} iconBg="bg-amber-50" iconColor="text-amber-600" />
              <KpiCard label="Half Day" value={kpis.halfDay} icon={Clock} iconBg="bg-orange-50" iconColor="text-orange-600" />
              <KpiCard label="Late / Exceptions" value={kpis.late} icon={AlertTriangle} iconBg="bg-purple-50" iconColor="text-purple-600" />
              <KpiCard label="Total Employees" value={kpis.total} icon={Users} iconBg="bg-[#D1FAE5]" iconColor="text-[#064E3B]" />
            </>
          )}
        </div>

        {/* Tabs */}
        <Tabs tabs={STATUS_TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Filters */}
        <div className="pt-3">
          <FilterBar
            search={search}
            searchPlaceholder="Search by employee name or code..."
            onSearchChange={(val) => { setSearch(val); setPage(1); }}
            filters={[
              {
                key: 'status',
                label: 'All Status',
                value: statusFilter,
                options: STATUS_OPTIONS,
                onChange: (val) => { setStatusFilter(val); setPage(1); },
              },
            ]}
            activeFilterCount={(statusFilter ? 1 : 0)}
            onClearFilters={() => { setStatusFilter(''); setSearch(''); setPage(1); }}
          />
        </div>

        {/* Table */}
        {loading ? (
          <TableSkeleton rows={8} cols={8} />
        ) : records.length === 0 ? (
          <div className="overflow-hidden rounded-lg border border-[#DDD0BB] bg-white">
            <EmptyState
              icon={Clock}
              title="No attendance records found"
              description="No attendance data matches your current filters."
              action={
                <button
                  onClick={() => { setStatusFilter(''); setSearch(''); setPage(1); }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#DDD0BB] px-3 py-1.5 text-[12px] font-medium text-[#57534E] hover:bg-[#FBF5EC]"
                >
                  Clear Filters
                </button>
              }
            />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={records}
            page={page}
            totalPages={totalPages}
            total={totalCount}
            limit={15}
            onPageChange={setPage}
            onRowClick={(item) => router.push(`/people/attendance/${item.id}`)}
          />
        )}
      </div>
    </div>
  );
}
