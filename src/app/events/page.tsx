import React from 'react';
import type { Metadata } from 'next';
import { fetchApi } from '@/lib/api-client';
import { Event } from '@/lib/types';
import { Calendar } from 'lucide-react';
import { isModuleEnabled } from '@/lib/moduleFlags';
import PageHero from '@/components/PageHero';
import SectionHeading from '@/components/SectionHeading';
import EventsRow from '@/components/EventsRow';
import ModuleUnavailable from '@/components/ModuleUnavailable';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Events & Workshops',
  description:
    'Join hands-on developer workshops, bootcamps, and technical tech-talks organized by the SRKR Coding Club.',
};

async function getEvents(): Promise<Event[]> {
  try {
    const fetched = await fetchApi<Event[]>('/events/');
    return fetched || [];
  } catch (error) {
    return [];
  }
}

export default async function EventsPage() {
  const enabled = await isModuleEnabled('events');
  if (!enabled) {
    return (
      <ModuleUnavailable
        moduleName="Events"
        icon={Calendar}
        description="The events hub is paused right now. Check back once the next event window opens."
      />
    );
  }

  const events = await getEvents();

  return (
    <div className="min-h-screen bg-[var(--background)] py-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <PageHero
          icon={<Calendar className="h-4 w-4 text-[#FF7A00]" />}
          eyebrow="SRKR CODING CLUB EVENTS HUB"
          title="Workshops & Tech Seminars"
          description="Explore upcoming technical workshops, expert guest seminars, competitive coding bootcamps, and official club gatherings."
        />

        <div className="space-y-6">
          <SectionHeading
            icon={Calendar}
            title={`Upcoming Events (${events.length})`}
            description="Workshops, seminars, and gatherings happening across campus."
          />
          {events.length > 0 ? (
            <EventsRow events={events} accent="#FF7A00" />
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 py-16 text-center">
              <Calendar className="h-8 w-8 text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No upcoming events right now.</p>
              <p className="text-xs text-slate-400 dark:text-slate-600">Check back soon — new workshops and seminars are announced regularly.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}