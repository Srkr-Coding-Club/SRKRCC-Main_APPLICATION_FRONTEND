// Bare API host (no trailing /api), derived from the same env var api-client.ts
// uses, so there is a single source of truth for the backend URL.
const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

export const API_BASE = RAW_API_BASE_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');
