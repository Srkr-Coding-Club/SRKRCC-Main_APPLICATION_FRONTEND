const DJANGO_API_URL = (process.env.INTERNAL_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '');

export interface RefreshedTokens {
  access: string;
  refresh?: string;
}

// Keyed by the refresh token value itself, so two callers holding the same
// (not-yet-rotated) cookie value share one in-flight Django call instead of
// each independently POSTing /auth/token/refresh/. That matters because the
// backend has ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION enabled: the
// old refresh token is single-use, so a second concurrent call with the same
// old value gets rejected as "blacklisted" — which the caller (e.g.
// fetchAndSyncCurrentUser) previously treated as an expired session and
// logged the user out, even though the first call's refresh had actually
// succeeded. This dedup makes every concurrent caller await and share that
// one successful result instead of racing Django's single-use rotation.
const inFlightRefreshes = new Map<string, Promise<RefreshedTokens | null>>();

export async function refreshTokens(refreshToken: string): Promise<RefreshedTokens | null> {
  const existing = inFlightRefreshes.get(refreshToken);
  if (existing) return existing;

  const promise = (async (): Promise<RefreshedTokens | null> => {
    try {
      const res = await fetch(`${DJANGO_API_URL}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data?.access) return null;
      return { access: data.access, refresh: data.refresh || undefined };
    } catch {
      return null;
    } finally {
      inFlightRefreshes.delete(refreshToken);
    }
  })();

  inFlightRefreshes.set(refreshToken, promise);
  return promise;
}
