'use client';

import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <div className={cn('flex items-center gap-0 border-b border-[#E2E8F0] bg-white', className)}>
      <div className="flex items-center">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'relative px-4 py-3 text-[13px] font-medium transition-colors',
              activeTab === tab.id
                ? 'text-[#2563EB]'
                : 'text-[#64748B] hover:text-[#0F172A]',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 rounded-full bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-medium text-[#64748B]">
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB]" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
