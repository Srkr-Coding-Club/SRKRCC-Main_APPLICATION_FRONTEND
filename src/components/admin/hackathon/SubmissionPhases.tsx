import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { Hackathon } from '@/lib/types';
import { StatusPill, type PillTone } from '@/components/ui/StatusPill';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';

type PhaseState = 'off' | 'soon' | 'open' | 'closed';

const PILL: Record<PhaseState, { tone: PillTone; label: string }> = {
  off: { tone: 'slate', label: 'Off' },
  soon: { tone: 'amber', label: 'Not open yet' },
  open: { tone: 'green', label: 'Open' },
  closed: { tone: 'slate', label: 'Closed' },
};

function stateOf(enabled: boolean, opensAt?: string | null, deadline?: string | null): PhaseState {
  if (!enabled) return 'off';
  const now = Date.now();
  if (opensAt && new Date(opensAt).getTime() > now) return 'soon';
  if (deadline && new Date(deadline).getTime() <= now) return 'closed';
  return 'open';
}

/** The two submission phases side by side, so organizers see how plan and implementation line up. */
export function SubmissionPhases({ hackathon }: { hackathon: Hackathon }) {
  const phases = [
    {
      title: 'Phase 1: Idea (plan)',
      state: stateOf(Boolean(hackathon.features?.ideas), hackathon.idea_opens_at, hackathon.idea_deadline),
      deadline: hackathon.idea_deadline,
      note: hackathon.idea_review_required ? 'Organizers review each idea' : 'Ideas are accepted automatically',
    },
    {
      title: 'Phase 2: Project (implement)',
      state: stateOf(Boolean(hackathon.features?.submissions), hackathon.submission_opens_at, hackathon.submission_deadline),
      deadline: hackathon.submission_deadline,
      note: hackathon.features?.ideas && hackathon.project_requires_approved_idea ? 'Only teams with an accepted idea' : 'Every registered team',
    },
  ];
  return (
    <ol className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr]" aria-label="Submission phases">
      {phases.map((phase, index) => (
        <React.Fragment key={phase.title}>
          {index === 1 && <li aria-hidden="true" className="hidden items-center justify-center text-slate-500 dark:text-slate-400 sm:flex"><ArrowRight className="h-5 w-5" /></li>}
          <li className="space-y-1 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-[#1A1A2E] dark:text-white">{phase.title}</p>
              <StatusPill tone={PILL[phase.state].tone}>{PILL[phase.state].label}</StatusPill>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{phase.note}</p>
            {phase.deadline && <p className="text-xs text-slate-500 dark:text-slate-400">Deadline: {formatDateTime(phase.deadline)}</p>}
          </li>
        </React.Fragment>
      ))}
    </ol>
  );
}
