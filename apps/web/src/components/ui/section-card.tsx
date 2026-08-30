'use client';

import { cn } from '@/lib/utils';

interface SectionCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({ title, subtitle, action, children, className }: SectionCardProps) {
  return (
    <div className={cn('rounded-lg border border-[#E2E8F0] bg-white', className)}>
      <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3">
        <div>
          <h2 className="text-[13px] font-semibold text-[#0F172A]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[11px] text-[#94A3B8]">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
