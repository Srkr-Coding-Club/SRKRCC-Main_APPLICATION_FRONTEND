import React from 'react';
import type { LandingData } from '@/lib/landing';
import Chapter from './Chapter';
import DawnBackdrop from './DawnBackdrop';
import LiveLine from './LiveLine';
import PathNode from './PathNode';
import { CHAPTERS, JOURNEY_STAGES } from './journeyContent';
import CompileDemo from './demos/CompileDemo';
import ContestDemo from './demos/ContestDemo';
import HackathonClock from './demos/HackathonClock';
import SortDemo from './demos/SortDemo';
import StreakDemo from './demos/StreakDemo';
import TerminalDemo from './demos/TerminalDemo';

/* ------------------------------------------------------------------ */
/* The Path: seven programs as one progression, Discover to Build.    */
/* Rhythm alternates on purpose - quiet, interactive, quiet,          */
/* energetic, climax - so the hackathon lands as the high point.      */
/* Live lines appear only when the API has a matching event.          */
/* ------------------------------------------------------------------ */
export default function ThePath({ data }: { data: LandingData }) {
  const { awareness, cWorkshop, dsa, edgeCase, codeQuest, hackOverflow, iconCoders } = data;

  return (
    <>
      <header id="path" className="scroll-mt-20 pb-8 pt-28 sm:pt-36">
        <div className="relative">
          <PathNode className="top-[0.35rem]" />
          <p className="text-sm text-journey-muted">The path</p>
          <h2 className="mt-4 max-w-[18ch] font-display text-[clamp(2.4rem,6vw,5rem)] font-semibold leading-[0.98] tracking-[-0.03em] text-journey-text [font-stretch:112%]">
            From your first <span className="font-mono text-[0.82em] font-medium tracking-[-0.04em]">printf</span> to your first hackathon.
          </h2>
          <p className="mt-6 max-w-[52ch] text-base leading-relaxed text-journey-muted sm:text-lg">
            The club is built as a path, one step at a time. Start wherever you are today.
          </p>
          <ol className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm" aria-label="Stages of the journey">
            {JOURNEY_STAGES.map((stage, i) => (
              <li key={stage} className="flex items-center gap-3">
                {i > 0 && <span aria-hidden="true" className="h-px w-5 bg-journey-text/20 sm:w-8" />}
                <span className="text-journey-text/80">{stage}</span>
              </li>
            ))}
          </ol>
        </div>
      </header>

      <Chapter
        copy={CHAPTERS.awareness}
        tone="quiet"
        demo={<TerminalDemo />}
        live={awareness && <LiveLine label={`Next: ${awareness.title}`} detail={awareness.dateLabel} registration={awareness.registration} href={awareness.href} />}
      />

      <Chapter
        copy={CHAPTERS.cWorkshop}
        tone="interactive"
        demo={<CompileDemo />}
        live={cWorkshop && <LiveLine label={`Next: ${cWorkshop.title}`} detail={cWorkshop.dateLabel} registration={cWorkshop.registration} href={cWorkshop.href} />}
      />

      <Chapter
        copy={CHAPTERS.dsa}
        tone="interactive"
        demo={<SortDemo />}
        live={dsa && <LiveLine label={`Next: ${dsa.title}`} detail={dsa.dateLabel} registration={dsa.registration} href={dsa.href} />}
      />

      <Chapter
        copy={CHAPTERS.codeQuest}
        tone="quiet"
        demo={
          <StreakDemo
            latest={codeQuest ? <LiveLine label={`Latest problem: ${codeQuest.title}`} detail={codeQuest.difficulty} href={codeQuest.href} /> : null}
          />
        }
      />

      <Chapter
        copy={CHAPTERS.edgeCase}
        tone="energetic"
        demo={
          <ContestDemo
            cadence={
              edgeCase?.daysAway != null
                ? `Next round ${edgeCase.daysAway === 0 ? 'today' : `in ${edgeCase.daysAway} day${edgeCase.daysAway === 1 ? '' : 's'}`}. Leaderboard shown is an illustration.`
                : 'A new round every two weeks. Leaderboard shown is an illustration.'
            }
          />
        }
        live={edgeCase && <LiveLine label={`Next: ${edgeCase.title}`} detail={edgeCase.dateLabel} registration={edgeCase.registration} href={edgeCase.href} />}
      />

      <Chapter
        copy={{ ...CHAPTERS.hackOverflow, cta: { ...CHAPTERS.hackOverflow.cta, href: hackOverflow?.href ?? CHAPTERS.hackOverflow.cta.href } }}
        tone="climax"
        backdrop={<DawnBackdrop />}
        demo={<HackathonClock />}
        live={
          hackOverflow && (
            <dl className="grid max-w-md grid-cols-2 gap-x-8 gap-y-4 border-t border-journey-text/10 pt-5 text-sm">
              <Fact term="Edition" value={hackOverflow.title} />
              <Fact term="Dates" value={hackOverflow.dateLabel} />
              <Fact term="Teams" value={hackOverflow.teamSizeLabel} />
              <Fact term="Prize pool" value={hackOverflow.prizePool} />
            </dl>
          )
        }
      />

      <Chapter
        copy={CHAPTERS.iconCoders}
        tone="quiet"
        body={iconCoders?.description}
        live={
          iconCoders && (
            <LiveLine label={iconCoders.title} detail={iconCoders.theme ?? iconCoders.dateLabel} registration={iconCoders.registration} href={iconCoders.href} />
          )
        }
      />
    </>
  );
}

function Fact({ term, value }: { term: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-journey-muted">{term}</dt>
      <dd className="mt-1 text-journey-text">{value}</dd>
    </div>
  );
}
