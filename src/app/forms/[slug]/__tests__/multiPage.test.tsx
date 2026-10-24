import React from 'react';
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
vi.mock('@/lib/auth', () => ({
  getStoredUser: () => user,
  fetchAndSyncCurrentUser: () => Promise.resolve(user),
}));

import FormDetailSubmissionPage from '../page';

const route = (action: string, expected: string) => ({
  logic: 'AND', action, rules: [{ field: 1, operator: 'equals', value: expected }],
});

const form = {
  id: 55, title: 'Paged form', slug: 'demo', description: 'Three pages', status: 'PUBLISHED', version: 1,
  allow_multiple_responses: false, allow_response_editing: true, enable_prefill: false,
  fields: [
    { id: 1, label: 'Nickname', type: 'TEXT', is_required: true, order: 1 },
    { id: 2, label: 'About you', description: 'Two quick questions', type: 'PAGE_BREAK', is_required: false, order: 2, conditional_logic: route('end_form', 'stop') },
    { id: 3, label: 'Hobby', type: 'TEXT', is_required: true, order: 3 },
    { id: 4, label: 'Last words', type: 'PAGE_BREAK', is_required: false, order: 4 },
    { id: 5, label: 'Notes', type: 'TEXT', is_required: false, order: 5 },
  ],
};

const respond = (url: string, options: any = {}) => {
  if (url === '/forms/demo/') return Promise.resolve(form);
  if (url.startsWith('/forms/demo/my-response/')) return Promise.resolve({ has_submitted: false, can_edit: true, response: null });
  if (url === '/forms/demo/draft/') return Promise.resolve(options.method === 'PUT' ? { saved_at: 'now', dropped: [] } : { draft: null });
  if (url === '/forms/submissions/') return Promise.resolve({ id: 1, answers: [] });
  return Promise.reject(new Error(`unexpected request ${url}`));
};

const field = (name: string) => document.getElementById(`field-${name}`) as HTMLInputElement | null;
const submissions = () => fetchApi.mock.calls.filter(([url]) => url === '/forms/submissions/');

beforeEach(() => {
  fetchApi.mockReset();
  fetchApi.mockImplementation(respond);
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

const openForm = async () => {
  render(<FormDetailSubmissionPage />);
  await screen.findByText('Page 1 of 3');
};

describe('multi-page form', () => {
  it('shows only the first page, with progress', async () => {
    await openForm();
    expect(field('1')).toBeTruthy();
    expect(field('3')).toBeNull();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('1');
    expect(screen.getByText('Next')).toBeTruthy();
    expect(screen.queryByText('Submit Form')).toBeNull();
    expect(screen.queryByText('Back')).toBeNull();
  });

  it('will not leave a page with a required question unanswered', async () => {
    await openForm();
    fireEvent.click(screen.getByText('Next'));
    expect(await screen.findByText(/Nickname' is required|is required/)).toBeTruthy();
    expect(screen.getByText('Page 1 of 3')).toBeTruthy();
    expect(field('3')).toBeNull();
    expect(submissions()).toHaveLength(0);
  });

  it('moves forward and back, keeping what was typed, and shows each page title', async () => {
    await openForm();
    fireEvent.change(field('1')!, { target: { value: 'Dee' } });
    fireEvent.click(screen.getByText('Next'));

    await screen.findByText('Page 2 of 3');
    expect(screen.getByText('About you')).toBeTruthy();
    expect(screen.getByText('Two quick questions')).toBeTruthy();
    expect(field('3')).toBeTruthy();
    expect(field('1')).toBeNull();

    fireEvent.click(screen.getByText('Back'));
    await screen.findByText('Page 1 of 3');
    expect(field('1')!.value).toBe('Dee');
  });

  it('submits only from the last page, with the answers from every page', async () => {
    await openForm();
    fireEvent.change(field('1')!, { target: { value: 'Dee' } });
    fireEvent.click(screen.getByText('Next'));
    await screen.findByText('Page 2 of 3');
    fireEvent.change(field('3')!, { target: { value: 'chess' } });
    fireEvent.click(screen.getByText('Next'));
    await screen.findByText('Page 3 of 3');
    fireEvent.change(field('5')!, { target: { value: 'hello' } });

    expect(submissions()).toHaveLength(0);
    fireEvent.click(screen.getByText('Submit Form'));
    await waitFor(() => expect(submissions()).toHaveLength(1));
    const body = JSON.parse(submissions()[0][1].body);
    expect(body.answers).toEqual([
      { field: 1, value: 'Dee' }, { field: 3, value: 'chess' }, { field: 5, value: 'hello' },
    ]);
  });

  it('turns the button into Submit as soon as an answer routes the form to its end', async () => {
    await openForm();
    fireEvent.change(field('1')!, { target: { value: 'stop' } });
    await screen.findByText('Page 1 of 1');
    expect(screen.getByText('Submit Form')).toBeTruthy();
    expect(screen.queryByText('Next')).toBeNull();

    fireEvent.click(screen.getByText('Submit Form'));
    await waitFor(() => expect(submissions()).toHaveLength(1));
    expect(JSON.parse(submissions()[0][1].body).answers).toEqual([{ field: 1, value: 'stop' }]);
  });

  it('puts the pages back when the answer that ended the form changes', async () => {
    await openForm();
    fireEvent.change(field('1')!, { target: { value: 'stop' } });
    await screen.findByText('Page 1 of 1');
    fireEvent.change(field('1')!, { target: { value: 'carry on' } });
    await screen.findByText('Page 1 of 3');
    expect(screen.getByText('Next')).toBeTruthy();
  });

  it('restores a saved draft: the answers and the page', async () => {
    fetchApi.mockImplementation((url: string, options: any = {}) =>
      url === '/forms/demo/draft/' && options.method !== 'PUT'
        ? Promise.resolve({ draft: { answers: { '1': 'Dee', '3': 'chess' }, current_page: 1, form_changed: false } })
        : respond(url, options));
    render(<FormDetailSubmissionPage />);
    await screen.findByText('Page 2 of 3');
    expect(field('3')!.value).toBe('chess');
    fireEvent.click(screen.getByText('Back'));
    await screen.findByText('Page 1 of 3');
    expect(field('1')!.value).toBe('Dee');
  });
});
