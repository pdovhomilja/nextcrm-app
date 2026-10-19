import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Keep the build inside apps/docs; otherwise Next picks the repo root
  // (the NextCRM app) as the project root.
  turbopack: { root: import.meta.dirname },
  outputFileTracingRoot: import.meta.dirname,
  // Older versions live at /docs/v0.35/... but render from app/docs-versions,
  // which has its own per-version layout (see README.md "Versions").
  async rewrites() {
    return {
      beforeFiles: [{ source: '/docs/:version(v\\d+\\.\\d+)/:path*', destination: '/docs-versions/:version/:path*' }],
    };
  },
};

export default withMDX(config);
