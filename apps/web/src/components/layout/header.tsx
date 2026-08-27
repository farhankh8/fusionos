'use client';

/**
 * FusionOS Header — Enterprise Top Bar
 *
 * Clean, minimal header. No glass effects, no unnecessary buttons.
 * Breadcrumb + search + notifications + user.
 */

import { cn } from '@/lib/utils';
import { Search, Bell, ChevronDown } from 'lucide-react';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-background px-4',
        className,
      )}
      role="banner"
    >
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <span>Dashboard</span>
        <span className="text-border">/</span>
        <span className="font-medium text-foreground">Command Center</span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Search */}
        <button
          className="flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-[13px] text-muted-foreground transition-colors duration-120 hover:border-border-strong hover:text-foreground cursor-pointer"
          aria-label="Search"
        >
          <Search className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden rounded border border-border bg-muted px-1 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
            ⌘K
          </kbd>
        </button>

        {/* Notifications */}
        <button
          className="relative flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-120 hover:bg-muted hover:text-foreground cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-destructive" />
        </button>

        {/* Separator */}
        <div className="mx-1 h-4 w-px bg-border" />

        {/* User */}
        <button className="flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors duration-120 hover:bg-muted cursor-pointer">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-[11px] font-semibold text-primary">
            Z
          </div>
          <span className="hidden text-[13px] font-medium text-foreground md:inline">
            Admin
          </span>
          <ChevronDown className="hidden h-3 w-3 text-muted-foreground md:block" />
        </button>
      </div>
    </header>
  );
}
