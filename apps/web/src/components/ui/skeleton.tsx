'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('animate-pulse rounded bg-[#F1F5F9]', className)} />
  );
}

export function KpiSkeleton() {
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2 h-6 w-16" />
        </div>
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
      <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-20" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b border-[#F1F5F9] px-4 py-3">
          <div className="flex gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
