'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CheckInSessionInfo } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';

const REFRESH_MS = 60000;

const storageKey = (slug: string) => `hackathon-check-in-session:${slug}`;

const scannable = (session: CheckInSessionInfo) => session.is_active && !session.outside_schedule;

function remembered(slug: string): number | null {
  try {
    const value = Number(window.localStorage.getItem(storageKey(slug)));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

/** Which session this phone is scanning: the one the volunteer chose last time if it still takes scans, otherwise the arrival check-in. */
export function pickSession(sessions: CheckInSessionInfo[], current: number | null, stored: number | null): number | null {
  const usable = sessions.filter(scannable);
  for (const wanted of [current, stored]) {
    const found = usable.find((session) => session.id === wanted);
    if (found) return found.id;
  }
  return (usable.find((session) => session.is_main) ?? usable[0] ?? null)?.id ?? null;
}

/** The check-in sessions of a hackathon and the one being scanned, kept across reloads. */
export function useCheckInSession(slug: string) {
  const [sessions, setSessions] = useState<CheckInSessionInfo[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    hackathonApi.checkIn.sessions(slug)
      .then((list) => {
        setSessions(list);
        setSelectedId((current) => pickSession(list, current, remembered(slug)));
        setError('');
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load the check-in sessions.')));
  }, [slug]);

  useEffect(() => {
    refresh();
    // Windows open and close while the page stays open.
    const timer = window.setInterval(refresh, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const select = useCallback((id: number) => {
    setSelectedId(id);
    try {
      window.localStorage.setItem(storageKey(slug), String(id));
    } catch {
      // Not remembered after a reload; the choice still holds for this visit.
    }
  }, [slug]);

  const session = sessions.find((item) => item.id === selectedId) ?? null;
  return { sessions, session, select, refresh, error };
}
