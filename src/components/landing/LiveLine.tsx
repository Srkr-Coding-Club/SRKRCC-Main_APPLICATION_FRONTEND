import React from 'react';
import Link from 'next/link';
import type { RegistrationState } from '@/lib/landing';

const REGISTRATION_LABEL: Record<RegistrationState, string | null> = {
  open: 'Registration open',
  upcoming: 'Registration opens soon',
  closed: 'Registration closed',
  none: null,
};

/* ------------------------------------------------------------------ */
/* A single line of live status - "Next: C workshop · Sat 12 Oct ·    */
/* Registration open". Ember marks only a genuinely open registration;*/
/* everything else stays neutral.                                     */
/* ------------------------------------------------------------------ */
export default function LiveLine({
  label,
  detail,
  registration = 'none',
  href,
}: {
  label: string;
  detail?: string | null;
  registration?: RegistrationState;
  href?: string;
}) {
  const status = REGISTRATION_LABEL[registration];
  const isOpen = registration === 'open';
  const parts = [
    { text: label, tone: 'text-journey-text' },
    detail ? { text: detail, tone: 'text-journey-muted' } : null,
    status ? { text: status, tone: isOpen ? 'text-journey-live' : 'text-journey-muted' } : null,
  ].filter((part): part is { text: string; tone: string } => part !== null);

  const content = (
    <>
      <span className="relative flex h-2 w-2 shrink-0">
        {isOpen && <span className="absolute inset-0 animate-ping rounded-full bg-journey-live/60 motion-reduce:hidden" />}
        <span className={`relative h-2 w-2 rounded-full ${isOpen ? 'bg-journey-live' : 'bg-journey-muted/60'}`} />
      </span>
      {parts.map((part, i) => (
        <React.Fragment key={part.text}>
          {i > 0 && <span aria-hidden="true" className="text-journey-muted/40">/</span>}
          <span className={part.tone}>{part.text}</span>
        </React.Fragment>
      ))}
    </>
  );
  const className = 'inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm';

  return href ? (
    <Link href={href} className={`${className} min-h-[44px] rounded-md underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-journey-accent`}>
      {content}
    </Link>
  ) : (
    <p className={className}>{content}</p>
  );
}
