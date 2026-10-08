import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { Event } from '@/lib/types';
import { isModuleEnabled } from '@/lib/moduleFlags';
import { isSafeHref } from '@/lib/urlSafety';
import ModuleUnavailable from '@/components/ModuleUnavailable';
import EventDetailsStack from '@/components/events/EventDetailsStack';

export const dynamic = 'force-dynamic';

const FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=80';

async function getEvent(slug: string): Promise<Event | null> {
  try {
    return await fetchApi<Event>(`/events/${encodeURIComponent(slug)}/`);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  // Thrown here (before streaming starts) so a missing slug returns a real HTTP 404.
  if (!event) notFound();
  return {
    title: event.title,
    description: `${event.category} at ${event.venue} | SRKR Coding Club`,
  };
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
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

  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  const poster = event.poster_image && isSafeHref(event.poster_image) ? event.poster_image : FALLBACK_POSTER;

  return (
    <div className="relative isolate flex min-h-[calc(100vh-5rem)] items-center overflow-hidden py-8 transition-colors duration-300">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 overflow-hidden"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- validated event poster URL */}
        <img src={poster} alt="" className="h-full w-full scale-110 object-cover blur-2xl" />
        <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-2xl" />
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/events"
          className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/30 px-4 py-2 text-sm font-semibold text-white/80 backdrop-blur transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          All events
        </Link>
        <EventDetailsStack key={event.id} events={[event]} initialEventId={event.id} />
      </div>
    </div>
  );
}
