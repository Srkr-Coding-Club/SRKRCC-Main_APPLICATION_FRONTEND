'use client';

import React, { useEffect, useState } from 'react';
import { AUTH_CHANGE_EVENT, isAuthenticated } from '@/lib/auth';
import ActionLink from './ActionLink';
import PathNode from './PathNode';

/* ------------------------------------------------------------------ */
/* The resolution: the trace ends here, on the one action the whole   */
/* journey has been building toward. The section has no bottom        */
/* padding so the line stops at the buttons; the page adds the space  */
/* below, outside the trace.                                          */
/* ------------------------------------------------------------------ */
export default function YourTurn() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const sync = () => setSignedIn(isAuthenticated());
    sync();
    window.addEventListener(AUTH_CHANGE_EVENT, sync);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, sync);
  }, []);

  return (
    <section aria-labelledby="your-turn-title" className="relative pt-24 sm:pt-32">
      <div className="relative">
        <p className="text-sm text-journey-muted">Your turn</p>
        <h2
          id="your-turn-title"
          className="mt-4 max-w-[17ch] font-display text-[clamp(2.4rem,6vw,5rem)] font-semibold leading-[0.98] tracking-[-0.03em] text-journey-text [font-stretch:112%]"
        >
          You started with one line of code. Where do you go next?
        </h2>
        <div className="relative mt-12 flex flex-wrap items-center gap-x-8 gap-y-5">
          <PathNode className="top-[20px]" />
          <ActionLink href={signedIn ? '/profile' : '/signup'} variant="primary">
            {signedIn ? 'Go to your profile' : 'Join the club'}
          </ActionLink>
          <ActionLink href="/events">Explore events</ActionLink>
        </div>
      </div>
    </section>
  );
}
