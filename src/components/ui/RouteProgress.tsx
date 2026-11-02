'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { ROUTE_PROGRESS_START } from '@/lib/routeProgress';

/* A thin line along the top that starts the moment a link is pressed and finishes when the new */
/* page is ready, so a click never looks like it did nothing. It creeps toward 85% and waits    */
/* there; the route change (pathname or query) completes it. Link clicks and back/forward start */
/* it, and so do pushWithProgress / replaceWithProgress for navigation done in code.             */
const FAILSAFE_MS = 30000;

function isPlainInternalNavigation(event: MouseEvent, anchor: HTMLAnchorElement): boolean {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (anchor.target && anchor.target !== '_self') return false;
  if (anchor.hasAttribute('download')) return false;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  const here = window.location;
  if (url.pathname === here.pathname && url.search === here.search) return false;
  return true;
}

export function RouteProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [phase, setPhase] = useState<'idle' | 'running' | 'finishing'>('idle');
  const [grown, setGrown] = useState(false);
  const failsafe = useRef<number | undefined>(undefined);
  const hide = useRef<number | undefined>(undefined);

  useEffect(() => {
    const start = () => {
      window.clearTimeout(hide.current);
      window.clearTimeout(failsafe.current);
      setPhase('running');
      failsafe.current = window.setTimeout(() => setPhase('idle'), FAILSAFE_MS);
    };
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (anchor && isPlainInternalNavigation(event, anchor)) start();
    };
    // Capture phase: next/link calls preventDefault in its own handler, which would hide the click from us.
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', start);
    window.addEventListener(ROUTE_PROGRESS_START, start);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', start);
      window.removeEventListener(ROUTE_PROGRESS_START, start);
      window.clearTimeout(failsafe.current);
      window.clearTimeout(hide.current);
    };
  }, []);

  // The route changed: whatever was running is done.
  useEffect(() => {
    setPhase((current) => (current === 'running' ? 'finishing' : current));
  }, [pathname, search]);

  useEffect(() => {
    if (phase !== 'finishing') return;
    window.clearTimeout(failsafe.current);
    hide.current = window.setTimeout(() => setPhase('idle'), 350);
    return () => window.clearTimeout(hide.current);
  }, [phase]);

  // Mount at zero width, then grow on the next frame so the creep is animated rather than starting at 85%.
  useEffect(() => {
    if (phase !== 'running') { setGrown(false); return; }
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setGrown(true)));
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  if (phase === 'idle') return null;
  return (
    <div
      aria-hidden="true"
      className="route-progress"
      style={{
        width: phase === 'finishing' ? '100%' : grown ? '85%' : '0%',
        opacity: phase === 'finishing' ? 0 : 1,
        transition: phase === 'finishing' ? 'width 0.18s ease-out, opacity 0.25s ease 0.18s' : 'width 12s cubic-bezier(0.12, 0.75, 0.25, 1)',
      }}
    />
  );
}
