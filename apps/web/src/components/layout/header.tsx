'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

interface HeaderProps {
  className?: string;
}

const QUICK_ADD_ITEMS = [
  { category: 'GENERAL', items: [
    { label: 'Add User', icon: '👤', href: '/settings/users' },
    { label: 'Item', icon: '📦', href: '/items/new' },
    { label: 'Journal Entry', icon: '📒', href: '/accounting/journal' },
    { label: 'Log Time', icon: '⏱️', href: '/time-tracking' },
    { label: 'Task', icon: '✅', href: '/tasks/new' },
  ]},
  { category: 'INVENTORY', items: [
    { label: 'Inventory Adjustments', icon: '📊', href: '/inventory/adjustments' },
    { label: 'Packages', icon: '📦', href: '/inventory/packages' },
    { label: 'Shipment', icon: '🚚', href: '/inventory/shipments' },
    { label: 'Bill of Materials', icon: '📋', href: '/manufacturing/bom' },
  ]},
  { category: 'SALES', items: [
    { label: 'Customer', icon: '👥', href: '/sales/customers/new' },
    { label: 'Quotes', icon: '💬', href: '/sales/quotes/new' },
    { label: 'Sales Order', icon: '📝', href: '/sales/orders/new' },
    { label: 'Invoices', icon: '🧾', href: '/sales/invoices/new' },
    { label: 'Credit Notes', icon: '↩️', href: '/sales/credit-notes/new' },
  ]},
  { category: 'PURCHASES', items: [
    { label: 'Vendor', icon: '🏭', href: '/purchases/vendors/new' },
    { label: 'Expenses', icon: '💰', href: '/purchases/expenses/new' },
    { label: 'Bill', icon: '📄', href: '/purchases/bills/new' },
    { label: 'Purchase Order', icon: '🛒', href: '/purchases/orders/new' },
  ]},
];

export function Header({ className }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const quickAddRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (quickAddRef.current && !quickAddRef.current.contains(event.target as Node)) {
        setShowQuickAdd(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get breadcrumb from pathname
  const getBreadcrumb = () => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0) return { section: 'Home', page: 'Dashboard' };
    const firstPart = parts[0] || '';
    const lastPart = parts[parts.length - 1] || '';
    const section = firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
    const page = parts.length > 1 
      ? lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/-/g, ' ')
      : section;
    return { section, page };
  };

  const { section, page } = getBreadcrumb();

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4',
        className,
      )}
      role="banner"
    >
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>{section}</span>
        <span className="text-gray-300">/</span>
        <span className="font-medium text-gray-900">{page}</span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Global Search */}
        <button
          className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          onClick={() => {/* Open search modal */}}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="hidden md:inline">Search</span>
          <kbd className="hidden rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-400 md:inline">
            /
          </kbd>
        </button>

        {/* Trial Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
          <span className="text-xs text-gray-500">Trial expires in 13 days.</span>
          <button className="text-xs font-semibold text-blue-600 hover:text-blue-700">Subscribe</button>
        </div>

        {/* Organization Name */}
        <div className="hidden lg:flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700">
          <span className="truncate max-w-[100px]">FUSIONOS</span>
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Quick Add (+) Button */}
        <div className="relative" ref={quickAddRef}>
          <button
            onClick={() => {
              setShowQuickAdd(!showQuickAdd);
              setShowNotifications(false);
              setShowUserMenu(false);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {/* Quick Add Dropdown */}
          {showQuickAdd && (
            <div className="absolute right-0 top-full mt-2 w-[600px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Quick Add</h3>
              </div>
              <div className="grid grid-cols-4 gap-0 divide-x divide-gray-100">
                {QUICK_ADD_ITEMS.map((category) => (
                  <div key={category.category} className="p-3">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{category.category}</h4>
                    <div className="space-y-1">
                      {category.items.map((item) => (
                        <button
                          key={item.label}
                          onClick={() => {
                            router.push(item.href);
                            setShowQuickAdd(false);
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-blue-50 transition-colors group"
                        >
                          <span className="text-sm">{item.icon}</span>
                          <span className="text-xs font-medium text-gray-700 group-hover:text-blue-600">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowQuickAdd(false);
              setShowUserMenu(false);
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                <button className="text-xs text-blue-600 hover:text-blue-700">Enable Desktop Notifications</button>
              </div>
              <div className="p-2 border-b border-gray-100 flex gap-2">
                <button className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-full">All</button>
                <button className="px-3 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-full">Mentions</button>
              </div>
              <div className="p-8 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-gray-500">Uhh... There are no notifications at the moment.</p>
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <button
          onClick={() => router.push('/settings')}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* Separator */}
        <div className="h-6 w-px bg-gray-200" />

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowQuickAdd(false);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium text-sm">
              {user?.firstName?.charAt(0) || 'U'}
            </div>
          </button>

          {/* User Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                    {user?.firstName?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  <span>User ID: 001</span>
                  <span>•</span>
                  <span>Org ID: FUSIONOS</span>
                </div>
              </div>
              <div className="p-2">
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  My Account
                </button>
                <button 
                  onClick={() => {
                    router.push('/settings');
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
              </div>
              <div className="p-2 border-t border-gray-100">
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
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