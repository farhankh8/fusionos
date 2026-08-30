'use client';

import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  search?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  filters?: {
    key: string;
    label: string;
    value: string;
    options: FilterOption[];
    onChange: (value: string) => void;
  }[];
  activeFilterCount?: number;
  onClearFilters?: () => void;
  className?: string;
}

export function FilterBar({ search, searchPlaceholder = 'Search...', onSearchChange, filters, activeFilterCount = 0, onClearFilters, className }: FilterBarProps) {
  return (
    <div className={cn('mb-3 flex items-center gap-3', className)}>
      {onSearchChange && (
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 w-full rounded-md border border-[#E2E8F0] bg-white pl-8 pr-3 text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
          />
        </div>
      )}
      {filters?.map((filter) => (
        <select
          key={filter.key}
          value={filter.value}
          onChange={(e) => filter.onChange(e.target.value)}
          className="h-8 rounded-md border border-[#E2E8F0] bg-white px-2.5 text-[12px] text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
        >
          <option value="">{filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ))}
      {activeFilterCount > 0 && onClearFilters && (
        <button
          onClick={onClearFilters}
          className="inline-flex items-center gap-1 text-[12px] text-[#2563EB] hover:text-[#1D4ED8]"
        >
          <X className="h-3 w-3" />
          Clear ({activeFilterCount})
        </button>
      )}
    </div>
  );
}
