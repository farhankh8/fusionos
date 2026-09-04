'use client';

import { useState, useEffect } from 'react';
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
  Handshake,
  FolderKanban,
  FileStack,
  Settings,
  ChevronDown,
  ChevronLeft,
  CreditCard,
  Package,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  implemented?: boolean;
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
      { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    ],
  },
  {
    label: 'PEOPLE',
    implemented: true,
    items: [
      { label: 'Employees', href: '/people/employees', icon: <Users className="h-5 w-5" /> },
      { label: 'Attendance', href: '/people/attendance', icon: <Clock className="h-5 w-5" /> },
      { label: 'Leave', href: '/people/leave', icon: <CalendarOff className="h-5 w-5" /> },
      { label: 'Payroll', href: '/people/payroll', icon: <Wallet className="h-5 w-5" /> },
      { label: 'Payslips', href: '/people/payslips', icon: <Receipt className="h-5 w-5" /> },
    ],
  },
  {
    label: 'ORGANIZATION',
    implemented: true,
    items: [
      { label: 'Company', href: '/organization/company', icon: <Building2 className="h-5 w-5" /> },
      { label: 'Branches', href: '/organization/branches', icon: <MapPin className="h-5 w-5" /> },
      { label: 'Departments', href: '/organization/departments', icon: <GitBranch className="h-5 w-5" /> },
      { label: 'Teams', href: '/organization/teams', icon: <UsersRound className="h-5 w-5" /> },
      { label: 'Designations', href: '/organization/designations', icon: <BadgeCheck className="h-5 w-5" /> },
    ],
  },
  {
    label: 'BUSINESS',
    implemented: true,
    items: [
      { label: 'Finance', href: '/finance', icon: <CreditCard className="h-5 w-5" /> },
      { label: 'CRM', href: '/crm', icon: <Handshake className="h-5 w-5" /> },
      { label: 'Projects', href: '/projects', icon: <FolderKanban className="h-5 w-5" /> },
      { label: 'Documents', href: '/documents', icon: <FileStack className="h-5 w-5" /> },
      { label: 'Assets', href: '/assets', icon: <Package className="h-5 w-5" /> },
    ],
  },

];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

function isActivePath(href: string, pathname: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
  if (pathname === href) return true;
  if (pathname.startsWith(href + '/')) return true;
  return false;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname() || '/';
  const { user } = useAuth();

  const getInitialGroups = (): Set<string> => {
    const groups = new Set(['WORKSPACE', 'PEOPLE']);
    for (const group of navigationGroups) {
      if (group.items.some(item => isActivePath(item.href, pathname))) {
        groups.add(group.label);
      }
    }
    return groups;
  };

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(getInitialGroups);

  useEffect(() => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      for (const group of navigationGroups) {
        if (group.items.some(item => isActivePath(item.href, pathname))) {
          next.add(group.label);
        }
      }
      return next;
    });
  }, [pathname]);

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

  const isGroupActive = (group: NavGroup) => {
    return group.items.some(item => isActivePath(item.href, pathname));
  };

  return (
    <aside
      className={cn(
        'flex h-full flex-col bg-[#022C22] text-[#A7F3D0] transition-all duration-200 ease-in-out',
        collapsed ? 'w-[72px]' : 'w-[260px]',
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className={cn('flex h-16 items-center border-b border-[#064E3B]', collapsed ? 'justify-center px-2' : 'gap-3 px-5')}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#064E3B]">
          <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-[17px] font-bold leading-tight text-white tracking-tight">FusionOS</span>
            <span className="text-[11px] leading-tight text-[#57534E]">by Zorvexa</span>
          </div>
        )}
        {onToggle && (
          <button
            onClick={onToggle}
            className={cn(
              'ml-auto flex h-7 w-7 items-center justify-center rounded-md text-[#57534E] hover:text-white hover:bg-[#065F46] transition-colors',
              collapsed && 'hidden',
            )}
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {navigationGroups.map((group) => {
          const isExpanded = expandedGroups.has(group.label);
          const groupActive = isGroupActive(group);

          return (
            <div key={group.label} className="mb-2">
              {/* Group Header */}
              {!collapsed ? (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={cn(
                    'flex w-full items-center gap-2 px-5 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors',
                    groupActive ? 'text-[#A7F3D0]' : 'text-[#57534E] hover:text-[#8E7E68]',
                  )}
                >
                  {group.label}
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 transition-transform duration-200',
                      !isExpanded && '-rotate-90',
                    )}
                  />
                </button>
              ) : (
                <div className="mx-auto my-3 h-px w-8 bg-[#064E3B]" />
              )}

              {/* Items */}
              <div
                className={cn(
                  'overflow-hidden transition-all duration-200 ease-in-out',
                  (isExpanded || collapsed) ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0',
                )}
              >
                <ul className={cn('space-y-0.5', collapsed ? 'px-2' : 'px-3')}>
                  {group.items.map((item) => {
                    const active = isActivePath(item.href, pathname);
                    const itemImplemented = item.implemented !== undefined ? item.implemented : group.implemented;

                    if (!itemImplemented) {
                      return (
                        <li key={item.href}>
                          <div
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] cursor-not-allowed opacity-40',
                              collapsed && 'justify-center px-2',
                            )}
                          >
                            {item.icon}
                            {!collapsed && (
                              <>
                                <span className="flex-1 truncate">{item.label}</span>
                                <span className="rounded bg-[#064E3B] px-2 py-0.5 text-[10px] font-medium text-[#57534E]">
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
                            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-all duration-150',
                            collapsed && 'justify-center px-2',
                            active
                              ? 'bg-[#064E3B] text-white shadow-md shadow-[#064E3B]/30'
                              : 'text-[#A7F3D0] hover:bg-[#065F46] hover:text-white',
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
              </div>
            </div>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="border-t border-[#064E3B] px-3 py-3">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium text-[#A7F3D0] transition-colors hover:bg-[#065F46] hover:text-white',
            collapsed && 'justify-center px-2',
            (pathname || '').startsWith('/settings') && 'bg-[#064E3B] text-white',
          )}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings className="h-5 w-5" />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>

      {/* Tenant Info */}
      {!collapsed && (
        <div className="border-t border-[#064E3B] px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#064E3B] text-[13px] font-bold text-white">
                {user?.firstName?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-white truncate">{user?.firstName || 'User'}</p>
                <p className="text-[11px] text-[#57534E] truncate">{user?.email || ''}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
