import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
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
    ],
  },
  turbopack: {
    root: path.resolve(__dirname, '../../'),
  },
};

export default nextConfig;
