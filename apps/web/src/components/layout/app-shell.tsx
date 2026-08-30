'use client';

/**
 * FusionOS Application Shell
 *
 * Clean enterprise layout. Dark navy sidebar + light workspace.
 * Skips shell for auth pages.
 */

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Header } from './header';

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
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      {/* Sidebar Navigation */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden" style={{ marginLeft: sidebarCollapsed ? 72 : 240 }}>
        {/* Top Header */}
        <Header onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

        {/* Page Content */}
        <main
          className="flex-1 overflow-y-auto bg-[#F8FAFC]"
          role="main"
          aria-label="Main content"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
