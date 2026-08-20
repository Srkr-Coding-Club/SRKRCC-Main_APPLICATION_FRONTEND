import React from 'react';
import type { Metadata } from 'next';
import { fetchApi } from '@/lib/api-client';
import { Event } from '@/lib/types';
import { Calendar } from 'lucide-react';
import PageHero from '@/components/PageHero';
import EventCard from '@/components/EventCard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Events & Workshops',
  description:
    'Join hands-on developer workshops, bootcamps, and technical tech-talks organized by the SRKR Coding Club.',
};

async function getEvents(): Promise<Event[]> {
  try {
    const fetched = await fetchApi<Event[]>('/events/');
    if (fetched && fetched.length > 0) return fetched;
  } catch (error) {
    // Fallback to curated event catalog
  }

  return [
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
  ];
}

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <PageHero
          icon={Calendar}
          eyebrow="SRKR CODING CLUB EVENTS HUB"
          title="Workshops & Tech Seminars"
          description="Explore upcoming technical workshops, expert guest seminars, competitive coding bootcamps, and official club gatherings."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map((evt) => (
            <EventCard key={evt.id} event={evt} />
          ))}
        </div>
      </div>
    </div>
  );
}
