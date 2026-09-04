'use client';

/**
 * FusionOS Project Detail Page
 * Comprehensive project workspace with tabs.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';

interface ProjectDetail {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  progress: number;
  currency: string;
  budgetAmount: number | null;
  actualCost: number | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  createdAt: string;
  projectManager: { id: string; firstName: string; lastName: string } | null;
  createdBy: { id: string; firstName: string; lastName: string } | null;
  customer: { id: string; name: string; code: string } | null;
  opportunity: { id: string; name: string; stage: string } | null;
  company: { id: string; name: string };
  branch: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  members: Array<{
    id: string;
    role: string;
    employee: { id: string; firstName: string; lastName: string; employeeCode: string; department?: { name: string } };
  }>;
  _count: { tasks: number; milestones: number; timeEntries: number };
  budget: { budgetAmount: number; spentAmount: number; currency: string } | null;
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'team', label: 'Team' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'time', label: 'Time' },
  { id: 'activity', label: 'Activity' },
];

const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PLANNED', 'CANCELLED'],
  PLANNED: ['ACTIVE', 'ON_HOLD', 'CANCELLED'],
  ACTIVE: ['ON_HOLD', 'COMPLETED', 'CANCELLED'],
  ON_HOLD: ['ACTIVE', 'CANCELLED'],
  COMPLETED: ['ARCHIVED'],
  CANCELLED: ['ARCHIVED'],
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = (params?.id ?? '') as string;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [tasks, setTasks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [showTransition, setShowTransition] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);

  const loadProject = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<ProjectDetail>(`/projects/${projectId}`);
      setProject(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadTasks = useCallback(async () => {
    try {
      const data = await apiClient.get<{ items: any[] }>(`/projects/${projectId}/tasks`);
      setTasks(data.items || []);
    } catch {}
  }, [projectId]);

  const loadActivities = useCallback(async () => {
    try {
      const data = await apiClient.get<{ items: any[] }>(`/projects/${projectId}/activities`);
      setActivities(data.items || []);
    } catch {}
  }, [projectId]);

  const loadMilestones = useCallback(async () => {
    try {
      const data = await apiClient.get<any[]>(`/projects/${projectId}/milestones`);
      setMilestones(Array.isArray(data) ? data : []);
    } catch {}
  }, [projectId]);

  const loadTimeEntries = useCallback(async () => {
    try {
      const data = await apiClient.get<{ items: any[] }>(`/projects/${projectId}/time`);
      setTimeEntries(data.items || []);
    } catch {}
  }, [projectId]);

  const loadEmployees = useCallback(async () => {
    try {
      const data = await apiClient.get<{ data: any[] }>('/employees', { page: '1', limit: '100' });
      setEmployees(data.data || []);
    } catch {}
  }, []);

  useEffect(() => { loadProject(); }, [loadProject]);
  useEffect(() => {
    if (activeTab === 'tasks') loadTasks();
    if (activeTab === 'activity') loadActivities();
    if (activeTab === 'milestones') loadMilestones();
    if (activeTab === 'time') loadTimeEntries();
    if (showAddMember || showAddTask) loadEmployees();
  }, [activeTab, loadTasks, loadActivities, loadMilestones, loadTimeEntries, showAddMember, showAddTask, loadEmployees]);

  const transition = async (status: string) => {
    try {
      await apiClient.post(`/projects/${projectId}/transition`, { status });
      setShowTransition(false);
      loadProject();
    } catch (err: any) {
      alert(err?.message || 'Failed to transition');
    }
  };

  const addMember = async (employeeId: string, role: string) => {
    try {
      await apiClient.post(`/projects/${projectId}/members`, { employeeId, role });
      setShowAddMember(false);
      loadProject();
    } catch (err: any) {
      alert(err?.message || 'Failed to add member');
    }
  };

  const createTask = async (title: string, priority: string, dueDate: string) => {
    try {
      await apiClient.post(`/projects/${projectId}/tasks`, { title, priority, dueDate: dueDate || undefined });
      setShowAddTask(false);
      loadTasks();
    } catch (err: any) {
      alert(err?.message || 'Failed to create task');
    }
  };

  const formatMoney = (amount: number | null) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: project?.currency || 'USD', minimumFractionDigits: 0 }).format(amount / 100);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E2E8F0] border-t-[#2563EB]" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <EmptyState title="Project not found" description={error || 'The project you are looking for does not exist.'} />
      </div>
    );
  }

  const allowedTransitions = STATUS_TRANSITIONS[project.status] || [];

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <PageHeader
        title={project.name}
        description={`${project.code} · ${project.customer?.name || 'No customer'}`}
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: project.code },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {allowedTransitions.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowTransition(!showTransition)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white px-3 text-[12px] font-medium text-[#475569] hover:bg-[#F8FAFC] transition-colors"
                >
                  Status ▾
                </button>
                {showTransition && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-[#E2E8F0] bg-white py-1 shadow-lg">
                    {allowedTransitions.map((s) => (
                      <button
                        key={s}
                        onClick={() => transition(s)}
                        className="w-full px-3 py-2 text-left text-[12px] text-[#0F172A] hover:bg-[#F8FAFC]"
                      >
                        {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => setShowAddTask(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#2563EB] px-3 text-[12px] font-medium text-white hover:bg-[#1D4ED8] transition-colors"
            >
              + Task
            </button>
          </div>
        }
      />

      {/* Tab Navigation */}
      <div className="border-b border-[#E2E8F0] bg-white px-5 lg:px-6">
        <nav className="flex gap-0.5" aria-label="Project tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-[13px] font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#2563EB] text-[#2563EB]'
                  : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="px-5 py-4 lg:px-6">
        {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* KPI Row */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-lg border border-[#E2E8F0] bg-white p-3.5">
                <p className="text-[12px] text-[#64748B]">Tasks</p>
                <p className="mt-1 text-[20px] font-semibold text-[#0F172A]">{project._count.tasks}</p>
              </div>
              <div className="rounded-lg border border-[#E2E8F0] bg-white p-3.5">
                <p className="text-[12px] text-[#64748B]">Team Size</p>
                <p className="mt-1 text-[20px] font-semibold text-[#0F172A]">{project.members.length}</p>
              </div>
              <div className="rounded-lg border border-[#E2E8F0] bg-white p-3.5">
                <p className="text-[12px] text-[#64748B]">Milestones</p>
                <p className="mt-1 text-[20px] font-semibold text-[#0F172A]">{project._count.milestones}</p>
              </div>
              <div className="rounded-lg border border-[#E2E8F0] bg-white p-3.5">
                <p className="text-[12px] text-[#64748B]">Budget</p>
                <p className="mt-1 text-[20px] font-semibold text-[#0F172A]">{formatMoney(project.budgetAmount)}</p>
              </div>
            </div>

            {/* Progress */}
            <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-medium text-[#0F172A]">Progress</span>
                <span className="text-[13px] font-semibold text-[#2563EB]">{project.progress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#E2E8F0]">
                <div className="h-2 rounded-full bg-[#2563EB] transition-all" style={{ width: `${project.progress}%` }} />
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
                <h3 className="mb-3 text-[13px] font-semibold text-[#0F172A]">Project Details</h3>
                <div className="space-y-2 text-[12px]">
                  {[
                    { label: 'Status', value: <StatusBadge status={project.status} /> },
                    { label: 'Company', value: project.company.name },
                    { label: 'Customer', value: project.customer?.name || '—' },
                    { label: 'Manager', value: project.projectManager ? `${project.projectManager.firstName} ${project.projectManager.lastName}` : '—' },
                    { label: 'Department', value: project.department?.name || '—' },
                    { label: 'Branch', value: project.branch?.name || '—' },
                    { label: 'Currency', value: project.currency },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-1">
                      <span className="text-[#64748B]">{item.label}</span>
                      <span className="text-[#0F172A]">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
                <h3 className="mb-3 text-[13px] font-semibold text-[#0F172A]">Timeline</h3>
                <div className="space-y-2 text-[12px]">
                  {[
                    { label: 'Planned Start', value: project.plannedStartDate ? new Date(project.plannedStartDate).toLocaleDateString() : '—' },
                    { label: 'Planned End', value: project.plannedEndDate ? new Date(project.plannedEndDate).toLocaleDateString() : '—' },
                    { label: 'Actual Start', value: project.actualStartDate ? new Date(project.actualStartDate).toLocaleDateString() : '—' },
                    { label: 'Actual End', value: project.actualEndDate ? new Date(project.actualEndDate).toLocaleDateString() : '—' },
                    { label: 'Budget', value: formatMoney(project.budgetAmount) },
                    { label: 'Created', value: new Date(project.createdAt).toLocaleDateString() },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-1">
                      <span className="text-[#64748B]">{item.label}</span>
                      <span className="text-[#0F172A]">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {project.description && (
              <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
                <h3 className="mb-2 text-[13px] font-semibold text-[#0F172A]">Description</h3>
                <p className="text-[13px] text-[#475569] whitespace-pre-wrap">{project.description}</p>
              </div>
            )}
          </div>
        )}

        {/* ── TASKS TAB ────────────────────────────────────────────────── */}
        {activeTab === 'tasks' && (
          <div className="rounded-lg border border-[#E2E8F0] bg-white">
            {tasks.length === 0 ? (
              <EmptyState title="No tasks" description="Create your first task to get started." />
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <th className="text-left px-4 py-2.5 font-medium text-[#64748B]">Task</th>
                    <th className="text-left px-4 py-2.5 font-medium text-[#64748B]">Assignee</th>
                    <th className="text-center px-4 py-2.5 font-medium text-[#64748B]">Priority</th>
                    <th className="text-center px-4 py-2.5 font-medium text-[#64748B]">Status</th>
                    <th className="text-left px-4 py-2.5 font-medium text-[#64748B]">Due Date</th>
                    <th className="text-center px-4 py-2.5 font-medium text-[#64748B]">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {tasks.map((t) => (
                    <tr key={t.id} className="hover:bg-[#F8FAFC]">
                      <td className="px-4 py-3 font-medium text-[#0F172A]">{t.title}</td>
                      <td className="px-4 py-3 text-[#475569]">
                        {t.assignee?.employee ? `${t.assignee.employee.firstName} ${t.assignee.employee.lastName}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          t.priority === 'URGENT' ? 'bg-red-50 text-red-700' :
                          t.priority === 'HIGH' ? 'bg-orange-50 text-orange-700' :
                          t.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-700' :
                          'bg-gray-50 text-gray-600'
                        }`}>{t.priority}</span>
                      </td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={t.status} /></td>
                      <td className="px-4 py-3 text-[#475569]">
                        {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-1.5 w-12 rounded-full bg-[#E2E8F0]">
                            <div className="h-1.5 rounded-full bg-[#2563EB]" style={{ width: `${t.progress}%` }} />
                          </div>
                          <span className="text-[11px] text-[#64748B]">{t.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── TEAM TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'team' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddMember(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#2563EB] px-3 text-[12px] font-medium text-white hover:bg-[#1D4ED8] transition-colors"
              >
                + Add Member
              </button>
            </div>
            {project.members.length === 0 ? (
              <div className="rounded-lg border border-[#E2E8F0] bg-white">
                <EmptyState title="No team members" description="Add members to this project." />
              </div>
            ) : (
              <div className="rounded-lg border border-[#E2E8F0] bg-white overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                      <th className="text-left px-4 py-2.5 font-medium text-[#64748B]">Employee</th>
                      <th className="text-left px-4 py-2.5 font-medium text-[#64748B]">Code</th>
                      <th className="text-left px-4 py-2.5 font-medium text-[#64748B]">Role</th>
                      <th className="text-left px-4 py-2.5 font-medium text-[#64748B]">Department</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {project.members.map((m) => (
                      <tr key={m.id} className="hover:bg-[#F8FAFC]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563EB] text-[11px] font-semibold text-white">
                              {m.employee.firstName.charAt(0)}{m.employee.lastName.charAt(0)}
                            </div>
                            <span className="font-medium text-[#0F172A]">{m.employee.firstName} {m.employee.lastName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#475569] font-mono text-[11px]">{m.employee.employeeCode}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded bg-[#EFF6FF] px-1.5 py-0.5 text-[10px] font-medium text-[#2563EB]">
                            {m.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#475569]">{m.employee.department?.name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── MILESTONES TAB ──────────────────────────────────────────── */}
        {activeTab === 'milestones' && (
          <div className="rounded-lg border border-[#E2E8F0] bg-white">
            {milestones.length === 0 ? (
              <EmptyState title="No milestones" description="Add milestones to track project checkpoints." />
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <th className="text-left px-4 py-2.5 font-medium text-[#64748B]">Milestone</th>
                    <th className="text-center px-4 py-2.5 font-medium text-[#64748B]">Status</th>
                    <th className="text-left px-4 py-2.5 font-medium text-[#64748B]">Target Date</th>
                    <th className="text-center px-4 py-2.5 font-medium text-[#64748B]">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {milestones.map((m: any) => (
                    <tr key={m.id} className="hover:bg-[#F8FAFC]">
                      <td className="px-4 py-3 font-medium text-[#0F172A]">{m.name}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={m.status} /></td>
                      <td className="px-4 py-3 text-[#475569]">
                        {m.targetDate ? new Date(m.targetDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-1.5 w-12 rounded-full bg-[#E2E8F0]">
                            <div className="h-1.5 rounded-full bg-[#2563EB]" style={{ width: `${m.progress}%` }} />
                          </div>
                          <span className="text-[11px] text-[#64748B]">{m.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── TIME TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'time' && (
          <div className="rounded-lg border border-[#E2E8F0] bg-white">
            {timeEntries.length === 0 ? (
              <EmptyState title="No time entries" description="Log time against project tasks." />
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <th className="text-left px-4 py-2.5 font-medium text-[#64748B]">Employee</th>
                    <th className="text-left px-4 py-2.5 font-medium text-[#64748B]">Date</th>
                    <th className="text-left px-4 py-2.5 font-medium text-[#64748B]">Task</th>
                    <th className="text-center px-4 py-2.5 font-medium text-[#64748B]">Duration</th>
                    <th className="text-left px-4 py-2.5 font-medium text-[#64748B]">Description</th>
                    <th className="text-center px-4 py-2.5 font-medium text-[#64748B]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {timeEntries.map((e: any) => {
                    const h = Math.floor(e.durationMinutes / 60);
                    const m = e.durationMinutes % 60;
                    return (
                      <tr key={e.id} className="hover:bg-[#F8FAFC]">
                        <td className="px-4 py-3 text-[#0F172A]">{e.employee?.firstName} {e.employee?.lastName}</td>
                        <td className="px-4 py-3 text-[#475569]">{new Date(e.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-[#475569]">{e.task?.title || '—'}</td>
                        <td className="px-4 py-3 text-center font-medium text-[#0F172A]">{h > 0 ? `${h}h ${m}m` : `${m}m`}</td>
                        <td className="px-4 py-3 text-[#475569] max-w-[200px] truncate">{e.description || '—'}</td>
                        <td className="px-4 py-3 text-center"><StatusBadge status={e.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── ACTIVITY TAB ─────────────────────────────────────────────── */}
        {activeTab === 'activity' && (
          <div className="rounded-lg border border-[#E2E8F0] bg-white">
            {activities.length === 0 ? (
              <EmptyState title="No activity" description="Project activity will appear here." />
            ) : (
              <div className="divide-y divide-[#E2E8F0]">
                {activities.map((a: any) => (
                  <div key={a.id} className="flex gap-4 px-4 py-3 hover:bg-[#F8FAFC]">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-[11px] font-semibold text-[#2563EB]">
                      {a.employee?.firstName?.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-[#0F172A]">{a.title}</p>
                      <p className="text-[11px] text-[#64748B]">
                        {a.employee?.firstName} {a.employee?.lastName} · {new Date(a.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Add Member Modal ────────────────────────────────────────────── */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowAddMember(false)}>
          <div className="w-[420px] rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-[#E2E8F0] px-6 py-4">
              <h2 className="text-[16px] font-semibold text-[#0F172A]">Add Team Member</h2>
            </div>
            <div className="p-6">
              <p className="mb-3 text-[12px] text-[#64748B]">Select an employee and role:</p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {employees.filter(e => !project.members.some(m => m.employee.id === e.id)).map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => addMember(emp.id, 'DEVELOPER')}
                    className="flex w-full items-center gap-3 rounded-md border border-[#E2E8F0] px-3 py-2 text-left hover:bg-[#F8FAFC] transition-colors"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2563EB] text-[10px] font-semibold text-white">
                      {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-[#0F172A]">{emp.firstName} {emp.lastName}</p>
                      <p className="text-[11px] text-[#64748B]">{emp.department?.name || '—'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-[#E2E8F0] px-6 py-4 flex justify-end">
              <button onClick={() => setShowAddMember(false)} className="px-4 py-2 text-[13px] text-[#64748B] hover:text-[#0F172A]">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Task Modal ──────────────────────────────────────────────── */}
      {showAddTask && (
        <AddTaskModal
          employees={project.members.map(m => ({ id: m.employee.id, firstName: m.employee.firstName, lastName: m.employee.lastName }))}
          onClose={() => setShowAddTask(false)}
          onCreate={createTask}
        />
      )}
    </div>
  );
}

function AddTaskModal({ employees, onClose, onCreate }: {
  employees: Array<{ id: string; firstName: string; lastName: string }>;
  onClose: () => void;
  onCreate: (title: string, priority: string, dueDate: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-[480px] rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-[#E2E8F0] px-6 py-4">
          <h2 className="text-[16px] font-semibold text-[#0F172A]">New Task</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[#475569] mb-1">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-[13px] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              placeholder="Task title"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-[#475569] mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-[13px]"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#475569] mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-[13px]"
              />
            </div>
          </div>
        </div>
        <div className="border-t border-[#E2E8F0] px-6 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-[#64748B] hover:text-[#0F172A]">Cancel</button>
          <button
            onClick={() => { if (title.trim()) onCreate(title, priority, dueDate); }}
            disabled={!title.trim()}
            className="rounded-md bg-[#2563EB] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#1D4ED8] disabled:opacity-50"
          >
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
}
