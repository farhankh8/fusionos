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
import { Building2, MapPin, Users, Plus, Globe, Phone, Mail } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  legalName?: string;
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

  /* ── Detail View ────────────────────────────────────────────────────────── */

  if (selectedCompany) {
    return (
      <div className="min-h-full bg-[#F8FAFC]">
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
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#E2E8F0] px-3 text-[12px] font-medium text-[#64748B] hover:bg-[#F8FAFC] transition-colors"
            >
              Back to List
            </button>
          }
        />
        <div className="p-5 lg:p-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Company Info */}
            <div className="rounded-lg border border-[#E2E8F0] bg-white">
              <div className="border-b border-[#E2E8F0] px-4 py-3">
                <h2 className="text-[13px] font-semibold text-[#0F172A]">Company Information</h2>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EFF6FF]">
                    <Building2 className="h-5 w-5 text-[#2563EB]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[#0F172A]">{selectedCompany.name}</p>
                    {selectedCompany.legalName && <p className="text-[12px] text-[#64748B]">{selectedCompany.legalName}</p>}
                  </div>
                </div>
                <div className="border-t border-[#E2E8F0] pt-3 space-y-2">
                  {selectedCompany.registrationNumber && (
                    <div className="flex justify-between">
                      <span className="text-[12px] text-[#64748B]">Registration No.</span>
                      <span className="text-[12px] font-medium text-[#0F172A]">{selectedCompany.registrationNumber}</span>
                    </div>
                  )}
                  {selectedCompany.taxId && (
                    <div className="flex justify-between">
                      <span className="text-[12px] text-[#64748B]">Tax ID</span>
                      <span className="text-[12px] font-medium text-[#0F172A]">{selectedCompany.taxId}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[12px] text-[#64748B]">Status</span>
                    <StatusBadge status={selectedCompany.status} />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="rounded-lg border border-[#E2E8F0] bg-white">
              <div className="border-b border-[#E2E8F0] px-4 py-3">
                <h2 className="text-[13px] font-semibold text-[#0F172A]">Contact Information</h2>
              </div>
              <div className="p-4 space-y-3">
                {selectedCompany.email && (
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 text-[#64748B]" />
                    <span className="text-[13px] text-[#475569]">{selectedCompany.email}</span>
                  </div>
                )}
                {selectedCompany.phone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 text-[#64748B]" />
                    <span className="text-[13px] text-[#475569]">{selectedCompany.phone}</span>
                  </div>
                )}
                {selectedCompany.website && (
                  <div className="flex items-center gap-2.5">
                    <Globe className="h-4 w-4 text-[#64748B]" />
                    <span className="text-[13px] text-[#475569]">{selectedCompany.website}</span>
                  </div>
                )}
                {selectedCompany.address && (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 text-[#64748B] mt-0.5" />
                    <div className="text-[13px] text-[#475569]">
                      <p>{selectedCompany.address}</p>
                      {selectedCompany.city && <p>{selectedCompany.city}{selectedCompany.state ? `, ${selectedCompany.state}` : ''}</p>}
                      {selectedCompany.country && <p>{selectedCompany.postalCode ? `${selectedCompany.postalCode} ` : ''}{selectedCompany.country}</p>}
                    </div>
                  </div>
                )}
                {!selectedCompany.email && !selectedCompany.phone && !selectedCompany.website && !selectedCompany.address && (
                  <p className="text-[12px] text-[#94A3B8]">No contact information available</p>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="rounded-lg border border-[#E2E8F0] bg-white">
              <div className="border-b border-[#E2E8F0] px-4 py-3">
                <h2 className="text-[13px] font-semibold text-[#0F172A]">Additional Details</h2>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-[12px] text-[#64748B]">Created</span>
                  <span className="text-[12px] font-medium text-[#0F172A]">{new Date(selectedCompany.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
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
    <div className="min-h-full bg-[#F8FAFC]">
      <PageHeader
        title="Companies"
        description="Manage company information and settings"
        breadcrumbs={[{ label: 'Organization' }, { label: 'Companies' }]}
        actions={
          <button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#2563EB] px-3 text-[12px] font-medium text-white hover:bg-[#1D4ED8] transition-colors">
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
              <KpiCard label="Total Companies" value={totalCount} icon={Building2} iconBg="bg-[#EFF6FF]" iconColor="text-[#2563EB]" />
              <KpiCard label="Active" value={companies.filter(c => c.status === 'ACTIVE').length} icon={Globe} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
              <KpiCard label="Inactive" value={companies.filter(c => c.status === 'INACTIVE').length} icon={Building2} iconBg="bg-gray-50" iconColor="text-gray-600" />
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
          <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
            <EmptyState
              icon={Building2}
              title="No companies found"
              description="Add your first company to get started."
              action={
                <button className="inline-flex items-center gap-1.5 rounded-md bg-[#2563EB] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#1D4ED8]">
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
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF6FF]">
                      <Building2 className="h-4 w-4 text-[#2563EB]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-[#0F172A]">{item.name}</p>
                      {item.legalName && <p className="text-[11px] text-[#64748B]">{item.legalName}</p>}
                    </div>
                  </div>
                ),
              },
              {
                key: 'email',
                label: 'Email',
                render: (item: Company) => (
                  <span className="text-[13px] text-[#475569]">{item.email || '—'}</span>
                ),
              },
              {
                key: 'phone',
                label: 'Phone',
                render: (item: Company) => (
                  <span className="text-[13px] text-[#475569]">{item.phone || '—'}</span>
                ),
              },
              {
                key: 'country',
                label: 'Location',
                render: (item: Company) => (
                  <span className="text-[13px] text-[#475569]">{item.city ? `${item.city}, ${item.country || ''}` : item.country || '—'}</span>
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
    </div>
  );
}
