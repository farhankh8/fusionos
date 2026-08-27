'use client';

/**
 * FusionOS Application Shell
 *
 * The main layout wrapper that provides the sidebar navigation and header.
 * All pages render inside this shell.
 * One application experience — no compromise.
 */

import { Sidebar } from './sidebar';
import { Header } from './header';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-50">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="ml-[260px] flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <Header />

        {/* Page Content */}
        <main
          className="flex-1 overflow-y-auto"
          role="main"
          aria-label="Main content"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
