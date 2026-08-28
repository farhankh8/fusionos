'use client';

/**
 * FusionOS Company Management Page
 *
 * Displays company information with edit capabilities.
 * This is the root of the organization hierarchy.
 */

import { useState, useEffect, useCallback } from 'react';
import { Building2, Globe, Phone, Mail, MapPin, Clock, CreditCard } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  legalName?: string;
  code: string;
  status: string;
  registrationNumber?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  website?: string;
  timezone?: string;
  currency?: string;
  address?: Record<string, string>;
  _count: { branches: number; departments: number; employees: number };
  createdAt: string;
}

export default function CompanyPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompany = useCallback(async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
      const res = await fetch('http://localhost:3001/api/v1/organization/companies?limit=1', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch companies');
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        setCompany(data.data[0]!);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load company');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCompany(); }, [fetchCompany]);

  if (loading) {
    return (
      <div className="min-h-full bg-background">
        <div className="p-4 lg:p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-[13px] text-muted-foreground">Loading company information...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full bg-background">
        <div className="p-4 lg:p-6">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-[13px] text-destructive">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-full bg-background">
        <div className="p-4 lg:p-6">
          <div className="rounded-lg border border-border p-8 text-center">
            <Building2 className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
            <p className="mt-2 text-[13px] text-muted-foreground">No company found. Create one to get started.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="p-4 lg:p-6">
        {/* Page Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-foreground">Company</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Company profile and configuration
            </p>
          </div>
          <span className={`inline-flex h-5 items-center rounded px-2 text-[10px] font-medium ${
            company.status === 'ACTIVE'
              ? 'bg-success/10 text-success'
              : 'bg-muted text-muted-foreground'
          }`}>
            {company.status}
          </span>
        </div>

        {/* Company Info */}
        <div className="grid gap-3 lg:grid-cols-2">
          {/* Basic Info */}
          <div className="rounded-lg border border-border">
            <div className="border-b border-border px-4 py-2.5">
              <h2 className="text-[13px] font-semibold text-foreground">Basic Information</h2>
            </div>
            <div className="divide-y divide-border">
              <InfoRow icon={Building2} label="Company Name" value={company.name} />
              {company.legalName && <InfoRow icon={Building2} label="Legal Name" value={company.legalName} />}
              <InfoRow icon={Building2} label="Code" value={company.code} />
              {company.registrationNumber && <InfoRow icon={Building2} label="Registration #" value={company.registrationNumber} />}
              {company.taxId && <InfoRow icon={Building2} label="Tax ID" value={company.taxId} />}
            </div>
          </div>

          {/* Contact */}
          <div className="rounded-lg border border-border">
            <div className="border-b border-border px-4 py-2.5">
              <h2 className="text-[13px] font-semibold text-foreground">Contact & Settings</h2>
            </div>
            <div className="divide-y divide-border">
              {company.email && <InfoRow icon={Mail} label="Email" value={company.email} />}
              {company.phone && <InfoRow icon={Phone} label="Phone" value={company.phone} />}
              {company.website && <InfoRow icon={Globe} label="Website" value={company.website} />}
              {company.timezone && <InfoRow icon={Clock} label="Timezone" value={company.timezone} />}
              {company.currency && <InfoRow icon={CreditCard} label="Currency" value={company.currency} />}
              {company.address && (
                <InfoRow
                  icon={MapPin}
                  label="Address"
                  value={[company.address['line1'] as string, company.address['city'] as string, company.address['country'] as string].filter(Boolean).join(', ')}
                />
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-3 grid grid-cols-3 gap-3">
          <StatCard label="Branches" value={company._count.branches} />
          <StatCard label="Departments" value={company._count.departments} />
          <StatCard label="Employees" value={company._count.employees} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
      <div className="min-w-0 flex-1">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <p className="text-[13px] text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-3 text-center">
      <p className="text-[16px] font-semibold text-foreground">{value}</p>
      <p className="text-[12px] text-muted-foreground">{label}</p>
    </div>
  );
}
