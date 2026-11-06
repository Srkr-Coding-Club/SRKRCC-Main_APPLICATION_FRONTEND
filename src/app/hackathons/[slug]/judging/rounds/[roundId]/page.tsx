'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { JudgeRoundDetail } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useRequireLogin } from '@/lib/hooks/useRequireLogin';
import { JudgeRoundTeams } from '@/components/hackathons/judging/JudgeRoundTeams';
import { PANEL } from '@/components/hackathons/dashboardStyles';

export default function JudgeRoundPage() {
  const { slug, roundId } = useParams<{ slug: string; roundId: string }>();
  const signedIn = useRequireLogin(`/hackathons/${slug}/judging/rounds/${roundId}`);
  const [round, setRound] = useState<JudgeRoundDetail | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    hackathonApi.judging.round(slug, Number(roundId)).then((data) => { setRound(data); setError(''); }).catch((err) => setError(apiErrorMessage(err, 'Could not load this round.')));
  }, [slug, roundId]);
  useEffect(() => { if (signedIn) load(); }, [signedIn, load]);

  return (
    <div className="min-h-screen bg-[var(--background)] py-10">
      <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6 lg:px-8">
        <Link href={`/hackathons/${slug}/judging`} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-journey-muted hover:text-journey-accent sm:min-h-8"><ArrowLeft className="h-4 w-4" /> All my judging</Link>
        {error && <p role="alert" className={`${PANEL} text-sm text-rose-600 dark:text-rose-400`}>{error}</p>}
        {!round && !error && <div className={`${PANEL} h-32 animate-pulse`} aria-busy="true" />}
        {round && <JudgeRoundTeams slug={slug} round={round} />}
      </div>
    </div>
  );
}
