/**
 * Shared runtime constants.
 *
 * NEXT_PUBLIC_API_URL  — full base URL of the Django backend, without a trailing slash.
 * Example .env.local:
 *   NEXT_PUBLIC_API_URL=http://localhost:8000
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';
