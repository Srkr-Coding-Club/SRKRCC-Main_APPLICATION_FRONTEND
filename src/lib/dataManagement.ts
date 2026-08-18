/**
 * dataManagement.ts
 * Shared utilities for the Club Data Management Center.
 */

import Papa from 'papaparse';

// ---------------------------------------------------------------------------
// Relative time formatting
// ---------------------------------------------------------------------------

export function relativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffSeconds = Math.floor((now - then) / 1000);

  if (diffSeconds < 60) return 'just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} min ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} hours ago`;
  if (diffSeconds < 172800) return 'yesterday';
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)} days ago`;
  return new Date(isoString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// File size formatting
// ---------------------------------------------------------------------------

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Star rating display
// ---------------------------------------------------------------------------

export function starsDisplay(value: number, max: number = 5): string {
  const filled = Math.max(0, Math.min(max, Math.round(value)));
  return '★'.repeat(filled) + '☆'.repeat(max - filled);
}

// ---------------------------------------------------------------------------
// Group responses by day (for timeline chart)
// ---------------------------------------------------------------------------

export function groupByDay(
  timestamps: string[],
  days: number = 30
): { date: string; count: number }[] {
  const counts: Record<string, number> = {};
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    counts[key] = 0;
  }

  timestamps.forEach((iso) => {
    const d = new Date(iso);
    const key = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    if (key in counts) counts[key]++;
  });

  return Object.entries(counts).map(([date, count]) => ({ date, count }));
}

// ---------------------------------------------------------------------------
// CSV download
// ---------------------------------------------------------------------------

/**
 * Serialize data to CSV and trigger a browser download.
 * JSON object/array values are stringified to avoid "[object Object]" output.
 */
export function downloadCSV(data: object[], filename: string): void {
  const normalized = data.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) => [
        k,
        v !== null && typeof v === 'object' ? JSON.stringify(v) : v,
      ])
    )
  );
  const csv = Papa.unparse(normalized);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Idempotency key generator
// ---------------------------------------------------------------------------

export function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------------------------------------------------------------------------
// Auth token helper
// ---------------------------------------------------------------------------

/** Read the JWT access token from localStorage. Key is 'access_token'. */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

/**
 * Build fetch options with Authorization header and no timeout abort.
 * Use this for long-running requests (e.g., bulk ingest) instead of fetchApi.
 */
export function buildAuthFetchOptions(
  method: string,
  body?: object
): RequestInit {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return {
    method,
    headers,
    cache: 'no-store',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };
}

// ---------------------------------------------------------------------------
// Excel date serial → JS Date conversion
// ---------------------------------------------------------------------------

/**
 * Convert an Excel date serial number to a JS Date.
 * Excel counts days from 1900-01-01; JS from 1970-01-01.
 * Formula: (serial - 25569) * 86400 * 1000
 */
export function excelSerialToDate(serial: number): Date {
  return new Date((serial - 25569) * 86400 * 1000);
}

/** Return true if a number looks like an Excel date serial. */
export function looksLikeExcelDate(value: unknown): boolean {
  if (typeof value !== 'number') return false;
  return value >= 25569 && value <= 60000;
}
