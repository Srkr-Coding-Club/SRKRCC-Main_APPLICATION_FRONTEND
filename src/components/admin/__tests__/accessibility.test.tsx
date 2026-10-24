import React, { useState } from 'react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const fetchApi = vi.fn();
vi.mock('@/lib/api-client', () => ({ fetchApi: (...args: unknown[]) => fetchApi(...args) }));

import { FormAnalyticsModal } from '../FormAnalyticsModal';
import { FormHistoryModal } from '../FormHistoryModal';
import { ReviewChangesModal } from '../ReviewChangesModal';
import { AfterSubmitSettings } from '../AfterSubmitSettings';
import { SubmissionThanks } from '@/components/forms/SubmissionThanks';

const diff = { form: [], fields: { added: [{ id: null, label: 'Phone', type: 'PHONE' }], removed: [], changed: [], reordered: false }, summary: { settings: 0, added: 1, removed: 0, changed: 0, reordered: false }, is_empty: false };
const review = { current_version: 3, diff, impact: { response_count: 2, new_required: [], now_required: [], removed_with_answers: [], options_removed_with_answers: [], type_changes_blocked: [] } };

beforeEach(() => {
  fetchApi.mockReset();
  fetchApi.mockImplementation((url: string) => {
    if (url.includes('/analytics/')) return Promise.resolve({ form: { id: 1, slug: 'demo', title: 'Demo' }, total_responses: 1, responses_analysed: 1, truncated: false, first_response_at: null, last_response_at: null, days: 7, timeline: [{ date: '2026-10-01', count: 1 }], unfinished: { count: 0, stopped_after: [] }, fields: [{ field_id: 1, label: 'Track', type: 'RADIO', answered: 1, answer_rate: 1, options: [{ option: 'AI', count: 1 }] }] });
    if (url.endsWith('/versions/')) return Promise.resolve([{ version: 1, note: 'Created', created_at: '2026-10-20T09:00:00Z', created_by: null, is_current: true, summary: null }]);
    return Promise.resolve({ version: 1, note: '', created_at: '', diff: null });
  });
});
afterEach(cleanup);

async function violations() {
  const result = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  return result.violations.map((v) => `${v.id}: ${v.help} -> ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
}

// Each dialog, opened from a button the way the builder does it.
const dialogs: [string, (open: boolean, close: () => void) => React.ReactElement, string][] = [
  ['analytics', (open, close) => <FormAnalyticsModal slug="demo" isOpen={open} onClose={close} />, 'Track'],
  ['history', (open, close) => <FormHistoryModal slug="demo" isOpen={open} onClose={close} onRestored={() => {}} />, 'Created'],
  ['review before saving', (open, close) => (open ? <ReviewChangesModal review={review as any} onConfirm={close} onCancel={close} /> : <></>), 'Save and apply'],
];

describe.each(dialogs)('the %s dialog', (_name, make, loaded) => {
  function Host() {
    const [open, setOpen] = useState(false);
    return (<><button onClick={() => setOpen(true)}>Open it</button>{make(open, () => setOpen(false))}</>);
  }

  it('takes focus when opened, closes on Escape and gives focus back', async () => {
    render(<Host />);
    const opener = screen.getByText('Open it');
    opener.focus();
    fireEvent.click(opener);
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  it('keeps Tab inside', async () => {
    render(<Host />);
    fireEvent.click(screen.getByText('Open it'));
    const dialog = await screen.findByRole('dialog');
    await screen.findAllByText(loaded);
    const items = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled])'));
    items[items.length - 1].focus();
    fireEvent.keyDown(items[items.length - 1], { key: 'Tab' });
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0], { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  it('has no accessibility violations', async () => {
    render(<Host />);
    fireEvent.click(screen.getByText('Open it'));
    await screen.findAllByText(loaded);
    expect(await violations()).toEqual([]);
  });
});

describe('the rest of Phase 5', () => {
  it('after-submit settings have no violations', async () => {
    function Harness() {
      const [meta, setMeta] = useState<any>({ redirect_url: 'javascript:x', captcha_enabled: true });
      return <AfterSubmitSettings formMeta={meta} setFormMeta={setMeta} />;
    }
    render(<Harness />);
    expect(await violations()).toEqual([]);
  });

  it('the thank-you page has no violations', async () => {
    render(<SubmissionThanks title="Demo" message="Thanks!" redirectUrl="/events" delaySeconds={5} navigate={() => {}} />);
    expect(await violations()).toEqual([]);
  });
});
