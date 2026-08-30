'use client';

import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  subtitle?: string;
  loading?: boolean;
  className?: string;
}

export function KpiCard({ label, value, icon: Icon, iconBg = 'bg-[#EFF6FF]', iconColor = 'text-[#2563EB]', subtitle, loading, className }: KpiCardProps) {
  return (
    <div className={cn('rounded-lg border border-[#E2E8F0] bg-white p-3.5', className)}>
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] text-[#64748B]">{label}</p>
          {loading ? (
            <div className="mt-1.5 h-6 w-20 animate-pulse rounded bg-[#F1F5F9]" />
          ) : (
            <p className="mt-1 text-[20px] font-semibold text-[#0F172A] leading-tight">{value}</p>
          )}
          {subtitle && <p className="mt-0.5 text-[11px] text-[#94A3B8]">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', iconBg)}>
            <Icon className={cn('h-4.5 w-4.5', iconColor)} />
          </div>
        )}
      </div>
    </div>
  );
}
