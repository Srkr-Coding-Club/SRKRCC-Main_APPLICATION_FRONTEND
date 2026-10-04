'use client';

import Link from 'next/link';
import { Calendar, User, Gauge, ArrowRight } from 'lucide-react';
import { IconCodersChallenge } from '@/lib/types';
import PublicListingCard from '@/components/PublicListingCard';

interface IconCodersEditionCardProps {
  challenge: IconCodersChallenge;
  accent?: string;
}

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

export default function IconCodersEditionCard({
  challenge,
  accent = '#FF7A00',
}: IconCodersEditionCardProps) {
  return (
    <PublicListingCard
      accent={accent}
      category={
        <>
          <User className="h-3 w-3" />
          {challenge.format === 'INDIVIDUAL' ? 'Individual' : challenge.format}
        </>
      }
      schedule={
        <>
          <Calendar className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
          {formatShortDate(challenge.start_date)}
          <span className="text-slate-300 dark:text-slate-600">→</span>
          {formatShortDate(challenge.end_date)}
        </>
      }
      title={challenge.title}
      description={challenge.description}
      details={
        <div className="grid gap-2.5">
          <p className="font-bold uppercase tracking-wide" style={{ color: accent }}>{challenge.edition}</p>
          <p className="line-clamp-2 font-medium"><span className="font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Theme:</span> {challenge.theme}</p>
          {challenge.difficulty_tier && (
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 shrink-0" style={{ color: accent }} />
              <span className="font-medium">{challenge.difficulty_tier}</span>
            </div>
          )}
        </div>
      }
      footer={
        <Link
          href={challenge.form_slug ? `/forms/${challenge.form_slug}` : '/forms'}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[12px] font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5"
          style={{ backgroundColor: accent }}
        >
          Register Now
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    />
  );
}