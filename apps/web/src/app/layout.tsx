import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

// Force dynamic rendering for all pages (enterprise ERP requires auth)
export const dynamic = 'force-dynamic';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

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
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
