'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { Celebration } from '@/lib/types';
import { celebrationsApi } from '@/lib/api/celebrations';
import { isAuthenticated } from '@/lib/auth';

const POLL_MS = 30_000;
/** A check right after another one is skipped, so a burst of page changes costs one request. */
const MIN_GAP_MS = 4_000;
/** At most this many are lined up at a time; the rest wait on the server for a later check. */
const MAX_QUEUE = 3;
const CHECK_EVENT = 'celebrations:check';
/** How soon to look again when the screen is not a place for a party (the home intro is playing). */
const RETRY_MS = 3_000;

/**
 * Pages where a card and confetti would get in the way: signing in or up, the camera that scans people in, and the
 * printable certificate. A celebration waits on the server until the person is somewhere else.
 */
const QUIET_ROUTES = [
  /^\/(login|signup|forgot-password|reset-password|account\/set-password)(\/|$)/,
  /^\/attendance\/scan/,
  /^\/hackathons\/[^/]+\/(check-in|certificate)(\/|$)/,
  /^\/certificates\//,
];

/** The home page's opening film hides the site's own navigation: nothing else should compete with it. */
const introPlaying = () => document.documentElement.hasAttribute('data-intro-cinema');

export const isQuietRoute = (path: string | null) => QUIET_ROUTES.some((route) => route.test(path ?? ''));

/** Ask the site to look for new celebrations now (after something happy may just have happened). */
export function requestCelebrationCheck(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHECK_EVENT));
}

/**
 * The celebrations waiting for the signed-in person, one at a time. It looks when the site opens, on every page change,
 * when the tab comes back, every 30 seconds while visible and on `requestCelebrationCheck()`. A celebration is marked
 * seen the moment it is put on screen, so closing the tab never makes it come back.
 */
export function useCelebrations() {
  const pathname = usePathname();
  const [queue, setQueue] = useState<Celebration[]>([]);
  const queueRef = useRef<Celebration[]>([]);
  const known = useRef(new Set<number>());
  const lastCheck = useRef(0);
  const running = useRef(false);
  const retry = useRef<number | null>(null);
  const quiet = useRef(false);
  quiet.current = isQuietRoute(pathname);

  const check = useCallback(async () => {
    if (running.current || !isAuthenticated() || document.visibilityState === 'hidden' || quiet.current) return;
    if (introPlaying()) {
      if (retry.current === null) retry.current = window.setTimeout(() => { retry.current = null; void check(); }, RETRY_MS);
      return;
    }
    if (Date.now() - lastCheck.current < MIN_GAP_MS) return;
    running.current = true;
    lastCheck.current = Date.now();
    try {
      const reply = await celebrationsApi.pending();
      if (!reply.enabled) {
        queueRef.current = [];
        setQueue([]);
        return;
      }
      const room = MAX_QUEUE - queueRef.current.length;
      const fresh = reply.results.filter((item) => !known.current.has(item.id)).slice(0, Math.max(room, 0));
      if (fresh.length === 0) return;
      fresh.forEach((item) => known.current.add(item.id));
      queueRef.current = [...queueRef.current, ...fresh];
      setQueue(queueRef.current);
    } catch {
      // Not signed in, offline or a server hiccup: a missed party is picked up by the next check.
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => void check(), 800);
    const timer = window.setInterval(() => void check(), POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') void check(); };
    const onCheck = () => { lastCheck.current = 0; void check(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener(CHECK_EVENT, onCheck);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      if (retry.current !== null) window.clearTimeout(retry.current);
      retry.current = null;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener(CHECK_EVENT, onCheck);
    };
  }, [check]);

  // Moving to another page is a natural moment to look (a sign-up or a form submit just happened).
  useEffect(() => { void check(); }, [pathname, check]);

  const current = queue[0] ?? null;

  useEffect(() => {
    if (current) void celebrationsApi.seen([current.id]).catch(() => undefined);
  }, [current]);

  const dismiss = useCallback(() => {
    queueRef.current = queueRef.current.slice(1);
    setQueue(queueRef.current);
  }, []);

  const clear = useCallback(() => {
    queueRef.current = [];
    setQueue([]);
  }, []);

  return { current, remaining: Math.max(queue.length - 1, 0), dismiss, clear };
}
