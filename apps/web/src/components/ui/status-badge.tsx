'use client';

import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  className?: string;
}

const VARIANT_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  default: { bg: 'bg-secondary', text: 'text-muted-foreground', dot: 'bg-muted-foreground/60' },
  success: { bg: 'bg-success-light', text: 'text-success', dot: 'bg-success' },
  warning: { bg: 'bg-warning-light', text: 'text-warning', dot: 'bg-warning' },
  danger: { bg: 'bg-[#FEF2F2] dark:bg-[rgba(239,68,68,0.15)]', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
  info: { bg: 'bg-info-light', text: 'text-primary', dot: 'bg-primary' },
  purple: { bg: 'bg-[#D1FAE5] dark:bg-[rgba(139,92,246,0.15)]', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-emerald-500' },
};

const DEFAULT_STYLE = { bg: 'bg-secondary', text: 'text-muted-foreground', dot: 'bg-muted-foreground/60' };

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
    <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium', styles.bg, styles.text, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', styles.dot)} />
      {status.replace(/_/g, ' ')}
    </span>
  );
}
