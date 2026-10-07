import React from 'react';
import type { Metadata } from 'next';
import { fetchApi } from '@/lib/api-client';
import { IconCodersChallenge, IconCodersHallOfFameEntry } from '@/lib/types';
import { Sparkles } from 'lucide-react';
import { isModuleEnabled } from '@/lib/moduleFlags';
import PageHero from '@/components/PageHero';
import SectionHeading from '@/components/SectionHeading';
import IconCodersEditionCard from '@/components/IconCodersEditionCard';
import IconCodersHallOfFameCard from '@/components/IconCodersHallOfFameCard';
import BounceCards from '@/components/ui/BounceCards';
import ModuleUnavailable from '@/components/ModuleUnavailable';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'IconCoders Flagship Hackathon & Hall of Fame',
  description:
    'The premier annual hackathon of SRKR Engineering College. Explore active challenges, past winning projects, and the Hall of Fame.',
};

async function getCurrentChallenge(): Promise<IconCodersChallenge | null> {
  try {
    const fetched = await fetchApi<IconCodersChallenge>('/iconcoders/current/');
    return fetched || null;
  } catch {
    return null;
  }
}

async function getHallOfFame(): Promise<IconCodersHallOfFameEntry[]> {
  try {
    const fetched = await fetchApi<IconCodersHallOfFameEntry[]>('/iconcoders/hall-of-fame/');
    if (fetched && fetched.length > 0) return fetched;
  } catch (error) {
    // Fallback to curated archive
  }

  return [
    { year: '2025', participantName: 'Chaitu B.', project: 'AI Medical Assistant' },
    { year: '2024', participantName: 'Vikram S.', project: 'Decentralized Identity Vault' },
    { year: '2023', participantName: 'Praveen M.', project: 'Smart Agri Monitor' },
  ];
}

export default async function IconCodersPage() {
  const enabled = await isModuleEnabled('iconcoders');
  if (!enabled) {
    return (
      <ModuleUnavailable
        moduleName="IconCoders Flagship"
        icon={Sparkles}
        description="The IconCoders flagship challenge is paused between editions. Check back once the next edition opens for registration."
      />
    );
  }

  const [challenge, hallOfFame] = await Promise.all([getCurrentChallenge(), getHallOfFame()]);

  return (
    <div className="min-h-screen bg-[var(--background)] py-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <PageHero
          icon={<Sparkles className="h-4 w-4 text-[#FF7A00]" />}
          eyebrow="SRKR CODING CLUB ICONCODERS FLAGSHIP"
          title="IconCoders Flagship"
          description="SRKR Coding Club's annual flagship hackathon, where top individual problem-solvers compete for glory and recognition."
        />

        <div className="space-y-6">
          <SectionHeading icon={Sparkles} eyebrow="Current Edition" title="Current Challenge" />
          {challenge ? (
            <div className="max-w-sm">
              <BounceCards
                layout="bounce-stack"
                cards={[<IconCodersEditionCard key={challenge.id} challenge={challenge} />]}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                No current IconCoders challenge scheduled.
              </p>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-600">
                Check back once the next edition is announced.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <SectionHeading icon={Sparkles} title="Hall of Fame" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {hallOfFame.map((entry) => (
              <IconCodersHallOfFameCard key={entry.year} entry={entry} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
