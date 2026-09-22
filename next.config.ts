import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: process.env.DOCKER_BUILD === '1' || process.env.OUTPUT_STANDALONE === 'true' ? 'standalone' : undefined,
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        // Overrides the blanket camera=() above for the two attendance-scanner
        // routes (admin's and the volunteer-reachable one) — both call
        // getUserMedia to open the camera. A same-origin Permissions-Policy
        // denial happens at the browser API level, before the browser ever
        // asks the user for camera permission, so without this override
        // Html5Qrcode.start() always failed with a policy violation and the
        // OS/browser permission prompt never had a chance to appear — it
        // wasn't a permission problem, it was this header blocking the page
        // from asking in the first place. Listed later in this array so it
        // wins over the general rule above for these exact two paths.
        source: '/(admin/attendance/scan|attendance/scan)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  turbopack: {
    resolveAlias: {
      fs: { browser: '' },
      path: { browser: '' },
      stream: { browser: '' },
    },
  },
  webpack: (config, { isServer }) => {
    // SheetJS (xlsx) uses Node.js built-ins internally.
    // In client bundles, provide false fallbacks so the build doesn't fail.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        stream: false,
      };
    }
    return config;
  },
};

export default nextConfig;
