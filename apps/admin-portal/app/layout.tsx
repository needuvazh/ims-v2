import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter, Sora, IBM_Plex_Mono, Noto_Sans_Arabic } from 'next/font/google';
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

const monoFont = IBM_Plex_Mono({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
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
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable} ${arabicFont.variable}`}>
      <body className="bg-[color:var(--ims-background)] text-[color:var(--ims-ink)] antialiased selection:bg-[color:var(--ims-brass)] selection:text-white">
        {children}
      </body>
    </html>
  );
}
