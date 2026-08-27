import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/auth-context';
import { AppShell } from '@/components/layout/app-shell';
import './globals.css';

export const metadata: Metadata = {
  title: 'FusionOS — AI-native Business Operating System',
  description:
    'FusionOS by ZORVEXA — A unified enterprise ERP SaaS platform connecting HR, Finance, CRM, Projects, AI, and Automation into one system.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
