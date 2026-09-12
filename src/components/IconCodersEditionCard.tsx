'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, User, Gauge, ArrowRight, Info, X } from 'lucide-react';
import { IconCodersChallenge } from '@/lib/types';

interface IconCodersEditionCardProps {
  challenge: IconCodersChallenge;
  accent?: string;
}

export default function IconCodersEditionCard({
  challenge,
  accent = '#8B2E3B',
}: IconCodersEditionCardProps) {
  const fallbackImage =
    'https://images.unsplash.com/photo-1550439062-609e1531270e?auto=format&fit=crop&w=900&q=70';
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="group relative isolate h-[330px] w-full [perspective:1400px]">
      {/* soft glow around the card */}
      <div
        className="pointer-events-none absolute -inset-1 rounded-[10px] opacity-60 blur-2xl transition-opacity duration-500 group-hover:opacity-100 dark:opacity-35 dark:group-hover:opacity-70"
        style={{ background: `radial-gradient(circle at 50% 50%, ${accent}30, transparent 70%)` }}
      />

      <div
        tabIndex={0}
        className={`relative h-full w-full rounded-2xl outline-none transition-transform duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] focus-visible:[transform:rotateY(180deg)] ${flipped ? '[transform:rotateY(180deg)]' : ''}`}
      >
        {/* ---------- FRONT (image) ---------- */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white shadow-[0_14px_40px_-20px_rgba(139,46,59,0.28)] [backface-visibility:hidden] [-webkit-backface-visibility:hidden] dark:border-white/10 dark:bg-[#161622]">
          <Image
            src={challenge.image_url || fallbackImage}
            alt={challenge.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E]/90 via-[#1A1A2E]/25 to-transparent" />

          <button
            type="button"
            onClick={() => setFlipped(true)}
            aria-label="View details"
            className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          >
            <Info className="h-4 w-4" />
          </button>

          <div className="absolute inset-x-0 top-0 p-4">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-md"
              style={{ backgroundColor: `${accent}D9` }}
            >
              <User className="h-3 w-3" />
              Individual · DSA
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
              {challenge.edition}
            </span>
            <h3 className="mt-1 text-base font-bold leading-snug text-white sm:text-lg">
              {challenge.title}
            </h3>
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-white/80">
              <Calendar className="h-3.5 w-3.5" style={{ color: accent }} />
              {challenge.start_date} → {challenge.end_date}
            </p>
          </div>
        </div>

        {/* ---------- BACK (details) ---------- */}
        <div className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white/85 p-5 backdrop-blur-xl [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)] dark:border-white/10 dark:bg-[#161622]/85">
          <div
            className="absolute inset-x-0 top-0 h-0.5"
            style={{ background: `linear-gradient(90deg, ${accent}66, ${accent}, ${accent}66)` }}
          />

          <button
            type="button"
            onClick={() => setFlipped(false)}
            aria-label="Back to card front"
            className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-black/5 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B2E3B] dark:hover:bg-white/5 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>

          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {challenge.edition}
          </span>

          <h3 className="mt-0.5 text-sm font-bold leading-snug tracking-tight text-[#1A1A2E] dark:text-white sm:text-base">
            {challenge.title}
          </h3>

          <p className="mt-1 text-[11px] font-bold" style={{ color: accent }}>
            Theme: {challenge.theme}
          </p>

          <p className="mt-1.5 line-clamp-3 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
            {challenge.description}
          </p>

          <div className="mt-3 grid gap-1.5 text-[12px] text-[#1A1A2E] dark:text-slate-200">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
              <span className="font-medium">
                {challenge.start_date} → {challenge.end_date}
              </span>
            </div>
            {challenge.difficulty_tier && (
              <div className="flex items-center gap-2">
                <Gauge className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
                <span className="font-medium">{challenge.difficulty_tier}</span>
              </div>
            )}
          </div>

          <div className="mt-auto pt-4">
            <Link
              href={challenge.form_slug ? `/forms/${challenge.form_slug}` : '/forms'}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[12px] font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5"
              style={{ backgroundColor: accent }}
            >
              Register Now
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}