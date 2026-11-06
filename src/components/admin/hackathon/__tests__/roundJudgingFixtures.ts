export const round = (over: Record<string, unknown> = {}) => ({
  id: 5, order: 2, name: 'Semi-final', kind: 'PROJECT_REVIEW', shortlist_limit: null, description: '', starts_at: null, ends_at: null, status: 'UPCOMING',
  effective_status: 'UPCOMING', details_form: null, results_published: false, evaluation_mode: 'JUDGED', evaluation_status: 'NOT_STARTED',
  entry_counts: { total: 3, PENDING: 3, SHORTLISTED: 0, REJECTED: 0, details_submitted: 0 }, created_at: '', updated_at: '', ...over,
}) as any;

export const judge = (id: number, name = `Judge ${id}`) => ({ judge_id: id, name, email: `j${id}@x.io` });

export const settings = (over: Record<string, unknown> = {}) => ({
  evaluation_mode: 'JUDGED', scoring_target: 'PROJECT', assignment_mode: 'BALANCED', judges_per_team: 3, min_reviews_per_team: 1,
  scoring_deadline: null, blind: false, tie_break: 'CRITERIA', ...over,
});

const READY = [
  { key: 'teams', label: 'Teams are in the round', ok: true, detail: '3 team(s)' },
  { key: 'judges', label: 'Judges are chosen', ok: true, detail: '2 judge(s)' },
  { key: 'rubric', label: 'Judging criteria are set', ok: true, detail: '2 criteria' },
  { key: 'coverage', label: 'Every team can get 1 judge(s)', ok: true, detail: '' },
  { key: 'deadline', label: 'The deadline is still ahead', ok: true, detail: '' },
];

export const evaluation = (over: Record<string, unknown> = {}) => ({
  round_id: 5, name: 'Semi-final', enabled: true, settings: settings(), status: 'NOT_STARTED', started_at: null, closed_at: null, results_published: false,
  criteria_source: 'hackathon', criteria: [{ id: 1, name: 'Idea', description: '', max_score: 10, weight: 3, order: 0 }, { id: 2, name: 'Demo', description: '', max_score: 10, weight: 1, order: 1 }],
  panel: [judge(11, 'Asha Rao'), judge(12, 'Ben Roy')], coverage: { assignments: 0, teams: 3, short: [] }, readiness: READY, can_start: true, ...over,
}) as any;

export const progress = (over: Record<string, unknown> = {}) => ({
  status: 'IN_PROGRESS', started_at: null, closed_at: null, deadline: null, min_reviews: 1,
  judges: [
    { judge_id: 11, name: 'Asha Rao', email: 'j11@x.io', assigned: 3, scored: 2, pending: 1, recused: 0, last_activity: '2026-11-05T10:00:00Z' },
    { judge_id: 12, name: 'Ben Roy', email: 'j12@x.io', assigned: 2, scored: 0, pending: 1, recused: 1, last_activity: null },
  ],
  teams: [
    { entry_id: 1, team_id: 1, team_name: 'Alpha', label: 'Alpha', review_count: 1, needs: 0, cells: [{ judge_id: 11, state: 'scored' }, { judge_id: 12, state: 'pending' }] },
    { entry_id: 2, team_id: 2, team_name: 'Beta', label: 'Beta', review_count: 1, needs: 0, cells: [{ judge_id: 11, state: 'scored' }, { judge_id: 12, state: 'recused' }] },
    { entry_id: 3, team_id: 3, team_name: 'Gamma', label: 'Gamma', review_count: 0, needs: 1, cells: [{ judge_id: 11, state: 'pending' }] },
  ],
  totals: { assigned: 5, scored: 2, pending: 3 }, ...over,
}) as any;

export const results = () => ({
  status: 'CLOSED', panel: [judge(11, 'Asha Rao'), judge(12, 'Ben Roy')],
  rows: [
    { entry_id: 1, team_id: 1, team_name: 'Alpha', status: 'PENDING', rank: 1, score: 90, review_count: 2, per_judge: { '11': 100, '12': 80 }, highest: 100, lowest: 80, spread: 10 },
    { entry_id: 3, team_id: 3, team_name: 'Gamma', status: 'PENDING', rank: null, score: null, review_count: 0, per_judge: {}, highest: null, lowest: null, spread: null },
  ],
}) as any;

export const staff = (id: number, name: string) => ({ id, role: 'JUDGE', user_id: id, email: `j${id}@x.io`, name, permissions: ['judge'] });
