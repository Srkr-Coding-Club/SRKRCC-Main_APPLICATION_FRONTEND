/**
 * The groups of teams the hackathon screens count, mirroring the backend's apps/hackathons/cohorts.py.
 * Every team is in exactly one group, so the groups always add up to the total.
 */
export type TeamCohort = 'competing' | 'forming' | 'waitlisted' | 'awaiting_payment' | 'removed';

export type TeamBreakdown = Record<TeamCohort, number> & { total: number };

export const COHORT_ORDER: TeamCohort[] = ['competing', 'forming', 'waitlisted', 'awaiting_payment', 'removed'];

export const COHORT_LABEL: Record<TeamCohort, string> = {
  competing: 'registered',
  forming: 'forming',
  waitlisted: 'waitlisted',
  awaiting_payment: 'awaiting payment',
  removed: 'withdrawn or disqualified',
};

/** What each group means, for a tooltip or a note under a count. */
export const COHORT_HINT: Record<TeamCohort, string> = {
  competing: 'Registered and holding a place: these teams hand in ideas and projects, check in and are judged.',
  forming: 'Still gathering members.',
  waitlisted: 'Queued because the hackathon is full.',
  awaiting_payment: 'The fee is waiting for an organizer, or was turned down.',
  removed: 'Withdrew or was disqualified.',
};

export function cohortOf(team: { status: string; is_waitlisted?: boolean }): TeamCohort {
  if (team.status === 'WITHDRAWN' || team.status === 'DISQUALIFIED') return 'removed';
  if (team.status === 'PAYMENT_PENDING' || team.status === 'PAYMENT_REJECTED') return 'awaiting_payment';
  if (team.is_waitlisted) return 'waitlisted';
  return team.status === 'REGISTERED' ? 'competing' : 'forming';
}

export function breakdownOf(teams: { status: string; is_waitlisted?: boolean }[]): TeamBreakdown {
  const counts = { competing: 0, forming: 0, waitlisted: 0, awaiting_payment: 0, removed: 0, total: teams.length };
  for (const team of teams) counts[cohortOf(team)] += 1;
  return counts;
}

/** "3 forming · 2 awaiting payment": the groups other than registered that have any teams, or '' when there are none. */
export function notCompetingSummary(breakdown: TeamBreakdown): string {
  return COHORT_ORDER.filter((c) => c !== 'competing' && breakdown[c] > 0).map((c) => `${breakdown[c]} ${COHORT_LABEL[c]}`).join(' · ');
}
