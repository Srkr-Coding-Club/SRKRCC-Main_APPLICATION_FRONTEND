'use client';

import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { BRANCHES } from '@/lib/adminUserForm';
import {
  directoryApi,
  directoryCollegeName,
  EMPTY_FILTERS,
  hasActiveFilters,
  listAllDirectoryUsers,
  type DirectoryFilters,
  type DirectoryScope,
} from '@/lib/userDirectory';

const SELECT = 'min-h-11 rounded-lg border border-journey-text/15 bg-journey-surface px-3 text-sm font-semibold text-journey-text focus:border-journey-accent focus:outline-none sm:min-h-10 sm:text-xs';
const COLLEGE_INPUT = `${SELECT} w-[min(100%,14rem)] font-medium placeholder:font-medium placeholder:text-journey-muted`;
const COLLEGE_DEBOUNCE_MS = 300;

const ROLES = [['AFFILIATE', 'Affiliate'], ['NON_AFFILIATE', 'Non-affiliate'], ['VOLUNTEER', 'Volunteer'], ['JUDGE', 'Judge'], ['CLUB_LEAD', 'Club lead'], ['ADMIN', 'Admin']];
const STATUSES = [['ACTIVE', 'Active'], ['INACTIVE', 'Inactive'], ['SUSPENDED', 'Suspended'], ['ALUMNI', 'Alumni (past)'], ['PENDING', 'Pending']];
const EMAIL = [['verified', 'Email verified'], ['unverified', 'Email unverified'], ['overdue', 'Verification overdue'], ['disputed', 'Disputed']];
const SORTS = [['newest', 'Newest first'], ['oldest', 'Oldest first'], ['name', 'Name A–Z'], ['email', 'Email A–Z'], ['club_id', 'Club ID'], ['last_login', 'Last sign-in']];

function Pick({ label, value, onChange, options, all }: { label: string; value: string; onChange: (value: string) => void; options: string[][]; all: string }) {
  return (
    <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className={SELECT}>
      <option value="">{all}</option>
      {options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
    </select>
  );
}

/** Distinct college names already on member accounts (catalogue or typed-in). */
async function loadCollegeSuggestions(scope: DirectoryScope): Promise<string[]> {
  const names = new Set<string>();
  const people = await listAllDirectoryUsers((page) =>
    directoryApi.list({ ...EMPTY_FILTERS, page }, scope, { page_size: '100' }),
  );
  for (const user of people) {
    const name = directoryCollegeName(user);
    if (name) names.add(name);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

function CollegeNameFilter({
  scope,
  value,
  onChange,
}: {
  scope: DirectoryScope;
  value: string;
  onChange: (college: string) => void;
}) {
  const listId = useId();
  const [text, setText] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => { setText(value); }, [value]);

  useEffect(() => {
    let cancelled = false;
    loadCollegeSuggestions(scope)
      .then((names) => { if (!cancelled) setSuggestions(names); })
      .catch(() => { if (!cancelled) setSuggestions([]); });
    return () => { cancelled = true; };
  }, [scope]);

  useEffect(() => {
    if (text.trim() === value) return undefined;
    const timer = window.setTimeout(() => onChange(text.trim()), COLLEGE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [text, value, onChange]);

  const matching = useMemo(() => {
    const needle = text.trim().toLowerCase();
    if (!needle) return suggestions.slice(0, 40);
    return suggestions.filter((name) => name.toLowerCase().includes(needle)).slice(0, 40);
  }, [suggestions, text]);

  return (
    <div className="relative flex items-center gap-1">
      <input
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        list={listId}
        placeholder="College name…"
        aria-label="Filter by college name"
        autoComplete="off"
        className={COLLEGE_INPUT}
      />
      <datalist id={listId}>
        {matching.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      {text.trim() !== '' && (
        <button
          type="button"
          onClick={() => { setText(''); onChange(''); }}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-journey-muted hover:text-journey-accent sm:min-h-10 sm:min-w-10"
          aria-label="Clear college filter"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

interface DirectoryFilterBarProps {
  scope: DirectoryScope;
  filters: DirectoryFilters;
  searchText: string;
  onSearch: (text: string) => void;
  onChange: (patch: Partial<DirectoryFilters>) => void;
  onClear: () => void;
}

/** Search plus directory filters. College is a free-text name match applied in the browser. */
export function DirectoryFilterBar({ scope, filters, searchText, onSearch, onChange, onClear }: DirectoryFilterBarProps) {
  const setCollege = useCallback((college: string) => onChange({ college }), [onChange]);

  return (
    <div className="space-y-3" role="search" aria-label="Filter people">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-journey-muted" aria-hidden="true" />
        <input
          type="search"
          value={searchText}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search name, email, roll number, phone or Club ID (e.g. 25SCC277)"
          aria-label="Search people"
          className="min-h-11 w-full rounded-xl border border-journey-text/15 bg-journey-surface pl-10 pr-3 text-base text-journey-text placeholder:text-journey-muted focus:border-journey-accent focus:outline-none sm:text-sm"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Pick label="Filter by role" value={filters.role} onChange={(role) => onChange({ role })} options={ROLES} all="Any role" />
        <Pick label="Filter by membership status" value={filters.membership_status} onChange={(membership_status) => onChange({ membership_status })} options={STATUSES} all="Any status" />
        <Pick label="Filter by email verification" value={filters.email} onChange={(email) => onChange({ email })} options={EMAIL} all="Any email state" />
        {scope === 'users' && (
          <Pick label="Filter by club membership" value={filters.member} onChange={(member) => onChange({ member: member as DirectoryFilters['member'] })} options={[['yes', 'Club members'], ['no', 'Not club members']]} all="Members and others" />
        )}
        <CollegeNameFilter scope={scope} value={filters.college} onChange={setCollege} />
        <Pick label="Filter by branch" value={filters.branch} onChange={(branch) => onChange({ branch })} options={BRANCHES.map((branch) => [branch, branch])} all="Any branch" />
        <Pick label="Filter by year" value={filters.year} onChange={(year) => onChange({ year })} options={[['1', 'Year 1'], ['2', 'Year 2'], ['3', 'Year 3'], ['4', 'Year 4']]} all="Any year" />
        <select aria-label="Sort by" value={filters.ordering} onChange={(event) => onChange({ ordering: event.target.value })} className={`${SELECT} sm:ml-auto`}>
          {SORTS.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
        </select>
        {(hasActiveFilters(filters) || searchText) && (
          <button type="button" onClick={onClear} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-journey-accent hover:underline sm:min-h-10">
            <X className="h-3.5 w-3.5" aria-hidden="true" /> Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
