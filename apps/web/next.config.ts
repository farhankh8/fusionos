import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@fusionos/shared', '@fusionos/types', '@fusionos/validation', '@fusionos/ui', '@fusionos/config'],
  reactStrictMode: true,
  outputFileTracingRoot: './',
};

export default nextConfig;
