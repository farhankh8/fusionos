'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Search, Bell, HelpCircle, ChevronDown, LogOut, Settings, User, Menu, Users, Building2, Clock, CalendarOff, Wallet, Receipt, ArrowRight, Loader2 } from 'lucide-react';

interface HeaderProps {
  className?: string;
  onSidebarToggle?: () => void;
}

interface SearchResult {
  id: string;
  name: string;
  subtitle?: string;
  type: string;
  href: string;
  icon: React.ReactNode;
}

export function Header({ className, onSidebarToggle }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearch(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ctrl+K for search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setSelectedIdx(-1);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results: SearchResult[] = [];
        // Search employees
        try {
          const empData = await apiClient.get<{ data: { id: string; firstName: string; lastName: string; employeeCode: string; designation?: { name: string } }[] }>('/employees', { search: searchQuery, limit: '5' });
          (empData.data || []).forEach(e => {
            results.push({
              id: e.id, name: `${e.firstName} ${e.lastName}`, subtitle: `${e.employeeCode}${e.designation?.name ? ` · ${e.designation.name}` : ''}`,
              type: 'Employee', href: `/people/employees/${e.id}`,
              icon: <Users className="h-4 w-4 text-[#2563EB]" />,
            });
          });
        } catch { /* unavailable */ }
        // Search departments
        try {
          const deptData = await apiClient.get<{ data: { id: string; name: string }[] }>('/organization/departments', { search: searchQuery, limit: '3' });
          (deptData.data || []).forEach(d => {
            results.push({
              id: d.id, name: d.name, subtitle: 'Department',
              type: 'Organization', href: '/organization/departments',
              icon: <Building2 className="h-4 w-4 text-[#64748B]" />,
            });
          });
        } catch { /* unavailable */ }
        // Search teams
        try {
          const teamData = await apiClient.get<{ data: { id: string; name: string }[] }>('/organization/teams', { search: searchQuery, limit: '3' });
          (teamData.data || []).forEach(t => {
            results.push({
              id: t.id, name: t.name, subtitle: 'Team',
              type: 'Organization', href: '/organization/teams',
              icon: <Building2 className="h-4 w-4 text-[#64748B]" />,
            });
          });
        } catch { /* unavailable */ }
        setSearchResults(results);
        setSelectedIdx(-1);
      } catch {
        setSearchResults([]);
      }
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Keyboard navigation in search
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(prev => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIdx >= 0 && searchResults[selectedIdx]) {
      e.preventDefault();
      router.push(searchResults[selectedIdx].href);
      setShowSearch(false);
      setSearchQuery('');
    }
  }, [selectedIdx, searchResults, router]);

  // Get breadcrumb from pathname
  const getBreadcrumb = () => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0) return [{ label: 'Dashboard', href: '/' }];
    const crumbs: { label: string; href: string }[] = [];
    let path = '';
    for (const part of parts) {
      path += '/' + part;
      crumbs.push({
        label: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '),
        href: path,
      });
    }
    return crumbs;
  };

  const breadcrumbs = getBreadcrumb();

  const handleLogout = useCallback(async () => {
    await logout();
    router.push('/auth/login');
  }, [logout, router]);

  // Group search results by type
  const groupedResults = searchResults.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type]!.push(r);
    return acc;
  }, {});

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#E2E8F0] bg-white px-4',
        className,
      )}
      role="banner"
    >
      {/* Left: Sidebar toggle + Breadcrumb */}
      <div className="flex items-center gap-3">
        {onSidebarToggle && (
          <button
            onClick={onSidebarToggle}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>
        )}
        <nav className="flex items-center gap-1.5 text-[13px]" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.href} className="flex items-center gap-1.5">
              {index > 0 && <span className="text-[#CBD5E1]">/</span>}
              {index === breadcrumbs.length - 1 ? (
                <span className="font-medium text-[#0F172A]">{crumb.label}</span>
              ) : (
                <button
                  onClick={() => router.push(crumb.href)}
                  className="text-[#64748B] hover:text-[#0F172A] transition-colors"
                >
                  {crumb.label}
                </button>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* Right: Search, Notifications, Help, User */}
      <div className="flex items-center gap-1.5">
        {/* Global Search */}
        <div ref={searchRef} className="relative">
          <button
            onClick={() => setShowSearch(true)}
            className="flex h-8 items-center gap-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-[13px] text-[#64748B] transition-colors hover:bg-[#F1F5F9]"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Search employees, leave, payroll...</span>
            <kbd className="hidden rounded border border-[#E2E8F0] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#94A3B8] lg:inline">
              ⌘K
            </kbd>
          </button>

          {showSearch && (
            <div className="absolute right-0 top-full mt-2 w-[480px] rounded-lg border border-[#E2E8F0] bg-white shadow-lg z-50">
              <div className="flex items-center gap-3 border-b border-[#E2E8F0] px-4 py-3">
                <Search className="h-4 w-4 text-[#94A3B8]" />
                {searchLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#94A3B8]" />
                ) : null}
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search employees, departments, teams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="flex-1 bg-transparent text-[13px] text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
                />
                <kbd className="rounded border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 py-0.5 text-[10px] text-[#94A3B8]">
                  ESC
                </kbd>
              </div>
              {searchQuery.length < 2 ? (
                <div className="p-4">
                  <p className="text-[12px] text-[#94A3B8]">Type at least 2 characters to search...</p>
                  <div className="mt-3 space-y-1">
                    <p className="text-[11px] font-medium text-[#94A3B8] uppercase tracking-wider">Quick Navigation</p>
                    {[
                      { label: 'Employees', href: '/people/employees', icon: <Users className="h-3.5 w-3.5" /> },
                      { label: 'Attendance', href: '/people/attendance', icon: <Clock className="h-3.5 w-3.5" /> },
                      { label: 'Leave', href: '/people/leave', icon: <CalendarOff className="h-3.5 w-3.5" /> },
                      { label: 'Payroll', href: '/people/payroll', icon: <Wallet className="h-3.5 w-3.5" /> },
                      { label: 'Payslips', href: '/people/payslips', icon: <Receipt className="h-3.5 w-3.5" /> },
                    ].map(item => (
                      <button
                        key={item.href}
                        onClick={() => { router.push(item.href); setShowSearch(false); setSearchQuery(''); }}
                        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[12px] text-[#475569] hover:bg-[#F8FAFC] transition-colors"
                      >
                        <span className="text-[#94A3B8]">{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : searchResults.length === 0 && !searchLoading ? (
                <div className="p-4 text-center">
                  <p className="text-[13px] text-[#64748B]">No results found for &quot;{searchQuery}&quot;</p>
                </div>
              ) : (
                <div className="max-h-[360px] overflow-y-auto p-2">
                  {Object.entries(groupedResults).map(([type, items]) => (
                    <div key={type} className="mb-2">
                      <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">{type}</p>
                      {items.map((result) => {
                        const idx = searchResults.indexOf(result);
                        return (
                          <button
                            key={`${result.type}-${result.id}`}
                            onClick={() => { router.push(result.href); setShowSearch(false); setSearchQuery(''); }}
                            className={cn(
                              'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors',
                              idx === selectedIdx ? 'bg-[#EFF6FF]' : 'hover:bg-[#F8FAFC]',
                            )}
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#F1F5F9]">
                              {result.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-medium text-[#0F172A] truncate">{result.name}</p>
                              {result.subtitle && <p className="text-[11px] text-[#94A3B8] truncate">{result.subtitle}</p>}
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#CBD5E1]" />
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="relative flex h-8 w-8 items-center justify-center rounded-md text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-4.5 w-4.5" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-[#E2E8F0] bg-white shadow-lg z-50">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3">
                <h3 className="text-[13px] font-semibold text-[#0F172A]">Notifications</h3>
                <button className="text-[12px] text-[#2563EB] hover:text-[#1D4ED8]">Mark all read</button>
              </div>
              <div className="p-8 text-center">
                <Bell className="mx-auto mb-3 h-10 w-10 text-[#E2E8F0]" />
                <p className="text-[13px] text-[#64748B]">No notifications yet</p>
              </div>
            </div>
          )}
        </div>

        {/* Help */}
        <button
          className="flex h-8 w-8 items-center justify-center rounded-md text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors"
          aria-label="Help"
        >
          <HelpCircle className="h-4.5 w-4.5" />
        </button>

        {/* Divider */}
        <div className="mx-1 h-5 w-px bg-[#E2E8F0]" />

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[#F1F5F9] transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563EB] text-[12px] font-semibold text-white">
              {user?.firstName?.charAt(0) || 'U'}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-[13px] font-medium text-[#0F172A] leading-tight">{user?.firstName} {user?.lastName}</p>
              <p className="text-[11px] text-[#64748B] leading-tight">Super Admin</p>
            </div>
            <ChevronDown className="hidden h-3.5 w-3.5 text-[#94A3B8] md:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-[#E2E8F0] bg-white shadow-lg z-50">
              <div className="border-b border-[#E2E8F0] px-4 py-3">
                <p className="text-[13px] font-semibold text-[#0F172A]">{user?.firstName} {user?.lastName}</p>
                <p className="text-[12px] text-[#64748B]">{user?.email}</p>
              </div>
              <div className="p-1.5">
                <button className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-[#0F172A] hover:bg-[#F8FAFC] transition-colors">
                  <User className="h-4 w-4 text-[#64748B]" />
                  My Account
                </button>
                <button
                  onClick={() => {
                    router.push('/settings');
                    setShowUserMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
                >
                  <Settings className="h-4 w-4 text-[#64748B]" />
                  Settings
                </button>
              </div>
              <div className="border-t border-[#E2E8F0] p-1.5">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
