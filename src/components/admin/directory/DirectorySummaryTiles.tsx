'use client';

import React from 'react';
import { AlertTriangle, BadgeCheck, GraduationCap, MailQuestion, UserCheck, Users } from 'lucide-react';
import { Kpi } from '../hackathon/OverviewParts';
import type { DirectoryFilters, DirectoryScope, DirectorySummary } from '@/lib/userDirectory';

interface DirectorySummaryTilesProps {
  scope: DirectoryScope;
  summary: DirectorySummary | null;
  filters: DirectoryFilters;
  onFilter: (patch: Partial<DirectoryFilters>) => void;
  onClear: () => void;
}

/** The numbers at the top; each tile is also the filter that shows exactly those people. */
export function DirectorySummaryTiles({ scope, summary, onFilter, onClear }: DirectorySummaryTilesProps) {
  if (!summary) return <div className="h-28 animate-pulse rounded-xl bg-journey-text/10" aria-hidden="true" />;
  if (scope === 'members') {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <Kpi icon={Users} label="Club members" value={summary.total} hint="hold a Club ID" onClick={onClear} />
        <Kpi icon={UserCheck} label="Active" value={summary.by_membership_status.ACTIVE} hint="current members" tone="green" onClick={() => onFilter({ membership_status: 'ACTIVE' })} />
        <Kpi icon={GraduationCap} label="Alumni" value={summary.by_membership_status.ALUMNI} hint="past members" onClick={() => onFilter({ membership_status: 'ALUMNI' })} />
        <Kpi icon={MailQuestion} label="Email unverified" value={summary.unverified} hint={`${summary.verified} verified`} tone="amber" onClick={() => onFilter({ email: 'unverified' })} />
        <Kpi icon={AlertTriangle} label="Verification overdue" value={summary.overdue} hint="past the deadline" tone={summary.overdue ? 'red' : 'accent'} className="col-span-2 lg:col-span-1" onClick={() => onFilter({ email: 'overdue' })} />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
      <Kpi icon={Users} label="Everyone" value={summary.total} hint={`${summary.members} are club members`} onClick={onClear} />
      <Kpi icon={BadgeCheck} label="Email verified" value={summary.verified} hint={summary.total ? `${Math.round((summary.verified / summary.total) * 100)}% of everyone` : ''} tone="green" onClick={() => onFilter({ email: 'verified' })} />
      <Kpi icon={MailQuestion} label="Email unverified" value={summary.unverified} hint="not yet confirmed" tone="amber" onClick={() => onFilter({ email: 'unverified' })} />
      <Kpi icon={AlertTriangle} label="Verification overdue" value={summary.overdue} hint="past the deadline" tone={summary.overdue ? 'red' : 'accent'} onClick={() => onFilter({ email: 'overdue' })} />
      <Kpi icon={UserCheck} label="Club members" value={summary.members} hint="hold a Club ID" className="col-span-2 lg:col-span-1" onClick={() => onFilter({ member: 'yes' })} />
    </div>
  );
}
