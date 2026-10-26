'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Inbox, Search } from 'lucide-react';
import type { FinderListing, Hackathon, JoinRequestRow } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { BTN, H2, PANEL } from './dashboardStyles';
import { FinderLists, JoinRequestsToAnswer } from './FinderLists';

/** Shown on the dashboard while the team finder is on: who needs people, who is available, and the requests waiting for the leader. */
export function TeamFinderCard({ hackathon, hasTeam, isLeader }: { hackathon: Hackathon; hasTeam: boolean; isLeader: boolean }) {
  const slug = hackathon.slug;
  const [listing, setListing] = useState<FinderListing | null>(null);
  const [incoming, setIncoming] = useState<JoinRequestRow[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [list, requests] = await Promise.all([
        hackathonApi.finder.list(slug),
        isLeader ? hackathonApi.finder.requests(slug) : Promise.resolve({ incoming: [], mine: [] }),
      ]);
      setListing(list);
      setIncoming(requests.incoming);
      setError('');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load the team finder.'));
    }
  }, [slug, isLeader]);

  useEffect(() => { void load(); }, [load]);

  return (
    <section aria-label="Teams and people" className={`${PANEL} space-y-5`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={H2}><Search className="h-4 w-4" /> Teams and people</h2>
        <Link href={`/hackathons/${slug}/finder`} className={`${BTN} bg-journey-text/5 text-journey-text/80 hover:bg-journey-text/10`}>
          {hasTeam ? 'Open the team finder' : 'List yourself and see everyone'}
        </Link>
      </div>

      {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      {!listing && !error && <div className="h-24 animate-pulse rounded-xl bg-journey-text/5" aria-busy="true" />}

      {isLeader && incoming.length > 0 && (
        <div className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-journey-text"><Inbox className="h-4 w-4 text-journey-accent" aria-hidden="true" /> Waiting for your answer ({incoming.length})</h3>
          <JoinRequestsToAnswer slug={slug} requests={incoming} onChanged={load} />
        </div>
      )}

      {listing && <FinderLists slug={slug} hackathon={hackathon} listing={listing} hasTeam={hasTeam} iAmLeader={isLeader} onChanged={load} limit={4} />}
    </section>
  );
}
