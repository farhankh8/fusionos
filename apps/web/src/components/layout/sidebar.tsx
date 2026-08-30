'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarOff,
  Wallet,
  Receipt,
  Building2,
  MapPin,
  GitBranch,
  UsersRound,
  BadgeCheck,
  Briefcase,
  Handshake,
  FolderKanban,
  FileStack,
  BarChart3,
  Sparkles,
  Zap,
  Settings,
  ChevronDown,
  ChevronLeft,
  CreditCard,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  implemented: boolean;
}

const navigationGroups: NavGroup[] = [
  {
    label: 'WORKSPACE',
    implemented: true,
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-[18px] w-[18px]" /> },
    ],
  },
  {
    label: 'PEOPLE',
    implemented: true,
    items: [
      { label: 'Employees', href: '/people/employees', icon: <Users className="h-[18px] w-[18px]" /> },
      { label: 'Attendance', href: '/people/attendance', icon: <Clock className="h-[18px] w-[18px]" /> },
      { label: 'Leave', href: '/people/leave', icon: <CalendarOff className="h-[18px] w-[18px]" /> },
      { label: 'Payroll', href: '/people/payroll', icon: <Wallet className="h-[18px] w-[18px]" /> },
      { label: 'Payslips', href: '/people/payslips', icon: <Receipt className="h-[18px] w-[18px]" /> },
    ],
  },
  {
    label: 'ORGANIZATION',
    implemented: true,
    items: [
      { label: 'Company', href: '/organization/company', icon: <Building2 className="h-[18px] w-[18px]" /> },
      { label: 'Branches', href: '/organization/branches', icon: <MapPin className="h-[18px] w-[18px]" /> },
      { label: 'Departments', href: '/organization/departments', icon: <GitBranch className="h-[18px] w-[18px]" /> },
      { label: 'Teams', href: '/organization/teams', icon: <UsersRound className="h-[18px] w-[18px]" /> },
      { label: 'Designations', href: '/organization/designations', icon: <BadgeCheck className="h-[18px] w-[18px]" /> },
    ],
  },
  {
    label: 'BUSINESS',
    implemented: false,
    items: [
      { label: 'Finance', href: '/finance', icon: <CreditCard className="h-[18px] w-[18px]" /> },
      { label: 'CRM', href: '/crm', icon: <Handshake className="h-[18px] w-[18px]" /> },
      { label: 'Projects', href: '/projects', icon: <FolderKanban className="h-[18px] w-[18px]" /> },
      { label: 'Assets', href: '/assets', icon: <Briefcase className="h-[18px] w-[18px]" /> },
      { label: 'Documents', href: '/documents', icon: <FileStack className="h-[18px] w-[18px]" /> },
    ],
  },
  {
    label: 'INTELLIGENCE',
    implemented: false,
    items: [
      { label: 'Analytics', href: '/analytics', icon: <BarChart3 className="h-[18px] w-[18px]" /> },
      { label: 'AI Command Center', href: '/ai', icon: <Sparkles className="h-[18px] w-[18px]" /> },
      { label: 'Automation', href: '/automation', icon: <Zap className="h-[18px] w-[18px]" /> },
    ],
  },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname() || '/';
  const { user } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['WORKSPACE', 'PEOPLE']));

  const toggleGroup = (label: string) => {
    if (collapsed) return;
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
    return pathname.startsWith(href);
  };

  const isGroupActive = (group: NavGroup) => {
    return group.items.some(item => isActive(item.href));
  };

  return (
    <aside
      className={cn(
        'flex h-full flex-col bg-[#0B1730] text-white transition-all duration-200',
        collapsed ? 'w-[72px]' : 'w-[240px]',
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className={cn('flex h-14 items-center border-b border-[#1E3A5F]', collapsed ? 'justify-center px-2' : 'gap-2.5 px-4')}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2563EB]">
          <svg className="h-4.5 w-4.5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold leading-tight text-white">FusionOS</span>
            <span className="text-[10px] leading-tight text-[#64748B]">by Zorvexa</span>
          </div>
        )}
        {onToggle && (
          <button
            onClick={onToggle}
            className={cn(
              'ml-auto flex h-6 w-6 items-center justify-center rounded text-[#64748B] hover:text-white hover:bg-[#162B50] transition-colors',
              collapsed && 'hidden',
            )}
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        {navigationGroups.map((group) => {
          const isExpanded = expandedGroups.has(group.label);
          const groupActive = isGroupActive(group);

          return (
            <div key={group.label} className="mb-1">
              {/* Group Header */}
              {!collapsed ? (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={cn(
                    'flex w-full items-center gap-2 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                    groupActive ? 'text-[#CBD5E1]' : 'text-[#475569] hover:text-[#94A3B8]',
                  )}
                >
                  {group.label}
                  <ChevronDown
                    className={cn(
                      'h-3 w-3 transition-transform duration-150',
                      !isExpanded && '-rotate-90',
                    )}
                  />
                </button>
              ) : (
                <div className="mx-auto my-2 h-px w-8 bg-[#1E3A5F]" />
              )}

              {/* Items */}
              {(isExpanded || collapsed) && (
                <ul className={cn('space-y-0.5', collapsed ? 'px-2' : 'px-2')}>
                  {group.items.map((item) => {
                    const active = isActive(item.href);

                    if (!group.implemented) {
                      return (
                        <li key={item.href}>
                          <div
                            className={cn(
                              'flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] cursor-not-allowed opacity-40',
                              collapsed && 'justify-center px-2',
                            )}
                          >
                            {item.icon}
                            {!collapsed && (
                              <>
                                <span className="flex-1 truncate">{item.label}</span>
                                <span className="rounded bg-[#1E3A5F] px-1.5 py-0.5 text-[9px] font-medium text-[#64748B]">
                                  Soon
                                </span>
                              </>
                            )}
                          </div>
                        </li>
                      );
                    }

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors',
                            collapsed && 'justify-center px-2',
                            active
                              ? 'bg-[#2563EB] text-white'
                              : 'text-[#CBD5E1] hover:bg-[#162B50] hover:text-white',
                          )}
                          title={collapsed ? item.label : undefined}
                        >
                          {item.icon}
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="border-t border-[#1E3A5F] px-2 py-2">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-[#CBD5E1] transition-colors hover:bg-[#162B50] hover:text-white',
            collapsed && 'justify-center px-2',
            (pathname || '').startsWith('/settings') && 'bg-[#2563EB] text-white',
          )}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings className="h-[18px] w-[18px]" />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>

      {/* Tenant Info */}
      {!collapsed && (
        <div className="border-t border-[#1E3A5F] px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#162B50] text-[11px] font-semibold text-white">
                {user?.firstName?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-white truncate">{user?.firstName || 'User'}</p>
                <p className="text-[10px] text-[#64748B] truncate">{user?.email || ''}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
