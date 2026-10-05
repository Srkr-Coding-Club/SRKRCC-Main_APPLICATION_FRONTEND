import React from 'react';

/* ------------------------------------------------------------------ */
/* The quiet surface every demonstration sits on: a dark panel with a */
/* hairline edge and an optional title strip (a file name, a status). */
/* It stays deliberately plain so the demonstration is the subject.   */
/* ------------------------------------------------------------------ */
export default function DemoFrame({
  title,
  aside,
  caption,
  children,
  className = '',
}: {
  title?: string;
  aside?: React.ReactNode;
  caption?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <figure className={className}>
      <div className="overflow-hidden rounded-xl border border-journey-text/10 bg-journey-surface/70">
        {title && (
          <div className="flex items-center justify-between border-b border-journey-text/10 px-4 py-2.5 font-mono text-xs text-journey-muted">
            <span>{title}</span>
            {aside}
          </div>
        )}
        {children}
      </div>
      {caption && <figcaption className="mt-3 text-sm text-journey-muted">{caption}</figcaption>}
    </figure>
  );
}
