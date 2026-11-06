import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = { myRounds: vi.fn(), scoreRoundTeam: vi.fn(), recuseRoundTeam: vi.fn(), ideaFileLink: vi.fn() };
const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('@/lib/api/hackathons', () => ({
  hackathonApi: {
    judging: { myRounds: (...a: unknown[]) => api.myRounds(...a), scoreRoundTeam: (...a: unknown[]) => api.scoreRoundTeam(...a), recuseRoundTeam: (...a: unknown[]) => api.recuseRoundTeam(...a) },
    ideaFileLink: (...a: unknown[]) => api.ideaFileLink(...a),
  },
  apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.message || fallback,
}));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a> }));

import { JudgeRoundsPanel } from '../judging/JudgeRoundsPanel';
import { JudgeRoundTeams } from '../judging/JudgeRoundTeams';
import { JudgeTeamScoring } from '../judging/JudgeTeamScoring';

const summary = (over: Record<string, unknown> = {}) => ({
  round_id: 5, name: 'Semi-final', description: 'Pick the finalists', status: 'IN_PROGRESS', deadline: null, scoring_target: 'PROJECT', blind: false,
  assigned: 4, scored: 1, pending: 3, recused: 0, can_score: true, ...over,
});
const criteria = [
  { id: 1, name: 'Idea', description: 'Is it new?', max_score: 10, weight: 3, order: 0 },
  { id: 2, name: 'Demo', description: '', max_score: 10, weight: 1, order: 1 },
];
const detail = (over: Record<string, unknown> = {}) => ({
  ...summary(), criteria, teams: [
    { entry_id: 11, label: 'Alpha', state: 'scored', my_total: 82.5, scored_at: '2026-11-05T10:00:00Z' },
    { entry_id: 12, label: 'Beta', state: 'pending', my_total: null, scored_at: null },
    { entry_id: 13, label: 'Gamma', state: 'recused', my_total: null, scored_at: null },
  ], ...over,
}) as any;
const team = (over: Record<string, unknown> = {}) => ({
  entry_id: 12, label: 'Beta', scoring_target: 'PROJECT', blind: false, recused: false, recused_reason: '', criteria, my_review: null, can_score: true,
  material: {
    problem: { title: 'Smart bins', description: 'Bins that report fill levels', domain: 'IoT' },
    idea: { id: 9, title: 'Bin Buddy', problem: 'Overflowing bins', solution: 'Sensors', plan: 'Week 1', tech_stack: ['IoT'], deck_url: null, has_deck_file: true, linkedin_url: null },
    project: { id: 4, title: 'Bin Buddy v1', tagline: 'Smarter bins', description: 'We built it', repo_url: 'https://github.com/x/y', demo_url: null, video_url: null, slides_url: null, tech_stack: ['React'] },
  }, ...over,
}) as any;

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  Object.values(toast).forEach((fn) => fn.mockReset());
  try { window.localStorage.clear(); } catch { /* none */ }
});
afterEach(() => cleanup());

describe('JudgeRoundsPanel', () => {
  it('lists the rounds with the judge\'s own progress and a link to each', async () => {
    api.myRounds.mockResolvedValue({ enabled: true, rounds: [summary(), summary({ round_id: 6, name: 'Final', status: 'NOT_STARTED', assigned: 0, scored: 0, pending: 0 })] });
    const onLoaded = vi.fn();
    render(<JudgeRoundsPanel slug="demo" onLoaded={onLoaded} />);
    const link = await screen.findByRole('link', { name: 'Semi-final: 1 of 4 scored' });
    expect(link.getAttribute('href')).toBe('/hackathons/demo/judging/rounds/5');
    expect(screen.getByText('Open for scoring')).toBeTruthy();
    expect(screen.getByText('You will be told when scoring opens.')).toBeTruthy();
    expect(onLoaded).toHaveBeenCalledWith(2);
  });

  it('shows nothing when judging by rounds is off or the judge has no rounds', async () => {
    api.myRounds.mockResolvedValue({ enabled: false, rounds: [summary()] });
    const onLoaded = vi.fn();
    const { container } = render(<JudgeRoundsPanel slug="demo" onLoaded={onLoaded} />);
    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith(0));
    expect(container.textContent).toBe('');
  });
});

describe('JudgeRoundTeams', () => {
  it('shows only the given teams with where the judge stands on each', () => {
    render(<JudgeRoundTeams slug="demo" round={detail()} />);
    const list = screen.getByRole('list', { name: 'Your teams' });
    const items = within(list).getAllByRole('link');
    expect(items.map((a) => a.getAttribute('href'))).toEqual([
      '/hackathons/demo/judging/rounds/5/teams/11', '/hackathons/demo/judging/rounds/5/teams/12', '/hackathons/demo/judging/rounds/5/teams/13',
    ]);
    expect(within(list).getByText(/you gave 82.5/)).toBeTruthy();
    expect(within(list).getByText('You stepped aside')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Your progress' }).getAttribute('aria-valuenow')).toBe('25');
    expect(screen.getByText(/Idea/)).toBeTruthy();
  });

  it('says scoring has not opened and shows no teams before the start', () => {
    render(<JudgeRoundTeams slug="demo" round={detail({ status: 'NOT_STARTED', teams: [] })} />);
    expect(screen.getByText(/Scoring has not opened yet/)).toBeTruthy();
    expect(screen.queryByRole('list', { name: 'Your teams' })).toBeNull();
  });

  it('tells a blind judge names are hidden', () => {
    render(<JudgeRoundTeams slug="demo" round={detail({ blind: true })} />);
    expect(screen.getByText(/Blind: team names are hidden/)).toBeTruthy();
  });
});

describe('JudgeTeamScoring: reading and scoring', () => {
  const show = (over: Record<string, unknown> = {}, props: Record<string, unknown> = {}) => {
    const onChanged = vi.fn();
    render(<JudgeTeamScoring slug="demo" roundId={5} team={team(over)} nextEntryId={13} onChanged={onChanged} {...props} />);
    return onChanged;
  };

  it('shows the problem, the idea and the project to read', () => {
    show();
    expect(screen.getByText('Smart bins')).toBeTruthy();
    expect(screen.getByText('Bin Buddy')).toBeTruthy();
    expect(screen.getByText('Bin Buddy v1')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Repository/ }).getAttribute('rel')).toContain('noopener');
    expect(screen.getByRole('button', { name: /Download the slides/ })).toBeTruthy();
  });

  it('says so when a team has not submitted the thing being scored', () => {
    show({ material: { problem: null, idea: null, project: null } });
    expect(screen.getByText('This team has not submitted a project.')).toBeTruthy();
    expect(screen.getByText('This team has not submitted an idea.')).toBeTruthy();
  });

  it('works out the weighted total as the judge types', () => {
    show();
    expect(screen.getByText('Your total: fill in every score')).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/^Idea/), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText(/^Demo/), { target: { value: '6' } });
    expect(screen.getByText('Your total: 75.0 / 100')).toBeTruthy();
  });

  it('saves the scores as numbers, then offers the next team', async () => {
    api.scoreRoundTeam.mockResolvedValue({ scores: {}, comment: '', total: 75 });
    const onChanged = show();
    fireEvent.change(screen.getByLabelText(/^Idea/), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText(/^Demo/), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText(/Comment for the organizers/), { target: { value: 'Solid' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save my scores' }));
    await waitFor(() => expect(api.scoreRoundTeam).toHaveBeenCalledWith('demo', 5, 12, { scores: { '1': 8, '2': 6 }, comment: 'Solid' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith('Scored Beta');
    expect(screen.getByRole('link', { name: 'Next team to score' }).getAttribute('href')).toBe('/hackathons/demo/judging/rounds/5/teams/13');
    expect(screen.getByRole('link', { name: 'Back to my teams' }).getAttribute('href')).toBe('/hackathons/demo/judging/rounds/5');
  });

  it('keeps the Saved message and the next-team links when the page reloads the team after the save', async () => {
    api.scoreRoundTeam.mockResolvedValue({ scores: {}, comment: '', total: 75 });
    const onChanged = vi.fn();
    const { rerender } = render(<JudgeTeamScoring slug="demo" roundId={5} team={team()} nextEntryId={13} onChanged={onChanged} />);
    fireEvent.change(screen.getByLabelText(/^Idea/), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText(/^Demo/), { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save my scores' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    // What the page does next: load the team again, now with the saved review in it.
    rerender(<JudgeTeamScoring slug="demo" roundId={5} nextEntryId={13} onChanged={onChanged} team={team({ my_review: { scores: { '1': 8, '2': 6 }, comment: '', total: 75, submitted_at: '2026-11-05T10:00:00Z' } })} />);
    expect(screen.getByRole('link', { name: 'Next team to score' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('Saved');
    expect((screen.getByLabelText(/^Idea/) as HTMLInputElement).value).toBe('8');
  });

  it('shows the server\'s reason when a score is refused', async () => {
    api.scoreRoundTeam.mockRejectedValue(new Error('The scoring deadline has passed.'));
    show();
    fireEvent.change(screen.getByLabelText(/^Idea/), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText(/^Demo/), { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save my scores' }));
    expect((await screen.findByRole('alert')).textContent).toContain('deadline has passed');
  });

  it('keeps a draft on this device and brings it back, until it is saved', async () => {
    const first = render(<JudgeTeamScoring slug="demo" roundId={5} team={team()} nextEntryId={null} onChanged={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/^Idea/), { target: { value: '7' } });
    first.unmount();
    render(<JudgeTeamScoring slug="demo" roundId={5} team={team()} nextEntryId={null} onChanged={vi.fn()} />);
    expect((screen.getByLabelText(/^Idea/) as HTMLInputElement).value).toBe('7');
    expect(screen.getByText(/A draft is kept on this device/)).toBeTruthy();
    api.scoreRoundTeam.mockResolvedValue({});
    fireEvent.change(screen.getByLabelText(/^Demo/), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save my scores' }));
    await waitFor(() => expect(api.scoreRoundTeam).toHaveBeenCalled());
    expect(window.localStorage.getItem('round-judging-draft:demo:5:12')).toBeNull();
  });

  it('starts from the saved scores and offers to update them', () => {
    show({ my_review: { scores: { '1': 9, '2': 4 }, comment: 'Nice', total: 77.5, submitted_at: '2026-11-05T10:00:00Z' } });
    expect((screen.getByLabelText(/^Idea/) as HTMLInputElement).value).toBe('9');
    expect((screen.getByLabelText(/Comment for the organizers/) as HTMLTextAreaElement).value).toBe('Nice');
    expect(screen.getByRole('button', { name: 'Update my scores' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Step aside' })).toBeNull();
  });
});

describe('JudgeTeamScoring: when scoring is closed or stepped aside', () => {
  it('shows the final scores read-only once the round is closed', () => {
    render(<JudgeTeamScoring slug="demo" roundId={5} nextEntryId={null} onChanged={vi.fn()} team={team({
      can_score: false, my_review: { scores: { '1': 9, '2': 4 }, comment: 'Nice', total: 77.5, submitted_at: '' },
    })} />);
    expect(screen.getByText(/Scoring is closed for this round/)).toBeTruthy();
    expect(screen.getByText('Your total: 77.5 / 100')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Save my scores|Update my scores/ })).toBeNull();
  });

  it('says a judge stepped aside and why', () => {
    render(<JudgeTeamScoring slug="demo" roundId={5} nextEntryId={null} onChanged={vi.fn()} team={team({ recused: true, recused_reason: 'I mentored them', can_score: false })} />);
    expect(screen.getByText(/You stepped aside from this team: I mentored them/)).toBeTruthy();
  });

  it('steps aside only with a reason and tells the judge what happened', async () => {
    api.recuseRoundTeam.mockResolvedValue({ reassigned: true, reassigned_to: 'Ben' });
    const onChanged = vi.fn();
    render(<JudgeTeamScoring slug="demo" roundId={5} nextEntryId={null} onChanged={onChanged} team={team()} />);
    fireEvent.click(screen.getByRole('button', { name: /step aside/i }));
    const submit = screen.getByRole('button', { name: 'Step aside from this team' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Why are you stepping aside?'), { target: { value: 'I mentored them' } });
    await act(async () => { fireEvent.click(submit); });
    await waitFor(() => expect(api.recuseRoundTeam).toHaveBeenCalledWith('demo', 5, 12, 'I mentored them'));
    expect(toast.success).toHaveBeenCalledWith('You stepped aside', 'The team was given to another judge.');
    expect(onChanged).toHaveBeenCalled();
  });

  it('opens the slides through a short-lived link', async () => {
    api.ideaFileLink.mockRejectedValue(new Error('Still being checked for viruses.'));
    render(<JudgeTeamScoring slug="demo" roundId={5} nextEntryId={null} onChanged={vi.fn()} team={team()} />);
    fireEvent.click(screen.getByRole('button', { name: /Download the slides/ }));
    await waitFor(() => expect(api.ideaFileLink).toHaveBeenCalledWith('demo', 9, 'deck'));
    expect((await screen.findByRole('alert')).textContent).toContain('virus');
  });
});
