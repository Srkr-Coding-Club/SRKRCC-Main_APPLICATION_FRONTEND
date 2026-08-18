import React from 'react';
import Link from 'next/link';
import { Calendar, User, Gauge, ArrowRight } from 'lucide-react';
import { IconCodersChallenge } from '@/lib/types';
import Card from './Card';

interface IconCodersEditionCardProps {
  challenge: IconCodersChallenge;
  accent?: string;
}

export default function IconCodersEditionCard({ challenge, accent = '#8B2E3B' }: IconCodersEditionCardProps) {
  return (
    <Card
      image={challenge.image_url}
      imageAlt={challenge.title}
      imageHeightClassName="h-56"
      topLeftBadge={
        <span
          className="text-xs font-bold uppercase tracking-wider text-white px-3 py-1 rounded-md shadow flex items-center gap-1.5"
          style={{ background: accent }}
        >
          <User className="w-3.5 h-3.5" />
          Individual · DSA Challenge
        </span>
      }
      footer={
        <>
          <span className="text-xs font-semibold text-slate-400">Individual Registration</span>
          <Link
            href={challenge.form_slug ? `/forms/${challenge.form_slug}` : '/forms'}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg text-white font-bold text-sm shadow-sm transition hover:brightness-110"
            style={{ background: accent }}
          >
            <span>Register Now</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </>
      }
    >
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{challenge.edition}</span>

      <h3 className="text-2xl font-extrabold text-[#1A1A2E] dark:text-white group-hover:text-[#FF7A00] transition">
        {challenge.title}
      </h3>

      <p className="text-xs font-bold" style={{ color: accent }}>
        Theme: {challenge.theme}
      </p>

      <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">{challenge.description}</p>

      <div className="pt-4 flex flex-wrap gap-4 text-xs font-medium text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-1.5">
          <Calendar className="w-4 h-4" style={{ color: accent }} />
          <span>{challenge.start_date} → {challenge.end_date}</span>
        </div>

        {challenge.difficulty_tier && (
          <div className="flex items-center space-x-1.5 font-mono text-[#8B2E3B] dark:text-rose-400">
            <Gauge className="w-4 h-4" />
            <span>{challenge.difficulty_tier}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
