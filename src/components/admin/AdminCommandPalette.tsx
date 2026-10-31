'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CornerDownLeft, Flag, IndianRupee, Lightbulb, ScanLine, Search, UserSearch, Users } from 'lucide-react';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import type { Hackathon } from '@/lib/types';

export interface PaletteEntry {
  /** Stable id, also used to build the option's DOM id. */
  key: string;
  label: string;
  href: string;
  /** The section it lives in ("Modules"), shown on the right and searched too. */
  section: string;
  desc?: string;
  icon: React.ElementType;
  /** A count worth noticing (tasks waiting). */
  badge?: number;
}

const SHORT_DATE = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });
const STATUS_WORD: Record<string, string> = { DRAFT: 'Draft', LIVE: 'Live', CLOSED: 'Closed' };

/**
 * One entry for each hackathon, and (for the ones still running) a shortcut to the tabs an organizer opens most: Teams,
 * Payments, Check-in, Ideas, Team Finder, each only where that module is on. "HackOverflow pay" then lands on its Payments tab.
 */
export function hackathonEntries(hackathons: Hackathon[]): PaletteEntry[] {
  const entries: PaletteEntry[] = [];
  for (const item of hackathons) {
    const base = `/admin/hackathons/${item.slug}`;
    const when = SHORT_DATE.format(new Date(item.start_date));
    entries.push({ key: `h-${item.slug}`, label: item.title, href: base, section: 'Hackathons', desc: `${STATUS_WORD[item.status ?? 'LIVE'] ?? 'Live'} · ${when}`, icon: Flag });
    if (item.status === 'CLOSED') continue;
    const features = item.features ?? {};
    const tabs: [string, string, React.ElementType, boolean][] = [
      ['teams', 'Teams', Users, true],
      ['payments', 'Payments', IndianRupee, !!item.payment_stage && item.payment_stage !== 'NONE'],
      ['checkin', 'Check-in', ScanLine, !!features.check_in],
      ['ideas', 'Ideas', Lightbulb, !!features.ideas],
      ['finder', 'Team Finder', UserSearch, !!features.team_finder],
    ];
    for (const [tab, label, icon, on] of tabs) {
      if (on) entries.push({ key: `h-${item.slug}-${tab}`, label: `${item.title}: ${label}`, href: `${base}?tab=${tab}`, section: 'Hackathons', icon });
    }
  }
  return entries;
}

/** Entries whose words all appear in the text match; ones that start with the search come first. Pure, so it is tested alone. */
export function rankEntries(entries: PaletteEntry[], query: string, limit = 8): PaletteEntry[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return entries.slice(0, limit);
  const scored: { entry: PaletteEntry; score: number }[] = [];
  for (const entry of entries) {
    const label = entry.label.toLowerCase();
    const text = `${label} ${entry.section.toLowerCase()} ${(entry.desc ?? '').toLowerCase()}`;
    if (!words.every((word) => text.includes(word))) continue;
    scored.push({ entry, score: label.startsWith(words[0]) ? 0 : label.includes(words[0]) ? 1 : 2 });
  }
  return scored.sort((a, b) => a.score - b.score).slice(0, limit).map((item) => item.entry);
}

interface AdminCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  entries: PaletteEntry[];
}

/** Ctrl K: type a few letters, press Enter, land on any admin page. A combobox: the input keeps focus, arrows move the highlight. */
export function AdminCommandPalette({ open, onClose, entries }: AdminCommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useFocusTrap(panelRef, open);

  const results = useMemo(() => rankEntries(entries, query), [entries, query]);

  useEffect(() => {
    if (open) { setQuery(''); setActive(0); }
  }, [open]);
  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const go = (entry: PaletteEntry | undefined) => {
    if (!entry) return;
    onClose();
    router.push(entry.href);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((value) => (results.length ? (value + 1) % results.length : 0)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((value) => (results.length ? (value - 1 + results.length) % results.length : 0)); }
    else if (event.key === 'Enter') { event.preventDefault(); go(results[active]); }
    else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]" onKeyDown={onKeyDown}>
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-[3px]" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Jump to a page"
        tabIndex={-1}
        className="relative w-full max-w-[660px] overflow-hidden rounded-2xl border border-black/[0.1] bg-[var(--card-bg)] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)] dark:border-white/[0.14]"
      >
        <div className="flex h-14 items-center gap-3 border-b border-black/[0.08] px-4 dark:border-white/[0.1]">
          <Search className="h-[18px] w-[18px] shrink-0 text-journey-accent" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            role="combobox"
            aria-expanded="true"
            aria-controls="admin-jump-results"
            aria-activedescendant={results[active] ? `jump-${results[active].key}` : undefined}
            aria-label="Search admin pages"
            placeholder="Jump to a page…"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent text-base font-medium text-[#1A1A2E] outline-none placeholder:text-[#1A1A2E]/55 dark:text-white dark:placeholder:text-white/55"
          />
          <kbd className="rounded-md border border-black/15 px-1.5 py-0.5 font-mono text-[11px] text-[#1A1A2E]/70 dark:border-white/20 dark:text-white/70">Esc</kbd>
        </div>

        <ul id="admin-jump-results" role="listbox" aria-label="Pages" className="max-h-[52vh] overflow-y-auto p-2">
          {results.map((entry, index) => {
            const Icon = entry.icon;
            const selected = index === active;
            return (
              <li
                key={entry.key}
                id={`jump-${entry.key}`}
                role="option"
                aria-selected={selected}
                onMouseMove={() => setActive(index)}
                onClick={() => go(entry)}
                className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-colors ${
                  selected ? 'bg-gradient-to-r from-[#8B2E3B]/90 to-[#C2410C]/80 text-white' : 'text-[#1A1A2E] dark:text-white'
                }`}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 ${selected ? 'text-orange-100' : 'text-[#1A1A2E]/60 dark:text-white/65'}`} aria-hidden="true" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{entry.label}</span>
                  {entry.desc && <span className={`truncate text-[11px] font-normal ${selected ? 'text-orange-50/90' : 'text-[#1A1A2E]/60 dark:text-white/60'}`}>{entry.desc}</span>}
                </span>
                {!!entry.badge && <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold leading-none text-black">{entry.badge}</span>}
                <span className={`ml-auto shrink-0 font-mono text-[11px] uppercase tracking-[0.06em] ${selected ? 'text-orange-50/90' : 'text-[#1A1A2E]/60 dark:text-white/60'}`}>{entry.section}</span>
                {selected && <CornerDownLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
              </li>
            );
          })}
          {results.length === 0 && <li role="presentation" className="px-4 py-8 text-center text-sm text-[#1A1A2E]/70 dark:text-white/70">Nothing matches “{query}”.</li>}
        </ul>

        <div className="flex h-11 items-center gap-5 border-t border-black/[0.08] bg-black/[0.03] px-4 text-xs text-[#1A1A2E]/70 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-white/70">
          <span>Up and down to move</span>
          <span>Enter to open</span>
          <span className="ml-auto">Esc to close</span>
        </div>
      </div>
    </div>
  );
}
