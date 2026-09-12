import React from 'react';
import type { Metadata } from 'next';
import { fetchApi } from '@/lib/api-client';
import { Event } from '@/lib/types';
import { Calendar, Info } from 'lucide-react';
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

async function getEvents(): Promise<{ events: Event[]; usingFallback: boolean }> {
  try {
    const fetched = await fetchApi<Event[]>('/events/');
    if (fetched && fetched.length > 0) return { events: fetched, usingFallback: false };
  } catch (error) {
    // Fallback to curated event catalog
  }

  const fallbackEvents: Event[] = [
    {
      id: 1,
      title: 'Full Stack React & Next.js 15 Hands-on Workshop',
      slug: 'full-stack-react-nextjs-workshop',
      category: 'Hands-on Workshop',
      description: 'Master modern frontend development, App Router server components, and Tailwind CSS glassmorphism styling in SRKR main seminar hall.',
      venue: 'SRKR Central Seminar Hall',
      capacity: 150,
      start_time: '2025-05-20T09:30:00Z',
      end_time: '2025-05-20T16:30:00Z',
      image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
      speaker: 'Rahul Sharma (Senior Lead)',
      form_slug: 'hands-on-nextjs-workshop-2025',
      tags: ['React', 'Next.js 15', 'Tailwind CSS'],
    },
    {
      id: 2,
      title: 'AI & Generative LLMs Model Fine-Tuning Seminar',
      slug: 'ai-generative-llm-seminar',
      category: 'Tech Seminar',
      description: 'Explore PyTorch, LoRA fine-tuning, and open-source model deployment strategies presented by SRKRCC AI research leads.',
      venue: 'CSE Department Lab 3',
      capacity: 100,
      start_time: '2025-05-28T10:00:00Z',
      end_time: '2025-05-28T13:00:00Z',
      image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
      speaker: 'Karthik Raju (AI Wing Lead)',
      tags: ['AI/ML', 'PyTorch', 'LLMs'],
    },
    {
      id: 3,
      title: 'IconCoders 2025 Flagship Hackathon Orientation & Kickoff',
      slug: 'iconcoders-2025-kickoff',
      category: 'Flagship Event',
      description: 'Official launch event for the annual 36-hour IconCoders Hackathon. Track announcements, mentor assignments, and rulebook distribution.',
      venue: 'SRKR Main Auditorium',
      capacity: 500,
      start_time: '2025-06-01T10:00:00Z',
      end_time: '2025-06-01T12:30:00Z',
      image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
      speaker: 'SRKRCC Executive Board',
      form_slug: 'iconcoders-2025-registration',
      tags: ['Hackathon', 'IconCoders', 'Flagship'],
    },
        {
      id: 4,
      title: 'Full Stack React & Next.js 15 Hands-on Workshop',
      slug: 'full-stack-react-nextjs-workshop',
      category: 'Hands-on Workshop',
      description: 'Master modern frontend development, App Router server components, and Tailwind CSS glassmorphism styling in SRKR main seminar hall.',
      venue: 'SRKR Central Seminar Hall',
      capacity: 150,
      start_time: '2025-05-20T09:30:00Z',
      end_time: '2025-05-20T16:30:00Z',
      image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
      speaker: 'Rahul Sharma (Senior Lead)',
      form_slug: 'hands-on-nextjs-workshop-2025',
      tags: ['React', 'Next.js 15', 'Tailwind CSS'],
    },
    {
      id: 5,
      title: 'AI & Generative LLMs Model Fine-Tuning Seminar',
      slug: 'ai-generative-llm-seminar',
      category: 'Tech Seminar',
      description: 'Explore PyTorch, LoRA fine-tuning, and open-source model deployment strategies presented by SRKRCC AI research leads.',
      venue: 'CSE Department Lab 3',
      capacity: 100,
      start_time: '2025-05-28T10:00:00Z',
      end_time: '2025-05-28T13:00:00Z',
      image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
      speaker: 'Karthik Raju (AI Wing Lead)',
      tags: ['AI/ML', 'PyTorch', 'LLMs'],
    },
    {
      id: 6,
      title: 'IconCoders 2025 Flagship Hackathon Orientation & Kickoff',
      slug: 'iconcoders-2025-kickoff',
      category: 'Flagship Event',
      description: 'Official launch event for the annual 36-hour IconCoders Hackathon. Track announcements, mentor assignments, and rulebook distribution.',
      venue: 'SRKR Main Auditorium',
      capacity: 500,
      start_time: '2025-06-01T10:00:00Z',
      end_time: '2025-06-01T12:30:00Z',
      image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
      speaker: 'SRKRCC Executive Board',
      form_slug: 'iconcoders-2025-registration',
      tags: ['Hackathon', 'IconCoders', 'Flagship'],
    },
  ];

  return { events: fallbackEvents, usingFallback: true };
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

  const { events, usingFallback } = await getEvents();

  return (
    <div className="min-h-screen bg-[var(--background)] py-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <PageHero
          icon={<Calendar className="h-4 w-4 text-[#FF7A00]" />}
          eyebrow="SRKR CODING CLUB EVENTS HUB"
          title="Workshops & Tech Seminars"
          description="Explore upcoming technical workshops, expert guest seminars, competitive coding bootcamps, and official club gatherings."
        />

        {usingFallback && (
          <div className="flex items-center gap-2.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            <Info className="h-4 w-4 shrink-0" />
            <span>Showing sample data — live data is temporarily unavailable.</span>
          </div>
        )}

        <div className="space-y-6">
          <SectionHeading
            icon={Calendar}
            title={`Upcoming Events (${events.length})`}
            description="Workshops, seminars, and gatherings happening across campus."
          />
          <EventsRow events={events} accent="#FF7A00" />
        </div>
      </div>
    </div>
  );
}