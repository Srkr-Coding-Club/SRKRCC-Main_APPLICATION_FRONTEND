'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, FileText, Search } from 'lucide-react';
import { ALL_DOMAINS, domainCounts, filterEntries, type PickerEntry } from '@/lib/problemPicker';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import { Modal } from '@/components/ui/Modal';
import { FieldError } from '@/components/ui/InputField';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';

/** Wide enough for the list and the details to sit side by side. */
const WIDE_QUERY = '(min-width: 1024px)';

interface ProblemPickerProps {
  entries: PickerEntry[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
  /** Tells the dialog around the picker when the phone sheet is open, so Escape closes only the sheet. */
  onSheetOpenChange?: (open: boolean) => void;
}

function EntryRow({ entry, selected, onPick }: { entry: PickerEntry; selected: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      aria-disabled={entry.disabled}
      disabled={entry.disabled}
      onClick={onPick}
      className={`flex w-full min-h-12 items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? 'border-journey-accent bg-journey-accent/10'
          : 'border-transparent hover:border-journey-text/10 hover:bg-journey-accent/[0.06]'
      }`}
    >
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-bold uppercase tracking-wide">
          <span className="text-orange-800 dark:text-[#FF9A4A]">{entry.code}</span>
          {entry.domain && <span className="rounded-full bg-journey-text/[0.07] px-2 py-0.5 normal-case tracking-normal text-journey-muted">{entry.domain}</span>}
          {entry.hint && <span className={`normal-case tracking-normal ${entry.disabled ? 'text-rose-700 dark:text-rose-300' : 'text-journey-muted'}`}>{entry.hint}</span>}
        </span>
        <span className="block break-words text-sm font-semibold leading-snug text-journey-text">{entry.title}</span>
      </span>
      {selected && <Check className="mt-1 h-4 w-4 shrink-0 text-journey-accent" aria-hidden="true" />}
    </button>
  );
}

/** Search, domain chips and the statements themselves. Used inline on large screens and inside the sheet on phones. */
function EntryList({ entries, value, onPick, listClassName, fill = false }: {
  entries: PickerEntry[];
  value: string;
  onPick: (id: string) => void;
  listClassName: string;
  /** Take the height of the parent so only the list scrolls (the phone sheet). */
  fill?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState(ALL_DOMAINS);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchId = useId();
  const domains = useMemo(() => domainCounts(entries), [entries]);
  const shown = useMemo(() => filterEntries(entries, query, domain), [entries, query, domain]);
  const filtered = Boolean(query.trim()) || domain !== ALL_DOMAINS;

  const options = () => Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)') ?? []);

  /** Arrow keys walk the statements, Home/End jump, and ArrowDown from the search box enters the list. */
  const onKeyDown = (event: React.KeyboardEvent) => {
    const move = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : event.key === 'Home' ? 'first' : event.key === 'End' ? 'last' : 0;
    const typing = (event.target as HTMLElement).tagName === 'INPUT';
    if (!move || (typing && (move === 'first' || move === 'last'))) return;
    const list = options();
    if (!list.length) return;
    event.preventDefault();
    const at = list.indexOf(document.activeElement as HTMLButtonElement);
    const next = move === 'first' ? 0 : move === 'last' ? list.length - 1 : Math.min(Math.max(at + move, 0), list.length - 1);
    list[next]?.focus();
  };

  return (
    <div ref={rootRef} className={`flex min-h-0 flex-col gap-3 ${fill ? 'h-full' : ''}`} onKeyDown={onKeyDown}>
      <div className="relative">
        <label htmlFor={searchId} className="sr-only">Search problem statements</label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-journey-muted" aria-hidden="true" />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, code or tag"
          autoComplete="off"
          // 16px on phones: iPhones zoom the page when a smaller text box is focused.
          className="glass-panel block h-11 w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-base text-[#1A1A2E] placeholder:text-slate-400 focus:border-journey-accent focus:outline-none focus:ring-1 focus:ring-journey-accent dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500 sm:h-10 sm:text-sm"
        />
      </div>

      {domains.length > 1 && (
        <div role="group" aria-label="Filter by domain" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
          {[{ domain: ALL_DOMAINS, count: entries.length }, ...domains].map((chip) => {
            const active = domain === chip.domain;
            return (
              <button
                key={chip.domain || 'all'}
                type="button"
                aria-pressed={active}
                onClick={() => setDomain(chip.domain)}
                className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-3 text-xs font-bold transition sm:min-h-8 ${
                  active ? 'border-journey-accent bg-journey-accent/10 text-orange-800 dark:text-[#FF9A4A]' : 'border-journey-text/10 text-journey-muted hover:border-journey-accent/50'
                }`}
              >
                {chip.domain || 'All'} <span className="ml-1 font-normal tabular-nums">{chip.count}</span>
              </button>
            );
          })}
        </div>
      )}

      <p aria-live="polite" className="text-xs text-journey-muted">
        {filtered ? `${shown.length} of ${entries.length} statements` : `${entries.length} statements`}
      </p>

      {shown.length === 0 ? (
        <div className="rounded-lg border border-dashed border-journey-text/15 px-4 py-8 text-center text-sm text-journey-muted">
          <p>No statement matches your search.</p>
          <button type="button" onClick={() => { setQuery(''); setDomain(ALL_DOMAINS); }} className="mt-2 min-h-11 font-bold text-journey-accent sm:min-h-0">Clear search and filters</button>
        </div>
      ) : (
        <div role="listbox" aria-label="Problem statements" className={`space-y-1 overflow-y-auto overscroll-contain pr-1 ${listClassName}`}>
          {shown.map((entry) => <EntryRow key={entry.id} entry={entry} selected={entry.id === value} onPick={() => onPick(entry.id)} />)}
        </div>
      )}
    </div>
  );
}

/** The chosen statement in full. */
function Details({ entry, collapsible }: { entry: PickerEntry | undefined; collapsible: boolean }) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => setExpanded(false), [entry?.id]);

  if (!entry) {
    return (
      <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-journey-text/15 p-6 text-center text-sm text-journey-muted">
        <FileText className="h-6 w-6" aria-hidden="true" />
        <p>Select a statement to read its full description.</p>
      </div>
    );
  }
  const hasDescription = Boolean(entry.description?.trim());
  return (
    <div className="space-y-3 rounded-xl border border-journey-text/10 bg-journey-text/[0.03] p-4" aria-live="polite">
      <div className="space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-wide text-orange-800 dark:text-[#FF9A4A]">{entry.code}{entry.domain && ` · ${entry.domain}`}{entry.hint && ` · ${entry.hint}`}</p>
        <h4 className="break-words text-base font-bold leading-snug text-journey-text">{entry.title}</h4>
      </div>
      {entry.tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
          {entry.tags.map((tag) => <li key={tag} className="rounded-full bg-journey-text/[0.07] px-2 py-0.5 text-[11px] text-journey-muted">{tag}</li>)}
        </ul>
      )}
      {hasDescription ? (
        <>
          <div className={`text-xs ${collapsible ? (expanded ? '' : 'max-h-28 overflow-hidden') : 'max-h-80 overflow-y-auto pr-1'}`}>
            <MarkdownRenderer content={entry.description} />
          </div>
          {collapsible && (
            <button type="button" aria-expanded={expanded} onClick={() => setExpanded((open) => !open)} className="min-h-11 text-xs font-bold text-journey-accent">
              {expanded ? 'Show less' : 'Read the full description'}
            </button>
          )}
        </>
      ) : (
        <p className="text-xs text-journey-muted">No further description was given.</p>
      )}
    </div>
  );
}

/**
 * Choose a problem statement. Large screens: searchable list beside the full description. Phones and tablets: a field
 * that opens a full-height sheet with the same list, with the description under the field once chosen.
 */
export function ProblemPicker({ entries, value, onChange, error, onSheetOpenChange }: ProblemPickerProps) {
  const wide = useMediaQuery(WIDE_QUERY);
  const [sheetOpen, setSheetOpen] = useState(false);
  const selected = entries.find((entry) => entry.id === value);
  const errorId = useId();

  const setSheet = (open: boolean) => {
    setSheetOpen(open);
    onSheetOpenChange?.(open);
  };
  // Resizing to a wide window while the sheet is open would leave it orphaned.
  useEffect(() => { if (wide && sheetOpen) setSheet(false); }, [wide]); // eslint-disable-line react-hooks/exhaustive-deps

  if (wide) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-5">
          <EntryList entries={entries} value={value} onPick={onChange} listClassName="max-h-[24rem]" />
          <div className="self-start"><Details entry={selected} collapsible={false} /></div>
        </div>
        <FieldError id={errorId}>{error}</FieldError>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setSheet(true)}
        aria-haspopup="dialog"
        aria-label={`Problem statement: ${selected ? `${selected.code} ${selected.title}` : 'none chosen'}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`glass-panel flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
          error ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
        }`}
      >
        {selected ? (
          <span className="min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-orange-800 dark:text-[#FF9A4A]">{selected.code}{selected.domain && ` · ${selected.domain}`}</span>
            <span className="line-clamp-2 break-words font-semibold text-journey-text">{selected.title}</span>
          </span>
        ) : (
          <span className="text-slate-500 dark:text-slate-400">Choose a problem statement</span>
        )}
        <ChevronRight className="h-4 w-4 shrink-0 text-journey-muted" aria-hidden="true" />
      </button>
      <FieldError id={errorId}>{error}</FieldError>
      {selected && <Details entry={selected} collapsible />}

      <Modal isOpen={sheetOpen} onClose={() => setSheet(false)} title="Choose a problem statement" maxWidth="max-w-lg">
        {/* Escape closes only the sheet; the form behind it keeps what was typed. */}
        <div
          className="flex h-[70dvh] min-h-0 flex-col sm:h-[60dvh]"
          onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); setSheet(false); } }}
        >
          <EntryList entries={entries} value={value} onPick={(id) => { onChange(id); setSheet(false); }} listClassName="min-h-0 flex-1" fill />
        </div>
      </Modal>
    </div>
  );
}
