'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PayrollPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  paymentDate: string;
  status: string;
}

interface PayrollRun {
  id: string;
  periodId: string;
  calculationMode: string;
  status: string;
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  currency: string;
  period: { id: string; name: string };
  calculatedAt?: string;
  createdAt: string;
}

interface PayrollDashboard {
  currentPeriod: PayrollPeriod | null;
  activeEmployees: number;
  latestRun: PayrollRun | null;
  pendingRuns: number;
  finalizedRuns: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
}

interface SalaryStructure {
  id: string;
  employeeId: string;
  employee: { id: string; firstName: string; lastName: string; employeeCode: string };
  currency: string;
  payFrequency: string;
  basicSalary: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  status: string;
}

interface PayrollComponent {
  id: string;
  name: string;
  code: string;
  type: string;
  isStatutory: boolean;
  isFixed: boolean;
  defaultValue?: number;
  isActive: boolean;
}

interface Payslip {
  id: string;
  employeeId: string;
  employee: { id: string; firstName: string; lastName: string; employeeCode: string };
  currency: string;
  grossPay: number;
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  paymentDate: string;
  status: string;
  line: {
    items: Array<{ id: string; type: string; code: string; name: string; amount: number; source: string }>;
  };
}

type TabType = 'dashboard' | 'periods' | 'runs' | 'salaries' | 'components' | 'payslips';

const TABS: { id: TabType; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'periods', label: 'Periods' },
  { id: 'runs', label: 'Payroll Runs' },
  { id: 'salaries', label: 'Salary Structures' },
  { id: 'components', label: 'Components' },
  { id: 'payslips', label: 'Payslips' },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
  OPEN: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  PROCESSING: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  CALCULATING: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  CALCULATED: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  UNDER_REVIEW: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  REVIEWING: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  REVIEWED: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  FINALIZED: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  CLOSED: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  FAILED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
};

const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const DEFAULT_STYLE = { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' } as const;
const getStatusStyle = (status: string): { bg: string; text: string; dot: string } => STATUS_STYLES[status] ?? DEFAULT_STYLE;

export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<PayrollDashboard | null>(null);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [salaries, setSalaries] = useState<SalaryStructure[]>([]);
  const [components, setComponents] = useState<PayrollComponent[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<PayrollDashboard>('/payroll/dashboard');
      setDashboard(data);
    } catch (error) {
      console.error('Failed to fetch payroll dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPeriods = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<{ data: PayrollPeriod[] }>('/payroll/periods');
      setPeriods(Array.isArray(data) ? data : (data as any)?.data || []);
    } catch (error) {
      console.error('Failed to fetch periods:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRuns = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<{ data: PayrollRun[] }>('/payroll/runs');
      setRuns(Array.isArray(data) ? data : (data as any)?.data || []);
    } catch (error) {
      console.error('Failed to fetch runs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSalaries = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<{ data: SalaryStructure[] }>('/payroll/salaries');
      setSalaries(Array.isArray(data) ? data : (data as any)?.data || []);
    } catch (error) {
      console.error('Failed to fetch salaries:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchComponents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<{ data: PayrollComponent[] }>('/payroll/components');
      setComponents(Array.isArray(data) ? data : (data as any)?.data || []);
    } catch (error) {
      console.error('Failed to fetch components:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPayslips = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<{ data: Payslip[] }>('/payroll/payslips');
      setPayslips(Array.isArray(data) ? data : (data as any)?.data || []);
    } catch (error) {
      console.error('Failed to fetch payslips:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    switch (activeTab) {
      case 'dashboard': fetchDashboard(); break;
      case 'periods': fetchPeriods(); break;
      case 'runs': fetchRuns(); break;
      case 'salaries': fetchSalaries(); break;
      case 'components': fetchComponents(); break;
      case 'payslips': fetchPayslips(); break;
    }
  }, [activeTab, fetchDashboard, fetchPeriods, fetchRuns, fetchSalaries, fetchComponents, fetchPayslips]);

  const renderDashboard = () => {
    if (!dashboard) return <Card><div className="p-8 text-center text-gray-500">No payroll data available</div></Card>;

    return (
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="text-sm text-gray-500 mb-1">Active Employees</div>
            <div className="text-2xl font-bold text-gray-900">{dashboard.activeEmployees}</div>
          </Card>
          <Card className="p-5">
            <div className="text-sm text-gray-500 mb-1">Total Gross Pay</div>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(dashboard.totalGross)}</div>
          </Card>
          <Card className="p-5">
            <div className="text-sm text-gray-500 mb-1">Total Deductions</div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(dashboard.totalDeductions)}</div>
          </Card>
          <Card className="p-5">
            <div className="text-sm text-gray-500 mb-1">Net Pay</div>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(dashboard.totalNet)}</div>
          </Card>
        </div>

        {/* Current Period & Run Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Current Period</h3>
            {dashboard.currentPeriod ? (
              <div>
                <div className="text-lg font-bold text-gray-900">{dashboard.currentPeriod.name}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {formatDate(dashboard.currentPeriod.startDate)} – {formatDate(dashboard.currentPeriod.endDate)}
                </div>
                <div className="mt-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyle(dashboard.currentPeriod.status).bg} ${getStatusStyle(dashboard.currentPeriod.status).text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${getStatusStyle(dashboard.currentPeriod.status).dot}`}></span>
                    {dashboard.currentPeriod.status}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-sm">No active payroll period</div>
            )}
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Run Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Pending Runs</span>
                <span className="font-medium text-amber-600">{dashboard.pendingRuns}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Finalized Runs</span>
                <span className="font-medium text-emerald-600">{dashboard.finalizedRuns}</span>
              </div>
              {dashboard.latestRun && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Latest Run</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(dashboard.latestRun.status).bg} ${getStatusStyle(dashboard.latestRun.status).text}`}>
                    {dashboard.latestRun.calculationMode} – {dashboard.latestRun.status}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderPeriods = () => (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Start Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">End Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Payment Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {periods.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No payroll periods found</td></tr>
            ) : periods.map((period) => {
              const s = getStatusStyle(period.status);
              return (
                <tr key={period.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{period.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(period.startDate)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(period.endDate)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(period.paymentDate)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>
                      {period.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );

  const renderRuns = () => (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Period</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mode</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Employees</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Gross</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Deductions</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Net</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {runs.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">No payroll runs found</td></tr>
            ) : runs.map((run) => {
              const s = getStatusStyle(run.status);
              return (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{run.period?.name}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      run.calculationMode === 'ATTENDANCE' ? 'bg-blue-50 text-blue-700' :
                      run.calculationMode === 'MANUAL' ? 'bg-purple-50 text-purple-700' :
                      'bg-indigo-50 text-indigo-700'
                    }`}>{run.calculationMode}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-700">{run.totalEmployees}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-700">{formatCurrency(run.totalGross, run.currency)}</td>
                  <td className="px-6 py-4 text-sm text-right text-red-600">{formatCurrency(run.totalDeductions, run.currency)}</td>
                  <td className="px-6 py-4 text-sm text-right font-medium text-emerald-600">{formatCurrency(run.totalNet, run.currency)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>
                      {run.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );

  const renderSalaries = () => (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Frequency</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Basic Salary</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Effective From</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {salaries.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No salary structures found</td></tr>
            ) : salaries.map((sal) => (
              <tr key={sal.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-medium">
                      {sal.employee.firstName.charAt(0)}{sal.employee.lastName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{sal.employee.firstName} {sal.employee.lastName}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded inline-block">{sal.employee.employeeCode}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{sal.payFrequency}</td>
                <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">{formatCurrency(sal.basicSalary, sal.currency)}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{formatDate(sal.effectiveFrom)}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    sal.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {sal.isActive ? 'Active' : sal.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );

  const renderComponents = () => (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Statutory</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Default</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {components.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No payroll components found</td></tr>
            ) : components.map((comp) => (
              <tr key={comp.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{comp.name}</td>
                <td className="px-6 py-4 font-mono text-sm text-gray-700">{comp.code}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    comp.type === 'EARNING' ? 'bg-emerald-50 text-emerald-700' :
                    comp.type === 'DEDUCTION' ? 'bg-red-50 text-red-700' :
                    comp.type === 'EMPLOYER_CONTRIBUTION' ? 'bg-blue-50 text-blue-700' :
                    'bg-purple-50 text-purple-700'
                  }`}>{comp.type}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{comp.isStatutory ? 'Yes' : 'No'}</td>
                <td className="px-6 py-4 text-sm text-right text-gray-700">
                  {comp.defaultValue != null ? formatCurrency(comp.defaultValue) : '—'}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    comp.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {comp.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );

  const renderPayslips = () => (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Gross</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Earnings</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Deductions</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Net Pay</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Payment Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {payslips.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">No payslips found</td></tr>
            ) : payslips.map((ps) => {
              const s = getStatusStyle(ps.status);
              return (
                <tr key={ps.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-medium">
                        {ps.employee.firstName.charAt(0)}{ps.employee.lastName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{ps.employee.firstName} {ps.employee.lastName}</div>
                        <div className="text-xs text-gray-500">{ps.employee.employeeCode}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-700">{formatCurrency(ps.grossPay, ps.currency)}</td>
                  <td className="px-6 py-4 text-sm text-right text-emerald-600">{formatCurrency(ps.totalEarnings, ps.currency)}</td>
                  <td className="px-6 py-4 text-sm text-right text-red-600">{formatCurrency(ps.totalDeductions, ps.currency)}</td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">{formatCurrency(ps.netPay, ps.currency)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(ps.paymentDate)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>
                      {ps.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-4 py-3.5 text-sm font-medium transition-colors ${
                    activeTab === tab.id ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
                  )}
                </button>
              ))}
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Period
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {loading ? (
          <Card>
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500">Loading...</p>
              </div>
            </div>
          </Card>
        ) : activeTab === 'dashboard' ? renderDashboard()
        : activeTab === 'periods' ? renderPeriods()
        : activeTab === 'runs' ? renderRuns()
        : activeTab === 'salaries' ? renderSalaries()
        : activeTab === 'components' ? renderComponents()
        : renderPayslips()
        }
      </div>
    </div>
  );
}
