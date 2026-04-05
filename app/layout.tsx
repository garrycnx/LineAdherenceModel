import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'AI Schedule Generator | WFM Club',
  description:
    'AI-powered workforce scheduling tool using Erlang-C and Line Adherence Engine. Generate weekly and monthly rosters with automatic shift and break optimization.',
  keywords: ['WFM', 'workforce management', 'scheduling', 'Erlang-C', 'roster', 'shift planning'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-gray-950 text-gray-100 antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
