'use client';

/**
 * FusionOS Application Shell
 *
 * Clean enterprise layout. Sidebar + top bar + content area.
 */

import { Sidebar } from './sidebar';
import { Header } from './header';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="ml-[240px] flex flex-1 flex-col overflow-hidden">
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
