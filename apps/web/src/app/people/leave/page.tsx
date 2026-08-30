'use client';

/**
 * FusionOS Leave Management Page
 * Enterprise leave workspace with requests, balances, calendar, types, and policies.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { FilterBar } from '@/components/ui/filter-bar';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionCard } from '@/components/ui/section-card';
import { KpiSkeleton, TableSkeleton } from '@/components/ui/skeleton';
import { CalendarOff, CheckCircle2, Clock, XCircle, Plus, FileText, Shield, Calendar, Settings } from 'lucide-react';

/* ── Types ───────────────────────────────────────────────────────────────── */

interface LeaveRequest {
  id: string;
  employee?: { id: string; firstName: string; lastName: string; employeeCode: string };
  leaveType?: { id: string; name: string; code: string; isPaid: boolean };
  startDate: string;
  endDate: string;
  duration: number;
  unit: string;
  status: string;
  reason?: string;
  createdAt: string;
}

interface LeaveBalance {
  id: string;
  leaveType?: { id: string; name: string; code: string; isPaid: boolean };
  employee?: { id: string; firstName: string; lastName: string };
  year: number;
  opening: number;
  accrued: number;
  used: number;
  pending: number;
  remaining: number;
  carryForward: number;
}

interface LeaveType {
  id: string;
  name: string;
  code: string;
  isPaid: boolean;
  requiresApproval: boolean;
  requiresDocument: boolean;
  defaultDaysPerYear: number;
  allowHalfDay: boolean;
  allowHourly: boolean;
  status: string;
}

interface LeavePolicy {
  id: string;
  name: string;
  leaveType?: { name: string; code: string };
  entitlementDays: number;
  accrualFrequency: string;
  carryForwardAllowed: boolean;
  maxCarryForwardDays: number;
  noticePeriodDays: number;
  maxConsecutiveDays: number;
  status: string;
}

/* ── Tab Configuration ───────────────────────────────────────────────────── */

const LEAVE_TABS = [
  { id: 'requests', label: 'Leave Requests' },
  { id: 'balances', label: 'Balances' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'types', label: 'Leave Types' },
  { id: 'policies', label: 'Policies' },
];

const REQUEST_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

/* ── Main Component ──────────────────────────────────────────────────────── */

export default function LeavePage() {
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [calendarRequests, setCalendarRequests] = useState<{ id: string; startDate: string; endDate: string; status: string; employee?: { firstName: string; lastName: string }; leaveType?: { name: string } }[]>([]);
  const [calendarHolidays, setCalendarHolidays] = useState<{ id: string; name: string; date: string }[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [kpis, setKpis] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [kpiLoading, setKpiLoading] = useState(true);

  /* ── Data Fetching ──────────────────────────────────────────────────────── */

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        page: page.toString(),
        limit: '15',
      };
      if (search) params['search'] = search;
      if (statusFilter) params['status'] = statusFilter;

      const responseData = await apiClient.get<{ data: LeaveRequest[]; meta?: { total: number; totalPages: number } }>('/leave/requests', params);
      setRequests(responseData.data || []);
      setTotalPages(responseData.meta?.totalPages || 1);
      setTotalCount(responseData.meta?.total || 0);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  const fetchBalances = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<{ data: LeaveBalance[] }>('/leave/balances');
      setBalances(data.data || []);
    } catch {
      setBalances([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLeaveTypes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<{ data: LeaveType[] }>('/leave/types');
      setLeaveTypes(data.data || []);
    } catch {
      setLeaveTypes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<{ data: LeavePolicy[] }>('/leave/policies');
      setPolicies(data.data || []);
    } catch {
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCalendar = useCallback(async () => {
    try {
      setCalendarLoading(true);
      const data = await apiClient.get<{ requests?: { id: string; startDate: string; endDate: string; status: string; employee?: { firstName: string; lastName: string }; leaveType?: { name: string } }[]; holidays?: { id: string; name: string; date: string }[] }>('/leave/calendar', { year: calendarYear.toString(), month: (calendarMonth + 1).toString() });
      setCalendarRequests(data.requests || []);
      setCalendarHolidays(data.holidays || []);
    } catch {
      setCalendarRequests([]);
      setCalendarHolidays([]);
    } finally {
      setCalendarLoading(false);
    }
  }, [calendarMonth, calendarYear]);

  const fetchKpis = useCallback(async () => {
    try {
      setKpiLoading(true);
      const data = await apiClient.get<{ data: LeaveRequest[]; meta?: { total: number } }>('/leave/requests', { page: '1', limit: '100' });
      const all = data.data || [];
      const pending = all.filter((r: LeaveRequest) => r.status === 'PENDING').length;
      const approved = all.filter((r: LeaveRequest) => r.status === 'APPROVED').length;
      const rejected = all.filter((r: LeaveRequest) => r.status === 'REJECTED').length;
      setKpis({ pending, approved, rejected, total: data.meta?.total || all.length });
    } catch {
      // KPI data unavailable
    } finally {
      setKpiLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'requests') fetchRequests();
    else if (activeTab === 'balances') fetchBalances();
    else if (activeTab === 'types') fetchLeaveTypes();
    else if (activeTab === 'policies') fetchPolicies();
    else if (activeTab === 'calendar') fetchCalendar();
  }, [activeTab, fetchRequests, fetchBalances, fetchLeaveTypes, fetchPolicies, fetchCalendar]);

  useEffect(() => { fetchKpis(); }, [fetchKpis]);
  useEffect(() => { if (activeTab === 'calendar') fetchCalendar(); }, [activeTab, fetchCalendar]);

  /* ── Render Helpers ─────────────────────────────────────────────────────── */

  const renderRequests = () => (
    <>
      <FilterBar
        search={search}
        searchPlaceholder="Search by employee name..."
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        filters={[
          {
            key: 'status',
            label: 'All Status',
            value: statusFilter,
            options: REQUEST_STATUS_OPTIONS,
            onChange: (val) => { setStatusFilter(val); setPage(1); },
          },
        ]}
        activeFilterCount={statusFilter ? 1 : 0}
        onClearFilters={() => { setStatusFilter(''); setSearch(''); setPage(1); }}
      />
      {loading ? (
        <TableSkeleton rows={8} cols={8} />
      ) : requests.length === 0 ? (
        <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
          <EmptyState icon={CalendarOff} title="No leave requests found" description="No leave requests match your current filters." />
        </div>
      ) : (
        <DataTable
          columns={[
            {
              key: 'employee',
              label: 'Employee',
              render: (item: LeaveRequest) => (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563EB] text-[11px] font-semibold text-white">
                    {item.employee?.firstName?.charAt(0)}{item.employee?.lastName?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[#0F172A]">{item.employee?.firstName} {item.employee?.lastName}</p>
                    <p className="text-[11px] text-[#64748B]">{item.employee?.employeeCode}</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'leaveType',
              label: 'Leave Type',
              render: (item: LeaveRequest) => (
                <span className="text-[13px] text-[#475569]">{item.leaveType?.name || '—'}</span>
              ),
            },
            {
              key: 'startDate',
              label: 'Start Date',
              render: (item: LeaveRequest) => (
                <span className="text-[13px] text-[#475569]">{new Date(item.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              ),
            },
            {
              key: 'endDate',
              label: 'End Date',
              render: (item: LeaveRequest) => (
                <span className="text-[13px] text-[#475569]">{new Date(item.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              ),
            },
            {
              key: 'duration',
              label: 'Duration',
              render: (item: LeaveRequest) => (
                <span className="text-[13px] font-medium text-[#0F172A]">{item.duration} {item.unit === 'DAYS' ? 'days' : 'hours'}</span>
              ),
              align: 'right' as const,
            },
            {
              key: 'status',
              label: 'Status',
              render: (item: LeaveRequest) => <StatusBadge status={item.status} />,
            },
            {
              key: 'createdAt',
              label: 'Submitted',
              render: (item: LeaveRequest) => (
                <span className="text-[12px] text-[#64748B]">{new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              ),
            },
          ]}
          data={requests}
          page={page}
          totalPages={totalPages}
          total={totalCount}
          limit={15}
          onPageChange={setPage}
        />
      )}
    </>
  );

  const renderBalances = () => (
    loading ? (
      <TableSkeleton rows={6} cols={8} />
    ) : balances.length === 0 ? (
      <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
        <EmptyState icon={FileText} title="No leave balances found" description="Leave balances will appear here once leave policies are configured." />
      </div>
    ) : (
      <DataTable
        columns={[
          {
            key: 'leaveType',
            label: 'Leave Type',
            render: (item: LeaveBalance) => (
              <span className="text-[13px] font-medium text-[#0F172A]">{item.leaveType?.name || '—'}</span>
            ),
          },
          {
            key: 'entitled',
            label: 'Entitled',
            render: (item: LeaveBalance) => (
              <span className="text-[13px] text-[#475569]">{item.opening + item.accrued}</span>
            ),
            align: 'right' as const,
          },
          {
            key: 'used',
            label: 'Used',
            render: (item: LeaveBalance) => (
              <span className="text-[13px] text-red-600">{item.used}</span>
            ),
            align: 'right' as const,
          },
          {
            key: 'pending',
            label: 'Pending',
            render: (item: LeaveBalance) => (
              <span className="text-[13px] text-amber-600">{item.pending}</span>
            ),
            align: 'right' as const,
          },
          {
            key: 'carryForward',
            label: 'Carry Forward',
            render: (item: LeaveBalance) => (
              <span className="text-[13px] text-[#475569]">{item.carryForward || 0}</span>
            ),
            align: 'right' as const,
          },
          {
            key: 'remaining',
            label: 'Remaining',
            render: (item: LeaveBalance) => (
              <span className="text-[13px] font-semibold text-emerald-600">{item.remaining}</span>
            ),
            align: 'right' as const,
          },
        ]}
        data={balances}
      />
    )
  );

  const renderTypes = () => (
    loading ? (
      <TableSkeleton rows={5} cols={6} />
    ) : leaveTypes.length === 0 ? (
      <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
        <EmptyState icon={Settings} title="No leave types configured" description="Leave types will appear here once configured by an administrator." />
      </div>
    ) : (
      <DataTable
        columns={[
          {
            key: 'name',
            label: 'Name',
            render: (item: LeaveType) => (
              <span className="text-[13px] font-medium text-[#0F172A]">{item.name}</span>
            ),
          },
          {
            key: 'code',
            label: 'Code',
            render: (item: LeaveType) => (
              <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[11px] font-mono text-[#475569]">{item.code}</span>
            ),
          },
          {
            key: 'isPaid',
            label: 'Paid/Unpaid',
            render: (item: LeaveType) => (
              <StatusBadge status={item.isPaid ? 'PAID' : 'UNPAID'} variant={item.isPaid ? 'success' : 'default'} />
            ),
          },
          {
            key: 'requiresApproval',
            label: 'Approval Required',
            render: (item: LeaveType) => (
              <span className="text-[13px] text-[#475569]">{item.requiresApproval ? 'Yes' : 'No'}</span>
            ),
          },
          {
            key: 'defaultDaysPerYear',
            label: 'Days/Year',
            render: (item: LeaveType) => (
              <span className="text-[13px] font-medium text-[#0F172A]">{item.defaultDaysPerYear || '—'}</span>
            ),
            align: 'right' as const,
          },
          {
            key: 'status',
            label: 'Status',
            render: (item: LeaveType) => <StatusBadge status={item.status} />,
          },
        ]}
        data={leaveTypes}
      />
    )
  );

  const renderCalendar = () => {
    const today = new Date();
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const monthLabel = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const prevMonth = () => {
      if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(calendarYear - 1); }
      else setCalendarMonth(calendarMonth - 1);
    };
    const nextMonth = () => {
      if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(calendarYear + 1); }
      else setCalendarMonth(calendarMonth + 1);
    };
    const goToday = () => { setCalendarMonth(today.getMonth()); setCalendarYear(today.getFullYear()); };

    const getEventsForDay = (day: number) => {
      const dateStr = new Date(calendarYear, calendarMonth, day);
      const events: { type: 'leave' | 'holiday'; name: string; status?: string; subtitle?: string }[] = [];
      // Find leave requests that overlap this day
      for (const req of calendarRequests) {
        const start = new Date(req.startDate);
        const end = new Date(req.endDate);
        if (dateStr >= start && dateStr <= end) {
          events.push({
            type: 'leave',
            name: `${req.employee?.firstName} ${req.employee?.lastName?.charAt(0)}.`,
            status: req.status,
            subtitle: req.leaveType?.name,
          });
        }
      }
      // Find holidays on this day
      for (const h of calendarHolidays) {
        const hDate = new Date(h.date);
        if (hDate.getFullYear() === calendarYear && hDate.getMonth() === calendarMonth && hDate.getDate() === day) {
          events.push({ type: 'holiday', name: h.name });
        }
      }
      return events;
    };

    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="rounded-lg border border-[#E2E8F0] bg-white">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]">&lt;</button>
            <h3 className="text-[14px] font-semibold text-[#0F172A] min-w-[160px] text-center">{monthLabel}</h3>
            <button onClick={nextMonth} className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]">&gt;</button>
            <button onClick={goToday} className="inline-flex h-7 items-center gap-1 rounded border border-[#E2E8F0] px-2 text-[11px] font-medium text-[#64748B] hover:bg-[#F8FAFC]">Today</button>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[#64748B]">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Approved</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Pending</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-500" /> Holiday</span>
          </div>
        </div>
        {calendarLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E2E8F0] border-t-[#2563EB]" />
              <p className="text-[12px] text-[#64748B]">Loading calendar...</p>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-7 gap-px">
              {dayHeaders.map(d => (
                <div key={d} className="py-2 text-center text-[11px] font-medium text-[#64748B] uppercase tracking-wider">{d}</div>
              ))}
              {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} className="min-h-[80px] bg-[#FAFBFC]" />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isToday = day === today.getDate() && calendarMonth === today.getMonth() && calendarYear === today.getFullYear();
                const events = getEventsForDay(day);
                return (
                  <div key={day} className={`min-h-[80px] border-t border-[#F1F5F9] p-1.5 ${isToday ? 'bg-[#EFF6FF]' : ''}`}>
                    <p className={`text-[12px] font-medium ${isToday ? 'text-[#2563EB]' : 'text-[#0F172A]'}`}>{day}</p>
                    <div className="mt-0.5 space-y-0.5">
                      {events.slice(0, 3).map((ev, j) => (
                        <div key={j} className={`rounded px-1 py-0.5 text-[9px] font-medium truncate ${
                          ev.type === 'holiday' ? 'bg-purple-50 text-purple-700' :
                          ev.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                          ev.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-700'
                        }`} title={ev.type === 'holiday' ? ev.name : `${ev.name} — ${ev.subtitle || 'Leave'}`}>
                          {ev.name}
                        </div>
                      ))}
                      {events.length > 3 && (
                        <p className="text-[9px] text-[#94A3B8]">+{events.length - 3} more</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPolicies = () => (
    loading ? (
      <TableSkeleton rows={5} cols={7} />
    ) : policies.length === 0 ? (
      <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
        <EmptyState icon={Shield} title="No leave policies found" description="Leave policies will appear here once configured by an administrator." />
      </div>
    ) : (
      <DataTable
        columns={[
          {
            key: 'name',
            label: 'Policy Name',
            render: (item: LeavePolicy) => (
              <span className="text-[13px] font-medium text-[#0F172A]">{item.name}</span>
            ),
          },
          {
            key: 'leaveType',
            label: 'Leave Type',
            render: (item: LeavePolicy) => (
              <span className="text-[13px] text-[#475569]">{item.leaveType?.name || '—'}</span>
            ),
          },
          {
            key: 'entitlementDays',
            label: 'Entitlement',
            render: (item: LeavePolicy) => (
              <span className="text-[13px] font-medium text-[#0F172A]">{item.entitlementDays} days</span>
            ),
            align: 'right' as const,
          },
          {
            key: 'accrualFrequency',
            label: 'Accrual',
            render: (item: LeavePolicy) => (
              <span className="text-[13px] text-[#475569]">{item.accrualFrequency || '—'}</span>
            ),
          },
          {
            key: 'carryForwardAllowed',
            label: 'Carry Forward',
            render: (item: LeavePolicy) => (
              <StatusBadge status={item.carryForwardAllowed ? 'YES' : 'NO'} variant={item.carryForwardAllowed ? 'success' : 'default'} />
            ),
          },
          {
            key: 'noticePeriodDays',
            label: 'Notice Period',
            render: (item: LeavePolicy) => (
              <span className="text-[13px] text-[#475569]">{item.noticePeriodDays} days</span>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            render: (item: LeavePolicy) => <StatusBadge status={item.status} />,
          },
        ]}
        data={policies}
      />
    )
  );

  /* ── Main Render ────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <PageHeader
        title="Leave"
        description="Manage employee leave, balances and approvals"
        breadcrumbs={[{ label: 'People' }, { label: 'Leave' }]}
        actions={
          <button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#2563EB] px-3 text-[12px] font-medium text-white hover:bg-[#1D4ED8] transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Request Leave
          </button>
        }
      />

      <div className="px-5 py-4 lg:px-6">
        {/* KPI Row */}
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpiLoading ? (
            Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
          ) : (
            <>
              <KpiCard label="Total Requests" value={kpis.total} icon={FileText} iconBg="bg-[#EFF6FF]" iconColor="text-[#2563EB]" />
              <KpiCard label="Pending" value={kpis.pending} icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-600" />
              <KpiCard label="Approved" value={kpis.approved} icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
              <KpiCard label="Rejected" value={kpis.rejected} icon={XCircle} iconBg="bg-red-50" iconColor="text-red-600" />
            </>
          )}
        </div>

        {/* Tabs */}
        <Tabs tabs={LEAVE_TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        <div className="pt-3">
          {activeTab === 'requests' && renderRequests()}
          {activeTab === 'balances' && renderBalances()}
          {activeTab === 'calendar' && renderCalendar()}
          {activeTab === 'types' && renderTypes()}
          {activeTab === 'policies' && renderPolicies()}
        </div>
      </div>
    </div>
  );
}
