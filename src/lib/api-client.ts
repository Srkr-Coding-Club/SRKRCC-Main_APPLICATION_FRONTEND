import { refreshAccessToken } from './auth';

const API_BASE_URL = (process.env.INTERNAL_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '');

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry: boolean = false
): Promise<T> {
  const isClient = typeof window !== 'undefined';
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

  // On client, route through BFF Proxy so HttpOnly cookies are automatically sent and forwarded
  const url = isClient
    ? `/api/proxy/${cleanEndpoint}`
    : `${API_BASE_URL}/${cleanEndpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Automatically includes HttpOnly cookies
      cache: 'no-store',
      signal: controller.signal,
    });

    // Handle token expiration: attempt transparent refresh and replay
    if (response.status === 401 && !isRetry && isClient) {
      clearTimeout(timeout);
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return fetchApi<T>(endpoint, options, true);
      }
    }

    if (!response.ok) {
      let errMsg = `API error: ${response.status} ${response.statusText}`;
      try {
        const errJson = await response.json();
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
      throw new Error(errMsg);
    }

    return await response.json();
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
