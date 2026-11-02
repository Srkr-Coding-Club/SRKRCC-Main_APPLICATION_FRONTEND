import React from 'react';
import type { Metadata } from 'next';
import { fetchApi } from '@/lib/api-client';
import { Hackathon } from '@/lib/types';
import { Trophy } from 'lucide-react';
import { isModuleEnabled } from '@/lib/moduleFlags';
import PageHero from '@/components/PageHero';
import HackathonsListing from '@/components/hackathons/HackathonsListing';
import { splitByPhase } from '@/lib/eventListing';
import ModuleUnavailable from '@/components/ModuleUnavailable';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Hackathons & Competitions',
  description:
    'Form teams, build cutting-edge software solutions, and compete for prize pools in SRKR Coding Club hackathons.',
};

async function getHackathons(): Promise<Hackathon[]> {
  try {
    const fetched = await fetchApi<Hackathon[]>('/hackathons/', { next: { revalidate: 60 } } as RequestInit);
    return fetched || [];
  } catch (error) {
    return [];
  }
}

export default async function HackathonsPage() {
  const enabled = await isModuleEnabled('hackathons');
  if (!enabled) {
    return (
      <ModuleUnavailable
        moduleName="Hackathons Engine"
        icon={Trophy}
        description="The hackathons engine is paused between seasons. Check back once the next hackathon window opens."
      />
    );
  }

  const hackathons = await getHackathons();

  return (
    <div className="min-h-[70vh] bg-[var(--background)] py-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <PageHero
          icon={<Trophy className="h-4 w-4 text-journey-accent" />}
          eyebrow="SRKR CODING CLUB HACKATHONS"
          title="Build, Hack & Win Cash Prizes"
          description="Form your hackathon squad, build real-world software prototypes, present to industry judges, and win prize pools!"
        />

        {hackathons.length > 0 ? (
          <HackathonsListing {...splitByPhase(hackathons, (hackathon) => ({ start: hackathon.start_date, end: hackathon.end_date }))} />
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-journey-text/10 py-16 text-center">
            <Trophy className="h-8 w-8 text-journey-muted" aria-hidden="true" />
            <p className="text-sm font-semibold text-journey-muted">No hackathons scheduled right now.</p>
            <p className="text-xs text-journey-muted">Check back soon. The next season will be announced here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
