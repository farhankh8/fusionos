import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@fusionos/shared', '@fusionos/types', '@fusionos/validation', '@fusionos/ui', '@fusionos/config'],
  reactStrictMode: true,
  // Required for the production Docker image (apps/web/Dockerfile copies .next/standalone)
  output: 'standalone',
  outputFileTracingRoot: './',
};

export default nextConfig;
