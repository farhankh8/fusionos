'use client';

import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
  key: string;
  label: string;
  className?: string;
  headerClassName?: string;
  render?: (item: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  page?: number;
  totalPages?: number;
  total?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  onRowClick?: (item: T) => void;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading,
  emptyIcon,
  emptyTitle = 'No records found',
  emptyDescription,
  emptyAction,
  page = 1,
  totalPages = 1,
  total = 0,
  limit = 20,
  onPageChange,
  onRowClick,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn('overflow-hidden rounded-lg border border-[#E2E8F0] bg-white', className)}>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E2E8F0] border-t-[#2563EB]" />
            <p className="text-[12px] text-[#64748B]">Loading...</p>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          {emptyIcon}
          <p className="mt-3 text-[14px] font-medium text-[#0F172A]">{emptyTitle}</p>
          {emptyDescription && <p className="mt-1 text-[12px] text-[#64748B]">{emptyDescription}</p>}
          {emptyAction && <div className="mt-4">{emptyAction}</div>}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={cn(
                        'px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-[#64748B]',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                        !col.align && 'text-left',
                        col.headerClassName,
                      )}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {data.map((item) => (
                  <tr
                    key={item.id}
                    className={cn(
                      'transition-colors hover:bg-[#F8FAFC]',
                      onRowClick && 'cursor-pointer',
                    )}
                    onClick={() => onRowClick?.(item)}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          'px-4 py-3 text-[13px]',
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center',
                          !col.align && 'text-left text-[#475569]',
                          col.className,
                        )}
                      >
                        {col.render ? col.render(item) : (item as Record<string, unknown>)[col.key] as React.ReactNode}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && onPageChange && (
            <div className="flex items-center justify-between border-t border-[#E2E8F0] px-4 py-2.5">
              <p className="text-[12px] text-[#64748B]">
                Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onPageChange(page - 1)}
                  disabled={page === 1}
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-50"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="px-2 text-[12px] text-[#64748B]">{page} / {totalPages}</span>
                <button
                  onClick={() => onPageChange(page + 1)}
                  disabled={page === totalPages}
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-50"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
