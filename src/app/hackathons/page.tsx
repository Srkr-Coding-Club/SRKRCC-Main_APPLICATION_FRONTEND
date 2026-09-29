import React from 'react';
import type { Metadata } from 'next';
import { fetchApi } from '@/lib/api-client';
import { Hackathon } from '@/lib/types';
import { Trophy } from 'lucide-react';
import { isModuleEnabled } from '@/lib/moduleFlags';
import PageHero from '@/components/PageHero';
import SectionHeading from '@/components/SectionHeading';
import HackathonCard from '@/components/HackathonCard';
import ModuleUnavailable from '@/components/ModuleUnavailable';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Hackathons & Competitions',
  description:
    'Form teams, build cutting-edge software solutions, and compete for prize pools in SRKR Coding Club hackathons.',
};

async function getHackathons(): Promise<Hackathon[]> {
  try {
    const fetched = await fetchApi<Hackathon[]>('/hackathons/');
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
    <div className="min-h-screen bg-[var(--background)] py-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <PageHero
          icon={<Trophy className="h-4 w-4 text-[#FF7A00]" />}
          eyebrow="SRKR CODING CLUB HACKATHONS ENGINE"
          title="Build, Hack & Win Cash Prizes"
          description="Form your hackathon squad, build real-world software prototypes, present to industry judges, and win prize pools!"
        />

        <div className="space-y-6">
          <SectionHeading
            icon={Trophy}
            title={`Upcoming Hackathons (${hackathons.length})`}
            description="Form a squad, build a prototype, and pitch to judges for a shot at the prize pool."
          />

          {hackathons.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {hackathons.map((h) => (
                <HackathonCard key={h.id} hackathon={h} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 py-16 text-center">
              <Trophy className="h-8 w-8 text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No hackathons scheduled right now.</p>
              <p className="text-xs text-slate-400 dark:text-slate-600">Check back soon — the next season will be announced here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
