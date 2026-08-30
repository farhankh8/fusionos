'use client';

/**
 * FusionOS — Employee Edit
 *
 * Edit employee details using the same form architecture as Add Employee.
 * Pre-populates existing values. Respects immutable fields.
 */

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────────── */

interface OrgEntity { id: string; name: string; }

interface Employee {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  preferredName?: string;
  employeeCode: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  address?: { line1?: string; line2?: string; city?: string; state?: string; country?: string; postalCode?: string };
  companyId: string;
  branchId?: string;
  departmentId?: string;
  teamId?: string;
  designationId?: string;
  managerId?: string;
  employmentType?: string;
  workLocation?: string;
  timezone?: string;
  joiningDate: string;
  probationEndDate?: string;
  confirmationDate?: string;
  currency?: string;
  basicSalary?: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  notes?: string;
}

/* ── Main Component ────────────────────────────────────────────────────── */

export default function EmployeeEditPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const employeeId = params.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);

  // Form state
  const [form, setForm] = useState({
    firstName: '', middleName: '', lastName: '', preferredName: '', email: '', phone: '',
    dateOfBirth: '', gender: '', maritalStatus: '', nationality: '',
    addressLine1: '', addressLine2: '', city: '', state: '', country: '', postalCode: '',
    emergencyContactName: '', emergencyContactRelation: '', emergencyContactPhone: '',
    companyId: '', branchId: '', departmentId: '', teamId: '', designationId: '', managerId: '',
    employmentType: 'FULL_TIME', workLocation: '', timezone: '',
    joiningDate: '', probationEndDate: '', confirmationDate: '',
    currency: 'USD', basicSalary: '', notes: '',
  });

  // Org data
  const [companies, setCompanies] = useState<OrgEntity[]>([]);
  const [branches, setBranches] = useState<OrgEntity[]>([]);
  const [departments, setDepartments] = useState<OrgEntity[]>([]);
  const [teams, setTeams] = useState<OrgEntity[]>([]);
  const [designations, setDesignations] = useState<OrgEntity[]>([]);
  const [managers, setManagers] = useState<{ id: string; firstName: string; lastName: string; employeeCode: string }[]>([]);

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    if (saveError) setSaveError('');
  };

  /* ── Load employee + org data ───────────────────────────────────── */

  const loadEmployee = useCallback(async () => {
    try {
      setLoading(true);
      const [emp, compData, empData] = await Promise.all([
        apiClient.get<Employee>(`/employees/${employeeId}`),
        apiClient.get<{ data: OrgEntity[] }>('/organization/companies', { limit: '100' }),
        apiClient.get<{ data: { id: string; firstName: string; lastName: string; employeeCode: string }[] }>('/employees', { limit: '200' }),
      ]);

      setCompanies(compData.data || []);
      setManagers(empData.data || []);

      // Populate form
      const addr = emp.address as Record<string, string> | undefined;
      setForm({
        firstName: emp.firstName || '',
        middleName: emp.middleName || '',
        lastName: emp.lastName || '',
        preferredName: emp.preferredName || '',
        email: emp.email || '',
        phone: emp.phone || '',
        dateOfBirth: emp.dateOfBirth ? emp.dateOfBirth.slice(0, 10) : '',
        gender: emp.gender || '',
        maritalStatus: emp.maritalStatus || '',
        nationality: emp.nationality || '',
        addressLine1: addr?.line1 || '',
        addressLine2: addr?.line2 || '',
        city: addr?.city || '',
        state: addr?.state || '',
        country: addr?.country || '',
        postalCode: addr?.postalCode || '',
        emergencyContactName: emp.emergencyContactName || '',
        emergencyContactRelation: emp.emergencyContactRelation || '',
        emergencyContactPhone: emp.emergencyContactPhone || '',
        companyId: emp.companyId || '',
        branchId: emp.branchId || '',
        departmentId: emp.departmentId || '',
        teamId: emp.teamId || '',
        designationId: emp.designationId || '',
        managerId: emp.managerId || '',
        employmentType: emp.employmentType || 'FULL_TIME',
        workLocation: emp.workLocation || '',
        timezone: emp.timezone || '',
        joiningDate: emp.joiningDate ? emp.joiningDate.slice(0, 10) : '',
        probationEndDate: emp.probationEndDate ? emp.probationEndDate.slice(0, 10) : '',
        confirmationDate: emp.confirmationDate ? emp.confirmationDate.slice(0, 10) : '',
        currency: emp.currency || 'USD',
        basicSalary: emp.basicSalary ? String(emp.basicSalary / 100) : '',
        notes: emp.notes || '',
      });
      setHasChanges(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load employee';
      if (msg.includes('404')) setError('Employee not found');
      else if (msg.includes('403')) setError('You do not have permission to edit this employee');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { loadEmployee(); }, [loadEmployee]);

  // Load org data when company changes
  useEffect(() => {
    if (!form.companyId) return;
    async function load() {
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
      } catch { /* ok */ }
    }
    load();
  }, [form.companyId]);

  /* ── Save ──────────────────────────────────────────────────────── */

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const payload: Record<string, unknown> = {};
      payload.firstName = form.firstName;
      payload.lastName = form.lastName;
      payload.email = form.email;
      if (form.middleName !== undefined) payload.middleName = form.middleName || null;
      if (form.preferredName !== undefined) payload.preferredName = form.preferredName || null;
      if (form.phone !== undefined) payload.phone = form.phone || null;
      if (form.dateOfBirth) payload.dateOfBirth = form.dateOfBirth;
      else payload.dateOfBirth = null;
      if (form.gender) payload.gender = form.gender;
      else payload.gender = null;
      if (form.maritalStatus) payload.maritalStatus = form.maritalStatus;
      else payload.maritalStatus = null;
      payload.nationality = form.nationality || null;
      if (form.addressLine1) payload.address = { line1: form.addressLine1, line2: form.addressLine2, city: form.city, state: form.state, country: form.country, postalCode: form.postalCode };
      else payload.address = null;
      payload.emergencyContactName = form.emergencyContactName || null;
      payload.emergencyContactPhone = form.emergencyContactPhone || null;
      payload.emergencyContactRelation = form.emergencyContactRelation || null;
      payload.branchId = form.branchId || null;
      payload.departmentId = form.departmentId || null;
      payload.teamId = form.teamId || null;
      payload.designationId = form.designationId || null;
      payload.managerId = form.managerId || null;
      payload.employmentType = form.employmentType;
      payload.workLocation = form.workLocation || null;
      payload.timezone = form.timezone || null;
      if (form.probationEndDate) payload.probationEndDate = form.probationEndDate;
      else payload.probationEndDate = null;
      if (form.confirmationDate) payload.confirmationDate = form.confirmationDate;
      else payload.confirmationDate = null;
      payload.currency = form.currency || null;
      payload.basicSalary = form.basicSalary ? parseInt(form.basicSalary) * 100 : null;
      payload.notes = form.notes || null;

      await apiClient.patch(`/employees/${employeeId}`, payload);
      setHasChanges(false);
      router.push(`/people/employees/${employeeId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      if (msg.includes('403')) setSaveError('You do not have permission to update this employee.');
      else if (msg.includes('400')) setSaveError('Invalid data. Please check all fields.');
      else if (msg.includes('429')) setSaveError('Too many requests. Please try again later.');
      else if (msg.includes('500')) setSaveError('Server error. Please try again later.');
      else setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  /* ── Loading / Error States ──────────────────────────────────── */

  if (loading) {
    return (
      <div className="min-h-full bg-[#F8FAFC]">
        <PageHeader title="Edit Employee" description="Loading..." breadcrumbs={[{ label: 'People' }, { label: 'Employees' }]} />
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" />
            <p className="text-[13px] text-[#64748B]">Loading employee data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full bg-[#F8FAFC]">
        <PageHeader title="Edit Employee" breadcrumbs={[{ label: 'People' }, { label: 'Employees' }]} />
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-[#E2E8F0]" strokeWidth={1.5} />
            <p className="mt-3 text-[14px] font-medium text-[#0F172A]">{error}</p>
            <button onClick={() => router.push('/people/employees')} className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#2563EB] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#1D4ED8]">
              Back to Employees
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main Render ──────────────────────────────────────────────── */

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] bg-white">
        <div className="px-5 py-4 lg:px-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[12px] text-[#64748B]">
                <span>People</span><span>/</span>
                <button onClick={() => router.push('/people/employees')} className="hover:text-[#0F172A] transition-colors">Employees</button>
                <span>/</span>
                <button onClick={() => router.push(`/people/employees/${employeeId}`)} className="hover:text-[#0F172A] transition-colors">{form.firstName} {form.lastName}</button>
                <span>/</span>
                <span className="font-medium text-[#0F172A]">Edit</span>
              </div>
              <h1 className="mt-0.5 text-[18px] font-semibold text-[#0F172A]">Edit Employee</h1>
              <p className="mt-0.5 text-[13px] text-[#64748B]">Update employee information for {form.firstName} {form.lastName}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => hasChanges ? setShowDiscard(true) : router.push(`/people/employees/${employeeId}`)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#E2E8F0] px-3 text-[12px] font-medium text-[#64748B] hover:bg-[#F8FAFC] transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#2563EB] px-3 text-[12px] font-medium text-white hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved changes indicator */}
      {hasChanges && (
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-[12px] text-amber-800">
          ⚠ You have unsaved changes.
        </div>
      )}

      {/* Save error */}
      {saveError && (
        <div className="border-b border-red-200 bg-red-50 px-5 py-2 text-[12px] text-red-700">
          {saveError}
        </div>
      )}

      <div className="max-w-3xl p-6">
        {/* Personal Information */}
        <SectionTitle title="Personal Information" />
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <Field label="First Name" required value={form.firstName} onChange={v => updateField('firstName', v)} />
          <Field label="Middle Name" value={form.middleName} onChange={v => updateField('middleName', v)} />
          <Field label="Last Name" required value={form.lastName} onChange={v => updateField('lastName', v)} />
          <Field label="Preferred Name" value={form.preferredName} onChange={v => updateField('preferredName', v)} />
          <Field label="Work Email" required type="email" value={form.email} onChange={v => updateField('email', v)} />
          <Field label="Mobile Number" value={form.phone} onChange={v => updateField('phone', v)} />
          <Field label="Date of Birth" type="date" value={form.dateOfBirth} onChange={v => updateField('dateOfBirth', v)} />
          <SelectField label="Gender" value={form.gender} onChange={v => updateField('gender', v)} options={[{ value: '', label: 'Select' }, { value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }, { value: 'OTHER', label: 'Other' }, { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' }]} />
          <SelectField label="Marital Status" value={form.maritalStatus} onChange={v => updateField('maritalStatus', v)} options={[{ value: '', label: 'Select' }, { value: 'SINGLE', label: 'Single' }, { value: 'MARRIED', label: 'Married' }, { value: 'DIVORCED', label: 'Divorced' }, { value: 'WIDOWED', label: 'Widowed' }, { value: 'OTHER', label: 'Other' }]} />
          <Field label="Nationality" value={form.nationality} onChange={v => updateField('nationality', v)} />
        </div>

        <SectionTitle title="Address" />
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <Field label="Address Line 1" value={form.addressLine1} onChange={v => updateField('addressLine1', v)} className="sm:col-span-2" />
          <Field label="Address Line 2" value={form.addressLine2} onChange={v => updateField('addressLine2', v)} className="sm:col-span-2" />
          <Field label="City" value={form.city} onChange={v => updateField('city', v)} />
          <Field label="State" value={form.state} onChange={v => updateField('state', v)} />
          <Field label="Country" value={form.country} onChange={v => updateField('country', v)} />
          <Field label="Postal Code" value={form.postalCode} onChange={v => updateField('postalCode', v)} />
        </div>

        <SectionTitle title="Emergency Contact" />
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <Field label="Contact Name" value={form.emergencyContactName} onChange={v => updateField('emergencyContactName', v)} />
          <Field label="Relationship" value={form.emergencyContactRelation} onChange={v => updateField('emergencyContactRelation', v)} />
          <Field label="Phone" value={form.emergencyContactPhone} onChange={v => updateField('emergencyContactPhone', v)} />
        </div>

        <SectionTitle title="Organization" />
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <EntitySelect label="Company" required value={form.companyId} onChange={v => updateField('companyId', v)} options={companies} />
          <EntitySelect label="Branch" value={form.branchId} onChange={v => updateField('branchId', v)} options={branches} disabled={!form.companyId} />
          <EntitySelect label="Department" value={form.departmentId} onChange={v => updateField('departmentId', v)} options={departments} disabled={!form.companyId} />
          <EntitySelect label="Team" value={form.teamId} onChange={v => updateField('teamId', v)} options={teams} disabled={!form.companyId} />
          <EntitySelect label="Designation" value={form.designationId} onChange={v => updateField('designationId', v)} options={designations} disabled={!form.companyId} />
          <EntitySelect label="Reporting Manager" value={form.managerId} onChange={v => updateField('managerId', v)} options={managers.map(m => ({ id: m.id, name: `${m.firstName} ${m.lastName} (${m.employeeCode})` }))} disabled={!form.companyId} />
        </div>

        <SectionTitle title="Employment Details" />
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <SelectField label="Employment Type" value={form.employmentType} onChange={v => updateField('employmentType', v)} options={[{ value: 'FULL_TIME', label: 'Full Time' }, { value: 'PART_TIME', label: 'Part Time' }, { value: 'CONTRACT', label: 'Contract' }, { value: 'INTERN', label: 'Intern' }, { value: 'TEMPORARY', label: 'Temporary' }]} />
          <Field label="Work Location" value={form.workLocation} onChange={v => updateField('workLocation', v)} />
          <Field label="Timezone" value={form.timezone} onChange={v => updateField('timezone', v)} />
          <Field label="Joining Date" type="date" value={form.joiningDate} onChange={v => updateField('joiningDate', v)} />
          <Field label="Probation End Date" type="date" value={form.probationEndDate} onChange={v => updateField('probationEndDate', v)} />
          <Field label="Confirmation Date" type="date" value={form.confirmationDate} onChange={v => updateField('confirmationDate', v)} />
        </div>

        <SectionTitle title="Compensation" />
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <SelectField label="Currency" value={form.currency} onChange={v => updateField('currency', v)} options={[{ value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }, { value: 'GBP', label: 'GBP' }, { value: 'INR', label: 'INR' }, { value: 'CAD', label: 'CAD' }, { value: 'AUD', label: 'AUD' }, { value: 'SGD', label: 'SGD' }]} />
          <Field label="Basic Salary (per month)" type="number" value={form.basicSalary} onChange={v => updateField('basicSalary', v)} />
        </div>

        <SectionTitle title="Additional" />
        <div className="mb-6">
          <div>
            <label className="block text-[12px] font-medium text-[#64748B] mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => updateField('notes', e.target.value)}
              rows={3}
              className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB] resize-none"
            />
          </div>
        </div>

        {/* Bottom actions */}
        <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-4 mt-6">
          <button
            onClick={() => hasChanges ? setShowDiscard(true) : router.push(`/people/employees/${employeeId}`)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#E2E8F0] px-3 text-[12px] font-medium text-[#64748B] hover:bg-[#F8FAFC] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#2563EB] px-3 text-[12px] font-medium text-white hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Discard Confirmation Dialog */}
      {showDiscard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-sm rounded-lg border border-[#E2E8F0] bg-white p-5 shadow-lg">
            <h3 className="text-[14px] font-semibold text-[#0F172A]">Discard unsaved changes?</h3>
            <p className="mt-1 text-[13px] text-[#64748B]">You have unsaved changes. Are you sure you want to leave without saving?</p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => setShowDiscard(false)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#E2E8F0] px-3 text-[12px] font-medium text-[#64748B] hover:bg-[#F8FAFC]">
                Stay
              </button>
              <button onClick={() => router.push(`/people/employees/${employeeId}`)} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#DC2626] px-3 text-[12px] font-medium text-white hover:bg-[#B91C1C]">
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Form Sub-components ───────────────────────────────────────────────── */

function SectionTitle({ title }: { title: string }) {
  return <h2 className="mb-3 text-[15px] font-semibold text-[#0F172A]">{title}</h2>;
}

function Field({
  label, required, type = 'text', value, onChange, placeholder, error, className,
}: {
  label: string; required?: boolean; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; error?: string; className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-[12px] font-medium text-[#64748B] mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-8 w-full rounded-md border bg-white px-3 text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-1',
          error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-[#E2E8F0] focus:border-[#2563EB] focus:ring-[#2563EB]',
        )}
      />
      {error && <p className="mt-0.5 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

function SelectField({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-[#64748B] mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-8 w-full rounded-md border border-[#E2E8F0] bg-white px-2.5 text-[13px] text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function EntitySelect({
  label, required, value, onChange, options, disabled,
}: {
  label: string; required?: boolean; value: string; onChange: (v: string) => void;
  options: { id: string; name: string }[]; disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-[#64748B] mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'h-8 w-full rounded-md border border-[#E2E8F0] bg-white px-2.5 text-[13px] text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]',
          disabled && 'bg-[#F8FAFC] text-[#94A3B8] cursor-not-allowed',
        )}
      >
        <option value="">{disabled ? 'Select company first' : 'Select'}</option>
        {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );
}
