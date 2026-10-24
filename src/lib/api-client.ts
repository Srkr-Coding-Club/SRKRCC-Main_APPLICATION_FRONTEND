import { redirectToLogin, refreshAccessToken } from './auth';

const API_BASE_URL = (process.env.INTERNAL_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '');

// A rate-limited read that asks for no more than this is retried once on its own.
const MAX_AUTO_RETRY_SECONDS = 5;

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry: boolean = false
): Promise<T> {
  const isClient = typeof window !== 'undefined';
  let cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  if (cleanEndpoint.startsWith('api/')) {
    cleanEndpoint = cleanEndpoint.slice(4);
  }

  // On client, route through BFF Proxy so HttpOnly cookies are automatically sent and forwarded
  const url = isClient
    ? `/api/proxy/${cleanEndpoint}`
    : `${API_BASE_URL}/${cleanEndpoint}`;

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...((options.headers as Record<string, string>) || {}),
  };

  if (isFormData) {
    delete headers['Content-Type'];
    delete headers['content-type'];
  }

  const controller = new AbortController();
  const timeoutMs = (options as any)?.timeout || 25000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const method = (options.method || 'GET').toUpperCase();
  const defaultCache: RequestCache = options.cache || (method === 'GET' ? 'default' : 'no-store');

  try {
    const response = await fetch(url, {
      cache: defaultCache,
      ...options,
      headers,
      credentials: 'include', // Automatically includes HttpOnly cookies
      signal: controller.signal,
    });

    // Handle token expiration: attempt one transparent refresh and replay.
    if (response.status === 401 && isClient) {
      if (!isRetry) {
        clearTimeout(timeout);
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          return fetchApi<T>(endpoint, options, true);
        }
      }
      // Background polling (e.g. the notification bell) passes silentAuth: an expired
      // session there must not bounce someone off a public page.
      if (!(options as { silentAuth?: boolean }).silentAuth) redirectToLogin();
    }

    // Rate limited: a read that only has to wait a moment is retried once, quietly, instead of showing an error.
    if (response.status === 429 && method === 'GET' && !(options as { throttleRetried?: boolean }).throttleRetried) {
      const wait = Number(response.headers.get('retry-after'));
      if (Number.isFinite(wait) && wait > 0 && wait <= MAX_AUTO_RETRY_SECONDS) {
        clearTimeout(timeout);
        await new Promise((resolve) => setTimeout(resolve, wait * 1000 + Math.random() * 500));
        return fetchApi<T>(endpoint, { ...options, throttleRetried: true } as RequestInit, isRetry);
      }
    }

    if (!response.ok) {
      let errMsg = `API error: ${response.status} ${response.statusText}`;
      let errBody: any = null;
      try {
        const errJson = await response.json();
        errBody = errJson;
        if (errJson) {
          if (typeof errJson === 'string') {
            errMsg = errJson;
          } else if (errJson.detail) {
            errMsg = errJson.detail;
          } else if (errJson.error) {
            errMsg = errJson.error;
          } else {
            const fieldErrors = Object.entries(errJson)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
              .join(' | ');
            if (fieldErrors) errMsg = fieldErrors;
          }
        }
      } catch {
        // use default errMsg
      }
      // Preserve the structured payload (e.g. the form engine's {errors:[...]})
      // so callers can render per-field messages, not just the summary string.
      const err = new Error(errMsg) as Error & { status?: number; body?: any; retryAfter?: number };
      err.status = response.status;
      err.body = errBody;
      if (response.status === 429) {
        const wait = Number(errBody?.retry_after ?? response.headers.get('retry-after'));
        if (Number.isFinite(wait) && wait > 0) err.retryAfter = Math.ceil(wait);
      }
      throw err;
    }

    // 204 No Content (e.g. DELETE) and other empty bodies have nothing to
    // parse — response.json() would throw "Unexpected end of JSON input".
    const raw = await response.text();
    return raw ? (JSON.parse(raw) as T) : (null as T);
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      console.warn(`[Backend Timeout] ${url} took too long to respond. Using fallback data.`);
    } else if (error?.code === 'ECONNREFUSED' || error?.cause?.code === 'ECONNREFUSED') {
      console.warn(`[Backend Offline] Unable to connect to ${url}. Using fallback data.`);
    } else {
      console.error(`[API Error] Request to ${url} failed:`, error?.message || error);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Downloads a file (CSV/XLSX/JSON) through the BFF proxy. Mirrors fetchApi's
 * one-shot token refresh on 401 - a plain fetch would otherwise fail as soon as
 * the access token expires, even though the session is still valid.
 */
export async function fetchApiBlob(endpoint: string): Promise<{ blob: Blob; filename: string | null }> {
  const url = `/api/proxy/${endpoint.replace(/^\/+/, '')}`;
  const request = () => fetch(url, { credentials: 'include', cache: 'no-store' });

  let response = await request();
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      redirectToLogin();
      throw new Error('Your session has expired. Please sign in again.');
    }
    response = await request();
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || body?.detail || `Download failed (${response.status})`);
  }

  const disposition = response.headers.get('Content-Disposition') ?? '';
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? null;
  return { blob: await response.blob(), filename };
}
