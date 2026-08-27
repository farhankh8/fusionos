'use client';

/**
 * FusionOS Sidebar — Professional Enterprise Navigation
 *
 * Compact, functional sidebar inspired by Linear, GitHub, Stripe.
 * No gradients, no glassmorphism, no decorative elements.
 */

import type React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { navigation, type NavigationItem, type NavigationGroup } from '@/lib/navigation-config';
import {
  Zap,
  LayoutDashboard,
  Users,
  Clock,
  DollarSign,
  Contact,
  FolderKanban,
  Brain,
  Workflow,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'command-center': Zap,
  dashboard: LayoutDashboard,
  hr: Users,
  attendance: Clock,
  payroll: DollarSign,
  crm: Contact,
  projects: FolderKanban,
  ai: Brain,
  automation: Workflow,
  analytics: BarChart3,
  settings: Settings,
};

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
        'fixed left-0 top-0 z-40 flex h-full w-[240px] flex-col border-r border-border bg-muted/50',
        className,
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div className="flex h-12 items-center border-b border-border px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="FusionOS Home">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-[11px] font-bold text-white">
            F
          </div>
          <span className="text-[13px] font-semibold text-foreground tracking-tight">
            FusionOS
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
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
      <div className="border-t border-border px-4 py-2.5">
        <p className="text-[11px] text-muted-foreground">v0.1.0 · Phase 1</p>
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
    <div
      className={cn('mb-1', groupIndex > 0 && 'mt-3')}
      role="group"
      aria-label={group.label ? `${group.label} navigation` : undefined}
    >
      {group.label && (
        <button
          onClick={onToggle}
          className="mb-0.5 flex w-full items-center justify-between px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-120"
          aria-expanded={!isCollapsed}
        >
          <span>{group.label}</span>
          <ChevronRight
            className={cn(
              'h-3 w-3 transition-transform duration-150',
              !isCollapsed && 'rotate-90',
            )}
          />
        </button>
      )}
      <ul
        className={cn('space-y-px', isCollapsed && 'hidden')}
        role="list"
      >
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
  const Icon = iconMap[item.icon ?? ''] ?? Zap;

  return (
    <li>
      <Link
        href={item.isImplemented ? item.href : '#'}
        className={cn(
          'flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors duration-120',
          isActive
            ? 'bg-primary/8 text-primary'
            : 'text-muted-foreground hover:bg-border/50 hover:text-foreground',
          !item.isImplemented && 'cursor-default opacity-40 hover:opacity-40',
        )}
        aria-current={isActive ? 'page' : undefined}
        tabIndex={item.isImplemented ? 0 : -1}
        aria-disabled={!item.isImplemented}
        title={!item.isImplemented ? `${item.label} — planned for future phase` : undefined}
      >
        <Icon
          className={cn(
            'h-4 w-4 shrink-0',
            isActive ? 'text-primary' : 'text-muted-foreground',
          )}
          strokeWidth={isActive ? 2 : 1.5}
        />
        <span className="flex-1 truncate">{item.label}</span>
        {!item.isImplemented && (
          <span className="rounded bg-border px-1 py-0.5 text-[9px] font-medium text-muted-foreground">
            soon
          </span>
        )}
        {item.badge && (
          <span className="rounded bg-primary/10 px-1 py-0.5 text-[10px] font-medium text-primary">
            {item.badge}
          </span>
        )}
      </Link>
    </li>
  );
}
