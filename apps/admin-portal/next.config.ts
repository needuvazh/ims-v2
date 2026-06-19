import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@ims/shared-kernel',
    '@ims/shared-auth',
    '@ims/shared-ui',
    '@ims/audit',
    '@ims/identity-access',
    '@ims/organization',
  ],
};

export default nextConfig;
