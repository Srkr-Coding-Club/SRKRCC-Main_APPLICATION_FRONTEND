'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, ArrowRight, ArrowUpRight, Trophy, Users } from 'lucide-react';
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
  const registrationOpen = hackathon.is_registration_open ?? hackathon.status !== 'CLOSED';
  const opensAt = hackathon.registration_opens_at ? new Date(hackathon.registration_opens_at) : null;
  const notYetOpen = !registrationOpen && hackathon.status !== 'CLOSED' && !!opensAt && opensAt > new Date();
  const registeredTeams = hackathon.registered_team_count ?? hackathon.team_count;

  return (
    <PublicListingCard
      accent={accent}
      index={index}
      category={
        <>
          <Trophy className="h-3 w-3" />
          Hackathon
        </>
      }
      status={
        hackathon.status === 'CLOSED' ? (
          <span className="inline-flex items-center rounded-full bg-journey-text/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-journey-text/80">
            Closed
          </span>
        ) : null
      }
      schedule={
        <>
          <Calendar className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
          {formatShortDate(hackathon.start_date)}
          <span className="text-journey-muted">→</span>
          {formatShortDate(hackathon.end_date)}
        </>
      }
      title={hackathon.title}
      description={<MarkdownRenderer content={hackathon.description} />}
      details={
        <div className="grid gap-2.5">
          <p className="line-clamp-1 font-medium"><span className="font-bold uppercase tracking-wide text-journey-muted">Theme:</span> {hackathon.theme}</p>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 shrink-0" style={{ color: accent }} />
            <span className="font-medium">Prize pool: {hackathon.prize_pool}</span>
          </div>
          {typeof registeredTeams === 'number' && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0" style={{ color: accent }} />
              <span className="font-medium">{registeredTeams} team{registeredTeams === 1 ? '' : 's'} registered</span>
            </div>
          )}
        </div>
      }
      footer={
        <>
          <Link
            href={detailHref}
            aria-label={`View details for ${hackathon.title}`}
            className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-journey-text/10 px-3 py-2.5 text-[12px] font-semibold text-journey-text/80 transition hover:text-journey-text"
          >
            Details
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          {!registrationOpen ? (
            <span className="inline-flex flex-1 items-center justify-center rounded-lg bg-journey-text/10 px-3 py-2.5 text-[12px] font-semibold text-journey-muted">
              {notYetOpen ? 'Registration opens soon' : 'Registration Closed'}
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