import React from 'react';
import type { Metadata } from 'next';
import { fetchApi } from '@/lib/api-client';
import { Hackathon } from '@/lib/types';
import { Trophy, Info } from 'lucide-react';
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

async function getHackathons(): Promise<{ hackathons: Hackathon[]; usingFallback: boolean }> {
  try {
    const fetched = await fetchApi<Hackathon[]>('/hackathons/');
    if (fetched && fetched.length > 0) return { hackathons: fetched, usingFallback: false };
  } catch (error) {
    // Fallback to flagship hackathon catalog
  }

  const fallbackHackathons: Hackathon[] = [
    {
      id: 1,
      title: 'IconCoders Flagship Hackathon 2025',
      slug: 'iconcoders-hackathon-2025',
      is_flagship: true,
      theme: 'AI for Social Good & Web3 Innovations',
      description: 'SRKR Coding Club annual flagship 36-hour hackathon. Bring your team, code overnight, present to industrial judges, and win cash awards!',
      prize_pool: '₹1,00,000 INR',
      start_date: '2025-06-15',
      end_date: '2025-06-17',
      image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
      form_slug: 'iconcoders-hackathon-2025',
      tracks: ['AI/ML & GenAI', 'Web3 & Blockchain', 'Full Stack Web & Cloud', 'Open Innovation'],
      team_size: '2 - 4 Members',
    },
    {
      id: 2,
      title: 'Summer Codefest Sprint 2025',
      slug: 'summer-codefest-2025',
      is_flagship: false,
      theme: 'Developer Productivity Tools & Automation',
      description: 'A focused 24-hour virtual hackathon dedicated to building CLI utilities, browser extensions, and workflow automation bots.',
      prize_pool: '₹25,000 INR',
      start_date: '2025-07-10',
      end_date: '2025-07-11',
      image_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
      tracks: ['DevTools & CLI', 'Browser Extensions', 'Automation Bots'],
      team_size: '1 - 3 Members',
    },
  ];

  return { hackathons: fallbackHackathons, usingFallback: true };
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

  const { hackathons, usingFallback } = await getHackathons();

  return (
    <div className="min-h-screen bg-[var(--background)] py-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <PageHero
          icon={<Trophy className="h-4 w-4 text-[#FF7A00]" />}
          eyebrow="SRKR CODING CLUB HACKATHONS ENGINE"
          title="Build, Hack & Win Cash Prizes"
          description="Form your hackathon squad, build real-world software prototypes, present to industry judges, and win prize pools!"
        />

        {usingFallback && (
          <div className="flex items-center gap-2.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            <Info className="h-4 w-4 shrink-0" />
            <span>Showing sample data — live data is temporarily unavailable.</span>
          </div>
        )}

        <div className="space-y-6">
          <SectionHeading
            icon={Trophy}
            title={`Upcoming Hackathons (${hackathons.length})`}
            description="Form a squad, build a prototype, and pitch to judges for a shot at the prize pool."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {hackathons.map((h) => (
              <HackathonCard key={h.id} hackathon={h} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
