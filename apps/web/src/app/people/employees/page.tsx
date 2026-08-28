'use client';

/**
 * FusionOS Employee List Page
 *
 * Production-oriented employee listing with:
 * - Search by name, email, employee code, phone
 * - Filter by department, branch, team, designation, status
 * - Pagination with page controls
 * - Sorting
 * - Employee profile view with tabs
 */

import { useState, useEffect, useCallback } from 'react';
import {
  UserPlus,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Users,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Clock,
  FileText,
  DollarSign,
  FolderKanban,
  User,
  History,
} from 'lucide-react';

interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  preferredName?: string;
  email: string;
  phone?: string;
  gender?: string;
  employmentStatus: string;
  employmentType?: string;
  joiningDate: string;
  branch?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
  team?: { id: string; name: string } | null;
  designation?: { id: string; name: string } | null;
  manager?: { id: string; firstName: string; lastName: string; employeeCode: string } | null;
  createdAt: string;
}

interface EmployeeProfile extends Employee {
  company?: { id: string; name: string; code: string };
  preferredName?: string;
  middleName?: string;
  dateOfBirth?: string;
  nationality?: string;
  address?: Record<string, string>;
  workLocation?: string;
  timezone?: string;
  notes?: string;
  currency?: string;
  basicSalary?: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  probationEndDate?: string;
  confirmationDate?: string;
  terminationDate?: string;
  userId?: string;
  directReports?: Array<{ id: string; employeeCode: string; firstName: string; lastName: string; designation?: { name: string } }>;
  employmentHistory?: Array<{
    id: string;
    action: string;
    effectiveDate: string;
    reason?: string;
    notes?: string;
    createdAt: string;
  }>;
  user?: { id: string; email: string; firstName: string; lastName: string; status: string };
}

interface PaginationMeta {
  page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrevious: boolean;
}

type ProfileTab = 'overview' | 'personal' | 'employment' | 'history';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    departmentId: '',
    branchId: '',
    teamId: '',
    designationId: '',
  });
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (search) params.set('search', search);
      if (filters.status) params.set('status', filters.status);
      if (filters.departmentId) params.set('departmentId', filters.departmentId);
      if (filters.branchId) params.set('branchId', filters.branchId);
      if (filters.teamId) params.set('teamId', filters.teamId);
      if (filters.designationId) params.set('designationId', filters.designationId);
      const res = await fetch(`http://localhost:3001/api/v1/employees?${params}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setEmployees(data.data ?? []);
      setMeta(data.meta ?? null);
    } catch { setEmployees([]); } finally { setLoading(false); }
  }, [page, search, filters]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const fetchProfile = useCallback(async (id: string) => {
    try {
      setProfileLoading(true);
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
      const res = await fetch(`http://localhost:3001/api/v1/employees/${id}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setSelectedEmployee(data);
      setActiveTab('overview');
    } catch { /* ignore */ } finally { setProfileLoading(false); }
  }, []);

  const clearFilters = () => {
    setFilters({ status: '', departmentId: '', branchId: '', teamId: '', designationId: '' });
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-success/10 text-success';
      case 'PROBATION': return 'bg-warning/10 text-warning';
      case 'ON_LEAVE': return 'bg-info/10 text-info';
      case 'SUSPENDED': return 'bg-destructive/10 text-destructive';
      case 'TERMINATED': case 'RESIGNED': case 'INACTIVE': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // ── Employee Profile View ──────────────────────────────────────────────────
  if (selectedEmployee) {
    return (
      <div className="min-h-full bg-background">
        <div className="p-4 lg:p-6">
          {/* Back Button */}
          <button
            onClick={() => setSelectedEmployee(null)}
            className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to employees
          </button>

          {profileLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-[13px] text-muted-foreground">Loading profile...</div>
            </div>
          ) : (
            <>
              {/* Profile Header */}
              <div className="mb-4 rounded-lg border border-border p-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-[14px] font-semibold text-primary">
                    {selectedEmployee.firstName[0]}{selectedEmployee.lastName[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h1 className="text-base font-semibold text-foreground">
                        {selectedEmployee.preferredName || selectedEmployee.firstName} {selectedEmployee.lastName}
                      </h1>
                      <span className={`inline-flex h-5 items-center rounded px-1.5 text-[10px] font-medium ${getStatusColor(selectedEmployee.employmentStatus)}`}>
                        {selectedEmployee.employmentStatus.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[13px] text-muted-foreground">{selectedEmployee.employeeCode} · {selectedEmployee.email}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-[12px] text-muted-foreground">
                      {selectedEmployee.designation && (
                        <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{selectedEmployee.designation.name}</span>
                      )}
                      {selectedEmployee.department && (
                        <span className="flex items-center gap-1"><Layers className="h-3 w-3" />{selectedEmployee.department.name}</span>
                      )}
                      {selectedEmployee.branch && (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{selectedEmployee.branch.name}</span>
                      )}
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Joined {new Date(selectedEmployee.joiningDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="mb-4 flex gap-1 border-b border-border">
                {(['overview', 'personal', 'employment', 'history'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-2 text-[13px] font-medium capitalize transition-colors ${
                      activeTab === tab
                        ? 'border-b-2 border-primary text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
                {/* Future tabs - clearly marked */}
                <span className="px-3 py-2 text-[11px] text-muted-foreground/50">Attendance</span>
                <span className="px-3 py-2 text-[11px] text-muted-foreground/50">Leave</span>
                <span className="px-3 py-2 text-[11px] text-muted-foreground/50">Payroll</span>
                <span className="px-3 py-2 text-[11px] text-muted-foreground/50">Documents</span>
              </div>

              {/* Tab Content */}
              {activeTab === 'overview' && (
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-lg border border-border">
                    <div className="border-b border-border px-4 py-2.5">
                      <h2 className="text-[13px] font-semibold text-foreground">Contact</h2>
                    </div>
                    <div className="divide-y divide-border">
                      <ProfileInfoRow icon={Mail} label="Email" value={selectedEmployee.email} />
                      {selectedEmployee.phone && <ProfileInfoRow icon={Phone} label="Phone" value={selectedEmployee.phone} />}
                      {selectedEmployee.timezone && <ProfileInfoRow icon={Clock} label="Timezone" value={selectedEmployee.timezone} />}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border">
                    <div className="border-b border-border px-4 py-2.5">
                      <h2 className="text-[13px] font-semibold text-foreground">Employment</h2>
                    </div>
                    <div className="divide-y divide-border">
                      <ProfileInfoRow icon={Briefcase} label="Type" value={selectedEmployee.employmentType?.replace('_', ' ') ?? '—'} />
                      <ProfileInfoRow icon={Calendar} label="Joined" value={new Date(selectedEmployee.joiningDate).toLocaleDateString()} />
                      {selectedEmployee.manager && (
                        <ProfileInfoRow icon={User} label="Reports to" value={`${selectedEmployee.manager.firstName} ${selectedEmployee.manager.lastName}`} />
                      )}
                      {selectedEmployee.workLocation && <ProfileInfoRow icon={MapPin} label="Work Location" value={selectedEmployee.workLocation} />}
                    </div>
                  </div>
                  {selectedEmployee.directReports && selectedEmployee.directReports.length > 0 && (
                    <div className="lg:col-span-2 rounded-lg border border-border">
                      <div className="border-b border-border px-4 py-2.5">
                        <h2 className="text-[13px] font-semibold text-foreground">Direct Reports ({selectedEmployee.directReports.length})</h2>
                      </div>
                      <div className="divide-y divide-border">
                        {selectedEmployee.directReports.map((report) => (
                          <div key={report.id} className="flex items-center gap-3 px-4 py-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                              {report.firstName[0]}{report.lastName[0]}
                            </div>
                            <div>
                              <p className="text-[13px] font-medium text-foreground">{report.firstName} {report.lastName}</p>
                              <p className="text-[11px] text-muted-foreground">{report.employeeCode} · {report.designation?.name ?? 'No designation'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'personal' && (
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-lg border border-border">
                    <div className="border-b border-border px-4 py-2.5">
                      <h2 className="text-[13px] font-semibold text-foreground">Personal Information</h2>
                    </div>
                    <div className="divide-y divide-border">
                      <ProfileInfoRow label="Full Name" value={`${selectedEmployee.firstName} ${selectedEmployee.middleName ? selectedEmployee.middleName + ' ' : ''}${selectedEmployee.lastName}`} />
                      {selectedEmployee.preferredName && <ProfileInfoRow label="Preferred Name" value={selectedEmployee.preferredName} />}
                      {selectedEmployee.gender && <ProfileInfoRow label="Gender" value={selectedEmployee.gender.replace('_', ' ')} />}
                      {selectedEmployee.dateOfBirth && <ProfileInfoRow label="Date of Birth" value={new Date(selectedEmployee.dateOfBirth).toLocaleDateString()} />}
                      {selectedEmployee.nationality && <ProfileInfoRow label="Nationality" value={selectedEmployee.nationality} />}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border">
                    <div className="border-b border-border px-4 py-2.5">
                      <h2 className="text-[13px] font-semibold text-foreground">Emergency Contact</h2>
                    </div>
                    <div className="divide-y divide-border">
                      {selectedEmployee.emergencyContactName ? (
                        <>
                          <ProfileInfoRow label="Name" value={selectedEmployee.emergencyContactName} />
                          {selectedEmployee.emergencyContactPhone && <ProfileInfoRow icon={Phone} label="Phone" value={selectedEmployee.emergencyContactPhone} />}
                          {selectedEmployee.emergencyContactRelation && <ProfileInfoRow label="Relationship" value={selectedEmployee.emergencyContactRelation} />}
                        </>
                      ) : (
                        <div className="px-4 py-4 text-[13px] text-muted-foreground">No emergency contact on file</div>
                      )}
                    </div>
                  </div>
                  {selectedEmployee.address && (
                    <div className="lg:col-span-2 rounded-lg border border-border">
                      <div className="border-b border-border px-4 py-2.5">
                        <h2 className="text-[13px] font-semibold text-foreground">Address</h2>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[13px] text-foreground">
                          {[selectedEmployee.address['line1'] as string, selectedEmployee.address['line2'] as string, selectedEmployee.address['city'] as string, selectedEmployee.address['state'] as string, selectedEmployee.address['postalCode'] as string, selectedEmployee.address['country'] as string].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'employment' && (
                <div className="rounded-lg border border-border">
                  <div className="border-b border-border px-4 py-2.5">
                    <h2 className="text-[13px] font-semibold text-foreground">Employment Details</h2>
                  </div>
                  <div className="divide-y divide-border">
                    <ProfileInfoRow label="Employee Code" value={selectedEmployee.employeeCode} />
                    <ProfileInfoRow label="Status" value={selectedEmployee.employmentStatus.replace('_', ' ')} />
                    <ProfileInfoRow label="Type" value={selectedEmployee.employmentType?.replace('_', ' ') ?? '—'} />
                    <ProfileInfoRow label="Company" value={selectedEmployee.company?.name ?? '—'} />
                    <ProfileInfoRow label="Branch" value={selectedEmployee.branch?.name ?? '—'} />
                    <ProfileInfoRow label="Department" value={selectedEmployee.department?.name ?? '—'} />
                    <ProfileInfoRow label="Team" value={selectedEmployee.team?.name ?? '—'} />
                    <ProfileInfoRow label="Designation" value={selectedEmployee.designation?.name ?? '—'} />
                    {selectedEmployee.manager && (
                      <ProfileInfoRow label="Reports To" value={`${selectedEmployee.manager.firstName} ${selectedEmployee.manager.lastName} (${selectedEmployee.manager.employeeCode})`} />
                    )}
                    <ProfileInfoRow label="Joining Date" value={new Date(selectedEmployee.joiningDate).toLocaleDateString()} />
                    {selectedEmployee.probationEndDate && <ProfileInfoRow label="Probation End" value={new Date(selectedEmployee.probationEndDate).toLocaleDateString()} />}
                    {selectedEmployee.confirmationDate && <ProfileInfoRow label="Confirmation Date" value={new Date(selectedEmployee.confirmationDate).toLocaleDateString()} />}
                    {selectedEmployee.terminationDate && <ProfileInfoRow label="Termination Date" value={new Date(selectedEmployee.terminationDate).toLocaleDateString()} />}
                    {selectedEmployee.user && (
                      <ProfileInfoRow label="User Account" value={`${selectedEmployee.user.email} (${selectedEmployee.user.status})`} />
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="rounded-lg border border-border">
                  <div className="border-b border-border px-4 py-2.5">
                    <h2 className="text-[13px] font-semibold text-foreground">Employment History</h2>
                  </div>
                  {selectedEmployee.employmentHistory && selectedEmployee.employmentHistory.length > 0 ? (
                    <div className="divide-y divide-border">
                      {selectedEmployee.employmentHistory.map((entry) => (
                        <div key={entry.id} className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <History className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-[13px] font-medium text-foreground capitalize">{entry.action.replace(/_/g, ' ')}</span>
                            <span className="text-[11px] text-muted-foreground">· {new Date(entry.effectiveDate).toLocaleDateString()}</span>
                          </div>
                          {entry.reason && <p className="mt-1 text-[12px] text-muted-foreground">{entry.reason}</p>}
                          {entry.notes && <p className="mt-0.5 text-[12px] text-muted-foreground italic">{entry.notes}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center text-[13px] text-muted-foreground">No history records</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Employee List View ─────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-background">
      <div className="p-4 lg:p-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-foreground">Employees</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Manage the canonical employee directory
            </p>
          </div>
          <button className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-[13px] font-medium text-primary-foreground hover:bg-primary/80">
            <UserPlus className="h-3.5 w-3.5" /> Add Employee
          </button>
        </div>

        {/* Search and Filters */}
        <div className="mb-3 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, code, email, phone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-medium transition-colors ${
              showFilters || hasActiveFilters
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {hasActiveFilters && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                {Object.values(filters).filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-3 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-medium text-foreground">Filter by</span>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" /> Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
              <select
                value={filters.status}
                onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
                className="h-7 rounded border border-border bg-background px-2 text-[12px] text-foreground"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PROBATION">Probation</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="TERMINATED">Terminated</option>
                <option value="RESIGNED">Resigned</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Employee</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Code</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Department</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Designation</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[13px] text-muted-foreground">Loading...</td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center">
                  <Users className="mx-auto h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
                  <p className="mt-1 text-[13px] text-muted-foreground">No employees found</p>
                </td></tr>
              ) : employees.map((emp) => (
                <tr
                  key={emp.id}
                  className="cursor-pointer transition-colors duration-120 hover:bg-muted/50"
                  onClick={() => fetchProfile(emp.id)}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                        {emp.firstName[0]}{emp.lastName[0]}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-foreground">
                          {emp.preferredName || emp.firstName} {emp.lastName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-[13px] text-muted-foreground font-mono">{emp.employeeCode}</td>
                  <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{emp.department?.name ?? '—'}</td>
                  <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{emp.designation?.name ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex h-5 items-center rounded px-1.5 text-[10px] font-medium ${getStatusColor(emp.employmentStatus)}`}>
                      {emp.employmentStatus.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[13px] text-muted-foreground">
                    {new Date(emp.joiningDate).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[12px] text-muted-foreground">
              Showing {((meta.page - 1) * meta.limit) + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => p - 1)} disabled={!meta.hasPrevious}
                className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted disabled:opacity-50">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 text-[12px] text-muted-foreground">{meta.page} / {meta.totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={!meta.hasNext}
                className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted disabled:opacity-50">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileInfoRow({ icon: Icon, label, value }: { icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />}
      <div className="min-w-0 flex-1">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <p className="text-[13px] text-foreground capitalize">{value}</p>
      </div>
    </div>
  );
}

function Layers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </svg>
  );
}
