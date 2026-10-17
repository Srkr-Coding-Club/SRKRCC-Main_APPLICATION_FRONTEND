// Bare API host (no trailing /api), derived from the same env var api-client.ts
// uses, so there is a single source of truth for the backend URL.
const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

export const API_BASE = RAW_API_BASE_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');

const LOCAL_API_HOSTS = ['localhost', '127.0.0.1'];

/**
 * `next build` prerenders pages on the server and runs the root layout for each
 * one. With a local API nothing answers during that build, so each read fails
 * and logs an error. Skip those reads in that case; production builds that point
 * at a real backend still read live data.
 */
export function skipBuildTimeApiRead(): boolean {
  if (process.env.NEXT_PHASE !== 'phase-production-build') return false;
  try {
    return LOCAL_API_HOSTS.includes(new URL(API_BASE).hostname);
  } catch {
    return false;
  }
}
