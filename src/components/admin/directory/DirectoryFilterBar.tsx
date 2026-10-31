'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { BRANCHES } from '@/lib/adminUserForm';
import { hasActiveFilters, type DirectoryFilters, type DirectoryScope } from '@/lib/userDirectory';

const SELECT = 'min-h-11 rounded-lg border border-journey-text/15 bg-journey-surface px-3 text-sm font-semibold text-journey-text focus:border-journey-accent focus:outline-none sm:min-h-10 sm:text-xs';

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

interface DirectoryFilterBarProps {
  scope: DirectoryScope;
  filters: DirectoryFilters;
  searchText: string;
  onSearch: (text: string) => void;
  onChange: (patch: Partial<DirectoryFilters>) => void;
  onClear: () => void;
}

/** Search plus every filter the server understands. The values live in the page address, so this component holds no state. */
export function DirectoryFilterBar({ scope, filters, searchText, onSearch, onChange, onClear }: DirectoryFilterBarProps) {
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
