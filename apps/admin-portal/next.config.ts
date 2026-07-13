import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ['127.0.0.1'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests",
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
        ],
      },
    ];
  },
  transpilePackages: [
    '@ims/shared-kernel',
    '@ims/shared-auth',
    '@ims/shared-ui',
    '@ims/portal-ui',
    '@ims/audit',
    '@ims/identity-access',
    '@ims/observability',
    '@ims/organization',
    '@ims/database',
    '@ims/admissions-enrollment',
    '@ims/finance-receivables',
    '@ims/crm-leads',
    '@ims/reporting-dashboards',
    '@ims/attendance',
    '@ims/course-catalog',
    '@ims/documents',
    '@ims/scheduling',
    '@ims/trainer-management',
    '@ims/training-delivery',
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      { protocol: 'https', hostname: 'www.alsaud-intl.com' },
    ],
  },
  turbopack: {
    root: path.resolve(__dirname, '../../'),
  },
};

export default nextConfig;
