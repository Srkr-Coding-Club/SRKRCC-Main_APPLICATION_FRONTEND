import React from 'react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const fetchApi = vi.fn();
vi.mock('@/lib/api-client', () => ({ fetchApi: (...args: unknown[]) => fetchApi(...args) }));
vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'demo' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/forms/demo',
}));

const user = { id: 7, email: 'dana@srkr.ac.in', username: 'dana', first_name: 'Dana', role: 'NON_AFFILIATE' };
vi.mock('@/lib/auth', () => ({ getStoredUser: () => user, fetchAndSyncCurrentUser: () => Promise.resolve(user) }));

import FormDetailSubmissionPage from '../page';

// One of every question a respondent can be asked to answer.
const everyQuestion = [
  { id: 1, label: 'Full name', type: 'TEXT', is_required: true, order: 1, description: 'As on your ID card' },
  { id: 2, label: 'Email', type: 'EMAIL', is_required: true, order: 2 },
  { id: 3, label: 'Phone', type: 'PHONE', order: 3 },
  { id: 4, label: 'Website', type: 'URL', order: 4 },
  { id: 5, label: 'Why join', type: 'PARAGRAPH', order: 5 },
  { id: 6, label: 'Track', type: 'DROPDOWN', is_required: true, order: 6, options: ['AI', 'Web'] },
  { id: 7, label: 'Level', type: 'RADIO', is_required: true, order: 7, options: ['Beginner', 'Expert'] },
  { id: 8, label: 'Interests', type: 'CHECKBOX', order: 8, options: ['Robotics', 'Design'] },
  { id: 9, label: 'Age', type: 'NUMBER', order: 9 },
  { id: 10, label: 'Birthday', type: 'DATE', order: 10 },
  { id: 11, label: 'Arrival', type: 'TIME', order: 11 },
  { id: 12, label: 'Rate us', type: 'RATING', order: 12, max_value: 5 },
  { id: 13, label: 'Confidence', type: 'LINEAR_SCALE', order: 13, min_value: 1, max_value: 5 },
  { id: 14, label: 'Skills grid', type: 'MATRIX_RADIO', order: 14, options: ['Low', 'High'], rows: ['Python', 'Java'] },
  { id: 15, label: 'Days grid', type: 'MATRIX_CHECKBOX', order: 15, options: ['Mon', 'Tue'], rows: ['Morning', 'Evening'] },
  { id: 16, label: 'Resume', type: 'FILE', order: 16 },
  { id: 17, label: 'Signature', type: 'SIGNATURE', order: 17 },
];

const respond = (url: string, options: any = {}) => {
  if (url === '/forms/demo/') return Promise.resolve({ id: 55, title: 'Everything', slug: 'demo', description: 'All the questions', status: 'PUBLISHED', version: 1, allow_multiple_responses: false, allow_response_editing: true, enable_prefill: false, fields: everyQuestion });
  if (url.startsWith('/forms/demo/my-response/')) return Promise.resolve({ has_submitted: false, can_edit: true, response: null });
  if (url === '/forms/demo/draft/') return Promise.resolve(options.method === 'PUT' ? { saved_at: 'now', dropped: [] } : { draft: null });
  if (url === '/forms/demo/availability/') return Promise.resolve({});
  return Promise.reject(new Error(`unexpected request ${url}`));
};

beforeEach(() => {
  fetchApi.mockReset();
  fetchApi.mockImplementation(respond);
  Element.prototype.scrollIntoView = vi.fn();
  // The signature pad draws on a canvas, which jsdom does not have.
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), scale: vi.fn(), fillRect: vi.fn(), getImageData: vi.fn() })) as any;
  window.history.pushState({}, '', '/forms/demo');
});
afterEach(cleanup);

// jsdom has no layout or colours, so the rules that need them are left to a real browser.
const NEEDS_A_BROWSER = ['color-contrast', 'scrollable-region-focusable', 'region'];

async function violations() {
  const result = await axe.run(document.body, { rules: Object.fromEntries(NEEDS_A_BROWSER.map((id) => [id, { enabled: false }])) });
  return result.violations.map((v) => `${v.id}: ${v.help} -> ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
}

const open = async () => {
  render(<FormDetailSubmissionPage />);
  await screen.findByText('Everything');
  await waitFor(() => expect(fetchApi).toHaveBeenCalledWith('/forms/demo/draft/', expect.anything()));
};

describe('the public form, checked with axe', () => {
  it('has no accessibility violations with every kind of question on screen', async () => {
    await open();
    expect(await violations()).toEqual([]);
  });

  it('has none after a failed submit, with every error showing', async () => {
    await open();
    fireEvent.click(screen.getByText('Submit Form'));
    await waitFor(() => expect(document.querySelectorAll('[aria-invalid="true"]').length).toBeGreaterThan(0));
    expect(await violations()).toEqual([]);
  });
});

describe('errors reach people who cannot see colour', () => {
  it('ties each error message to its question and announces it', async () => {
    await open();
    fireEvent.click(screen.getByText('Submit Form'));
    await waitFor(() => expect(document.querySelectorAll('[aria-invalid="true"]').length).toBeGreaterThan(0));
    const name = document.getElementById('field-1')!;
    expect(name.getAttribute('aria-invalid')).toBe('true');
    const message = document.getElementById(name.getAttribute('aria-describedby')!.split(' ').pop()!);
    expect(message?.textContent).toBeTruthy();
    expect(message?.getAttribute('role')).toBe('alert');
  });

  it('moves keyboard focus to the first question that needs fixing', async () => {
    await open();
    fireEvent.click(screen.getByText('Submit Form'));
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('field-1')));
  });
});
