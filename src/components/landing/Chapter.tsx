import React from 'react';
import ActionLink from './ActionLink';
import PathNode from './PathNode';
import type { ChapterCopy } from './journeyContent';

export type ChapterTone = 'quiet' | 'interactive' | 'energetic' | 'climax';

const TONE_SPACING: Record<ChapterTone, string> = {
  quiet: 'py-16 sm:py-24',
  interactive: 'py-16 sm:py-24',
  energetic: 'py-20 sm:py-28',
  climax: 'py-24 sm:py-36',
};

/* ------------------------------------------------------------------ */
/* One chapter of the journey: narrative on the left, its demonstra-  */
/* tion on the right (below it on phones), anchored to the trace by a */
/* PathNode. Tone sets the rhythm - quiet chapters breathe, the       */
/* climax gets more room and a band of its own (`backdrop`).          */
/* ------------------------------------------------------------------ */
export default function Chapter({
  copy,
  tone,
  demo,
  live,
  body,
  backdrop,
}: {
  copy: ChapterCopy;
  tone: ChapterTone;
  demo?: React.ReactNode;
  live?: React.ReactNode;
  /** Replaces the default body copy, e.g. with an API-provided description. */
  body?: string | null;
  backdrop?: React.ReactNode;
}) {
  const climax = tone === 'climax';
  return (
    <section id={copy.id} aria-labelledby={`${copy.id}-title`} className={`relative scroll-mt-20 ${TONE_SPACING[tone]}`}>
      {backdrop}
      <div className={`relative grid items-center gap-12 lg:grid-cols-12 ${climax ? 'lg:gap-10' : 'lg:gap-16'}`}>
        <div className={`relative ${demo ? 'lg:col-span-5' : 'lg:col-span-8'}`}>
          <PathNode className="top-[0.35rem]" />
          <p className="flex items-baseline gap-3 text-sm">
            <span className="font-mono text-journey-accent">{copy.number}</span>
            <span className="text-journey-muted">
              {copy.stage} / {copy.program}
            </span>
          </p>
          <h2
            id={`${copy.id}-title`}
            className={`mt-5 max-w-[18ch] font-display font-semibold leading-[1.02] tracking-[-0.025em] text-journey-text [font-stretch:112%] [text-wrap:balance] ${
              climax ? 'text-[clamp(2.4rem,5.6vw,4.6rem)]' : 'text-[clamp(2rem,4.2vw,3.3rem)]'
            }`}
          >
            {copy.title}
          </h2>
          <p className="mt-6 max-w-[46ch] text-base leading-relaxed text-journey-muted sm:text-lg">{body || copy.body}</p>
          {copy.outcome && <p className="mt-5 max-w-[46ch] text-base font-medium text-journey-text">{copy.outcome}</p>}
          {live && <div className="mt-7">{live}</div>}
          <div className="mt-7">
            <ActionLink href={copy.cta.href}>{copy.cta.label}</ActionLink>
          </div>
        </div>
        {demo && <div className={climax ? 'lg:col-span-7' : 'lg:col-span-6 lg:col-start-7'}>{demo}</div>}
      </div>
    </section>
  );
}
