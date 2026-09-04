'use client';

/**
 * FusionOS Company Management Page
 * Enterprise company workspace with real API data.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { FilterBar } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { KpiSkeleton, TableSkeleton } from '@/components/ui/skeleton';
import { Building2, MapPin, Plus, Globe, Phone, Mail, X, Loader2 } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  legalName?: string;
  code?: string;
  registrationNumber?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  status: string;
  createdAt: string;
}

interface CreateForm {
  name: string;
  code: string;
  legalName: string;
  email: string;
  phone: string;
  website: string;
  taxId: string;
  registrationNumber: string;
}

export default function CompanyPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm] = useState<CreateForm>({
    name: '',
    code: '',
    legalName: '',
    email: '',
    phone: '',
    website: '',
    taxId: '',
    registrationNumber: '',
  });

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        page: page.toString(),
        limit: '10',
      };
      if (search) params['search'] = search;
      if (statusFilter) params['status'] = statusFilter;

      const responseData = await apiClient.get<{ data: Company[]; meta?: { total: number; totalPages: number } }>('/organization/companies', params);
      setCompanies(responseData.data || []);
      setTotalPages(responseData.meta?.totalPages || 1);
      setTotalCount(responseData.meta?.total || 0);
    } catch {
      setCompanies([]);
    } finally {
      setLoading(false);
      setKpiLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      setCreateError('Company name and code are required');
      return;
    }
    try {
      setCreating(true);
      setCreateError('');
      await apiClient.post('/organization/companies', {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        legalName: form.legalName.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        website: form.website.trim() || undefined,
        taxId: form.taxId.trim() || undefined,
        registrationNumber: form.registrationNumber.trim() || undefined,
      });
      setShowCreateModal(false);
      setForm({ name: '', code: '', legalName: '', email: '', phone: '', website: '', taxId: '', registrationNumber: '' });
      fetchCompanies();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create company';
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  const openCreateModal = () => {
    setForm({ name: '', code: '', legalName: '', email: '', phone: '', website: '', taxId: '', registrationNumber: '' });
    setCreateError('');
    setShowCreateModal(true);
  };

  /* ── Detail View ────────────────────────────────────────────────────────── */

  if (selectedCompany) {
    return (
      <div className="min-h-full bg-background">
        <PageHeader
          title="Company Details"
          description={selectedCompany.name}
          breadcrumbs={[
            { label: 'Organization' },
            { label: 'Companies', onClick: () => setSelectedCompany(null) },
            { label: 'Details' },
          ]}
          actions={
            <button
              onClick={() => setSelectedCompany(null)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-[12px] font-medium text-muted-foreground hover:bg-secondary transition-colors"
            >
              Back to List
            </button>
          }
        />
        <div className="p-5 lg:p-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Company Info */}
            <div className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-[13px] font-semibold text-foreground">Company Information</h2>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info-light">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-foreground">{selectedCompany.name}</p>
                    {selectedCompany.legalName && <p className="text-[12px] text-muted-foreground">{selectedCompany.legalName}</p>}
                  </div>
                </div>
                <div className="border-t border-border pt-3 space-y-2">
                  {selectedCompany.registrationNumber && (
                    <div className="flex justify-between">
                      <span className="text-[12px] text-muted-foreground">Registration No.</span>
                      <span className="text-[12px] font-medium text-foreground">{selectedCompany.registrationNumber}</span>
                    </div>
                  )}
                  {selectedCompany.taxId && (
                    <div className="flex justify-between">
                      <span className="text-[12px] text-muted-foreground">Tax ID</span>
                      <span className="text-[12px] font-medium text-foreground">{selectedCompany.taxId}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[12px] text-muted-foreground">Status</span>
                    <StatusBadge status={selectedCompany.status} />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-[13px] font-semibold text-foreground">Contact Information</h2>
              </div>
              <div className="p-4 space-y-3">
                {selectedCompany.email && (
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[13px] text-muted-foreground">{selectedCompany.email}</span>
                  </div>
                )}
                {selectedCompany.phone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[13px] text-muted-foreground">{selectedCompany.phone}</span>
                  </div>
                )}
                {selectedCompany.website && (
                  <div className="flex items-center gap-2.5">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[13px] text-muted-foreground">{selectedCompany.website}</span>
                  </div>
                )}
                {selectedCompany.address && (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="text-[13px] text-muted-foreground">
                      <p>{selectedCompany.address}</p>
                      {selectedCompany.city && <p>{selectedCompany.city}{selectedCompany.state ? `, ${selectedCompany.state}` : ''}</p>}
                      {selectedCompany.country && <p>{selectedCompany.postalCode ? `${selectedCompany.postalCode} ` : ''}{selectedCompany.country}</p>}
                    </div>
                  </div>
                )}
                {!selectedCompany.email && !selectedCompany.phone && !selectedCompany.website && !selectedCompany.address && (
                  <p className="text-[12px] text-muted-foreground">No contact information available</p>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-[13px] font-semibold text-foreground">Additional Details</h2>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-[12px] text-muted-foreground">Created</span>
                  <span className="text-[12px] font-medium text-foreground">{new Date(selectedCompany.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── List View ──────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-full bg-background">
      <PageHeader
        title="Companies"
        description="Manage company information and settings"
        breadcrumbs={[{ label: 'Organization' }, { label: 'Companies' }]}
        actions={
          <button
            onClick={openCreateModal}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[12px] font-medium text-primary-foreground hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Company
          </button>
        }
      />

      <div className="px-5 py-4 lg:px-6">
        {/* KPI Row */}
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {kpiLoading ? (
            Array.from({ length: 3 }).map((_, i) => <KpiSkeleton key={i} />)
          ) : (
            <>
              <KpiCard label="Total Companies" value={totalCount} icon={Building2} iconBg="bg-info-light" iconColor="text-primary" />
              <KpiCard label="Active" value={companies.filter(c => c.status === 'ACTIVE').length} icon={Globe} iconBg="bg-success-light" iconColor="text-success" />
              <KpiCard label="Inactive" value={companies.filter(c => c.status === 'INACTIVE').length} icon={Building2} iconBg="bg-secondary" iconColor="text-muted-foreground" />
            </>
          )}
        </div>

        {/* Filters */}
        <FilterBar
          search={search}
          searchPlaceholder="Search companies..."
          onSearchChange={(val) => { setSearch(val); setPage(1); }}
          filters={[
            {
              key: 'status',
              label: 'All Status',
              value: statusFilter,
              options: [
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
              ],
              onChange: (val) => { setStatusFilter(val); setPage(1); },
            },
          ]}
          activeFilterCount={statusFilter ? 1 : 0}
          onClearFilters={() => { setStatusFilter(''); setSearch(''); setPage(1); }}
        />

        {/* Table */}
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : companies.length === 0 ? (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <EmptyState
              icon={Building2}
              title="No companies found"
              description="Add your first company to get started."
              action={
                <button
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground hover:bg-primary-hover"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Company
                </button>
              }
            />
          </div>
        ) : (
          <DataTable
            columns={[
              {
                key: 'name',
                label: 'Company',
                render: (item: Company) => (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info-light">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-foreground">{item.name}</p>
                      {item.legalName && <p className="text-[11px] text-muted-foreground">{item.legalName}</p>}
                    </div>
                  </div>
                ),
              },
              {
                key: 'email',
                label: 'Email',
                render: (item: Company) => (
                  <span className="text-[13px] text-muted-foreground">{item.email || '—'}</span>
                ),
              },
              {
                key: 'phone',
                label: 'Phone',
                render: (item: Company) => (
                  <span className="text-[13px] text-muted-foreground">{item.phone || '—'}</span>
                ),
              },
              {
                key: 'country',
                label: 'Location',
                render: (item: Company) => (
                  <span className="text-[13px] text-muted-foreground">{item.city ? `${item.city}, ${item.country || ''}` : item.country || '—'}</span>
                ),
              },
              {
                key: 'status',
                label: 'Status',
                render: (item: Company) => <StatusBadge status={item.status} />,
              },
            ]}
            data={companies}
            page={page}
            totalPages={totalPages}
            total={totalCount}
            limit={10}
            onPageChange={setPage}
            onRowClick={(item) => setSelectedCompany(item)}
          />
        )}
      </div>

      {/* ═══ Create Company Modal ═══ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-[16px] font-semibold text-foreground">Add Company</h2>
                <p className="mt-0.5 text-[12px] text-muted-foreground">Create a new company in your organization</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-4 space-y-4">
              {createError && (
                <div className="rounded-lg bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                  {createError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                    Company Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Acme Corporation"
                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                    Company Code <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. ACME"
                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">Uppercase, letters, numbers, hyphens</p>
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-foreground">Legal Name</label>
                  <input
                    type="text"
                    value={form.legalName}
                    onChange={(e) => setForm(f => ({ ...f, legalName: e.target.value }))}
                    placeholder="e.g. Acme Corporation Inc."
                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-foreground">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="info@acme.com"
                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-foreground">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+1 234 567 890"
                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-foreground">Website</label>
                  <input
                    type="url"
                    value={form.website}
                    onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))}
                    placeholder="https://acme.com"
                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-foreground">Tax ID</label>
                  <input
                    type="text"
                    value={form.taxId}
                    onChange={(e) => setForm(f => ({ ...f, taxId: e.target.value }))}
                    placeholder="e.g. 12-3456789"
                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-foreground">Registration No.</label>
                  <input
                    type="text"
                    value={form.registrationNumber}
                    onChange={(e) => setForm(f => ({ ...f, registrationNumber: e.target.value }))}
                    placeholder="e.g. REG-2024-001"
                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="inline-flex h-8 items-center rounded-md border border-border px-3 text-[12px] font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !form.name.trim() || !form.code.trim()}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-4 text-[12px] font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    Create Company
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
