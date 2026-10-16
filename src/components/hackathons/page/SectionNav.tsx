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
      className="sticky top-[72px] z-30 -mx-4 border-b border-slate-200 bg-[var(--background)]/90 px-4 backdrop-blur-md dark:border-white/10 sm:mx-0 sm:rounded-2xl sm:border sm:px-2"
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
                className={`block border-b-2 px-4 py-3.5 text-sm font-semibold transition ${
                  active
                    ? 'border-[#FF7A00] text-[#FF7A00]'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
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

/** Section wrapper with the accent-bar heading used across the page. */
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
      className="scroll-mt-36 space-y-5 rounded-2xl border border-slate-200 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.02] sm:p-7"
    >
      <h2 className="border-l-4 border-[#FF7A00] pl-3 text-xl font-bold text-[#1A1A2E] dark:text-white sm:text-2xl">{title}</h2>
      {children}
    </section>
  );
}
