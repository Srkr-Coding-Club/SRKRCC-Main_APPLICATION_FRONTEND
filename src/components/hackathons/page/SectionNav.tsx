'use client';

import React, { useEffect, useState } from 'react';

export interface PageSection {
  id: string;
  label: string;
}

/** Sticky in-page navigation: jumps to a section and highlights the one being read. */
export function SectionNav({ sections }: { sections: PageSection[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');

  useEffect(() => {
    const targets = sections.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => !!el);
    if (targets.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      // The band just under the sticky bars counts as "being read".
      { rootMargin: '-140px 0px -60% 0px' },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  const jump = (event: React.MouseEvent, id: string) => {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${id}`);
    setActiveId(id);
  };

  return (
    <nav
      aria-label="Hackathon sections"
      className="sticky top-[72px] z-30 -mx-4 border-b border-journey-text/10 bg-[var(--background)]/90 px-4 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border sm:px-2"
    >
      <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sections.map((section) => {
          const active = section.id === activeId;
          return (
            <li key={section.id} className="shrink-0">
              <a
                href={`#${section.id}`}
                onClick={(event) => jump(event, section.id)}
                aria-current={active ? 'true' : undefined}
                className={`block border-b-2 px-4 py-3.5 font-mono text-xs font-medium uppercase tracking-[0.14em] transition ${
                  active
                    ? 'border-journey-accent text-journey-accent'
                    : 'border-transparent text-journey-muted hover:text-journey-text'
                }`}
              >
                {section.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Section wrapper with the hairline-accent heading used across the page, like the landing page's connectors. */
export function PageSectionCard({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-36 space-y-5 rounded-2xl border border-journey-text/10 bg-journey-surface/50 p-5 sm:p-7"
    >
      <h2 className="text-xl font-semibold text-journey-text sm:text-2xl">{title}</h2>
      {children}
    </section>
  );
}
