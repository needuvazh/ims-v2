import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  transpilePackages: [
    '@ims/shared-kernel',
    '@ims/shared-auth',
    '@ims/shared-ui',
    '@ims/portal-ui',
    '@ims/audit',
    '@ims/identity-access',
    '@ims/organization',
    '@ims/database',
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
    ],
  },
};

export default nextConfig;
