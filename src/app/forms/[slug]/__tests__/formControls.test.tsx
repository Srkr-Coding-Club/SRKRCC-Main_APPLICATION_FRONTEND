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

let form: any;
let availability: Record<string, Record<string, number>> = {};

const baseForm = (fields: any[]) => ({
  id: 55, title: 'Controls', slug: 'demo', description: 'x', status: 'PUBLISHED', version: 1,
  allow_multiple_responses: false, allow_response_editing: true, enable_prefill: false, fields,
});

const respond = (url: string, options: any = {}) => {
  if (url === '/forms/demo/') return Promise.resolve(form);
  if (url.startsWith('/forms/demo/my-response/')) return Promise.resolve({ has_submitted: false, can_edit: true, response: null });
  if (url === '/forms/demo/draft/') return Promise.resolve(options.method === 'PUT' ? { saved_at: 'now', dropped: [] } : { draft: null });
  if (url === '/forms/demo/availability/') return Promise.resolve(availability);
  if (url === '/forms/submissions/') return Promise.resolve({ id: 1, answers: [] });
  return Promise.reject(new Error(`unexpected request ${url}`));
};

const input = (id: number) => document.getElementById(`field-${id}`) as HTMLInputElement | null;
const submissions = () => fetchApi.mock.calls.filter(([url]) => url === '/forms/submissions/');
const submittedAnswers = () => JSON.parse(submissions()[0][1].body).answers;

beforeEach(() => {
  fetchApi.mockReset();
  fetchApi.mockImplementation(respond);
  availability = {};
  window.history.pushState({}, '', '/forms/demo');
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

// The form is on screen and the first look at the person's saved draft has been made, which is when
// defaults and hidden values are put in place.
const open = async (fields: any[], title = 'Controls') => {
  form = baseForm(fields);
  render(<FormDetailSubmissionPage />);
  await screen.findByText(title);
  await waitFor(() => expect(fetchApi).toHaveBeenCalledWith('/forms/demo/draft/', expect.anything()));
};

describe('defaults', () => {
  it('pre-fills a question and still lets the person change it', async () => {
    await open([
      { id: 1, label: 'City', type: 'TEXT', is_required: true, order: 1, validation_rules: { defaultValue: 'Hyderabad' } },
    ]);
    await waitFor(() => expect(input(1)!.value).toBe('Hyderabad'));
    fireEvent.change(input(1)!, { target: { value: 'Pune' } });
    expect(input(1)!.value).toBe('Pune');
  });
});

describe('hidden questions', () => {
  it('take their value from the link, are never shown, and are submitted', async () => {
    window.history.pushState({}, '', '/forms/demo?ref=poster-7');
    await open([
      { id: 1, label: 'Name', type: 'TEXT', is_required: true, order: 1 },
      { id: 2, label: 'Where did you hear', type: 'HIDDEN', is_required: false, order: 2, validation_rules: { queryParam: 'ref' } },
    ]);
    expect(screen.queryByText('Where did you hear')).toBeNull();
    expect(input(2)).toBeNull();
    fireEvent.change(input(1)!, { target: { value: 'Dee' } });
    fireEvent.click(screen.getByText('Submit Form'));
    await waitFor(() => expect(submissions()).toHaveLength(1));
    expect(submittedAnswers()).toEqual([{ field: 1, value: 'Dee' }, { field: 2, value: 'poster-7' }]);
  });

  it('fall back to their default when the link has no parameter', async () => {
    await open([
      { id: 1, label: 'Name', type: 'TEXT', is_required: true, order: 1 },
      { id: 2, label: 'Source', type: 'HIDDEN', order: 2, validation_rules: { queryParam: 'ref', defaultValue: 'website' } },
    ]);
    fireEvent.change(input(1)!, { target: { value: 'Dee' } });
    fireEvent.click(screen.getByText('Submit Form'));
    await waitFor(() => expect(submissions()).toHaveLength(1));
    expect(submittedAnswers()).toContainEqual({ field: 2, value: 'website' });
  });
});

describe('calculated questions', () => {
  const fields = [
    { id: 1, label: 'Price', type: 'NUMBER', is_required: true, order: 1 },
    { id: 2, label: 'Quantity', type: 'NUMBER', is_required: true, order: 2 },
    { id: 3, label: 'Total', type: 'CALCULATED', is_required: false, order: 3, validation_rules: { formula: '{1} * {2}', decimals: 2 } },
  ];

  it('shows the result as the answers change and sends it with the submission', async () => {
    await open(fields);
    const total = () => screen.getByText('Total').parentElement!.querySelector('p[aria-live]')!.textContent;
    expect(total()).toBe('0'); // nothing answered yet: blank counts as zero
    fireEvent.change(input(1)!, { target: { value: '19.99' } });
    fireEvent.change(input(2)!, { target: { value: '3' } });
    await waitFor(() => expect(total()).toBe('59.97'));
    expect(input(3)).toBeNull(); // read-only: nothing to type into

    fireEvent.click(screen.getByText('Submit Form'));
    await waitFor(() => expect(submissions()).toHaveLength(1));
    expect(submittedAnswers()).toContainEqual({ field: 3, value: 59.97 });
  });
});

describe('answer piping', () => {
  it('shows an earlier answer inside a later label and description', async () => {
    await open([
      { id: 1, label: 'Your name', type: 'TEXT', is_required: true, order: 1 },
      { id: 2, label: 'Hello {{1}}, pick a track', description: 'Thanks, {{1}}.', type: 'TEXT', order: 2 },
    ]);
    expect(screen.getByText('Hello ..., pick a track')).toBeTruthy();
    fireEvent.change(input(1)!, { target: { value: 'Dee' } });
    expect(await screen.findByText('Hello Dee, pick a track')).toBeTruthy();
    expect(screen.getByText('Thanks, Dee.')).toBeTruthy();
  });
});

describe('option limits', () => {
  const fields = [
    { id: 1, label: 'Slot', type: 'RADIO', is_required: true, order: 1, options: ['Morning', 'Noon', 'Evening'], validation_rules: { optionLimits: { Morning: 2, Noon: 5 } } },
  ];

  it('stops offering a full option and says how many places are left on the others', async () => {
    availability = { '1': { Morning: 0, Noon: 2 } };
    await open(fields);
    await screen.findByText(/Places left: Noon \(2 left\)/);
    expect(screen.queryByText('Morning')).toBeNull();
    expect(screen.getByText('Noon')).toBeTruthy();
    expect(screen.getByText('Evening')).toBeTruthy();
  });

  it('asks the server again when it reports an option as full', async () => {
    availability = { '1': { Morning: 1, Noon: 2 } };
    await open(fields);
    await screen.findByText('Morning');
    const lookups = () => fetchApi.mock.calls.filter(([url]) => url === '/forms/demo/availability/').length;
    const before = lookups();

    fetchApi.mockImplementation((url: string, options: any = {}) => {
      if (url === '/forms/submissions/') {
        return Promise.reject(Object.assign(new Error('rejected'), {
          status: 400, body: { detail: 'Validation failed', errors: [{ field_id: 1, code: 'OPTION_FULL', message: "'Morning' is full." }] },
        }));
      }
      return respond(url, options);
    });
    availability = { '1': { Morning: 0, Noon: 2 } };
    fireEvent.click(screen.getByText('Morning'));
    fireEvent.click(screen.getByText('Submit Form'));

    await waitFor(() => expect(lookups()).toBeGreaterThan(before));
    await waitFor(() => expect(screen.queryByText('Morning')).toBeNull());
  });
});

describe('custom messages', () => {
  it('uses the admin\'s own wording for a missing required answer', async () => {
    await open([
      { id: 1, label: 'Name', type: 'TEXT', is_required: true, order: 1, validation_rules: { messages: { required: 'We do need your name.' } } },
    ]);
    fireEvent.click(screen.getByText('Submit Form'));
    expect(await screen.findByText('We do need your name.')).toBeTruthy();
    expect(submissions()).toHaveLength(0);
  });
});
