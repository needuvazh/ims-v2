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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ims-asti-uat.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Al-Saud Training Institute',
    template: '%s | Al-Saud Training Institute',
  },
  description:
    'Al-Saud Training Institute in Muscat provides forklift, crane, and safety training for individuals and corporate teams.',
  openGraph: {
    type: 'website',
    locale: 'en_OM',
    siteName: 'Al-Saud Training Institute',
  },
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable} ${arabicFont.variable}`}
    >
      <body className="bg-[color:var(--ims-background)] text-[color:var(--ims-ink)] antialiased selection:bg-[color:var(--ims-brass)] selection:text-white">
        {children}
      </body>
    </html>
  );
}
