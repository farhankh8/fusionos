'use client';

/**
 * FusionOS — Employee Profile
 *
 * Canonical employee profile page.
 * Every employee-related module links back here.
 *
 * Tabs: Overview, Employment, Attendance, Leave, Payroll, Payslips
 */

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { KpiSkeleton, TableSkeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import {
  User, Briefcase, Clock, CalendarOff, Wallet, Receipt,
  Edit, MoreHorizontal, Mail, Phone, MapPin, Building2,
  ChevronRight, ArrowRight, Calendar, Users, Shield,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────────── */

interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  preferredName?: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  address?: { line1?: string; line2?: string; city?: string; state?: string; country?: string; postalCode?: string };
  branchId?: string;
  departmentId?: string;
  teamId?: string;
  designationId?: string;
  managerId?: string;
  employmentStatus: string;
  employmentType?: string;
  workLocation?: string;
  timezone?: string;
  joiningDate: string;
  probationEndDate?: string;
  confirmationDate?: string;
  terminationDate?: string;
  currency?: string;
  basicSalary?: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  notes?: string;
  company?: { id: string; name: string; code?: string };
  branch?: { id: string; name: string; code?: string };
  department?: { id: string; name: string; code?: string };
  team?: { id: string; name: string; code?: string };
  designation?: { id: string; name: string; code?: string; level?: string };
  manager?: { id: string; firstName: string; lastName: string; employeeCode: string; email: string };
  directReports?: { id: string; firstName: string; lastName: string; employeeCode: string; designation?: { name: string } }[];
  employmentHistory?: { id: string; action: string; effectiveDate: string; notes?: string }[];
  createdAt: string;
  updatedAt: string;
}

interface AttendanceRecord {
  id: string; date: string; status: string; firstClockIn?: string; lastClockOut?: string;
  totalWorkedMinutes: number; totalBreakMinutes: number; overtimeMinutes: number;
}

interface LeaveRequest {
  id: string; leaveType?: { name: string }; startDate: string; endDate: string;
  duration: number; unit: string; status: string; createdAt: string;
}

interface PayrollLine {
  id: string; period?: { name: string }; grossAmount: number; totalDeductions: number;
  netAmount: number; currency: string; status: string;
}

const PROFILE_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'employment', label: 'Employment' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'leave', label: 'Leave' },
  { id: 'payroll', label: 'Payroll' },
  { id: 'payslips', label: 'Payslips' },
];

const STATUS_MAP: Record<string, string> = {
  ACTIVE: 'success', PROBATION: 'warning', ON_LEAVE: 'info', SUSPENDED: 'warning',
  TERMINATED: 'danger', RESIGNED: 'danger', RETIRED: 'default', INACTIVE: 'default', DRAFT: 'default',
};

/* ── Main Component ────────────────────────────────────────────────────── */

export default function EmployeeProfilePage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const employeeId = params.id;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Tab data
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [payslips, setPayslips] = useState<PayrollLine[]>([]);
  const [payslipLoading, setPayslipLoading] = useState(false);

  const fetchEmployee = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<Employee>(`/employees/${employeeId}`);
      setEmployee(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load employee';
      if (msg.includes('404')) setError('Employee not found');
      else if (msg.includes('403')) setError('You do not have permission to view this employee');
      else if (msg.includes('401')) setError('Please log in to view this employee');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { fetchEmployee(); }, [fetchEmployee]);

  // Tab data fetching
  useEffect(() => {
    if (!employee) return;
    if (activeTab === 'attendance') {
      setAttendanceLoading(true);
      apiClient.get<{ data: AttendanceRecord[] }>('/attendance', { employeeId, limit: '20' })
        .then(d => setAttendance(d.data || []))
        .catch(() => setAttendance([]))
        .finally(() => setAttendanceLoading(false));
    }
    if (activeTab === 'leave') {
      setLeaveLoading(true);
      apiClient.get<{ data: LeaveRequest[] }>('/leave/requests', { employeeId, limit: '20' })
        .then(d => setLeaveRequests(d.data || []))
        .catch(() => setLeaveRequests([]))
        .finally(() => setLeaveLoading(false));
    }
    if (activeTab === 'payslips') {
      setPayslipLoading(true);
      apiClient.get<{ data: PayrollLine[] }>('/payroll/payslips', { employeeId, limit: '20' })
        .then(d => setPayslips(d.data || []))
        .catch(() => setPayslips([]))
        .finally(() => setPayslipLoading(false));
    }
  }, [activeTab, employee, employeeId]);

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

  const formatMoney = (amount: number, currency: string = 'USD') => {
    if (!amount && amount !== 0) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount / 100);
  };

  if (error) {
    return (
      <div className="min-h-full bg-[#F8FAFC]">
        <PageHeader title="Employee Profile" description="View employee details" breadcrumbs={[{ label: 'People' }, { label: 'Employees' }]} />
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="text-center">
            <User className="mx-auto h-10 w-10 text-[#E2E8F0]" strokeWidth={1.5} />
            <p className="mt-3 text-[14px] font-medium text-[#0F172A]">{error}</p>
            <button onClick={() => router.push('/people/employees')} className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#2563EB] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#1D4ED8]">
              Back to Employees
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !employee) {
    return (
      <div className="min-h-full bg-[#F8FAFC]">
        <PageHeader title="Loading..." breadcrumbs={[{ label: 'People' }, { label: 'Employees' }]} />
        <div className="p-5 lg:p-6">
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}</div>
          <TableSkeleton rows={5} cols={4} />
        </div>
      </div>
    );
  }

  const initials = `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`;

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      {/* ── Profile Header ─────────────────────────────────────────── */}
      <div className="border-b border-[#E2E8F0] bg-white">
        <div className="px-5 py-4 lg:px-6">
          <div className="flex items-center gap-1.5 text-[12px] text-[#64748B] mb-2">
            <span>People</span><span>/</span>
            <button onClick={() => router.push('/people/employees')} className="hover:text-[#0F172A] transition-colors">Employees</button>
            <span>/</span>
            <span className="font-medium text-[#0F172A]">{employee.firstName} {employee.lastName}</span>
          </div>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2563EB] text-[18px] font-semibold text-white shrink-0">
                {initials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[18px] font-semibold text-[#0F172A]">
                    {employee.firstName} {employee.lastName}
                  </h1>
                  {employee.preferredName && (
                    <span className="text-[12px] text-[#64748B]">({employee.preferredName})</span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-[12px] text-[#64748B]">
                  <span className="font-mono">{employee.employeeCode}</span>
                  {employee.designation?.name && <span>· {employee.designation.name}</span>}
                  {employee.department?.name && <span>· {employee.department.name}</span>}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <StatusBadge status={employee.employmentStatus} variant={STATUS_MAP[employee.employmentStatus] as 'success' | 'warning' | 'danger' | 'info' | 'default'} />
                  {employee.branch?.name && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#64748B]">
                      <MapPin className="h-3 w-3" /> {employee.branch.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/people/employees/${employeeId}/edit`)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#2563EB] px-3 text-[12px] font-medium text-white hover:bg-[#1D4ED8] transition-colors"
              >
                <Edit className="h-3.5 w-3.5" /> Edit
              </button>
              <button className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] transition-colors">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div className="px-5 lg:px-6">
        <Tabs tabs={PROFILE_TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* ── Tab Content ───────────────────────────────────────────── */}
      <div className="px-5 py-4 lg:px-6">
        {/* ── Overview ──────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <InfoCard title="Personal Information" icon={User} items={[
              { label: 'Full Name', value: [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(' ') },
              { label: 'Email', value: employee.email },
              { label: 'Phone', value: employee.phone },
              { label: 'Date of Birth', value: employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : undefined },
              { label: 'Gender', value: employee.gender?.replace(/_/g, ' ') },
              { label: 'Marital Status', value: employee.maritalStatus?.replace(/_/g, ' ') },
              { label: 'Nationality', value: employee.nationality },
            ]} />

            <InfoCard title="Employment" icon={Briefcase} items={[
              { label: 'Company', value: employee.company?.name },
              { label: 'Branch', value: employee.branch?.name },
              { label: 'Department', value: employee.department?.name },
              { label: 'Team', value: employee.team?.name },
              { label: 'Designation', value: employee.designation?.name },
              { label: 'Manager', value: employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : undefined },
              { label: 'Type', value: employee.employmentType?.replace(/_/g, ' ') },
              { label: 'Joining Date', value: employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : undefined },
            ]} />

            <InfoCard title="Contact" icon={Phone} items={[
              { label: 'Work Email', value: employee.email },
              { label: 'Phone', value: employee.phone },
              { label: 'Address', value: employee.address ? [employee.address.line1, employee.address.city, employee.address.state, employee.address.country].filter(Boolean).join(', ') : undefined },
            ]} />

            <InfoCard title="Emergency Contact" icon={Shield} items={[
              { label: 'Name', value: employee.emergencyContactName },
              { label: 'Relationship', value: employee.emergencyContactRelation },
              { label: 'Phone', value: employee.emergencyContactPhone },
            ]} />

            {(employee.basicSalary || employee.currency) && (
              <InfoCard title="Compensation" icon={Wallet} items={[
                { label: 'Currency', value: employee.currency },
                { label: 'Basic Salary', value: employee.basicSalary ? formatMoney(employee.basicSalary, employee.currency || 'USD') : undefined },
                { label: 'Effective Date', value: employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : undefined },
              ]} />
            )}

            {employee.directReports && employee.directReports.length > 0 && (
              <InfoCard title={`Direct Reports (${employee.directReports.length})`} icon={Users} items={employee.directReports.map(r => ({
                label: r.employeeCode,
                value: `${r.firstName} ${r.lastName}${r.designation?.name ? ` · ${r.designation.name}` : ''}`,
              }))} />
            )}

            {employee.employmentHistory && employee.employmentHistory.length > 0 && (
              <div className="rounded-lg border border-[#E2E8F0] bg-white lg:col-span-2">
                <div className="border-b border-[#E2E8F0] px-4 py-3">
                  <h3 className="text-[13px] font-semibold text-[#0F172A]">Recent Activity</h3>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    {employee.employmentHistory.slice(0, 5).map(h => (
                      <div key={h.id} className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EFF6FF]">
                          <Clock className="h-3.5 w-3.5 text-[#2563EB]" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[13px] text-[#0F172A]">{h.action.replace(/_/g, ' ')}</p>
                          <p className="text-[11px] text-[#94A3B8]">{new Date(h.effectiveDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Employment ────────────────────────────────────────── */}
        {activeTab === 'employment' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <InfoCard title="Organization" icon={Building2} items={[
              { label: 'Company', value: employee.company?.name },
              { label: 'Branch', value: employee.branch?.name },
              { label: 'Department', value: employee.department?.name },
              { label: 'Team', value: employee.team?.name },
              { label: 'Designation', value: employee.designation?.name },
              { label: 'Reporting Manager', value: employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName} (${employee.manager.employeeCode})` : undefined },
            ]} />
            <InfoCard title="Employment Details" icon={Briefcase} items={[
              { label: 'Employment Type', value: employee.employmentType?.replace(/_/g, ' ') },
              { label: 'Status', value: employee.employmentStatus?.replace(/_/g, ' ') },
              { label: 'Work Location', value: employee.workLocation },
              { label: 'Timezone', value: employee.timezone },
              { label: 'Joining Date', value: employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : undefined },
              { label: 'Probation End', value: employee.probationEndDate ? new Date(employee.probationEndDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : undefined },
              { label: 'Confirmation Date', value: employee.confirmationDate ? new Date(employee.confirmationDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : undefined },
            ]} />
          </div>
        )}

        {/* ── Attendance ────────────────────────────────────────── */}
        {activeTab === 'attendance' && (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiCard label="Total Records" value={attendance.length} icon={Clock} iconBg="bg-[#EFF6FF]" iconColor="text-[#2563EB]" />
              <KpiCard label="Present" value={attendance.filter(a => a.status === 'PRESENT').length} icon={Clock} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
              <KpiCard label="Absent" value={attendance.filter(a => a.status === 'ABSENT').length} icon={Clock} iconBg="bg-red-50" iconColor="text-red-600" />
              <KpiCard label="Overtime" value={formatDuration(attendance.reduce((s, a) => s + (a.overtimeMinutes || 0), 0))} icon={Clock} iconBg="bg-purple-50" iconColor="text-purple-600" />
            </div>
            {attendanceLoading ? (
              <TableSkeleton rows={5} cols={6} />
            ) : attendance.length === 0 ? (
              <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
                <EmptyState icon={Clock} title="No attendance records" description="No attendance data found for this employee." />
              </div>
            ) : (
              <DataTable
                columns={[
                  { key: 'date', label: 'Date', render: (r: AttendanceRecord) => <span className="text-[13px] text-[#475569]">{new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span> },
                  { key: 'clockIn', label: 'Clock In', render: (r: AttendanceRecord) => <span className="text-[13px] font-medium text-emerald-600">{formatTime(r.firstClockIn)}</span> },
                  { key: 'clockOut', label: 'Clock Out', render: (r: AttendanceRecord) => <span className="text-[13px] font-medium text-red-600">{formatTime(r.lastClockOut)}</span> },
                  { key: 'worked', label: 'Worked', render: (r: AttendanceRecord) => <span className="text-[13px] font-semibold text-[#0F172A]">{formatDuration(r.totalWorkedMinutes)}</span>, align: 'right' as const },
                  { key: 'overtime', label: 'Overtime', render: (r: AttendanceRecord) => <span className="text-[13px] text-purple-600">{r.overtimeMinutes > 0 ? formatDuration(r.overtimeMinutes) : '—'}</span>, align: 'right' as const },
                  { key: 'status', label: 'Status', render: (r: AttendanceRecord) => <StatusBadge status={r.status} /> },
                ]}
                data={attendance}
                onRowClick={(r) => router.push(`/people/attendance/${r.id}`)}
              />
            )}
          </>
        )}

        {/* ── Leave ─────────────────────────────────────────────── */}
        {activeTab === 'leave' && (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiCard label="Total Requests" value={leaveRequests.length} icon={CalendarOff} iconBg="bg-[#EFF6FF]" iconColor="text-[#2563EB]" />
              <KpiCard label="Pending" value={leaveRequests.filter(l => l.status === 'PENDING').length} icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-600" />
              <KpiCard label="Approved" value={leaveRequests.filter(l => l.status === 'APPROVED').length} icon={CalendarOff} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
              <KpiCard label="Rejected" value={leaveRequests.filter(l => l.status === 'REJECTED').length} icon={CalendarOff} iconBg="bg-red-50" iconColor="text-red-600" />
            </div>
            {leaveLoading ? (
              <TableSkeleton rows={5} cols={5} />
            ) : leaveRequests.length === 0 ? (
              <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
                <EmptyState icon={CalendarOff} title="No leave requests" description="No leave requests found for this employee." />
              </div>
            ) : (
              <DataTable
                columns={[
                  { key: 'leaveType', label: 'Type', render: (r: LeaveRequest) => <span className="text-[13px] font-medium text-[#0F172A]">{r.leaveType?.name || '—'}</span> },
                  { key: 'startDate', label: 'Start', render: (r: LeaveRequest) => <span className="text-[13px] text-[#475569]">{new Date(r.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span> },
                  { key: 'endDate', label: 'End', render: (r: LeaveRequest) => <span className="text-[13px] text-[#475569]">{new Date(r.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span> },
                  { key: 'duration', label: 'Duration', render: (r: LeaveRequest) => <span className="text-[13px] font-medium text-[#0F172A]">{r.duration} {r.unit === 'DAYS' ? 'days' : 'hrs'}</span>, align: 'right' as const },
                  { key: 'status', label: 'Status', render: (r: LeaveRequest) => <StatusBadge status={r.status} /> },
                ]}
                data={leaveRequests}
              />
            )}
          </>
        )}

        {/* ── Payroll ──────────────────────────────────────────── */}
        {activeTab === 'payroll' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <InfoCard title="Current Compensation" icon={Wallet} items={[
              { label: 'Currency', value: employee.currency },
              { label: 'Basic Salary', value: employee.basicSalary ? formatMoney(employee.basicSalary, employee.currency || 'USD') : undefined },
              { label: 'Effective Date', value: employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : undefined },
            ]} />
            <div className="rounded-lg border border-[#E2E8F0] bg-white">
              <div className="border-b border-[#E2E8F0] px-4 py-3">
                <h3 className="text-[13px] font-semibold text-[#0F172A]">Payroll History</h3>
              </div>
              <div className="p-8 text-center">
                <Wallet className="mx-auto h-8 w-8 text-[#E2E8F0]" strokeWidth={1.5} />
                <p className="mt-2 text-[13px] text-[#64748B]">Payroll history will appear here once processed.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Payslips ─────────────────────────────────────────── */}
        {activeTab === 'payslips' && (
          <>
            {payslipLoading ? (
              <TableSkeleton rows={5} cols={5} />
            ) : payslips.length === 0 ? (
              <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
                <EmptyState icon={Receipt} title="No payslips" description="Payslips will appear here once payroll runs are finalized." />
              </div>
            ) : (
              <DataTable
                columns={[
                  { key: 'period', label: 'Period', render: (p: PayrollLine) => <span className="text-[13px] font-medium text-[#0F172A]">{p.period?.name || '—'}</span> },
                  { key: 'grossAmount', label: 'Gross', render: (p: PayrollLine) => <span className="text-[13px] text-[#475569]">{formatMoney(p.grossAmount, p.currency)}</span>, align: 'right' as const },
                  { key: 'totalDeductions', label: 'Deductions', render: (p: PayrollLine) => <span className="text-[13px] text-red-600">{formatMoney(p.totalDeductions, p.currency)}</span>, align: 'right' as const },
                  { key: 'netAmount', label: 'Net', render: (p: PayrollLine) => <span className="text-[13px] font-semibold text-[#0F172A]">{formatMoney(p.netAmount, p.currency)}</span>, align: 'right' as const },
                  { key: 'status', label: 'Status', render: (p: PayrollLine) => <StatusBadge status={p.status} /> },
                ]}
                data={payslips}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── InfoCard Sub-component ─────────────────────────────────────────────── */

function InfoCard({
  title, icon: Icon, items,
}: {
  title: string; icon: React.ComponentType<{ className?: string }>;
  items: { label: string; value: string | undefined }[];
}) {
  const visible = items.filter(i => i.value);
  if (visible.length === 0) return null;
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white">
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] px-4 py-3">
        <Icon className="h-4 w-4 text-[#64748B]" />
        <h3 className="text-[13px] font-semibold text-[#0F172A]">{title}</h3>
      </div>
      <div className="p-4 space-y-2.5">
        {visible.map(item => (
          <div key={item.label} className="flex items-baseline justify-between gap-4">
            <span className="text-[12px] text-[#94A3B8] shrink-0">{item.label}</span>
            <span className="text-[13px] font-medium text-[#0F172A] text-right">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
