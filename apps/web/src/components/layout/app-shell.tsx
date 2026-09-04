'use client';

/**
 * FusionOS Application Shell
 *
 * Clean enterprise layout. Dark navy sidebar + light workspace + right AI toolbar.
 * Skips shell for auth pages.
 */

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { RightToolbar } from './right-toolbar';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname() || '/';

  // Skip shell for auth pages
  const isAuthPage = pathname.startsWith('/auth');

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Left Sidebar Navigation */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-h-0 min-w-0">
        {/* Top Header */}
        <Header onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

        {/* Page Content */}
        <main
          className="flex-1 min-h-0 overflow-y-auto"
          role="main"
          aria-label="Main content"
        >
          <div className="min-h-full bg-background">
            {children}
          </div>
        </main>
      </div>

      {/* Right AI Toolbar */}
      <RightToolbar />
    </div>
  );
}
