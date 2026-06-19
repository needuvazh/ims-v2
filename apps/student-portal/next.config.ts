import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@ims/shared-auth', '@ims/shared-ui', '@ims/identity-access'],
};

export default nextConfig;
