import type { Metadata } from 'next';

import { DriftField } from '@/components/layout/DriftField';
import { Nav } from '@/components/layout/Nav';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Drift | Every version remembered',
  description: 'Prompt iteration genealogy and grounded visual delta analysis.',
};

/** Provides the shared shell, navigation, and ambient field for every route. */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {/* Logo slot: replace with public/logo.svg once provided */}
        {/* Favicon slot: replace with public/favicon.ico once provided */}
        <DriftField />
        <Nav />
        {children}
      </body>
    </html>
  );
}
