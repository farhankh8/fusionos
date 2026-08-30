'use client';

import { type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { AuthProvider } from '@/contexts/auth-context';

const AppShell = dynamic(
  () => import('@/components/layout/app-shell').then((mod) => mod.AppShell),
  { ssr: false }
);

export function ShellProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
