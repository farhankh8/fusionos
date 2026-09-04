'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';

interface PipelineStage {
  count: number;
  totalValue: number;
  weightedValue: number;
}

interface Pipeline {
  [stage: string]: PipelineStage;
}

function formatCurrency(amount: number, currency = 'USD') {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 100000) return `${sign}${currency} ${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${sign}${currency} ${(abs / 1000).toFixed(1)}K`;
  return `${sign}${currency} ${(abs / 100).toFixed(2)}`;
}

const STAGE_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  PROSPECTING: { color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' },
  QUALIFICATION: { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  PROPOSAL: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  NEGOTIATION: { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  CLOSED_WON: { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  CLOSED_LOST: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
};

export default function CrmPipelinePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pipeline, setPipeline] = useState<Pipeline>({});
  const [companyId, setCompanyId] = useState('');

  useEffect(() => {
    const loadCompany = async () => {
      try {
        const res = await apiClient.get<{ id: string }[]>('/organization/companies');
        const companies = Array.isArray(res) ? res : [];
        if (companies.length > 0) setCompanyId(companies[0]!.id);
      } catch {}
    };
    loadCompany();
  }, []);

  const loadPipeline = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<Pipeline>(`/crm/pipeline?companyId=${companyId}`);
      setPipeline(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load pipeline');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { loadPipeline(); }, [loadPipeline]);

  const totalValue = Object.values(pipeline).reduce((sum, s) => sum + s.totalValue, 0);
  const totalWeighted = Object.values(pipeline).reduce((sum, s) => sum + s.weightedValue, 0);

  return (
    <div>
      <PageHeader
        title="Pipeline"
        description="Visual overview of your sales pipeline."
        breadcrumbs={[{ label: 'CRM', href: '/crm' }, { label: 'Pipeline' }]}
      />

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[13px] text-[#DC2626]">{error}</div>
      )}

      {/* Summary bar */}
      <div className="flex gap-4 mb-6">
        <div className="px-4 py-2 bg-white rounded-lg border border-[#E2E8F0]">
          <span className="text-[12px] text-[#64748B]">Total Pipeline</span>
          <p className="text-[16px] font-semibold text-[#0F172A]">{formatCurrency(totalValue)}</p>
        </div>
        <div className="px-4 py-2 bg-white rounded-lg border border-[#E2E8F0]">
          <span className="text-[12px] text-[#64748B]">Weighted Value</span>
          <p className="text-[16px] font-semibold text-[#0F172A]">{formatCurrency(totalWeighted)}</p>
        </div>
      </div>

      {/* Kanban columns */}
      {loading ? (
        <div className="grid grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-[#F8FAFC] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(pipeline).map(([stage, data]) => {
            const fallback = { color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' };
            const cfg = STAGE_CONFIG[stage] ?? fallback;
            return (
              <div
                key={stage}
                className="rounded-lg border p-4"
                style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
              >
                <div className="mb-3">
                  <h3 className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: cfg.color }}>
                    {stage.replace('_', ' ')}
                  </h3>
                  <p className="text-[22px] font-bold text-[#0F172A] mt-1">{data.count}</p>
                </div>
                <div className="space-y-1.5 text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Total</span>
                    <span className="font-medium text-[#0F172A]">{formatCurrency(data.totalValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Weighted</span>
                    <span className="font-medium text-[#0F172A]">{formatCurrency(data.weightedValue)}</span>
                  </div>
                </div>
                {/* Visual bar */}
                {totalValue > 0 && (
                  <div className="mt-3 h-1.5 bg-white rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (data.totalValue / totalValue) * 100)}%`,
                        backgroundColor: cfg.color ?? '#64748B',
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
