'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { clubIdApi } from '@/lib/clubIds';
import type { DirectoryUser } from '@/lib/userDirectory';

const INPUT = 'min-h-11 w-full rounded-lg border border-journey-text/15 bg-journey-surface pl-9 pr-3 text-base text-journey-text placeholder:text-journey-muted focus:border-journey-accent focus:outline-none sm:min-h-10 sm:text-sm';

interface PersonPickerProps {
  label: string;
  value: DirectoryUser | null;
  onChange: (person: DirectoryUser | null) => void;
  /** Only people who hold no Club ID yet (who an id could be given to). */
  withoutId?: boolean;
  id: string;
}

/** Search everybody by name, email, roll number or phone and pick one person. */
export function PersonPicker({ label, value, onChange, withoutId = false, id }: PersonPickerProps) {
  const [text, setText] = useState('');
  const [results, setResults] = useState<DirectoryUser[]>([]);
  const [searching, setSearching] = useState(false);
  const newest = useRef(0);

  useEffect(() => {
    const query = text.trim();
    if (query.length < 2) { setResults([]); return undefined; }
    const timer = window.setTimeout(() => {
      const mine = ++newest.current;
      setSearching(true);
      clubIdApi.people(query, withoutId)
        .then((page) => { if (mine === newest.current) setResults(page.results); })
        .catch(() => { if (mine === newest.current) setResults([]); })
        .finally(() => { if (mine === newest.current) setSearching(false); });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [text, withoutId]);

  if (value) {
    return (
      <div>
        <p className="mb-1 block text-xs font-bold text-journey-text">{label}</p>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-journey-accent/40 bg-journey-accent/5 px-3 py-2">
          <span className="min-w-0 text-sm"><strong className="block break-words text-journey-text">{value.full_name}</strong><span className="block break-all text-xs text-journey-muted">{value.email}{value.club_id ? ` · ${value.club_id}` : ''}</span></span>
          <button type="button" onClick={() => { onChange(null); setText(''); }} aria-label={`Choose someone else instead of ${value.full_name}`} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-journey-muted hover:bg-journey-text/10"><X className="h-4 w-4" aria-hidden="true" /></button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-bold text-journey-text">{label}</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-journey-muted" aria-hidden="true" />
        <input id={id} type="search" value={text} onChange={(event) => setText(event.target.value)} placeholder={withoutId ? 'Name or email of someone without a Club ID' : 'Name or email'} className={INPUT} autoComplete="off" />
      </div>
      {text.trim().length >= 2 && (
        <ul className="mt-1 max-h-56 overflow-y-auto rounded-lg border border-journey-text/10" aria-label="Matching people">
          {results.map((person) => (
            <li key={person.id}>
              <button type="button" onClick={() => onChange(person)} className="flex min-h-11 w-full flex-col items-start px-3 py-2 text-left hover:bg-journey-text/10">
                <span className="text-sm font-bold text-journey-text">{person.full_name}</span>
                <span className="break-all text-xs text-journey-muted">{person.email}{person.club_id ? ` · ${person.club_id}` : ''}</span>
              </button>
            </li>
          ))}
          {!searching && results.length === 0 && <li className="px-3 py-3 text-xs text-journey-muted">{withoutId ? 'Nobody without a Club ID matches.' : 'Nobody matches.'}</li>}
          {searching && results.length === 0 && <li className="px-3 py-3 text-xs text-journey-muted">Searching…</li>}
        </ul>
      )}
    </div>
  );
}
