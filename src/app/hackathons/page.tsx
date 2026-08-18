import React from 'react';
import { fetchApi } from '@/lib/api-client';
import { Hackathon } from '@/lib/types';
import { Trophy } from 'lucide-react';
import { isModuleEnabled } from '@/lib/moduleFlags';
import PageHero from '@/components/PageHero';
import HackathonCard from '@/components/HackathonCard';
import ModuleUnavailable from '@/components/ModuleUnavailable';

export const dynamic = 'force-dynamic';

async function getHackathons(): Promise<Hackathon[]> {
  try {
    const fetched = await fetchApi<Hackathon[]>('/hackathons/');
    if (fetched && fetched.length > 0) return fetched;
  } catch (error) {
    // Fallback to flagship hackathon catalog
  }

  return [
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
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <PageHero
          icon={Trophy}
          eyebrow="SRKR CODING CLUB HACKATHONS ENGINE"
          title="Build, Hack & Win Cash Prizes"
          description="Form your hackathon squad, build real-world software prototypes, present to industry judges, and win prize pools!"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {hackathons.map((h) => (
            <HackathonCard key={h.id} hackathon={h} />
          ))}
        </div>
      </div>
    </div>
  );
}
