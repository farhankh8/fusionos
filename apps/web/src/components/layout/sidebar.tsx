'use client';

/**
 * FusionOS Sidebar Component
 *
 * The main navigation sidebar. Displays navigation groups with collapsible sections.
 * Professional, enterprise-grade design. Keyboard accessible.
 */

import type React from 'react';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { navigation, type NavigationItem, type NavigationGroup } from '@/lib/navigation-config';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-full w-[260px] flex-col border-r border-gray-200 bg-white',
        className,
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo / Brand */}
      <div className="flex h-14 items-center border-b border-gray-200 px-5">
        <Link href="/" className="flex items-center gap-2.5" aria-label="FusionOS Home">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <span className="text-sm font-bold text-white">F</span>
          </div>
          <span className="text-base font-semibold text-gray-900">FusionOS</span>
        </Link>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navigation.map((group, groupIndex) => (
          <NavigationGroupComponent
            key={group.label ?? groupIndex}
            group={group}
            pathname={pathname}
            isCollapsed={group.label ? collapsedGroups.has(group.label) : false}
            onToggle={group.label ? () => toggleGroup(group.label!) : undefined}
            groupIndex={groupIndex}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 px-5 py-3">
        <p className="text-xs text-gray-400">FusionOS v0.1.0</p>
        <p className="text-xs text-gray-400">by ZORVEXA</p>
      </div>
    </aside>
  );
}

interface NavigationGroupComponentProps {
  group: NavigationGroup;
  pathname: string;
  isCollapsed: boolean;
  onToggle?: () => void;
  groupIndex: number;
}

function NavigationGroupComponent({
  group,
  pathname,
  isCollapsed,
  onToggle,
  groupIndex,
}: NavigationGroupComponentProps) {
  return (
    <div className="mb-2" role="group" aria-label={group.label ? `${group.label} navigation` : undefined}>
      {group.label && (
        <button
          onClick={onToggle}
          className="mb-1 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-gray-400 hover:text-gray-600"
          aria-expanded={!isCollapsed}
        >
          <span>{group.label}</span>
          <svg
            className={cn('h-3.5 w-3.5 transition-transform', isCollapsed && '-rotate-90')}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      )}
      <ul className={cn('space-y-0.5', isCollapsed && 'hidden')} role="list">
        {group.items.map((item) => (
          <NavigationItemComponent
            key={item.href}
            item={item}
            pathname={pathname}
          />
        ))}
      </ul>
    </div>
  );
}

interface NavigationItemComponentProps {
  item: NavigationItem;
  pathname: string;
}

function NavigationItemComponent({ item, pathname }: NavigationItemComponentProps) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <li>
      <Link
        href={item.isImplemented ? item.href : '#'}
        className={cn(
          'group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
          isActive
            ? 'bg-blue-50 font-medium text-blue-700'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
          !item.isImplemented && 'cursor-default opacity-50',
        )}
        aria-current={isActive ? 'page' : undefined}
        tabIndex={item.isImplemented ? 0 : -1}
        aria-disabled={!item.isImplemented}
        title={!item.isImplemented ? `${item.label} — planned for future phase` : undefined}
      >
        <NavigationIcon name={item.icon} isActive={isActive} />
        <span className="flex-1 truncate">{item.label}</span>
        {!item.isImplemented && (
          <span className="text-[10px] text-gray-400" aria-hidden="true">
            soon
          </span>
        )}
        {item.badge && (
          <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
            {item.badge}
          </span>
        )}
      </Link>
    </li>
  );
}

interface NavigationIconProps {
  name?: string;
  isActive: boolean;
}

function NavigationIcon({ name, isActive }: NavigationIconProps) {
  const colorClass = isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500';

  // Placeholder icons — will be replaced with proper icons in later phases
  const iconMap: Record<string, React.JSX.Element> = {
    'command-center': (
      <svg className={cn('h-4 w-4', colorClass)} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    dashboard: (
      <svg className={cn('h-4 w-4', colorClass)} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  };

  return iconMap[name ?? ''] ?? (
    <svg className={cn('h-4 w-4', colorClass)} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" />
    </svg>
  );
}
