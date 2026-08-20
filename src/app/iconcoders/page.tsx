import React from 'react';
import type { Metadata } from 'next';
import { fetchApi } from '@/lib/api-client';
import { IconCodersChallenge, IconCodersHallOfFameEntry } from '@/lib/types';
import { Sparkles, Trophy } from 'lucide-react';
import { isModuleEnabled } from '@/lib/moduleFlags';
import PageHero from '@/components/PageHero';
import SectionHeading from '@/components/SectionHeading';
import IconCodersEditionCard from '@/components/IconCodersEditionCard';
import IconCodersHallOfFameCard from '@/components/IconCodersHallOfFameCard';
import ModuleUnavailable from '@/components/ModuleUnavailable';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'IconCoders Flagship Hackathon & Hall of Fame',
  description:
    'The premier annual hackathon of SRKR Engineering College. Explore active challenges, past winning projects, and the Hall of Fame.',
};

async function getCurrentChallenge(): Promise<IconCodersChallenge> {
  try {
    const fetched = await fetchApi<IconCodersChallenge>('/iconcoders/current/');
    if (fetched) return fetched;
  } catch (error) {
    // Fallback to curated current edition
  }

  return {
    id: 1,
    title: 'IconCoders 2026 Flagship Challenge',
    slug: 'iconcoders-2026',
    edition: '2026 Edition',
    theme: 'Advanced Data Structures & Algorithmic Problem Solving',
    description: 'SRKR Coding Club’s annual flagship individual DSA competition. Solve a curated set of algorithmic problems solo, climb the live leaderboard, and win recognition plus prizes.',
    format: 'INDIVIDUAL',
    difficulty_tier: 'Advanced DSA',
    start_date: '2026-02-10',
    end_date: '2026-02-10',
    image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
    form_slug: 'iconcoders-hackathon-2025',
  };
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
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <PageHero
          icon={Sparkles}
          eyebrow="SRKR CODING CLUB ICONCODERS FLAGSHIP"
          title="IconCoders Flagship"
          description="SRKR Coding Club's annual flagship hackathon — where top individual problem-solvers compete for glory and recognition."
        />

        <div className="space-y-6">
          <SectionHeading icon={Sparkles} eyebrow="Current Edition" title="Current Challenge" />
          <div className="max-w-2xl">
            <IconCodersEditionCard challenge={challenge} />
          </div>
        </div>

        <div className="space-y-6">
          <SectionHeading icon={Trophy} title="Hall of Fame" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {hallOfFame.map((entry) => (
              <IconCodersHallOfFameCard key={entry.year} entry={entry} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
