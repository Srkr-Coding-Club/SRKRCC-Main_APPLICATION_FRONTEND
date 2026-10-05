import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Trophy } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { Hackathon, HackathonAnnouncement, ProblemStatement } from '@/lib/types';
import { isModuleEnabled } from '@/lib/moduleFlags';
import ModuleUnavailable from '@/components/ModuleUnavailable';
import { HackathonDetailClient } from '@/components/hackathons/HackathonDetailClient';

export const dynamic = 'force-dynamic';

async function getHackathon(slug: string): Promise<Hackathon | null> {
  try {
    return await fetchApi<Hackathon>(`/hackathons/${encodeURIComponent(slug)}/`);
  } catch {
    return null;
  }
}

async function getPublicExtras(slug: string) {
  const [problems, announcements] = await Promise.all([
    fetchApi<ProblemStatement[]>(`/hackathons/${encodeURIComponent(slug)}/problem-statements/`).catch(() => []),
    fetchApi<HackathonAnnouncement[]>(`/hackathons/${encodeURIComponent(slug)}/announcements/`).catch(() => []),
  ]);
  return { problems: problems || [], announcements: announcements || [] };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const hackathon = await getHackathon(slug);
  if (!hackathon) notFound();
  return {
    title: `${hackathon.title} | SRKR Coding Club Hackathons`,
    description: `${hackathon.theme}. Total Prize Pool: ${hackathon.prize_pool}. Explore problem statements, rules, schedule, and team registration on the official SRKRCC portal.`,
  };
}

export default async function HackathonDetailPage({ params }: { params: Promise<{ slug: string }> }) {
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

  const { slug } = await params;
  const hackathon = await getHackathon(slug);
  if (!hackathon) notFound();

  const { problems, announcements } = await getPublicExtras(slug);

  return (
    <HackathonDetailClient
      hackathon={hackathon}
      problems={problems}
      announcements={announcements}
    />
  );
}
