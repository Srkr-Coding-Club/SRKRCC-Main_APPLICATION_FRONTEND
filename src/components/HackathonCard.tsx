'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, Flame, ArrowRight, ArrowUpRight, Trophy, Users } from 'lucide-react';
import { Hackathon } from '@/lib/types';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import PublicListingCard from '@/components/PublicListingCard';

interface HackathonCardProps {
  hackathon: Hackathon;
  accent?: string;
  index?: number;
}

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

export default function HackathonCard({ hackathon, accent = '#FF7A00', index = 0 }: HackathonCardProps) {
  const router = useRouter();
  const detailHref = `/hackathons/${hackathon.slug}`;

  return (
    <PublicListingCard
      accent={accent}
      index={index}
      category={
        <>
          <Trophy className="h-3 w-3" />
          {hackathon.is_flagship && <Flame className="h-3 w-3" />}
          {hackathon.is_flagship ? 'Flagship Hackathon' : 'Hackathon'}
        </>
      }
      status={
        hackathon.status === 'CLOSED' ? (
          <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Closed
          </span>
        ) : null
      }
      schedule={
        <>
          <Calendar className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
          {formatShortDate(hackathon.start_date)}
          <span className="text-slate-300 dark:text-slate-600">→</span>
          {formatShortDate(hackathon.end_date)}
        </>
      }
      title={hackathon.title}
      description={<MarkdownRenderer content={hackathon.description} />}
      details={
        <div className="grid gap-2.5">
          <p className="line-clamp-1 font-medium"><span className="font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Theme:</span> {hackathon.theme}</p>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 shrink-0" style={{ color: accent }} />
            <span className="font-medium">Prize pool: {hackathon.prize_pool}</span>
          </div>
          {typeof hackathon.team_count === 'number' && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0" style={{ color: accent }} />
              <span className="font-medium">{hackathon.team_count} team{hackathon.team_count === 1 ? '' : 's'} registered</span>
            </div>
          )}
        </div>
      }
      footer={
        <>
          <Link
            href={detailHref}
            aria-label={`View details for ${hackathon.title}`}
            className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-2.5 text-[12px] font-semibold text-slate-600 transition hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:text-white"
          >
            Details
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          {hackathon.status === 'CLOSED' ? (
            <span className="inline-flex flex-1 items-center justify-center rounded-lg bg-slate-100 px-3 py-2.5 text-[12px] font-semibold text-slate-400 dark:bg-white/5 dark:text-slate-500">
              Registration Closed
            </span>
          ) : (
            <Link
              href={detailHref}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[12px] font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5"
              style={{ backgroundColor: accent }}
            >
              <Trophy className="h-3 w-3" />
              Register Team
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </>
      }
      onCardClick={() => router.push(detailHref)}
    />
  );
}