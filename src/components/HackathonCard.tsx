'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, ArrowRight, ArrowUpRight, Clock, Trophy } from 'lucide-react';
import { Hackathon } from '@/lib/types';
import { markdownToPreview } from '@/lib/utils';
import { registrationLine } from '@/lib/eventDates';
import BannerImage from '@/components/ui/BannerImage';
import { useScrollEntrance } from '@/lib/hooks/useScrollEntrance';
import { coverWipe, drawTimeline, fadeIn, footerRise, popIn, riseFromMask } from '@/lib/entranceMotion';

interface HackathonCardProps {
  hackathon: Hackathon;
  accent?: string;
  index?: number;
}

/** The grid fades the whole card in first; the inner sequence follows it. */
const INNER_START_DELAY_SECONDS = 0.15;

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

function registrationChip(closed: boolean, open: boolean, notYetOpen: boolean) {
  if (closed) return { label: 'Closed', className: 'bg-slate-700 text-white', dot: 'bg-white' };
  if (open) return { label: 'Registration open', className: 'bg-emerald-700 text-white', dot: 'bg-white' };
  if (notYetOpen) return { label: 'Opens soon', className: 'bg-amber-400 text-slate-900', dot: 'bg-slate-900' };
  return { label: 'Registration closed', className: 'bg-slate-700 text-white', dot: 'bg-white' };
}

export default function HackathonCard({ hackathon, accent = '#FF7A00', index = 0 }: HackathonCardProps) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const detailHref = `/hackathons/${hackathon.slug}`;
  const closed = hackathon.status === 'CLOSED';
  const registrationOpen = hackathon.is_registration_open ?? !closed;
  const opensAt = hackathon.registration_opens_at ? new Date(hackathon.registration_opens_at) : null;
  const notYetOpen = !registrationOpen && !closed && !!opensAt && opensAt > new Date();
  const status = registrationChip(closed, registrationOpen, notYetOpen);
  // When registration closes or opens: useful to someone deciding, and says nothing about how many teams there are.
  const registration = registrationLine({ closed, open: registrationOpen, opensAt: hackathon.registration_opens_at, closesAt: hackathon.registration_closes_at });
  const description = markdownToPreview(hackathon.description);

  useScrollEntrance(
    cardRef,
    (tl) => {
      coverWipe(tl, '.hc-media', '.hc-img');
      popIn(tl, '.hc-chip');
      riseFromMask(tl, '.hc-title');
      fadeIn(tl, '.hc-desc');
      drawTimeline(tl, { line: '.hc-line', dots: '.hc-dot', steps: '.hc-step' });
      fadeIn(tl, '.hc-meta', '-=0.3');
      footerRise(tl, '.hc-footer');
    },
    { index, delay: INNER_START_DELAY_SECONDS, start: 'top 85%' },
  );

  return (
    <div ref={cardRef} className="h-full w-full py-2">
      <article
        onClick={(event) => {
          if (!(event.target as HTMLElement).closest('a, button')) router.push(detailHref);
        }}
        className={[
          'hc-shell group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[28px] p-2',
          'border border-journey-text/10 bg-journey-surface/60 backdrop-blur-sm',
          'shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_20px_45px_-28px_rgba(30,41,59,0.35)]',
          'transition-shadow duration-500 hover:shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_26px_55px_-26px_rgba(255,122,0,0.28)]',
          'dark:shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_20px_45px_-28px_rgba(0,0,0,0.8)]',
          'dark:hover:shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_26px_55px_-26px_rgba(255,122,0,0.18)]',
        ].join(' ')}
      >
        <div className="hc-media relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-[20px] bg-slate-200/60 dark:bg-slate-800/60">
          <div className="hc-img absolute inset-0">
            <div className="h-full w-full transition-transform duration-700 group-hover:scale-[1.04] motion-reduce:transform-none">
              {hackathon.banner_image ? (
                <BannerImage src={hackathon.banner_image} alt="" crop={hackathon.banner_crop} />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#FFF1E2] to-[#FFE0C2] dark:from-slate-800 dark:to-slate-900">
                  <Trophy className="h-14 w-14 text-journey-accent/40" aria-hidden="true" />
                </div>
              )}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/25 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/65 via-black/30 to-transparent" />

          <div className={`hc-chip absolute left-2 top-2 inline-flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-md ${status.className}`}>
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`} aria-hidden="true" />
            <span className="truncate">{status.label}</span>
          </div>

          <div className="absolute inset-x-4 bottom-3.5 z-10 overflow-hidden">
            <div className="hc-title">
              <h3 className="line-clamp-2 font-display text-lg font-bold leading-tight tracking-tight text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.85)] sm:text-xl">
                {hackathon.title}
              </h3>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col px-4 pb-4 pt-4 sm:px-5">
          {description && <p className="hc-desc line-clamp-3 text-sm leading-relaxed text-journey-text/80">{description}</p>}

          <ol className="relative mt-5 grid gap-4 pl-6">
            <li className="hc-step relative">
              <span aria-hidden="true" className="hc-line absolute -bottom-[26px] -left-[19px] top-[10px] w-px origin-top bg-gradient-to-b from-journey-accent to-journey-text/20" />
              <span aria-hidden="true" className="hc-dot absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-journey-accent bg-journey-bg" />
              <p className="text-xs font-medium text-journey-muted">Starts</p>
              <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-semibold leading-none text-journey-text">
                <Calendar className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} aria-hidden="true" />
                {formatShortDate(hackathon.start_date)}
              </p>
            </li>
            <li className="hc-step relative">
              <span aria-hidden="true" className="hc-dot absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-journey-text/30 bg-journey-bg" />
              <p className="text-xs font-medium text-journey-muted">Ends</p>
              <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-semibold leading-none text-journey-text">
                <Calendar className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} aria-hidden="true" />
                {formatShortDate(hackathon.end_date)}
              </p>
            </li>
          </ol>

          <div className="hc-meta mt-5 grid gap-2 border-t border-journey-text/10 pt-4 text-sm text-journey-text/80">
            {hackathon.theme && (
              <p className="line-clamp-1 font-medium">
                <span className="font-bold uppercase tracking-wide text-journey-muted">Theme:</span> {hackathon.theme}
              </p>
            )}
            <p className="flex items-center gap-2 font-medium">
              <Trophy className="h-4 w-4 shrink-0" style={{ color: accent }} aria-hidden="true" />
              Prize pool: {hackathon.prize_pool}
            </p>
            <p className="flex items-center gap-2 font-medium">
              <Clock className="h-4 w-4 shrink-0" style={{ color: accent }} aria-hidden="true" />
              {registration}
            </p>
          </div>

          <div className="hc-footer mt-auto flex flex-wrap items-stretch gap-2 pt-5">
            <Link
              href={detailHref}
              aria-label={`View details for ${hackathon.title}`}
              className="inline-flex min-h-11 grow items-center justify-center gap-1 rounded-full border border-journey-text/10 px-4 text-xs font-semibold text-journey-text/80 transition hover:text-journey-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journey-accent/60 sm:min-h-10"
            >
              Details
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            {registrationOpen ? (
              <Link
                href={detailHref}
                className="inline-flex min-h-11 min-w-[8.5rem] flex-[2] items-center justify-center gap-1 whitespace-nowrap rounded-full bg-journey-accent px-3 text-xs font-semibold text-journey-on-accent shadow-[0_8px_18px_-8px_rgba(255,122,0,0.6)] transition active:scale-[0.97] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journey-accent/60 sm:min-h-10"
              >
                Register Team
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            ) : (
              <span className="inline-flex min-h-11 min-w-[8.5rem] flex-[2] items-center justify-center rounded-full bg-journey-text/10 px-3 text-center text-xs font-semibold leading-tight text-journey-text/70 sm:min-h-10">
                {notYetOpen ? 'Registration opens soon' : 'Registration Closed'}
              </span>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
