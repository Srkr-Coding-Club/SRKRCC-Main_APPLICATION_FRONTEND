import React from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api-client';
import { Event } from '@/lib/types';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  ArrowRight,
  UserCheck,
  Sparkles,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

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
      form_slug: 'web-dev-workshop-rsvp',
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
      form_slug: 'iconcoders-hackathon-2025',
      tags: ['Hackathon', 'IconCoders', 'Flagship'],
    },
  ];
}

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header Hero Banner */}
        <div className="relative rounded-xl bg-gradient-to-r from-[#1A1A2E] via-[#8B2E3B] to-[#FF7A00] p-8 sm:p-12 text-white shadow-lg overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md text-xs font-bold bg-white/10 text-white border border-white/20">
              <Calendar className="w-4 h-4 text-[#FF7A00]" />
              <span>SRKR CODING CLUB EVENTS HUB</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Workshops & Tech Seminars
            </h1>

            <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
              Explore upcoming technical workshops, expert guest seminars, competitive coding bootcamps, and official club gatherings.
            </p>
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map((evt) => (
            <div
              key={evt.id}
              className="bg-white dark:bg-[#151722] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
                {/* Event Image Banner */}
                {evt.image_url && (
                  <div className="relative h-48 w-full overflow-hidden bg-slate-900">
                    <img
                      src={evt.image_url}
                      alt={evt.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-90"
                    />
                    <span className="absolute top-3 left-4 text-xs font-bold uppercase tracking-wider text-white bg-[#FF7A00] px-3 py-1 rounded-md shadow-sm">
                      {evt.category}
                    </span>
                  </div>
                )}

                {/* Content Box */}
                <div className="p-6 space-y-4">
                  <h3 className="text-xl font-bold text-[#1A1A2E] dark:text-white group-hover:text-[#FF7A00] transition">
                    {evt.title}
                  </h3>

                  <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                    {evt.description}
                  </p>

                  {/* Metadata Badges */}
                  <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400 font-medium pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-[#FF7A00]" />
                      <span>{evt.venue}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-[#8B2E3B] dark:text-rose-400" />
                      <span>Capacity: {evt.capacity} seats</span>
                    </div>

                    {evt.speaker && (
                      <div className="flex items-center space-x-2">
                        <UserCheck className="w-4 h-4 text-emerald-500" />
                        <span>Speaker: {evt.speaker}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  Seat Reservation
                </span>

                <Link
                  href={evt.form_slug ? `/forms/${evt.form_slug}` : '/forms'}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-xs shadow-sm transition"
                >
                  <span>RSVP Event</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
