'use client';

import React from 'react';
import { notCompetingSummary, type TeamBreakdown } from '@/lib/teamCohorts';

/** A listed idea or project whose team has left: shown next to the team's name. */
export const REMOVED_STATUS_LABEL: Record<string, string> = { WITHDRAWN: 'withdrawn', DISQUALIFIED: 'disqualified' };

interface TeamCoverageNoteProps {
  /** How the hackathon's teams break down; absent from an older backend. */
  teams?: TeamBreakdown;
  /** 'ideas' or 'projects', for the wording. */
  noun: string;
  /** How many of them belong to withdrawn or disqualified teams (listed only when shown). */
  removedRows?: number;
  showRemoved: boolean;
  onToggleRemoved: (show: boolean) => void;
}

/**
 * Says which teams a phase counts, so its numbers reconcile with the Teams tab: only registered teams holding a place
 * are expected to hand something in; the rest are named here with how many there are.
 */
export function TeamCoverageNote({ teams, noun, removedRows = 0, showRemoved, onToggleRemoved }: TeamCoverageNoteProps) {
  const others = teams ? notCompetingSummary(teams) : '';
  if (!others && removedRows === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
      {teams && others && (
        <span>
          Of {teams.total} teams, {teams.competing} are registered and expected to hand in {noun}. Not counted: {others}.
        </span>
      )}
      {removedRows > 0 && (
        <label className="inline-flex items-center gap-1.5 font-semibold">
          <input type="checkbox" checked={showRemoved} onChange={(e) => onToggleRemoved(e.target.checked)} className="h-3.5 w-3.5 accent-[#FF7A00]" />
          Show {removedRows} from withdrawn or disqualified teams
        </label>
      )}
    </div>
  );
}
