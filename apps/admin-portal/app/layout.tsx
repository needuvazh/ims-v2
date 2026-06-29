import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter, Noto_Sans_Arabic, Sora } from 'next/font/google';
import '@ims/shared-ui/styles.css';
import './globals.css';

const bodyFont = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

const displayFont = Sora({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

const arabicFont = Noto_Sans_Arabic({
  subsets: ['arabic'],
  display: 'swap',
  variable: '--font-noto-sans-arabic',
});

export const metadata: Metadata = {
  title: 'IMS Admin Portal',
  description: 'Institute Management System admin portal foundation.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable} ${arabicFont.variable}`}>
      <body className="bg-[color:var(--ims-background)] text-[color:var(--ims-ink)] antialiased selection:bg-[color:var(--ims-brass)] selection:text-white">
        {children}
      </body>
    </html>
  );
}
