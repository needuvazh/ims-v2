import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@ims/identity-access', '@ims/shared-auth', '@ims/shared-ui'],
};

export default nextConfig;
