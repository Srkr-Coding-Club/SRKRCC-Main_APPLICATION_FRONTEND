import React from 'react';
import Link from 'next/link';
import { MapPin, Users, UserCheck, ArrowRight } from 'lucide-react';
import { Event } from '@/lib/types';
import Card from './Card';

interface EventCardProps {
  event: Event;
  accent?: string;
}

export default function EventCard({ event, accent = '#FF7A00' }: EventCardProps) {
  return (
    <Card
      image={event.image_url}
      imageAlt={event.title}
      topLeftBadge={
        <span
          className="text-xs font-bold uppercase tracking-wider text-white px-3 py-1 rounded-md shadow-sm"
          style={{ background: accent }}
        >
          {event.category}
        </span>
      }
      footer={
        <>
          <span className="text-xs font-semibold text-slate-400">Seat Reservation</span>
          <Link
            href={event.form_slug ? `/forms/${event.form_slug}` : '/forms'}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-white font-bold text-xs shadow-sm transition hover:brightness-110"
            style={{ background: accent }}
          >
            <span>RSVP Event</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </>
      }
    >
      <h3 className="text-xl font-bold text-[#1A1A2E] dark:text-white group-hover:text-[#FF7A00] transition">
        {event.title}
      </h3>

      <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">{event.description}</p>

      <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400 font-medium pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4" style={{ color: accent }} />
          <span>{event.venue}</span>
        </div>

        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-[#8B2E3B] dark:text-rose-400" />
          <span>Capacity: {event.capacity} seats</span>
        </div>

        {event.speaker && (
          <div className="flex items-center space-x-2">
            <UserCheck className="w-4 h-4 text-emerald-500" />
            <span>Speaker: {event.speaker}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
