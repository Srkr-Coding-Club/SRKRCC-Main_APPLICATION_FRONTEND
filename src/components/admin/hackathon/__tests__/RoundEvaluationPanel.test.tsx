import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { evaluation, progress, results, round, settings, staff } from './roundJudgingFixtures';

const api = {
  roundEvaluation: vi.fn(), configureRoundEvaluation: vi.fn(), setRoundCriteria: vi.fn(), setRoundPanel: vi.fn(), assignRoundJudges: vi.fn(),
  roundEvaluationAction: vi.fn(), roundProgress: vi.fn(), roundResults: vi.fn(), staff: vi.fn(), judgeInvites: vi.fn(),
};
const toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };
vi.mock('@/lib/api/hackathons', () => ({
  hackathonApi: { admin: new Proxy({}, { get: (_t, name: string) => (...args: unknown[]) => (api as any)[name](...args) }) },
  apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.message || fallback,
}));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/components/ui/FormSelect', () => ({
  FormSelect: ({ value, options, onChange, disabled, 'aria-labelledby': labelledBy }: any) => (
    <select aria-labelledby={labelledBy} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  ),
}));

import { RoundEvaluationPanel } from '../RoundEvaluationPanel';

const features = { round_judging: true, judging: true } as any;
const show = (over: Record<string, unknown> = {}, roundOver: Record<string, unknown> = {}) => {
  const onChanged = vi.fn();
  render(<RoundEvaluationPanel slug="demo" round={round(roundOver)} features={{ ...features, ...over }} onChanged={onChanged} />);
  return onChanged;
};

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  Object.values(toast).forEach((fn) => fn.mockReset());
  api.roundEvaluation.mockResolvedValue(evaluation());
  api.staff.mockResolvedValue([staff(11, 'Asha Rao'), staff(12, 'Ben Roy'), staff(13, 'Cara Das')]);
  api.roundProgress.mockResolvedValue(progress());
  api.roundResults.mockResolvedValue(results());
  api.judgeInvites.mockResolvedValue([]);
});
afterEach(() => cleanup());

describe('RoundEvaluationPanel: before it starts', () => {
  it('shows nothing when the hackathon has not switched round judging on', () => {
    show({ round_judging: false });
    expect(screen.queryByLabelText('Judging this round')).toBeNull();
    expect(api.roundEvaluation).not.toHaveBeenCalled();
  });

  it('offers a switch for a plain round and turns judging on', async () => {
    api.roundEvaluation.mockResolvedValue(evaluation({ settings: settings({ evaluation_mode: 'NONE' }) }));
    api.configureRoundEvaluation.mockResolvedValue(evaluation());
    const onChanged = show();
    const toggle = await screen.findByRole('switch', { name: /Judge this round with a panel/ });
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(toggle);
    await waitFor(() => expect(api.configureRoundEvaluation).toHaveBeenCalledWith('demo', 5, { evaluation_mode: 'JUDGED' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('lists the start checklist and lets the organizer start once it is all ticked', async () => {
    api.roundEvaluationAction.mockResolvedValue({ evaluation: evaluation({ status: 'IN_PROGRESS' }) });
    const onChanged = show();
    const checklist = await screen.findByRole('list', { name: 'Checklist' });
    expect(within(checklist).getAllByLabelText('Done')).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: /Start judging/ }));
    fireEvent.click((await screen.findAllByRole('button', { name: 'Start judging' })).at(-1)!);
    await waitFor(() => expect(api.roundEvaluationAction).toHaveBeenCalledWith('demo', 5, 'start', {}));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith('Judging started', 'The judges were told.');
  });

  it('keeps Start switched off and says what is missing', async () => {
    api.roundEvaluation.mockResolvedValue(evaluation({
      can_start: false, readiness: evaluation().readiness.map((c: any) => (c.key === 'judges' ? { ...c, ok: false, detail: '0 judge(s)' } : c)),
    }));
    show();
    const checklist = await screen.findByRole('list', { name: 'Checklist' });
    expect(within(checklist).getAllByLabelText('Not done')).toHaveLength(1);
    expect((screen.getByRole('button', { name: /Start judging/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('RoundEvaluationPanel: while judges score', () => {
  beforeEach(() => api.roundEvaluation.mockResolvedValue(evaluation({ status: 'IN_PROGRESS', started_at: '2026-11-05T09:00:00Z' })));

  it('shows the judge-by-team grid and the totals', async () => {
    show();
    expect(await screen.findByText('2 of 5 scores in (40%)')).toBeTruthy();
    const grid = screen.getByRole('table', { name: 'Who has scored which team' });
    expect(within(grid).getByRole('rowheader', { name: 'Gamma' })).toBeTruthy();
    expect(within(grid).getByText(/needs 1 more/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Start judging/ })).toBeNull();
  });

  it('closes the round after a confirmation', async () => {
    api.roundEvaluationAction.mockResolvedValue({ ranked: 3, unranked: 0, evaluation: evaluation({ status: 'CLOSED' }) });
    show();
    fireEvent.click(await screen.findByRole('button', { name: /Close judging/ }));
    fireEvent.click((await screen.findAllByRole('button', { name: 'Close judging' })).at(-1)!);
    await waitFor(() => expect(api.roundEvaluationAction).toHaveBeenCalledWith('demo', 5, 'close', {}));
    expect(toast.success).toHaveBeenCalledWith('Judging closed', '3 team(s) ranked.');
  });

  it('asks for a reason before closing with teams under-reviewed, then forces it', async () => {
    api.roundEvaluationAction
      .mockRejectedValueOnce(Object.assign(new Error('1 team(s) have fewer than 1 review(s): Gamma.'), { body: { code: 'UNDER_REVIEWED' } }))
      .mockResolvedValueOnce({ ranked: 2, unranked: 1, evaluation: evaluation({ status: 'CLOSED' }) });
    show();
    fireEvent.click(await screen.findByRole('button', { name: /Close judging/ }));
    fireEvent.click((await screen.findAllByRole('button', { name: 'Close judging' })).at(-1)!);
    expect((await screen.findByRole('alert')).textContent).toContain('Gamma');
    const anyway = screen.getByRole('button', { name: 'Close anyway' }) as HTMLButtonElement;
    expect(anyway.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Close anyway: why?'), { target: { value: 'A judge was unwell' } });
    fireEvent.click(anyway);
    await waitFor(() => expect(api.roundEvaluationAction).toHaveBeenLastCalledWith('demo', 5, 'close', { force: true, reason: 'A judge was unwell' }));
  });

  it('shows the deadline only as something that can still move', async () => {
    show();
    fireEvent.click(await screen.findByRole('button', { name: /Round settings, criteria and judges/ }));
    const form = await screen.findByRole('form', { name: 'How this round is judged' });
    expect(within(form).getByText('Judges are already scoring, so only the deadline can change.')).toBeTruthy();
    expect((within(form).getByLabelText('Judges per team') as HTMLInputElement).disabled).toBe(true);
    expect((within(form).getByLabelText('Scoring deadline (optional)') as HTMLInputElement).disabled).toBe(false);
  });
});

describe('RoundEvaluationPanel: once closed', () => {
  beforeEach(() => api.roundEvaluation.mockResolvedValue(evaluation({ status: 'CLOSED', closed_at: '2026-11-05T12:00:00Z' })));

  it('shows the ranking with each judge and a reopen with a reason', async () => {
    api.roundEvaluationAction.mockResolvedValue({ evaluation: evaluation({ status: 'IN_PROGRESS' }) });
    show();
    const table = await screen.findByRole('table', { name: 'Round results' });
    expect(within(table).getByRole('rowheader', { name: 'Alpha' })).toBeTruthy();
    expect(within(table).getByText('90.0')).toBeTruthy();
    const reopen = screen.getByRole('button', { name: 'Reopen' }) as HTMLButtonElement;
    expect(reopen.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Reopen judging: why?'), { target: { value: 'Mistake found' } });
    fireEvent.click(reopen);
    await waitFor(() => expect(api.roundEvaluationAction).toHaveBeenCalledWith('demo', 5, 'reopen', { reason: 'Mistake found' }));
  });

  it('cannot be reopened once the results are published', async () => {
    api.roundEvaluation.mockResolvedValue(evaluation({ status: 'CLOSED', results_published: true }));
    show();
    expect(await screen.findByText(/cannot be reopened/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Reopen' })).toBeNull();
  });
});

describe('RoundEvaluationPanel: setting it up', () => {
  it('saves how the round works, with the rules the server checks', async () => {
    api.configureRoundEvaluation.mockResolvedValue(evaluation({ settings: settings({ judges_per_team: 2, blind: true }) }));
    show();
    const form = await screen.findByRole('form', { name: 'How this round is judged' });
    fireEvent.change(within(form).getByLabelText('Judges per team'), { target: { value: '2' } });
    fireEvent.click(within(form).getByRole('switch', { name: /Blind judging/ }));
    fireEvent.click(within(form).getByRole('button', { name: 'Save settings' }));
    await waitFor(() => expect(api.configureRoundEvaluation).toHaveBeenCalledWith('demo', 5, expect.objectContaining({
      scoring_target: 'PROJECT', assignment_mode: 'BALANCED', judges_per_team: 2, min_reviews_per_team: 1, blind: true, tie_break: 'CRITERIA', scoring_deadline: null,
    })));
  });

  it('shows the reason next to the field when the server refuses', async () => {
    api.configureRoundEvaluation.mockRejectedValue(Object.assign(new Error('x'), { body: { field: 'min_reviews_per_team', detail: 'The minimum reviews cannot be more than the judges per team.' } }));
    show();
    const form = await screen.findByRole('form', { name: 'How this round is judged' });
    fireEvent.click(within(form).getByRole('button', { name: 'Save settings' }));
    expect(await within(form).findByText('The minimum reviews cannot be more than the judges per team.')).toBeTruthy();
  });

  it('puts the ticked judges on the panel', async () => {
    api.setRoundPanel.mockResolvedValue(evaluation());
    show();
    const section = await screen.findByRole('region', { name: 'Judges for this round' });
    await waitFor(() => expect(within(section).getAllByRole('checkbox')).toHaveLength(3));
    fireEvent.click(within(section).getByRole('checkbox', { name: /Cara Das/ }));
    fireEvent.click(within(section).getByRole('checkbox', { name: /Ben Roy/ }));
    fireEvent.click(within(section).getByRole('button', { name: 'Save judges (2)' }));
    await waitFor(() => expect(api.setRoundPanel).toHaveBeenCalledWith('demo', 5, expect.arrayContaining([11, 13])));
    expect(api.setRoundPanel.mock.calls[0][2]).toHaveLength(2);
  });

  it('writes the round\'s own criteria and can go back to the hackathon rubric', async () => {
    api.setRoundCriteria.mockResolvedValue(evaluation({ criteria_source: 'round' }));
    show();
    const section = await screen.findByRole('region', { name: 'Judging criteria' });
    expect(within(section).getByText(/uses the hackathon rubric: Idea, Demo/)).toBeTruthy();
    fireEvent.click(within(section).getByRole('button', { name: /Write this round's own criteria/ }));
    fireEvent.click(within(section).getByRole('button', { name: 'Save criteria' }));
    await waitFor(() => expect(api.setRoundCriteria).toHaveBeenCalledWith('demo', 5, [
      expect.objectContaining({ name: 'Idea', max_score: 10, weight: 3 }), expect.objectContaining({ name: 'Demo', max_score: 10, weight: 1 }),
    ]));
    api.setRoundCriteria.mockClear();
    fireEvent.click(await within(section).findByRole('button', { name: 'Use the hackathon rubric instead' }));
    await waitFor(() => expect(api.setRoundCriteria).toHaveBeenCalledWith('demo', 5, []));
  });

  it('lets the organizer tick who scores which team in manual mode', async () => {
    api.roundEvaluation.mockResolvedValue(evaluation({ settings: settings({ assignment_mode: 'MANUAL' }) }));
    api.roundProgress.mockResolvedValue(progress({ status: 'NOT_STARTED', teams: [{ entry_id: 1, team_id: 1, team_name: 'Alpha', label: 'Alpha', review_count: 0, needs: 1, cells: [] }] }));
    api.assignRoundJudges.mockResolvedValue({ result: { assignments: 1, teams: 1, short: [], skipped: [] }, progress: progress() });
    show();
    const section = await screen.findByRole('region', { name: 'Who scores which team' });
    fireEvent.click(within(section).getByRole('checkbox', { name: 'Asha Rao scores Alpha' }));
    fireEvent.click(within(section).getByRole('button', { name: 'Save assignments' }));
    await waitFor(() => expect(api.assignRoundJudges).toHaveBeenCalledWith('demo', 5, [{ entry_id: 1, judge_ids: [11] }]), { timeout: 4000 });
  });
});
