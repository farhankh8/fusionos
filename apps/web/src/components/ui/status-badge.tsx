'use client';

import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  className?: string;
}

const VARIANT_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  default: { bg: 'bg-[#F1F5F9]', text: 'text-[#475569]', dot: 'bg-[#94A3B8]' },
  success: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  danger: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  info: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
};

const DEFAULT_STYLE = { bg: 'bg-[#F1F5F9]', text: 'text-[#475569]', dot: 'bg-[#94A3B8]' };

const STATUS_VARIANT_MAP: Record<string, string> = {
  ACTIVE: 'success',
  APPROVED: 'success',
  FINALIZED: 'success',
  CONFIRMED: 'success',
  CLOSED: 'success',
  DRAFT: 'warning',
  PENDING: 'warning',
  UNDER_REVIEW: 'warning',
  OPEN: 'info',
  PROCESSING: 'info',
  CALCULATED: 'info',
  PAID: 'success',
  UNPAID: 'default',
  YES: 'success',
  NO: 'default',
  INACTIVE: 'default',
  TERMINATED: 'danger',
  RESIGNED: 'danger',
  REJECTED: 'danger',
  CANCELLED: 'danger',
  ON_LEAVE: 'info',
  PRESENT: 'success',
  ABSENT: 'danger',
  HALF_DAY: 'warning',
  LATE: 'warning',
};

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const variantKey = variant || STATUS_VARIANT_MAP[status] || 'default';
  const styles = VARIANT_STYLES[variantKey] || DEFAULT_STYLE;

  return (
    <span className={cn(`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${styles.bg} ${styles.text}`, className)}>
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      {status.replace(/_/g, ' ')}
    </span>
  );
}
