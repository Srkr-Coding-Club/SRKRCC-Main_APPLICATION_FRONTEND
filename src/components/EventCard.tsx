import React from 'react';
import Link from 'next/link';
import {
  MapPin,
  Users,
  UserCheck,
  ArrowRight,
  Calendar,
  Clock,
  Ticket,
} from 'lucide-react';

export interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  time: string;
  venue: string;
  capacity: number;
  speaker?: string;
  image?: string;
  slug: string;
}

interface EventCardProps {
  event: Event;
  accent?: string;
}

export default function EventCard({ event, accent = '#FF7A00' }: EventCardProps) {
  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const fallbackImage =
    'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=900&q=70';

  return (
    <div className="group relative isolate h-[330px] w-full [perspective:1400px]">
      {/* soft orange glow around the card */}
      <div
        className="pointer-events-none absolute -inset-1 rounded-[1.75rem] opacity-60 blur-2xl transition-opacity duration-500 group-hover:opacity-100 dark:opacity-35 dark:group-hover:opacity-70"
        style={{ background: `radial-gradient(circle at 50% 50%, ${accent}30, transparent 70%)` }}
      />

      <div
        tabIndex={0}
        className="relative h-full w-full rounded-2xl outline-none transition-transform duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] focus-visible:[transform:rotateY(180deg)]"
      >
        {/* ---------- FRONT (image) ---------- */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white shadow-[0_14px_40px_-20px_rgba(255,122,0,0.28)] [backface-visibility:hidden] [-webkit-backface-visibility:hidden] dark:border-white/10 dark:bg-[#161622]">
          <img
            src={event.image || fallbackImage}
            alt={event.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E]/90 via-[#1A1A2E]/25 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-4">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-md"
              style={{ backgroundColor: `${accent}D9` }}
            >
              <Ticket className="h-3 w-3" />
              {event.category}
            </span>

            <h3 className="mt-2 text-base font-bold leading-snug text-white sm:text-lg">
              {event.title}
            </h3>

            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-white/80">
              <Calendar className="h-3.5 w-3.5" style={{ color: accent }} />
              {formattedDate}
              <span className="text-white/40">•</span>
              <Clock className="h-3.5 w-3.5" style={{ color: accent }} />
              {event.time}
            </p>
          </div>
        </div>

        {/* ---------- BACK (details) ---------- */}
        <div className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white/85 p-5 backdrop-blur-xl [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)] dark:border-white/10 dark:bg-[#161622]/85">
          <div
            className="absolute inset-x-0 top-0 h-0.5"
            style={{ background: `linear-gradient(90deg, ${accent}66, ${accent}, ${accent}66)` }}
          />

          <h3 className="text-sm font-bold leading-snug tracking-tight text-[#1A1A2E] dark:text-white sm:text-base">
            {event.title}
          </h3>

          <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
            {event.description}
          </p>

          <div className="mt-3 grid gap-1.5 text-[12px] text-[#1A1A2E] dark:text-slate-200">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
              <span className="truncate font-medium">{event.venue}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
              <span className="font-medium">{event.capacity} seats</span>
            </div>
            {event.speaker && (
              <div className="flex items-center gap-2">
                <UserCheck className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
                <span className="truncate font-medium">{event.speaker}</span>
              </div>
            )}
          </div>

          <div className="mt-auto flex items-center gap-2 pt-4">
            <Link
              href={`/events/${event.slug}/reserve`}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5"
              style={{ backgroundColor: accent }}
            >
              <Ticket className="h-3.5 w-3.5" />
              Reserve Seat
            </Link>
            <Link
              href={`/events/${event.slug}/rsvp`}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-[12px] font-semibold text-[#1A1A2E] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#FF7A00]/40 hover:bg-[#FFF8F3] hover:text-[#B24A0B] dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              RSVP
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}