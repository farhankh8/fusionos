import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@fusionos/shared', '@fusionos/types', '@fusionos/validation', '@fusionos/ui', '@fusionos/config'],
  reactStrictMode: true,
  // Required for the production Docker image (apps/web/Dockerfile copies .next/standalone)
  output: 'standalone',
  // Resolved relative to this file (apps/web/) — must point at the MONOREPO root
  // so Next.js also traces the hoisted workspace node_modules (next, react, …).
  // Otherwise .next/standalone is produced without node_modules and the
  // production image (`node apps/web/server.js`) cannot boot.
  outputFileTracingRoot: '../../',
};

export default nextConfig;
