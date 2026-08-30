'use client';

import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16', className)}>
      {Icon && <Icon className="h-10 w-10 text-[#E2E8F0]" strokeWidth={1.5} />}
      <p className="mt-3 text-[14px] font-medium text-[#0F172A]">{title}</p>
      {description && <p className="mt-1 text-[12px] text-[#64748B]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
