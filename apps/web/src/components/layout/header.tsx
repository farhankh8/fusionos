'use client';

/**
 * FusionOS Header Component
 *
 * Top navigation bar with application name, search, notifications, and user menu.
 * Professional, clean, enterprise design.
 */

import { cn } from '@/lib/utils';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6',
        className,
      )}
      role="banner"
    >
      {/* Left: Page context / breadcrumb */}
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-medium text-gray-500">
          {/* Page title will be dynamic in future phases */}
        </h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <button
          className="flex h-8 items-center gap-2 rounded-md border border-gray-200 px-3 text-sm text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-600"
          aria-label="Search"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <span className="hidden md:inline">Search...</span>
          <kbd className="hidden rounded border border-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 md:inline">
            ⌘K
          </kbd>
        </button>

        {/* Notifications */}
        <button
          className="relative flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Notifications"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          {/* Notification badge placeholder */}
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
            <span className="text-xs font-medium text-gray-600">?</span>
          </div>
        </div>
      </div>
    </header>
  );
}
