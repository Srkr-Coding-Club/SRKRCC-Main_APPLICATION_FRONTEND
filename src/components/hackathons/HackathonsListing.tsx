'use client';

import { Trophy } from 'lucide-react';
import type { Hackathon } from '@/lib/types';
import HackathonCard from '@/components/HackathonCard';
import PhasedListing from '@/components/ui/PhasedListing';

interface HackathonsListingProps {
  live: Hackathon[];
  upcoming: Hackathon[];
  past: Hackathon[];
}

/** The hackathons listing: on now, upcoming, and finished ones kept out of the way. */
export default function HackathonsListing({ live, upcoming, past }: HackathonsListingProps) {
  return (
    <PhasedListing
      icon={Trophy}
      noun="hackathon"
      live={live}
      upcoming={upcoming}
      past={past}
      getKey={(hackathon) => hackathon.id}
      render={(hackathon, index, layout) => <HackathonCard hackathon={hackathon} index={index} layout={layout} />}
      upcomingDescription="Form a squad, build a prototype, and pitch to judges for a shot at the prize pool."
      empty={
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-journey-text/10 py-14 text-center">
          <Trophy className="h-8 w-8 text-journey-muted" aria-hidden="true" />
          <p className="text-sm font-semibold text-journey-muted">No hackathons scheduled right now.</p>
          <p className="text-xs text-journey-muted">Check back soon. The next season will be announced here. Past hackathons are listed below.</p>
        </div>
      }
    />
  );
}
