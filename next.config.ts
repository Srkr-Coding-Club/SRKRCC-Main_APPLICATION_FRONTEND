import type { NextConfig } from "next";
import path from "path";

// Default hosts and custom environment hosts for Next.js remote images
const defaultImageHosts = [
  'images.unsplash.com',
  'plus.unsplash.com',
  'lh3.googleusercontent.com',
  'drive.google.com',
  'res.cloudinary.com',
  'avatars.githubusercontent.com',
  'raw.githubusercontent.com',
  'dl.dropboxusercontent.com',
];

const envImageHosts = (process.env.NEXT_IMAGE_REMOTE_HOSTS || '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

const allImageHosts = Array.from(new Set([...defaultImageHosts, ...envImageHosts]));

// HSTS makes browsers refuse plain HTTP for this site for HSTS_MAX_AGE_SECONDS, and they cannot be
// told to forget it early: use a short value (e.g. 3600) until the deployment is settled. 0 turns
// the header off.
const DEFAULT_HSTS_SECONDS = 31536000;
const parsedHstsSeconds = Number.parseInt(process.env.HSTS_MAX_AGE_SECONDS ?? '', 10);
const hstsSeconds = Number.isNaN(parsedHstsSeconds) ? DEFAULT_HSTS_SECONDS : Math.max(parsedHstsSeconds, 0);

const envFlag = (name: string, fallback: boolean): boolean => {
  const value = (process.env[name] || '').trim().toLowerCase();
  return value ? ['true', '1', 'yes'].includes(value) : fallback;
};

const hstsValue = [
  `max-age=${hstsSeconds}`,
  envFlag('HSTS_INCLUDE_SUBDOMAINS', true) && 'includeSubDomains',
  envFlag('HSTS_PRELOAD', false) && 'preload',
]
  .filter(Boolean)
  .join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: process.env.DOCKER_BUILD === '1' || process.env.OUTPUT_STANDALONE === 'true' ? 'standalone' : undefined,
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
      ...allImageHosts.map((hostname) => ({ protocol: 'https' as const, hostname })),
    ],
  },
  async headers() {
    // Report-only for now: violations show in the browser console without breaking anything. Tighten
    // (drop 'unsafe-inline'/'unsafe-eval' via nonces) and switch to Content-Security-Policy once the
    // console is quiet in production.
    const uploadOrigins = (process.env.UPLOAD_CONNECT_SRC || '').split(/\s+/).filter(Boolean).map((origin) => ` ${origin}`).join('');
    const cspReportOnly = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      // Uploads go from the browser straight to the storage bucket: list its origin(s) in UPLOAD_CONNECT_SRC.
      `connect-src 'self'${uploadOrigins}`,
      "media-src 'self' blob:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      `frame-src 'self' blob:${uploadOrigins}`,
    ].join('; ');

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
          ...(hstsSeconds > 0 ? [{ key: 'Strict-Transport-Security', value: hstsValue }] : []),
          {
            key: 'Content-Security-Policy-Report-Only',
            value: cspReportOnly,
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  async rewrites() {
    const backendUrl = (process.env.INTERNAL_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '');
    const backendOrigin = backendUrl.replace(/\/api\/?$/, '');
    return [
      {
        source: '/media/:path*',
        destination: `${backendOrigin}/media/:path*`,
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
