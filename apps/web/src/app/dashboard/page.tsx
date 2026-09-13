'use client';

/**
 * FusionOS Dashboard
 *
 * Zoho-style enterprise command center with:
 * - Company name display
 * - Getting Started onboarding checklist
 * - Feature exploration cards
 * - KPI overview
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import { KpiCard } from '@/components/ui/kpi-card';
import { KpiSkeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Users, Clock, CalendarOff, Wallet, ArrowRight, AlertCircle,
  CheckCircle2, UserCheck, Building2, CreditCard,
  FolderKanban, Sparkles, BarChart3,
  ChevronRight, ExternalLink, Plus,
  Circle, CheckCircle,
} from 'lucide-react';

interface DashboardData {
  employees?: { total: number; active: number };
  attendance?: { present: number; onLeave: number; absent: number };
  leave?: { pending: number; approved: number; total: number };
  payroll?: { status: string; period: string; netPayroll: number; currency: string };
}

interface Company {
  id: string;
  name: string;
  code?: string;
}

interface SetupStep {
  id: string;
  label: string;
  description: string;
  href: string;
  completed: boolean;
}

const defaultSetupSteps: SetupStep[] = [
  {
    id: 'company',
    label: 'Add Organization Details',
    description: 'Add your organization\'s name, address, and tax details to auto-populate them when you create transactions. Also, add users to provide access to your employees and accountants.',
    href: '/organization/company',
    completed: false,
  },
  {
    id: 'employees',
    label: 'Add Your First Employee',
    description: 'Add employee records with their personal details, department, designation, and compensation information to start managing your workforce.',
    href: '/people/employees/new',
    completed: false,
  },
  {
    id: 'attendance',
    label: 'Set Up Attendance',
    description: 'Configure attendance policies and track daily attendance for your employees. Set up work hours, grace periods, and location-based check-in.',
    href: '/people/attendance',
    completed: false,
  },
  {
    id: 'leave',
    label: 'Configure Leave Policies',
    description: 'Create leave types and policies for your organization. Define accrual rules, carry-forward settings, and approval workflows.',
    href: '/people/leave',
    completed: false,
  },
  {
    id: 'payroll',
    label: 'Run Your First Payroll',
    description: 'Process your first payroll run. Set up salary structures, allowances, deductions, and generate payslips for your employees.',
    href: '/people/payroll',
    completed: false,
  },
];

const featureCards = [
  {
    icon: Building2,
    title: 'Organization Management',
    description: 'Set up your company structure with branches, departments, teams, and designations.',
    href: '/organization/company',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-500/10',
  },
  {
    icon: Users,
    title: 'Employee Management',
    description: 'Manage your workforce with employee profiles, documents, and history.',
    href: '/people/employees',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
  {
    icon: CreditCard,
    title: 'Finance & Accounting',
    description: 'Track accounts, journal entries, invoices, bills, and financial reports.',
    href: '/finance',
    color: 'text-violet-500',
    bgColor: 'bg-violet-50 dark:bg-violet-500/10',
  },
  {
    icon: FolderKanban,
    title: 'Project Management',
    description: 'Create projects, assign tasks, track time, and manage deliverables.',
    href: '/projects',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-500/10',
  },
  {
    icon: Sparkles,
    title: 'AI Command Center',
    description: 'Leverage AI for intelligent insights, automation, and decision support.',
    href: '/ai',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-emerald-500/10',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reports',
    description: 'Real-time dashboards and business intelligence across all modules.',
    href: '/analytics',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50 dark:bg-cyan-500/10',
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'getting-started'>('getting-started');
  const [data, setData] = useState<DashboardData>({});
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [setupSteps, setSetupSteps] = useState<SetupStep[]>(defaultSetupSteps);
  const [selectedStep, setSelectedStep] = useState<SetupStep>(defaultSetupSteps[0]!);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch company name
      try {
        const compData = await apiClient.get<{ data: Company[] }>('/organization/companies', { limit: '1' });
        const companies = compData.data || [];
        if (companies.length > 0) {
          setCompany(companies[0]!);
        }
      } catch { /* no company */ }

      // Fetch employee count
      try {
        const empData = await apiClient.get<{ meta?: { total: number } }>('/employees', { page: '1', limit: '1' });
        setData(prev => ({
          ...prev,
          employees: { total: empData.meta?.total || 0, active: empData.meta?.total || 0 },
        }));
        // Mark employees step as completed if count > 0
        if ((empData.meta?.total || 0) > 0) {
          setSetupSteps(prev => prev.map(s => s.id === 'employees' ? { ...s, completed: true } : s));
        }
      } catch { /* Employee data unavailable */ }

      // Check if company exists (mark company step)
      try {
        const compCheck = await apiClient.get<{ data: Company[] }>('/organization/companies', { limit: '1' });
        if ((compCheck.data || []).length > 0) {
          setSetupSteps(prev => prev.map(s => s.id === 'company' ? { ...s, completed: true } : s));
        }
      } catch { /* no company */ }

      // Fetch payroll dashboard
      try {
        const payrollData = await apiClient.get<{ currentPeriod?: string; status?: string; netPayroll?: number; currency?: string }>('/payroll/dashboard');
        setData(prev => ({
          ...prev,
          payroll: {
            status: payrollData.status || 'N/A',
            period: payrollData.currentPeriod || 'N/A',
            netPayroll: payrollData.netPayroll || 0,
            currency: payrollData.currency || 'USD',
          },
        }));
        if (payrollData.status) {
          setSetupSteps(prev => prev.map(s => s.id === 'payroll' ? { ...s, completed: true } : s));
        }
      } catch { /* Payroll data unavailable */ }

      // Fetch leave summary
      try {
        const leaveData = await apiClient.get<{ meta?: { total: number } }>('/leave/requests', { page: '1', limit: '1' });
        setData(prev => ({
          ...prev,
          leave: { pending: 0, approved: 0, total: leaveData.meta?.total || 0 },
        }));
        if ((leaveData.meta?.total || 0) > 0) {
          setSetupSteps(prev => prev.map(s => s.id === 'leave' ? { ...s, completed: true } : s));
        }
      } catch { /* Leave data unavailable */ }

    } catch {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  useEffect(() => {
    const next = setupSteps.find(s => !s.completed) ?? setupSteps[0];
    if (next) setSelectedStep(next);
  }, [setupSteps]);

  const completedCount = setupSteps.filter(s => s.completed).length;
  const progressPercent = Math.round((completedCount / setupSteps.length) * 100);

  const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  return (
    <div className="min-h-full bg-background">
      {/* ═══ Header with Welcome & Company Name ═══ */}
      <div className="border-b border-border bg-card">
        <div className="px-5 py-5 lg:px-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <span className="text-xl font-bold text-primary">
                  {user?.firstName?.charAt(0) || 'U'}
                </span>
              </div>
              <div>
                <h1 className="text-[20px] font-bold text-foreground">
                  Hello, {user?.firstName || 'User'} {user?.lastName || ''}
                </h1>
                {company && (
                  <p className="mt-0.5 text-[13px] font-semibold text-primary uppercase tracking-wide">
                    {company.name}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Tab Navigation ═══ */}
        <div className="px-5 lg:px-6">
          <div className="flex items-center gap-0">
            {[
              { id: 'dashboard' as const, label: 'Dashboard' },
              { id: 'getting-started' as const, label: 'Getting Started' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative px-5 py-3 text-[14px] font-medium transition-colors',
                  activeTab === tab.id
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 py-5 lg:px-6">
        {error && (
          <div className="mb-4 rounded-lg border border-warning/30 bg-warning-light p-3">
            <div className="flex items-center gap-2 text-[13px] text-warning">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          </div>
        )}

        {/* ═══ Getting Started Tab ═══ */}
        {activeTab === 'getting-started' && (
          <div className="space-y-6">
            {/* Welcome Card */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-[20px] font-bold text-foreground">
                Welcome to FusionOS
              </h2>
              <p className="mt-1 text-[14px] text-muted-foreground">
                The AI-native business operating system that connects HR, Finance, CRM, Projects, and more into one unified platform.
              </p>
            </div>

            {/* Setup Checklist */}
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-[16px] font-semibold text-foreground">
                    Let&apos;s get you up and running
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-medium text-muted-foreground">
                    {completedCount} of {setupSteps.length} completed
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className="text-[13px] font-semibold text-primary">{progressPercent}%</span>
                  </div>
                </div>
              </div>

              <div className="flex">
                {/* Step List */}
                <div className="w-[340px] shrink-0 border-r border-border">
                  {setupSteps.map((step) => (
                    <button
                      key={step.id}
                      onClick={() => setSelectedStep(step)}
                      className={cn(
                        'flex w-full items-center gap-3 border-b border-border px-6 py-4 text-left transition-colors',
                        selectedStep.id === step.id
                          ? 'bg-primary/5 border-l-2 border-l-primary'
                          : 'hover:bg-secondary/50 border-l-2 border-l-transparent',
                        step.completed && 'opacity-70',
                      )}
                    >
                      {step.completed ? (
                        <CheckCircle className="h-5 w-5 shrink-0 text-success" />
                      ) : (
                        <Circle className="h-5 w-5 shrink-0 text-border-strong" />
                      )}
                      <span className={cn(
                        'text-[13px] font-medium',
                        selectedStep.id === step.id ? 'text-primary' : 'text-foreground',
                        step.completed && 'text-muted-foreground',
                      )}>
                        {step.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Step Detail */}
                <div className="flex-1 p-6">
                  {selectedStep && (
                    <div>
                      <h4 className="text-[16px] font-semibold text-foreground">
                        {selectedStep.label}
                      </h4>
                      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                        {selectedStep.description}
                      </p>
                      <div className="mt-5 flex items-center gap-3">
                        <a
                          href={selectedStep.href}
                          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                        >
                          <Plus className="h-4 w-4" />
                          {selectedStep.completed ? 'View' : 'Get Started'}
                        </a>
                        <a
                          href={selectedStep.href}
                          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-[13px] font-medium text-foreground transition-colors hover:bg-secondary"
                        >
                          Learn More
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Feature Exploration */}
            <div>
              <h3 className="mb-4 text-[16px] font-semibold text-foreground">
                Explore useful features
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {featureCards.map(card => (
                  <a
                    key={card.href}
                    href={card.href}
                    className="group rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:shadow-md"
                  >
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', card.bgColor)}>
                      <card.icon className={cn('h-5 w-5', card.color)} />
                    </div>
                    <h4 className="mt-3 text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors">
                      {card.title}
                    </h4>
                    <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                      {card.description}
                    </p>
                    <div className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Explore
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-4 text-[16px] font-semibold text-foreground">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <QuickAction href="/people/employees" label="Add Employee" icon={Users} />
                <QuickAction href="/people/attendance" label="Attendance" icon={Clock} />
                <QuickAction href="/people/leave" label="Leave Requests" icon={CalendarOff} />
                <QuickAction href="/people/payroll" label="Run Payroll" icon={Wallet} />
              </div>
            </div>
          </div>
        )}

        {/* ═══ Dashboard Tab ═══ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-5">
            {/* KPI Row */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)
              ) : (
                <>
                  <KpiCard label="Total Employees" value={data.employees?.total || 0} icon={Users} iconBg="bg-info-light" iconColor="text-primary" trend={{ value: 12, direction: 'up', label: 'vs last month' }} />
                  <KpiCard label="Present Today" value={data.attendance?.present || 0} icon={UserCheck} iconBg="bg-success-light" iconColor="text-success" trend={{ value: 5, direction: 'up', label: 'vs yesterday' }} />
                  <KpiCard label="On Leave" value={data.attendance?.onLeave || 0} icon={CalendarOff} iconBg="bg-warning-light" iconColor="text-warning" trend={{ value: 2, direction: 'down', label: 'vs last week' }} />
                  <KpiCard label="Pending Leave" value={data.leave?.pending || 0} icon={AlertCircle} iconBg="bg-[#FFF7ED] dark:bg-[rgba(249,115,22,0.15)]" iconColor="text-orange-600" trend={{ value: 0, direction: 'neutral', label: 'no change' }} />
                  <KpiCard label="Payroll Status" value={data.payroll?.status || 'N/A'} icon={Wallet} iconBg="bg-[#D1FAE5] dark:bg-[rgba(139,92,246,0.15)]" iconColor="text-violet-600" />
                </>
              )}
            </div>

            {/* Overview Cards */}
            <div className="grid gap-4 lg:grid-cols-3">
              <OverviewCard title="Employee Overview" items={[
                { label: 'Total Employees', value: String(data.employees?.total || 0) },
                { label: 'Active', value: String(data.employees?.active || 0), color: 'text-success' },
              ]} />
              <OverviewCard title="Leave Overview" items={[
                { label: 'Total Requests', value: String(data.leave?.total || 0) },
                { label: 'Pending', value: String(data.leave?.pending || 0), color: 'text-warning' },
                { label: 'Approved', value: String(data.leave?.approved || 0), color: 'text-success' },
              ]} />
              <OverviewCard title="Payroll Overview" items={[
                { label: 'Period', value: data.payroll?.period || 'N/A' },
                { label: 'Status', value: data.payroll?.status || 'N/A' },
                { label: 'Net Payroll', value: data.payroll ? formatMoney(data.payroll.netPayroll, data.payroll.currency) : 'N/A' },
              ]} />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <QuickAction href="/people/employees" label="Manage Employees" icon={Users} description="View and manage staff" />
              <QuickAction href="/people/attendance" label="Attendance" icon={Clock} description="Track daily attendance" />
              <QuickAction href="/people/leave" label="Leave Management" icon={CalendarOff} description="Approve leave requests" />
              <QuickAction href="/people/payroll" label="Payroll" icon={Wallet} description="Process payroll runs" />
            </div>

            {/* Alerts */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 text-[14px] font-semibold text-foreground">Important Alerts</h3>
              {data.leave?.pending ? (
                <div className="flex items-center gap-3 rounded-lg bg-warning-light p-3">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <div>
                    <p className="text-[13px] font-medium text-amber-800 dark:text-amber-200">{data.leave.pending} leave requests pending approval</p>
                    <p className="text-[12px] text-amber-600 dark:text-amber-400">Review and process pending leave requests</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg bg-success-light p-3">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <p className="text-[13px] text-emerald-700 dark:text-emerald-300">You&apos;re all caught up.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────────────────── */

function OverviewCard({ title, items }: { title: string; items: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-3 text-[13px] font-semibold text-foreground">{title}</h3>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground">{item.label}</span>
            <span className={cn('text-[14px] font-semibold text-foreground', item.color)}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickAction({ href, label, icon: Icon, description }: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; description?: string }) {
  return (
    <a
      href={href}
      className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-all duration-150 hover:border-primary/30 hover:bg-secondary hover:shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-info-light transition-colors group-hover:bg-primary/10">
          <Icon className="h-4.5 w-4.5 text-primary" />
        </div>
        <div>
          <p className="text-[13px] font-medium text-foreground">{label}</p>
          {description && <p className="text-[12px] text-muted-foreground">{description}</p>}
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-border-strong transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary" />
    </a>
  );
}
