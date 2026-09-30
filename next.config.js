const withNextIntl = require("next-intl/plugin")(
  "./i18n/request.ts"
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@sparticuz/chromium", "playwright-core"], // fork: homepage-generation headless chromium
  // fork: the Inngest function launches @sparticuz/chromium; its brotli-packed
  // binary lives in bin/ and is loaded at runtime, so Next's file tracer can't see
  // it from the imports. Force it into the function bundle or the serverless launch
  // fails (executablePath points at a missing file) — CI stays green because CI
  // never bundles for Vercel. See docs/reference/LESSONS_LEARNED.md.
  outputFileTracingIncludes: {
    "/api/inngest": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "localhost" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "minio-cwg0o4ss0scoccgwso8sk004.coolify.cz" },
      { protocol: "http", hostname: "minio" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/:locale/crm/targets/:path*",
        destination: "/:locale/campaigns/targets/:path*",
        permanent: true,
      },
      {
        source: "/:locale/crm/target-lists/:path*",
        destination: "/:locale/campaigns/target-lists/:path*",
        permanent: true,
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
