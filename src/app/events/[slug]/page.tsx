import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { Event } from '@/lib/types';
import { isModuleEnabled } from '@/lib/moduleFlags';
import ModuleUnavailable from '@/components/ModuleUnavailable';
import { EventDetailClient } from '@/components/events/EventDetailClient';
import { eventPoster } from '@/lib/eventListing';

export const revalidate = 300;

const MORE_EVENTS = 3;

/** Other events worth a look: ones still open first, soonest first, never the one being read. */
async function getMoreEvents(currentSlug: string): Promise<Event[]> {
  try {
    const all = (await fetchApi<Event[]>('/events/')) || [];
    const open = all.filter((candidate) => candidate.slug !== currentSlug);
    const upcoming = open.filter((candidate) => candidate.status !== 'CLOSED' && (!candidate.start_time || new Date(candidate.start_time) > new Date()));
    const soonestFirst = (a: Event, b: Event) => (a.start_time ? new Date(a.start_time).getTime() : Infinity) - (b.start_time ? new Date(b.start_time).getTime() : Infinity);
    return (upcoming.length > 0 ? upcoming.sort(soonestFirst) : open).slice(0, MORE_EVENTS);
  } catch {
    return [];
  }
}

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
  const poster = eventPoster(event);
  const description = `${event.category} at ${event.venue} | SRKR Coding Club`;
  return {
    title: event.title,
    description,
    openGraph: { title: event.title, description, type: 'website', ...(poster ? { images: [{ url: poster, alt: event.title }] } : {}) },
    twitter: { card: poster ? 'summary_large_image' : 'summary', title: event.title, description },
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

  return <EventDetailClient event={event} more={await getMoreEvents(slug)} />;
}
