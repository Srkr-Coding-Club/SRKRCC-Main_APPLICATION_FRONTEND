import React from 'react';
import Link from 'next/link';
import { Calendar, CheckCircle2, Flame, ArrowRight } from 'lucide-react';
import { Hackathon } from '@/lib/types';
import Card from './Card';

interface HackathonCardProps {
  hackathon: Hackathon;
  accent?: string;
}

export default function HackathonCard({ hackathon, accent = '#FF7A00' }: HackathonCardProps) {
  return (
    <Card
      image={hackathon.image_url}
      imageAlt={hackathon.title}
      imageHeightClassName="h-56"
      topLeftBadge={
        <>
          <span
            className="text-xs font-bold uppercase tracking-wider text-white px-3 py-1 rounded-md shadow"
            style={{ background: accent }}
          >
            Prize: {hackathon.prize_pool}
          </span>
          {hackathon.is_flagship && (
            <span className="text-xs font-bold uppercase tracking-wider text-white bg-[#8B2E3B] px-3 py-1 rounded-md shadow flex items-center space-x-1">
              <Flame className="w-3.5 h-3.5" />
              <span>Flagship Edition</span>
            </span>
          )}
        </>
      }
      footer={
        <>
          <span className="text-xs font-semibold text-slate-400">Team Registration</span>
          <Link
            href={hackathon.form_slug ? `/forms/${hackathon.form_slug}` : '/forms'}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg text-white font-bold text-sm shadow-sm transition hover:brightness-110"
            style={{ background: accent }}
          >
            <span>Register Team</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </>
      }
    >
      <h3 className="text-2xl font-extrabold text-[#1A1A2E] dark:text-white group-hover:text-[#FF7A00] transition">
        {hackathon.title}
      </h3>

      <p className="text-xs font-bold" style={{ color: accent }}>
        Theme: {hackathon.theme}
      </p>

      <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">{hackathon.description}</p>

      {hackathon.tracks && (
        <div className="space-y-2 pt-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tracks & Categories</p>
          <div className="flex flex-wrap gap-2">
            {hackathon.tracks.map((tr) => (
              <span
                key={tr}
                className="px-2.5 py-1 rounded text-xs font-semibold bg-orange-50 dark:bg-orange-950/30 text-[#FF7A00] border border-orange-200 dark:border-orange-900/40"
              >
                {tr}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="pt-4 flex flex-wrap gap-4 text-xs font-medium text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-1.5">
          <Calendar className="w-4 h-4" style={{ color: accent }} />
          <span>{hackathon.start_date} → {hackathon.end_date}</span>
        </div>

        {hackathon.team_size && (
          <div className="flex items-center space-x-1.5 font-mono text-[#8B2E3B] dark:text-rose-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Team: {hackathon.team_size}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
