import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@ims/shared-kernel',
    '@ims/shared-auth',
    '@ims/shared-ui',
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
