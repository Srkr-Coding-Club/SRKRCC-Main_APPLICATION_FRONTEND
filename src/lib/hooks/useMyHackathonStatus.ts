import { useEffect, useState } from 'react';
import type { MyTeamPayload } from '@/lib/types';
import { fetchAndSyncCurrentUser, isAuthenticated } from '@/lib/auth';
import { hackathonApi } from '@/lib/api/hackathons';

interface MyHackathonStatus {
  /** null while still checking. */
  loggedIn: boolean | null;
  mine: MyTeamPayload | null;
}

const CACHE_MS = 15_000;
const cache = new Map<string, { at: number; promise: Promise<MyHackathonStatus> }>();

function load(slug: string): Promise<MyHackathonStatus> {
  const hit = cache.get(slug);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.promise;

  const promise = (async (): Promise<MyHackathonStatus> => {
    if (!isAuthenticated()) return { loggedIn: false, mine: null };
    // Confirm the session is live first: a stale stored user would make my-team 401,
    // and a 401 redirects to /login, which is not acceptable on a public page.
    const user = await fetchAndSyncCurrentUser();
    if (!user) return { loggedIn: false, mine: null };
    try {
      return { loggedIn: true, mine: await hackathonApi.myTeam(slug) };
    } catch {
      return { loggedIn: true, mine: null };
    }
  })();
  cache.set(slug, { at: Date.now(), promise });
  return promise;
}

/** Call after the member's team or invites change so the next page shows fresh state. */
export function invalidateMyHackathonStatus(slug: string) {
  cache.delete(slug);
}

/** The signed-in member's team/invite state for one hackathon, shared by every component on the page. */
export function useMyHackathonStatus(slug: string): MyHackathonStatus {
  const [status, setStatus] = useState<MyHackathonStatus>({ loggedIn: null, mine: null });

  useEffect(() => {
    let cancelled = false;
    load(slug).then((result) => {
      if (!cancelled) setStatus(result);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return status;
}
