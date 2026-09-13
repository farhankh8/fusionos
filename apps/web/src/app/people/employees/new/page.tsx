'use client';

/**
 * FusionOS — Add Employee
 *
 * Multi-step enterprise employee creation workflow.
 * Left-side vertical stepper + right-side form workspace.
 *
 * Steps:
 *  1. Master Details
 *  2. Employment
 *  3. Compensation
 *  4. Additional Details
 *  5. Review & Confirm
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  Check,
  ChevronRight,
  User,
  Briefcase,
  DollarSign,
  FileText,
  ClipboardCheck,
  ArrowLeft,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────────── */

interface OrgEntity {
  id: string;
  name: string;
  code?: string;
}

interface FormData {
  // Step 1 — Master Details
  firstName: string;
  middleName: string;
  lastName: string;
  preferredName: string;
  employeeCode: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  nationality: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
  emergencyContactEmail: string;

  // Step 2 — Employment
  companyId: string;
  branchId: string;
  departmentId: string;
  teamId: string;
  designationId: string;
  managerId: string;
  employmentType: string;
  workLocation: string;
  timezone: string;
  joiningDate: string;
  probationEndDate: string;
  confirmationDate: string;

  // Step 3 — Compensation
  currency: string;
  basicSalary: string;

  // Step 4 — Additional
  notes: string;
}

const INITIAL_FORM: FormData = {
  firstName: '', middleName: '', lastName: '', preferredName: '',
  employeeCode: '', email: '', phone: '', dateOfBirth: '',
  gender: '', maritalStatus: '', nationality: '',
  addressLine1: '', addressLine2: '', city: '', state: '', country: '', postalCode: '',
  emergencyContactName: '', emergencyContactRelation: '', emergencyContactPhone: '', emergencyContactEmail: '',
  companyId: '', branchId: '', departmentId: '', teamId: '', designationId: '', managerId: '',
  employmentType: 'FULL_TIME', workLocation: '', timezone: '',
  joiningDate: '', probationEndDate: '', confirmationDate: '',
  currency: 'USD', basicSalary: '',
  notes: '',
};

const STEPS = [
  { id: 1, label: 'Master Details', icon: User },
  { id: 2, label: 'Employment', icon: Briefcase },
  { id: 3, label: 'Compensation', icon: DollarSign },
  { id: 4, label: 'Additional Details', icon: FileText },
  { id: 5, label: 'Review & Confirm', icon: ClipboardCheck },
];

/* ── Main Component ────────────────────────────────────────────────────── */

export default function AddEmployeePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [serverError, setServerError] = useState('');

  // Organization data for selectors
  const [companies, setCompanies] = useState<OrgEntity[]>([]);
  const [branches, setBranches] = useState<OrgEntity[]>([]);
  const [departments, setDepartments] = useState<OrgEntity[]>([]);
  const [teams, setTeams] = useState<OrgEntity[]>([]);
  const [designations, setDesignations] = useState<OrgEntity[]>([]);
  const [managers, setManagers] = useState<{ id: string; firstName: string; lastName: string; employeeCode: string }[]>([]);
  const [orgLoading, setOrgLoading] = useState(true);

  const updateField = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  /* ── Load organization data ─────────────────────────────────────────── */

  useEffect(() => {
    async function loadOrg() {
      try {
        const [compData, empData] = await Promise.all([
          apiClient.get<{ data: OrgEntity[] }>('/organization/companies', { limit: '100' }),
          apiClient.get<{ data: { id: string; firstName: string; lastName: string; employeeCode: string }[] }>('/employees', { limit: '200' }),
        ]);
        setCompanies(compData.data || []);
        setManagers(empData.data || []);
      } catch { /* unavailable */ }
      setOrgLoading(false);
    }
    loadOrg();
  }, []);

  // Load branches/departments/teams/designations when company changes
  useEffect(() => {
    if (!form.companyId) return;
    async function loadCompanyData() {
      try {
        const [b, d, t, des] = await Promise.all([
          apiClient.get<{ data: OrgEntity[] }>('/organization/branches', { companyId: form.companyId, limit: '100' }),
          apiClient.get<{ data: OrgEntity[] }>('/organization/departments', { companyId: form.companyId, limit: '100' }),
          apiClient.get<{ data: OrgEntity[] }>('/organization/teams', { companyId: form.companyId, limit: '100' }),
          apiClient.get<{ data: OrgEntity[] }>('/organization/designations', { companyId: form.companyId, limit: '100' }),
        ]);
        setBranches(b.data || []);
        setDepartments(d.data || []);
        setTeams(t.data || []);
        setDesignations(des.data || []);
      } catch { /* partial load ok */ }
    }
    loadCompanyData();
  }, [form.companyId]);

  /* ── Validation ──────────────────────────────────────────────────────── */

  const validateStep = useCallback((s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!form.firstName.trim()) e.firstName = 'Required';
      if (!form.lastName.trim()) e.lastName = 'Required';
      if (!form.email.trim()) e.email = 'Required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
      if (!form.phone.trim()) e.phone = 'Required';
    }
    if (s === 2) {
      if (!form.companyId) e.companyId = 'Required';
      if (!form.designationId) e.designationId = 'Required';
      if (!form.joiningDate) e.joiningDate = 'Required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form]);

  const nextStep = () => { if (validateStep(step) && step < 5) setStep(step + 1); };
  const prevStep = () => { if (step > 1) setStep(step - 1); };

  /* ── Submit ──────────────────────────────────────────────────────────── */

  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2)) { setStep(1); return; }
    setSubmitting(true);
    setServerError('');
    try {
      const payload: Record<string, unknown> = {
        companyId: form.companyId,
        employeeCode: form.employeeCode || `EMP-${Date.now().toString(36).toUpperCase()}`,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        joiningDate: form.joiningDate,
      };
      if (form.middleName) payload.middleName = form.middleName;
      if (form.preferredName) payload.preferredName = form.preferredName;
      if (form.phone) payload.phone = form.phone;
      if (form.dateOfBirth) payload.dateOfBirth = form.dateOfBirth;
      if (form.gender) payload.gender = form.gender;
      if (form.maritalStatus) payload.maritalStatus = form.maritalStatus;
      if (form.nationality) payload.nationality = form.nationality;
      if (form.addressLine1) payload.address = { line1: form.addressLine1, line2: form.addressLine2, city: form.city, state: form.state, country: form.country, postalCode: form.postalCode };
      if (form.emergencyContactName) payload.emergencyContactName = form.emergencyContactName;
      if (form.emergencyContactPhone) payload.emergencyContactPhone = form.emergencyContactPhone;
      if (form.emergencyContactRelation) payload.emergencyContactRelation = form.emergencyContactRelation;
      if (form.branchId) payload.branchId = form.branchId;
      if (form.departmentId) payload.departmentId = form.departmentId;
      if (form.teamId) payload.teamId = form.teamId;
      if (form.designationId) payload.designationId = form.designationId;
      if (form.managerId) payload.managerId = form.managerId;
      if (form.employmentType) payload.employmentType = form.employmentType;
      if (form.workLocation) payload.workLocation = form.workLocation;
      if (form.timezone) payload.timezone = form.timezone;
      if (form.probationEndDate) payload.probationEndDate = form.probationEndDate;
      if (form.confirmationDate) payload.confirmationDate = form.confirmationDate;
      if (form.currency) payload.currency = form.currency;
      if (form.basicSalary) payload.basicSalary = parseInt(form.basicSalary, 10) * 100; // Convert to minor units
      if (form.notes) payload.notes = form.notes;

      const result = await apiClient.post<{ id: string }>('/employees', payload);
      setCreatedId(result.id);
      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create employee';
      if (msg.includes('409') || msg.includes('already exists')) {
        setServerError('An employee with this code or email already exists.');
      } else if (msg.includes('400')) {
        setServerError('Invalid data. Please check all required fields.');
      } else if (msg.includes('401') || msg.includes('403')) {
        setServerError('You do not have permission to create employees.');
      } else if (msg.includes('429')) {
        setServerError('Too many requests. Please try again later.');
      } else if (msg.includes('500')) {
        setServerError('Server error. Please try again later.');
      } else {
        setServerError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Success State ──────────────────────────────────────────────────── */

  if (success) {
    return (
      <div className="min-h-full bg-[#FBF5EC]">
        <div className="px-5 py-4 lg:px-6">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h1 className="text-[18px] font-semibold text-[#1C1917]">Employee Created Successfully</h1>
              <p className="mt-1 text-[13px] text-[#57534E]">
                {form.firstName} {form.lastName} has been added to your organization.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={() => router.push(`/people/employees/${createdId}`)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#064E3B] px-3 text-[12px] font-medium text-white hover:bg-[#047857] transition-colors"
                >
                  View Employee
                </button>
                <button
                  onClick={() => { setForm(INITIAL_FORM); setSuccess(false); setStep(1); setCreatedId(null); }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#DDD0BB] px-3 text-[12px] font-medium text-[#57534E] hover:bg-[#FBF5EC] transition-colors"
                >
                  Create Another
                </button>
                <button
                  onClick={() => router.push('/people/employees')}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#DDD0BB] px-3 text-[12px] font-medium text-[#57534E] hover:bg-[#FBF5EC] transition-colors"
                >
                  Back to Employees
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main Render ────────────────────────────────────────────────────── */

  return (
    <div className="min-h-full bg-[#FBF5EC]">
      {/* Header */}
      <div className="border-b border-[#DDD0BB] bg-white">
        <div className="px-5 py-4 lg:px-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[12px] text-[#57534E]">
                <span>People</span><span>/</span>
                <button onClick={() => router.push('/people/employees')} className="hover:text-[#1C1917] transition-colors">Employees</button>
                <span>/</span>
                <span className="font-medium text-[#1C1917]">Add Employee</span>
              </div>
              <h1 className="mt-0.5 text-[18px] font-semibold text-[#1C1917]">Add New Employee</h1>
              <p className="mt-0.5 text-[13px] text-[#57534E]">Complete the following steps to create a new employee record.</p>
            </div>
            <button
              onClick={() => router.push('/people/employees')}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#DDD0BB] px-3 text-[12px] font-medium text-[#57534E] hover:bg-[#FBF5EC] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-0">
        {/* ── Stepper (Left) ──────────────────────────────────────── */}
        <div className="hidden w-60 shrink-0 border-r border-[#DDD0BB] bg-white lg:block">
          <nav className="p-4" aria-label="Employee creation steps">
            {STEPS.map((s, i) => {
              const isComplete = step > s.id;
              const isCurrent = step === s.id;
              return (
                <div key={s.id}>
                  <button
                    onClick={() => { if (isComplete) setStep(s.id); }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors',
                      isCurrent && 'bg-[#D1FAE5]',
                      !isCurrent && !isComplete && 'opacity-50 cursor-default',
                      isComplete && 'hover:bg-[#FBF5EC] cursor-pointer',
                    )}
                    disabled={!isCurrent && !isComplete}
                  >
                    <div className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                      isComplete && 'bg-[#16A34A] text-white',
                      isCurrent && 'bg-[#064E3B] text-white',
                      !isCurrent && !isComplete && 'bg-[#F5E6CC] text-[#8E7E68]',
                    )}>
                      {isComplete ? <Check className="h-3.5 w-3.5" /> : s.id}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        'text-[13px] font-medium truncate',
                        isCurrent ? 'text-[#064E3B]' : isComplete ? 'text-[#1C1917]' : 'text-[#8E7E68]',
                      )}>
                        {s.label}
                      </p>
                    </div>
                    {isComplete && <ChevronRight className="h-3.5 w-3.5 text-[#8E7E68]" />}
                  </button>
                  {i < STEPS.length - 1 && <div className="ml-6 h-4 w-px bg-[#DDD0BB]" />}
                </div>
              );
            })}
          </nav>
        </div>

        {/* ── Mobile Step Indicator ───────────────────────────────── */}
        <div className="flex lg:hidden w-full border-b border-[#DDD0BB] bg-white px-4 py-2">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold',
                  step > s.id && 'bg-[#16A34A] text-white',
                  step === s.id && 'bg-[#064E3B] text-white',
                  step < s.id && 'bg-[#F5E6CC] text-[#8E7E68]',
                )}>
                  {step > s.id ? <Check className="h-3 w-3" /> : s.id}
                </div>
                {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-[#A7F3D0]" />}
              </div>
            ))}
            <span className="ml-2 text-[12px] font-medium text-[#57534E]">
              Step {step}: {STEPS[step - 1]?.label ?? ''}
            </span>
          </div>
        </div>

        {/* ── Form Workspace (Right) ─────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl p-6">
            {/* Server Error */}
            {serverError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-[13px] text-red-700">{serverError}</p>
              </div>
            )}

            {/* Step 1 — Master Details */}
            {step === 1 && (
              <div className="space-y-6">
                <SectionTitle title="Personal Information" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First Name" required value={form.firstName} onChange={v => updateField('firstName', v)} error={errors.firstName} />
                  <Field label="Middle Name" value={form.middleName} onChange={v => updateField('middleName', v)} />
                  <Field label="Last Name" required value={form.lastName} onChange={v => updateField('lastName', v)} error={errors.lastName} />
                  <Field label="Preferred Name" value={form.preferredName} onChange={v => updateField('preferredName', v)} />
                  <Field label="Employee Code" value={form.employeeCode} onChange={v => updateField('employeeCode', v.toUpperCase())} placeholder="Auto-generated if empty" />
                  <Field label="Work Email" required type="email" value={form.email} onChange={v => updateField('email', v)} error={errors.email} />
                  <Field label="Mobile Number" required value={form.phone} onChange={v => updateField('phone', v)} error={errors.phone} />
                  <Field label="Date of Birth" type="date" value={form.dateOfBirth} onChange={v => updateField('dateOfBirth', v)} />
                  <SelectField label="Gender" value={form.gender} onChange={v => updateField('gender', v)} options={[{ value: '', label: 'Select' }, { value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }, { value: 'OTHER', label: 'Other' }, { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' }]} />
                  <SelectField label="Marital Status" value={form.maritalStatus} onChange={v => updateField('maritalStatus', v)} options={[{ value: '', label: 'Select' }, { value: 'SINGLE', label: 'Single' }, { value: 'MARRIED', label: 'Married' }, { value: 'DIVORCED', label: 'Divorced' }, { value: 'WIDOWED', label: 'Widowed' }, { value: 'OTHER', label: 'Other' }]} />
                  <Field label="Nationality" value={form.nationality} onChange={v => updateField('nationality', v)} />
                </div>

                <SectionTitle title="Address" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Address Line 1" value={form.addressLine1} onChange={v => updateField('addressLine1', v)} className="sm:col-span-2" />
                  <Field label="Address Line 2" value={form.addressLine2} onChange={v => updateField('addressLine2', v)} className="sm:col-span-2" />
                  <Field label="City" value={form.city} onChange={v => updateField('city', v)} />
                  <Field label="State" value={form.state} onChange={v => updateField('state', v)} />
                  <Field label="Country" value={form.country} onChange={v => updateField('country', v)} />
                  <Field label="Postal Code" value={form.postalCode} onChange={v => updateField('postalCode', v)} />
                </div>

                <SectionTitle title="Emergency Contact" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Contact Name" value={form.emergencyContactName} onChange={v => updateField('emergencyContactName', v)} />
                  <Field label="Relationship" value={form.emergencyContactRelation} onChange={v => updateField('emergencyContactRelation', v)} />
                  <Field label="Phone" value={form.emergencyContactPhone} onChange={v => updateField('emergencyContactPhone', v)} />
                  <Field label="Email" type="email" value={form.emergencyContactEmail} onChange={v => updateField('emergencyContactEmail', v)} />
                </div>
              </div>
            )}

            {/* Step 2 — Employment */}
            {step === 2 && (
              <div className="space-y-6">
                <SectionTitle title="Organization" />
                {orgLoading ? (
                  <div className="flex items-center gap-2 text-[13px] text-[#57534E]">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading organization data...
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <EntitySelect label="Company" required value={form.companyId} onChange={v => { updateField('companyId', v); updateField('branchId', ''); updateField('departmentId', ''); updateField('teamId', ''); updateField('designationId', ''); }} options={companies} error={errors.companyId} />
                    <EntitySelect label="Branch" value={form.branchId} onChange={v => updateField('branchId', v)} options={branches} disabled={!form.companyId} />
                    <EntitySelect label="Department" value={form.departmentId} onChange={v => updateField('departmentId', v)} options={departments} disabled={!form.companyId} />
                    <EntitySelect label="Team" value={form.teamId} onChange={v => updateField('teamId', v)} options={teams} disabled={!form.companyId} />
                    <EntitySelect label="Designation" required value={form.designationId} onChange={v => updateField('designationId', v)} options={designations} error={errors.designationId} disabled={!form.companyId} />
                    <EntitySelect label="Reporting Manager" value={form.managerId} onChange={v => updateField('managerId', v)} options={managers.map(m => ({ id: m.id, name: `${m.firstName} ${m.lastName} (${m.employeeCode})` }))} disabled={!form.companyId} />
                  </div>
                )}

                <SectionTitle title="Employment Details" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField label="Employment Type" value={form.employmentType} onChange={v => updateField('employmentType', v)} options={[{ value: 'FULL_TIME', label: 'Full Time' }, { value: 'PART_TIME', label: 'Part Time' }, { value: 'CONTRACT', label: 'Contract' }, { value: 'INTERN', label: 'Intern' }, { value: 'TEMPORARY', label: 'Temporary' }]} />
                  <Field label="Work Location" value={form.workLocation} onChange={v => updateField('workLocation', v)} placeholder="e.g. Office, Remote, Hybrid" />
                  <Field label="Timezone" value={form.timezone} onChange={v => updateField('timezone', v)} placeholder="e.g. UTC, America/New_York" />
                  <Field label="Joining Date" required type="date" value={form.joiningDate} onChange={v => updateField('joiningDate', v)} error={errors.joiningDate} />
                  <Field label="Probation End Date" type="date" value={form.probationEndDate} onChange={v => updateField('probationEndDate', v)} />
                  <Field label="Confirmation Date" type="date" value={form.confirmationDate} onChange={v => updateField('confirmationDate', v)} />
                </div>
              </div>
            )}

            {/* Step 3 — Compensation */}
            {step === 3 && (
              <div className="space-y-6">
                <SectionTitle title="Compensation" />
                <p className="text-[12px] text-[#57534E] -mt-4">
                  Basic compensation details. Detailed payroll structures are managed in the Payroll module.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField label="Currency" value={form.currency} onChange={v => updateField('currency', v)} options={[{ value: 'USD', label: 'USD — US Dollar' }, { value: 'EUR', label: 'EUR — Euro' }, { value: 'GBP', label: 'GBP — British Pound' }, { value: 'INR', label: 'INR — Indian Rupee' }, { value: 'CAD', label: 'CAD — Canadian Dollar' }, { value: 'AUD', label: 'AUD — Australian Dollar' }, { value: 'SGD', label: 'SGD — Singapore Dollar' }]} />
                  <Field label="Basic Salary (per month)" type="number" value={form.basicSalary} onChange={v => updateField('basicSalary', v)} placeholder="e.g. 5000" />
                </div>
                {form.basicSalary && (
                  <div className="rounded-lg border border-[#DDD0BB] bg-[#FBF5EC] p-4">
                    <p className="text-[12px] font-medium text-[#57534E] mb-2">Compensation Summary</p>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[13px] text-[#57534E]">Basic Salary</span>
                        <span className="text-[13px] font-medium text-[#1C1917]">{form.currency} {parseInt(form.basicSalary || '0').toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[13px] text-[#57534E]">Currency</span>
                        <span className="text-[13px] font-medium text-[#1C1917]">{form.currency}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4 — Additional Details */}
            {step === 4 && (
              <div className="space-y-6">
                <SectionTitle title="Additional Information" />
                <div className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-medium text-[#57534E] mb-1">Notes</label>
                    <textarea
                      value={form.notes}
                      onChange={e => updateField('notes', e.target.value)}
                      rows={4}
                      className="w-full rounded-md border border-[#DDD0BB] bg-white px-3 py-2 text-[13px] text-[#1C1917] placeholder:text-[#8E7E68] focus:border-[#064E3B] focus:outline-none focus:ring-1 focus:ring-[#064E3B] resize-none"
                      placeholder="Any additional notes about this employee..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 5 — Review & Confirm */}
            {step === 5 && (
              <div className="space-y-6">
                <SectionTitle title="Review & Confirm" />
                <p className="text-[12px] text-[#57534E] -mt-4">
                  Review all information before creating the employee record.
                </p>

                <ReviewSection
                  title="Personal Information"
                  onEdit={() => setStep(1)}
                  items={[
                    { label: 'Name', value: [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ') },
                    { label: 'Email', value: form.email },
                    { label: 'Phone', value: form.phone },
                    { label: 'Employee Code', value: form.employeeCode || 'Auto-generated' },
                    { label: 'Date of Birth', value: form.dateOfBirth },
                    { label: 'Gender', value: form.gender?.replace(/_/g, ' ') },
                    { label: 'Nationality', value: form.nationality },
                    { label: 'Address', value: [form.addressLine1, form.city, form.state, form.country].filter(Boolean).join(', ') },
                    { label: 'Emergency Contact', value: [form.emergencyContactName, form.emergencyContactRelation, form.emergencyContactPhone].filter(Boolean).join(' · ') },
                  ].filter(i => i.value)}
                />

                <ReviewSection
                  title="Organization & Employment"
                  onEdit={() => setStep(2)}
                  items={[
                    { label: 'Company', value: companies.find(c => c.id === form.companyId)?.name },
                    { label: 'Branch', value: branches.find(b => b.id === form.branchId)?.name },
                    { label: 'Department', value: departments.find(d => d.id === form.departmentId)?.name },
                    { label: 'Team', value: teams.find(t => t.id === form.teamId)?.name },
                    { label: 'Designation', value: designations.find(d => d.id === form.designationId)?.name },
                    { label: 'Reporting Manager', value: managers.find(m => m.id === form.managerId)?.firstName ? `${managers.find(m => m.id === form.managerId)!.firstName} ${managers.find(m => m.id === form.managerId)!.lastName}` : undefined },
                    { label: 'Employment Type', value: form.employmentType?.replace(/_/g, ' ') },
                    { label: 'Work Location', value: form.workLocation },
                    { label: 'Joining Date', value: form.joiningDate },
                    { label: 'Probation End', value: form.probationEndDate },
                  ].filter(i => i.value)}
                />

                <ReviewSection
                  title="Compensation"
                  onEdit={() => setStep(3)}
                  items={[
                    { label: 'Currency', value: form.currency },
                    { label: 'Basic Salary', value: form.basicSalary ? `${form.currency} ${parseInt(form.basicSalary).toLocaleString()}` : undefined },
                  ].filter(i => i.value)}
                />

                <ReviewSection
                  title="Additional Details"
                  onEdit={() => setStep(4)}
                  items={[
                    { label: 'Notes', value: form.notes },
                    { label: 'Timezone', value: form.timezone },
                  ].filter(i => i.value)}
                />
              </div>
            )}

            {/* ── Navigation ─────────────────────────────────────── */}
            <div className="mt-8 flex items-center justify-between border-t border-[#DDD0BB] pt-4">
              <button
                onClick={prevStep}
                disabled={step === 1}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#DDD0BB] px-3 text-[12px] font-medium text-[#57534E] hover:bg-[#FBF5EC] transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Previous
              </button>
              <div className="flex items-center gap-2">
                {step < 5 ? (
                  <button
                    onClick={nextStep}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#064E3B] px-3 text-[12px] font-medium text-white hover:bg-[#047857] transition-colors"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#16A34A] px-3 text-[12px] font-medium text-white hover:bg-[#15803D] transition-colors disabled:opacity-50"
                  >
                    {submitting ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating...</>
                    ) : (
                      <><Check className="h-3.5 w-3.5" /> Create Employee</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-[15px] font-semibold text-[#1C1917]">{title}</h2>;
}

function Field({
  label, required, type = 'text', value, onChange, placeholder, error, className,
}: {
  label: string; required?: boolean; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; error?: string; className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-[12px] font-medium text-[#57534E] mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-8 w-full rounded-md border bg-white px-3 text-[13px] text-[#1C1917] placeholder:text-[#8E7E68] focus:outline-none focus:ring-1',
          error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-[#DDD0BB] focus:border-[#064E3B] focus:ring-[#064E3B]',
        )}
      />
      {error && <p className="mt-0.5 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

function SelectField({
  label, value, onChange, options, className,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-[12px] font-medium text-[#57534E] mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-8 w-full rounded-md border border-[#DDD0BB] bg-white px-2.5 text-[13px] text-[#1C1917] focus:border-[#064E3B] focus:outline-none focus:ring-1 focus:ring-[#064E3B]"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function EntitySelect({
  label, required, value, onChange, options, error, disabled,
}: {
  label: string; required?: boolean; value: string; onChange: (v: string) => void;
  options: { id: string; name: string }[]; error?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-[#57534E] mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'h-8 w-full rounded-md border bg-white px-2.5 text-[13px] text-[#1C1917] focus:outline-none focus:ring-1',
          error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-[#DDD0BB] focus:border-[#064E3B] focus:ring-[#064E3B]',
          disabled && 'bg-[#FBF5EC] text-[#8E7E68] cursor-not-allowed',
        )}
      >
        <option value="">{disabled ? 'Select company first' : 'Select'}</option>
        {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      {error && <p className="mt-0.5 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

function ReviewSection({
  title, onEdit, items,
}: {
  title: string; onEdit: () => void; items: { label: string; value: string | undefined }[];
}) {
  return (
    <div className="rounded-lg border border-[#DDD0BB] bg-white">
      <div className="flex items-center justify-between border-b border-[#DDD0BB] px-4 py-3">
        <h3 className="text-[13px] font-semibold text-[#1C1917]">{title}</h3>
        <button onClick={onEdit} className="text-[12px] font-medium text-[#064E3B] hover:text-[#047857] transition-colors">
          Edit
        </button>
      </div>
      <div className="p-4 grid gap-2 sm:grid-cols-2">
        {items.map(item => (
          <div key={item.label} className="flex justify-between sm:block">
            <span className="text-[11px] text-[#8E7E68]">{item.label}</span>
            <span className="text-[13px] font-medium text-[#1C1917] sm:block">{item.value || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
