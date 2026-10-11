import type { CodeQuestReport } from './types';

const API_BASE_URL = (
  process.env.INTERNAL_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:8000/api'
).replace(/\/$/, '');

const ENDPOINT = 'codequest/stats/admin-export/';

/**
 * Download a server-generated CodeQuest report as a CSV attachment.
 *
 * The blob is fetched through the BFF proxy so the HttpOnly session cookie is
 * forwarded; the filename is taken from the backend's Content-Disposition.
 */
export async function downloadCodeQuestReport(
  dataset: CodeQuestReport,
  params: Record<string, string> = {},
): Promise<void> {
  const query = new URLSearchParams({ dataset, ...params }).toString();
  const isClient = typeof window !== 'undefined';
  const url = isClient
    ? `/api/proxy/${ENDPOINT}?${query}`
    : `${API_BASE_URL}/${ENDPOINT}?${query}`;

  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  if (!response.ok) {
    let message = `Export failed: ${response.status}`;
    try {
      const body = await response.json();
      message = body?.dataset?.[0] || body?.detail || message;
    } catch {
      // Non-JSON error body — keep the status-based message.
    }
    throw new Error(message);
  }

  const disposition = response.headers.get('Content-Disposition') ?? '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || `codequest_${dataset}.csv`;

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}
