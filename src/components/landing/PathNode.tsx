import React from 'react';

/* ------------------------------------------------------------------ */
/* A stop on the trace: a node on the line with a short branch toward */
/* the section it introduces. JourneyTrace toggles `data-active`;     */
/* unset (no JS) it renders lit. Place it inside a `relative` parent  */
/* that sits directly in JourneyTrace's padded column.                */
/* ------------------------------------------------------------------ */
export default function PathNode({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-path-node
      className={`group/node absolute left-[calc(var(--trace-x)-var(--trace-pad)-5px)] flex items-center ${className}`}
    >
      <span className="h-[11px] w-[11px] rounded-full border border-journey-accent bg-journey-accent transition-colors duration-500 group-data-[active=false]/node:border-journey-text/25 group-data-[active=false]/node:bg-journey-bg" />
      <span className="ml-1 h-px w-[calc(var(--trace-pad)-var(--trace-x)-1.25rem)] bg-journey-accent/60 transition-opacity duration-500 group-data-[active=false]/node:opacity-0" />
    </span>
  );
}
