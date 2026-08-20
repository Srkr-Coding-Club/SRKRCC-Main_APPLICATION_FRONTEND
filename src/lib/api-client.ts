import { refreshAccessToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry: boolean = false
): Promise<T> {
  // If requesting current user profile from client, route through BFF endpoint for HttpOnly cookie transport
  const isClient = typeof window !== 'undefined';
  const url =
    isClient && endpoint.includes('/auth/me')
      ? '/api/auth/me'
      : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

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
      throw new Error(`API error: ${response.status} ${response.statusText}`);
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
