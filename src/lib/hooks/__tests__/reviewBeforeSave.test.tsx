import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChangeReview } from '@/lib/formHistory';

const fetchApi = vi.fn();
vi.mock('@/lib/api-client', () => ({ fetchApi: (...args: unknown[]) => fetchApi(...args) }));

import { useAdminData } from '../useAdminData';

const liveForm = (status = 'PUBLISHED') => ({
  id: 7, title: 'Live form', slug: 'live', description: '', status, version: 3, response_count: 12,
  fields: [{ id: 11, label: 'Name', type: 'TEXT', is_required: true, order: 1, options: [], validation_rules: {}, conditional_logic: {} }],
});

const review = (empty: boolean): ChangeReview => ({
  current_version: 3,
  diff: {
    form: [],
    fields: { added: empty ? [] : [{ id: null, label: 'Phone', type: 'PHONE' }], removed: [], changed: [], reordered: false },
    summary: { settings: 0, added: empty ? 0 : 1, removed: 0, changed: 0, reordered: false },
    is_empty: empty,
  },
  impact: { response_count: 12, new_required: [], now_required: [], removed_with_answers: [], options_removed_with_answers: [], type_changes_blocked: [] },
});

let previewResult: ChangeReview | Error;
const calls = (matcher: (url: string, options: any) => boolean) => fetchApi.mock.calls.filter(([url, options]) => matcher(url, options ?? {}));
const saves = () => calls((url, o) => url === '/forms/live/' && o.method === 'PUT');

beforeEach(() => {
  fetchApi.mockReset();
  previewResult = review(false);
  fetchApi.mockImplementation((url: string, options: any = {}) => {
    if (url === '/forms/live/' && !options.method) return Promise.resolve(liveForm());
    if (url === '/forms/live/preview-changes/') return previewResult instanceof Error ? Promise.reject(previewResult) : Promise.resolve(previewResult);
    if (url === '/forms/live/' && options.method === 'PUT') return Promise.resolve({ ...liveForm(), version: 4 });
    return Promise.resolve([]);
  });
});

const openLiveForm = async (status = 'PUBLISHED') => {
  fetchApi.mockImplementation(((impl) => (url: string, options: any = {}) =>
    url === '/forms/live/' && !options.method ? Promise.resolve(liveForm(status)) : impl(url, options))(fetchApi.getMockImplementation()!));
  const hook = renderHook(() => useAdminData({ include: [] }));
  await act(async () => { await hook.result.current.loadFormBySlug('live'); });
  return hook;
};

describe('saving a form that is already live', () => {
  it('shows the changes first and saves only after they are confirmed', async () => {
    const hook = await openLiveForm();
    let finished = false;
    act(() => { void hook.result.current.handleSaveForm('PUBLISHED').then(() => { finished = true; }); });

    await waitFor(() => expect(hook.result.current.pendingReview).not.toBeNull());
    expect(hook.result.current.pendingReview!.diff.fields.added[0].label).toBe('Phone');
    expect(saves()).toHaveLength(0);

    await act(async () => { hook.result.current.settleReview(true); });
    await waitFor(() => expect(saves()).toHaveLength(1));
    await waitFor(() => expect(finished).toBe(true));
    expect(hook.result.current.pendingReview).toBeNull();
  });

  it('saves nothing when the review is turned down, and leaves the edits in the builder', async () => {
    const hook = await openLiveForm();
    const before = hook.result.current.builderFields;
    let finished = false;
    act(() => { void hook.result.current.handleSaveForm('PUBLISHED').then(() => { finished = true; }); });
    await waitFor(() => expect(hook.result.current.pendingReview).not.toBeNull());

    await act(async () => { hook.result.current.settleReview(false); });
    await waitFor(() => expect(finished).toBe(true));
    expect(saves()).toHaveLength(0);
    expect(hook.result.current.builderFields).toEqual(before);
  });

  it('does not interrupt a save that changes nothing', async () => {
    previewResult = review(true);
    const hook = await openLiveForm();
    await act(async () => { await hook.result.current.handleSaveForm('PUBLISHED'); });
    expect(hook.result.current.pendingReview).toBeNull();
    expect(saves()).toHaveLength(1);
  });

  it('lets the save itself report problems the preview could not (the preview failing never blocks a save)', async () => {
    previewResult = new Error('rejected');
    const hook = await openLiveForm();
    await act(async () => { await hook.result.current.handleSaveForm('PUBLISHED'); });
    expect(hook.result.current.pendingReview).toBeNull();
    expect(saves()).toHaveLength(1);
  });

  it('does not ask when unpublishing a form (nothing goes live)', async () => {
    const hook = await openLiveForm();
    await act(async () => { await hook.result.current.handleSaveForm('DRAFT'); });
    expect(calls((url) => url.endsWith('/preview-changes/'))).toHaveLength(0);
    expect(saves()).toHaveLength(1);
  });

  it('does not ask for a draft that nobody can see yet', async () => {
    const hook = await openLiveForm('DRAFT');
    await act(async () => { await hook.result.current.handleSaveForm('DRAFT'); });
    expect(calls((url) => url.endsWith('/preview-changes/'))).toHaveLength(0);
    expect(saves()).toHaveLength(1);
  });
});

describe('what a save sends', () => {
  it('keeps a question filled from the profile as one', async () => {
    const withProfile = { ...liveForm('DRAFT'), fields: [
      { id: 11, label: 'Email', type: 'EMAIL', is_required: true, order: 1, profile_field: 'email' },
      { id: 12, label: 'Why', type: 'TEXT', is_required: false, order: 2 },
    ] };
    fetchApi.mockImplementation((url: string, options: any = {}) =>
      url === '/forms/live/' ? Promise.resolve(options.method ? withProfile : withProfile) : Promise.resolve([]));
    const hook = renderHook(() => useAdminData({ include: [] }));
    await act(async () => { await hook.result.current.loadFormBySlug('live'); });
    await act(async () => { await hook.result.current.handleSaveForm('DRAFT'); });

    const put = fetchApi.mock.calls.find(([url, o]) => url === '/forms/live/' && o?.method === 'PUT')!;
    const sent = JSON.parse(put[1].body).fields;
    expect(sent.map((f: any) => f.profile_field)).toEqual(['email', null]);
  });
});
