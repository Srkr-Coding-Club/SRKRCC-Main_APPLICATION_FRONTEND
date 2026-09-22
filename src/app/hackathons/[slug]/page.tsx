import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, Trophy, Users, Flame, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { Hackathon } from '@/lib/types';
import { isModuleEnabled } from '@/lib/moduleFlags';
import { isSafeHref } from '@/lib/urlSafety';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import ModuleUnavailable from '@/components/ModuleUnavailable';

export const dynamic = 'force-dynamic';

const FALLBACK_BANNER =
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80';

// Server-rendered: pin the zone, or production (Render runs in UTC) shows every time 5h30m off.
const HACKATHON_TIME_ZONE = 'Asia/Kolkata';

async function getHackathon(slug: string): Promise<Hackathon | null> {
  try {
    return await fetchApi<Hackathon>(`/hackathons/${encodeURIComponent(slug)}/`);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const hackathon = await getHackathon(slug);
  if (!hackathon) notFound();
  return {
    title: hackathon.title,
    description: `${hackathon.theme} — prize pool ${hackathon.prize_pool}. SRKR Coding Club hackathon.`,
  };
}

function formatSchedule(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const date = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: HACKATHON_TIME_ZONE });
  const time = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: HACKATHON_TIME_ZONE });

  if (date(start) === date(end)) {
    return [
      { icon: Calendar, label: 'Date', value: date(start) },
      { icon: Clock, label: 'Time', value: `${time(start)} – ${time(end)} IST` },
    ];
  }
  return [
    { icon: Calendar, label: 'Starts', value: `${date(start)} · ${time(start)} IST` },
    { icon: Clock, label: 'Ends', value: `${date(end)} · ${time(end)} IST` },
  ];
}

export default async function HackathonDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const enabled = await isModuleEnabled('hackathons');
  if (!enabled) {
    return (
      <ModuleUnavailable
        moduleName="Hackathons Engine"
        icon={Trophy}
        description="The hackathons engine is paused between seasons. Check back once the next hackathon window opens."
      />
    );
  }

  const { slug } = await params;
  const hackathon = await getHackathon(slug);
  if (!hackathon) notFound();

  const isClosed = hackathon.status === 'CLOSED';
  const teams = hackathon.team_count ?? 0;
  const banner = hackathon.banner_image && isSafeHref(hackathon.banner_image) ? hackathon.banner_image : FALLBACK_BANNER;

  const facts = [
    ...formatSchedule(hackathon.start_date, hackathon.end_date),
    { icon: Sparkles, label: 'Theme', value: hackathon.theme },
    { icon: Trophy, label: 'Prize Pool', value: hackathon.prize_pool },
    { icon: Users, label: 'Teams', value: `${teams} team${teams === 1 ? '' : 's'} registered` },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] py-10 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <Link
          href="/hackathons"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-[#FF7A00] transition"
        >
          <ArrowLeft className="h-4 w-4" />
          All hackathons
        </Link>

        {/* Banner header */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl">
          {/* eslint-disable-next-line @next/next/no-img-element -- admin-supplied arbitrary host, not in next/image remotePatterns */}
          <img src={banner} alt={hackathon.title} className="h-64 sm:h-80 w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E]/95 via-[#1A1A2E]/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF7A00] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                <Trophy className="h-3 w-3" />
                Prize: {hackathon.prize_pool}
              </span>
              {hackathon.is_flagship && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#8B2E3B] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                  <Flame className="h-3 w-3" />
                  IconCoders Flagship
                </span>
              )}
              <span
                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                  isClosed ? 'bg-slate-700/80 text-slate-200' : 'bg-emerald-500/90 text-white'
                }`}
              >
                {isClosed ? 'Closed' : 'Registrations Open'}
              </span>
            </div>
            <h1 className="font-poppins text-2xl sm:text-4xl font-extrabold leading-tight text-white">{hackathon.title}</h1>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* About */}
          <section className="self-start glass-panel rounded-2xl border border-slate-200 dark:border-white/10 p-6 sm:p-8 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-[#FF7A00]">About this hackathon</h2>
            {hackathon.description?.trim() ? (
              <MarkdownRenderer content={hackathon.description} />
            ) : (
              <p className="text-sm text-slate-500">Rules, tracks and judging criteria will be posted soon.</p>
            )}
          </section>

          {/* Facts + CTA */}
          <aside className="space-y-4 lg:sticky lg:top-24 self-start">
            <div className="glass-panel rounded-2xl border border-slate-200 dark:border-white/10 p-6 space-y-4">
              {facts.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#FF7A00]" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                    <p className="text-sm font-semibold text-[#1A1A2E] dark:text-white">{value}</p>
                  </div>
                </div>
              ))}

              <div className="pt-2">
                {isClosed ? (
                  <span className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-400 dark:bg-white/5 dark:text-slate-500">
                    <Lock className="h-4 w-4" />
                    Registration Closed
                  </span>
                ) : hackathon.form_slug ? (
                  <Link
                    href={`/forms/${hackathon.form_slug}`}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#8B2E3B] to-[#FF7A00] px-4 py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 active:scale-95"
                  >
                    Register Team
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <span className="flex w-full items-center justify-center rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500 dark:bg-white/5 dark:text-slate-400">
                    Registration opens soon
                  </span>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
