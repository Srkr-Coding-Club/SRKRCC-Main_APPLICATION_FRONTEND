'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, Users, Flame, ArrowRight, ArrowUpRight, Info, X } from 'lucide-react';
import { Hackathon } from '@/lib/types';
import { isSafeHref } from '@/lib/urlSafety';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';

interface HackathonCardProps {
  hackathon: Hackathon;
  accent?: string;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

export default function HackathonCard({ hackathon, accent = '#FF7A00' }: HackathonCardProps) {
  const fallbackImage =
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&q=70';
  const [flipped, setFlipped] = useState(false);
  const router = useRouter();
  const detailHref = `/hackathons/${hackathon.slug}`;
  const banner = hackathon.banner_image && isSafeHref(hackathon.banner_image) ? hackathon.banner_image : fallbackImage;

  return (
    <div className="group relative isolate h-[330px] w-full [perspective:1400px]">
      {/* soft orange glow around the card */}
      <div
        className="pointer-events-none absolute -inset-1 rounded-[10px] opacity-60 blur-2xl transition-opacity duration-500 group-hover:opacity-100 dark:opacity-35 dark:group-hover:opacity-70"
        style={{ background: `radial-gradient(circle at 50% 50%, ${accent}30, transparent 70%)` }}
      />

      <div
        tabIndex={0}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('a, button')) return;
          router.push(detailHref);
        }}
        className={`relative h-full w-full cursor-pointer rounded-2xl outline-none transition-transform duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] focus-visible:[transform:rotateY(180deg)] ${flipped ? '[transform:rotateY(180deg)]' : ''}`}
      >
        {/* ---------- FRONT (image) ---------- */}
        <div className="glass-panel absolute inset-0 overflow-hidden rounded-2xl border border-[#E5E5E5] shadow-[0_14px_40px_-20px_rgba(255,122,0,0.28)] [backface-visibility:hidden] [-webkit-backface-visibility:hidden] dark:border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element -- admin-supplied arbitrary host, not in next/image remotePatterns */}
          <img src={banner} alt={hackathon.title} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E]/90 via-[#1A1A2E]/25 to-transparent" />

          <button
            type="button"
            onClick={() => setFlipped(true)}
            aria-label="View details"
            className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60 active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          >
            <Info className="h-4 w-4" />
          </button>

          <div className="absolute inset-x-0 top-0 flex flex-wrap gap-1.5 p-4">
            <span
              className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-md"
              style={{ backgroundColor: `${accent}D9` }}
            >
              Prize: {hackathon.prize_pool}
            </span>
            {hackathon.is_flagship && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#8B2E3B]/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-md">
                <Flame className="h-3 w-3" />
                Flagship
              </span>
            )}
            {hackathon.status === 'CLOSED' && (
              <span className="inline-flex items-center rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-md">
                Closed
              </span>
            )}
          </div>

          <div className="absolute inset-x-0 bottom-0 p-4">
            <h3 className="text-base font-bold leading-snug text-white sm:text-lg">
              {hackathon.title}
            </h3>

            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-white/80">
              <Calendar className="h-3.5 w-3.5" style={{ color: accent }} />
              {formatShortDate(hackathon.start_date)} → {formatShortDate(hackathon.end_date)}
            </p>
          </div>
        </div>

        {/* ---------- BACK (details) ---------- */}
        <div className="glass-panel absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-[#E5E5E5] p-5 [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)] dark:border-white/10">
          <div
            className="absolute inset-x-0 top-0 h-0.5"
            style={{ background: `linear-gradient(90deg, ${accent}66, ${accent}, ${accent}66)` }}
          />

          <button
            type="button"
            onClick={() => setFlipped(false)}
            aria-label="Back to card front"
            className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-black/5 hover:text-slate-600 active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00] dark:hover:bg-white/5 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>

          <h3 className="text-sm font-bold leading-snug tracking-tight text-[#1A1A2E] dark:text-white sm:text-base">
            {hackathon.title}
          </h3>

          <p className="mt-1 text-[11px] font-bold" style={{ color: accent }}>
            Theme: {hackathon.theme}
          </p>

          <div className="mt-1.5 flex-1 min-h-0 overflow-y-auto scrollbar-hide text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
            <MarkdownRenderer content={hackathon.description} />
          </div>

          {typeof hackathon.team_count === 'number' && (
            <div className="mt-2 flex items-center gap-2 text-[12px] text-[#1A1A2E] dark:text-slate-200">
              <Users className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
              <span className="font-medium">{hackathon.team_count} team{hackathon.team_count === 1 ? '' : 's'} registered</span>
            </div>
          )}

          <div className="mt-auto flex items-center gap-2 pt-4">
            <Link
              href={detailHref}
              aria-label={`View details for ${hackathon.title}`}
              className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-2.5 text-[12px] font-semibold text-slate-600 transition hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:text-white"
            >
              Details
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            {hackathon.status === 'CLOSED' ? (
              <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2.5 text-[12px] font-semibold text-slate-400 dark:bg-white/5 dark:text-slate-500">
                Registration Closed
              </span>
            ) : (
              <Link
                href={hackathon.form_slug ? `/forms/${hackathon.form_slug}` : '/forms'}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[12px] font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5"
                style={{ backgroundColor: accent }}
              >
                Register Team
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}