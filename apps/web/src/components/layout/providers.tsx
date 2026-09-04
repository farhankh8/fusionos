'use client';

import { type ReactNode } from 'react';
import { ThemeProvider } from '@/contexts/theme-context';
import { ShellProvider } from '@/components/layout/shell-provider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ShellProvider>{children}</ShellProvider>
    </ThemeProvider>
  );
}
