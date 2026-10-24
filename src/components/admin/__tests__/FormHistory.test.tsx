import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const fetchApi = vi.fn();
vi.mock('@/lib/api-client', () => ({ fetchApi: (...args: unknown[]) => fetchApi(...args) }));

import { FormHistoryModal } from '../FormHistoryModal';
import { ReviewChangesModal } from '../ReviewChangesModal';
import { FormChanges } from '../FormChanges';
import type { ChangeImpact, ChangeReview, FormDiff } from '@/lib/formHistory';

const emptyImpact: ChangeImpact = {
  response_count: 0, new_required: [], now_required: [], removed_with_answers: [], options_removed_with_answers: [], type_changes_blocked: [],
};

const diff = (over: Partial<FormDiff['fields']> = {}, form: FormDiff['form'] = []): FormDiff => {
  const fields = { added: [], removed: [], changed: [], reordered: false, ...over };
  const summary = { settings: form.length, added: fields.added.length, removed: fields.removed.length, changed: fields.changed.length, reordered: fields.reordered };
  return { form, fields, summary, is_empty: !(summary.settings || summary.added || summary.removed || summary.changed || summary.reordered) };
};

const versions = [
  { version: 3, note: 'Saved', created_at: '2026-10-22T09:00:00Z', created_by: 'dana@srkr.ac.in', is_current: true, summary: { settings: 0, added: 1, removed: 0, changed: 0, reordered: false } },
  { version: 2, note: 'Published', created_at: '2026-10-21T09:00:00Z', created_by: null, is_current: false, summary: { settings: 1, added: 0, removed: 0, changed: 1, reordered: false } },
  { version: 1, note: 'Created', created_at: '2026-10-20T09:00:00Z', created_by: 'dana@srkr.ac.in', is_current: false, summary: null },
];

beforeEach(() => {
  fetchApi.mockReset();
  fetchApi.mockImplementation((url: string, options: any = {}) => {
    if (url === '/forms/demo/versions/') return Promise.resolve(versions);
    if (url.endsWith('/restore/')) return Promise.resolve({ slug: 'demo' });
    const match = url.match(/versions\/(\d+)\/(\?against=current)?/);
    if (match) {
      const n = Number(match[1]);
      const d = n === 1 ? null : diff({ added: [{ id: 9, label: `Added in v${n}`, type: 'TEXT' }] });
      return Promise.resolve({ version: n, note: '', created_at: '', diff: match[2] ? diff({ removed: [{ id: 5, label: 'Would be removed', type: 'TEXT' }] }) : d });
    }
    return Promise.reject(new Error(`unexpected ${url} ${options.method ?? ''}`));
  });
});
afterEach(cleanup);

describe('FormHistoryModal', () => {
  const open = (extra: Partial<React.ComponentProps<typeof FormHistoryModal>> = {}) => {
    const props = { slug: 'demo', isOpen: true, onClose: vi.fn(), onRestored: vi.fn(), ...extra };
    render(<FormHistoryModal {...props} />);
    return props;
  };

  it('lists the versions and opens on the newest, showing what it changed', async () => {
    open();
    expect((await screen.findAllByText('Version 3')).length).toBeGreaterThan(0);
    expect(screen.getByText('Current')).toBeTruthy();
    expect(screen.getByText('Published')).toBeTruthy();
    expect(await screen.findByText(/Added in v3/)).toBeTruthy();
    expect(screen.queryByText('Restore this version')).toBeNull(); // nothing to restore from the current version
  });

  it('shows another version when it is picked, and the first version as the starting point', async () => {
    open();
    fireEvent.click(await screen.findByText('Created'));
    expect(await screen.findByText('This is the first saved version.')).toBeTruthy();
    fireEvent.click(screen.getByText('Published'));
    expect(await screen.findByText(/Added in v2/)).toBeTruthy();
  });

  it('can show what going back would change', async () => {
    open();
    fireEvent.click(await screen.findByText('Published'));
    fireEvent.click(screen.getByText('What going back would change'));
    expect(await screen.findByText(/Would be removed/)).toBeTruthy();
    expect(fetchApi).toHaveBeenCalledWith('/forms/demo/versions/2/?against=current');
  });

  it('asks before restoring, then restores, reloads the builder and closes', async () => {
    const props = open();
    fireEvent.click(await screen.findByText('Published'));
    fireEvent.click(await screen.findByText('Restore this version'));
    expect(screen.getByText(/saved as version 4; nothing is lost/)).toBeTruthy();
    expect(fetchApi).not.toHaveBeenCalledWith(expect.stringContaining('/restore/'), expect.anything());

    fireEvent.click(screen.getByText('Restore version 2'));
    await waitFor(() => expect(props.onRestored).toHaveBeenCalled());
    expect(fetchApi).toHaveBeenCalledWith('/forms/demo/versions/2/restore/', { method: 'POST' });
    expect(props.onClose).toHaveBeenCalled();
  });

  it('keeps the dialog open and says why when a restore is refused', async () => {
    fetchApi.mockImplementation((url: string) => {
      if (url.endsWith('/restore/')) return Promise.reject(Object.assign(new Error('rejected'), { body: { errors: [{ message: "'Age' already has responses, so its type cannot change." }] } }));
      if (url === '/forms/demo/versions/') return Promise.resolve(versions);
      return Promise.resolve({ version: 2, note: '', created_at: '', diff: diff() });
    });
    const props = open();
    fireEvent.click(await screen.findByText('Published'));
    fireEvent.click(await screen.findByText('Restore this version'));
    fireEvent.click(screen.getByText('Restore version 2'));
    expect(await screen.findByText("'Age' already has responses, so its type cannot change.")).toBeTruthy();
    expect(props.onClose).not.toHaveBeenCalled();
    expect(props.onRestored).not.toHaveBeenCalled();
  });

  it('renders nothing while closed', () => {
    const { container } = render(<FormHistoryModal slug="demo" isOpen={false} onClose={() => {}} onRestored={() => {}} />);
    expect(container.innerHTML).toBe('');
    expect(fetchApi).not.toHaveBeenCalled();
  });
});

describe('ReviewChangesModal', () => {
  const review = (d: FormDiff, impact = emptyImpact): ChangeReview => ({ diff: d, impact, current_version: 4 });

  it('shows the changes and the warnings, and passes on the decision', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ReviewChangesModal
        review={review(diff({ added: [{ id: null, label: 'Phone', type: 'PHONE' }] }), { ...emptyImpact, response_count: 12, new_required: [{ id: null, label: 'Phone' }] })}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByText(/This form is live/)).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('"Phone" is new and required, but the 12 existing responses');
    expect(screen.getAllByText(/Phone/).length).toBeGreaterThan(1);
    fireEvent.click(screen.getByText('Keep editing'));
    expect(onCancel).toHaveBeenCalled();
    fireEvent.click(screen.getByText('Save and apply'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('is not there without a review', () => {
    const { container } = render(<ReviewChangesModal review={null} onConfirm={() => {}} onCancel={() => {}} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('FormChanges', () => {
  it('lists settings, additions, removals and per-question changes', () => {
    render(
      <FormChanges
        diff={diff(
          {
            added: [{ id: 1, label: 'New one', type: 'TEXT' }],
            removed: [{ id: 2, label: 'Old one', type: 'TEXT' }],
            changed: [{ id: 3, label: 'Track', type: 'RADIO', changes: [{ key: 'options', label: 'Options', added: ['IoT'], removed: [] } as any] }],
            reordered: true,
          },
          [{ key: 'title', label: 'Title', before: 'A', after: 'B' }],
        )}
      />,
    );
    expect(screen.getByText('Title:')).toBeTruthy();
    expect(screen.getByText(/New one/)).toBeTruthy();
    expect(screen.getByText(/Old one/)).toBeTruthy();
    expect(screen.getByText('options: added IoT')).toBeTruthy();
    expect(screen.getByText(/order of the questions changed/)).toBeTruthy();
  });

  it('says so when nothing differs', () => {
    render(<FormChanges diff={diff()} />);
    expect(screen.getByText('No difference.')).toBeTruthy();
  });
});
