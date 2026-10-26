import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = { mySubmission: vi.fn(), saveSubmission: vi.fn() };
vi.mock('@/lib/api/hackathons', () => ({
  hackathonApi: new Proxy({}, { get: (_t, name: string) => (...args: unknown[]) => (api as any)[name](...args) }),
  apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.message || fallback,
}));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast: { success: vi.fn(), error: vi.fn() } }) }));

import { SubmissionPanel } from '../SubmissionPanel';

const hackathon = { slug: 'demo', features: {} } as any;
const payload = (over: Record<string, unknown> = {}) => ({ state: 'OPEN', opens_at: null, deadline: null, submission: null, gate: { required: false, satisfied: true, reason: '' }, can_edit: true, ...over });
const saved = () => ({ id: 1, team_id: 1, team_name: 'T', project_title: 'Bins', tagline: '', description: 'Sensors', repo_url: 'https://github.com/x/y', demo_url: null, video_url: null, slides_url: null, tech_stack: [], is_public: true, created_at: '', updated_at: '' });

beforeEach(() => { api.mySubmission.mockReset().mockResolvedValue(payload()); api.saveSubmission.mockReset(); });
afterEach(() => cleanup());

describe('SubmissionPanel: saving', () => {
  it('keeps what was typed when the save is refused and says why next to the button', async () => {
    api.saveSubmission.mockRejectedValue(Object.assign(new Error('Add a valid repository link.'), { body: { field: 'repo_url' } }));
    render(<SubmissionPanel hackathon={hackathon} />);
    fireEvent.change(await screen.findByLabelText(/Project title/), { target: { value: 'Bins' } });
    fireEvent.change(screen.getByLabelText(/What did you build/), { target: { value: 'Sensors' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit project' }));
    await waitFor(() => expect(screen.getByText('Add a valid repository link.')).toBeTruthy());
    expect(screen.getByText(/Not saved yet/)).toBeTruthy();
    expect((screen.getByLabelText(/Project title/) as HTMLInputElement).value).toBe('Bins');
    expect((screen.getByLabelText(/What did you build/) as HTMLTextAreaElement).value).toBe('Sensors');
  });

  it('shows an error for the one-line pitch, which had no place to show it', async () => {
    api.saveSubmission.mockRejectedValue(Object.assign(new Error('The pitch is too long.'), { body: { field: 'tagline' } }));
    render(<SubmissionPanel hackathon={hackathon} />);
    await screen.findByLabelText(/Project title/);
    fireEvent.click(screen.getByRole('button', { name: 'Submit project' }));
    expect(await screen.findByText('The pitch is too long.')).toBeTruthy();
  });

  it('confirms a save on the page', async () => {
    api.saveSubmission.mockResolvedValue(payload({ submission: saved() }));
    render(<SubmissionPanel hackathon={hackathon} />);
    await screen.findByLabelText(/Project title/);
    fireEvent.click(screen.getByRole('button', { name: 'Submit project' }));
    expect(await screen.findByText(/Project saved at/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy();
  });

  it('checks the links before sending, keeps what was typed and focuses the bad field', async () => {
    render(<SubmissionPanel hackathon={hackathon} />);
    const repo = await screen.findByLabelText(/Code repository/);
    fireEvent.change(repo, { target: { value: 'https://example.com/a/b' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit project' }));
    expect(await screen.findByText(/code host/)).toBeTruthy();
    expect(api.saveSubmission).not.toHaveBeenCalled();
    expect((repo as HTMLInputElement).value).toBe('https://example.com/a/b');
  });
});
