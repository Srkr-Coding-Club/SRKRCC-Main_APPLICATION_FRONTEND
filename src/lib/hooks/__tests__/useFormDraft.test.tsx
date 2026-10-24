import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FormField } from '@/lib/types';
import { DRAFT_SAVE_DELAY_MS, persistableAnswers, useFormDraft } from '../useFormDraft';

const fetchApi = vi.fn();
vi.mock('@/lib/api-client', () => ({ fetchApi: (...args: unknown[]) => fetchApi(...args) }));

const field = (id: number, over: Partial<FormField> = {}): FormField => ({
  id, label: `Q${id}`, type: 'TEXT', is_required: false, order: id, ...over,
});
const fields: FormField[] = [
  field(1), field(2, { type: 'NUMBER' }), field(3, { type: 'FILE' }), field(4, { type: 'PAGE_BREAK' }),
  field(5, { profile_field: 'email' }), field(6, { type: 'SIGNATURE' }),
];

afterEach(cleanup);
beforeEach(() => {
  fetchApi.mockReset();
  vi.useFakeTimers();
  return () => vi.useRealTimers();
});

const flush = async () => { await act(async () => { await vi.advanceTimersByTimeAsync(0); }); };
const wait = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };

describe('persistableAnswers', () => {
  it('keeps real answers only - no files, signatures, profile-filled, structure or blanks', () => {
    expect(persistableAnswers(fields, {
      '1': 'Dana', '2': '', '3': [{ name: 'cv.pdf' }], '4': 'x', '5': 'dana@srkr.ac.in', '6': 'data:image/png;base64,AAAA', '99': 'ghost',
    })).toEqual({ '1': 'Dana' });
  });
});

describe('useFormDraft', () => {
  const setup = (formData: Record<string, any>, over: Partial<{ enabled: boolean; page: number }> = {}) => {
    const onRestore = vi.fn();
    const hook = renderHook(
      (props: { formData: Record<string, any>; page: number; enabled: boolean }) => useFormDraft({
        slug: 'hack', fields, enabled: props.enabled, formData: props.formData, currentPage: props.page, onRestore,
      }),
      { initialProps: { formData, page: over.page ?? 0, enabled: over.enabled ?? true } },
    );
    return { ...hook, onRestore };
  };

  it('does nothing until saving is allowed', async () => {
    setup({}, { enabled: false });
    await flush();
    expect(fetchApi).not.toHaveBeenCalled();
  });

  it('hands a saved draft back so the form can restore it', async () => {
    fetchApi.mockResolvedValueOnce({ draft: { answers: { '1': 'Dana' }, current_page: 2, form_changed: false } });
    const { onRestore } = setup({});
    await flush();
    expect(fetchApi).toHaveBeenCalledWith('/forms/hack/draft/', expect.objectContaining({ silentAuth: true }));
    expect(onRestore).toHaveBeenCalledWith({ answers: { '1': 'Dana' }, current_page: 2, form_changed: false });
  });

  it('saves nothing for a form the person has not touched, then saves after a change', async () => {
    fetchApi.mockResolvedValueOnce({ draft: null });
    const { rerender, result } = setup({ '1': '' });
    await flush();
    await wait(DRAFT_SAVE_DELAY_MS * 2);
    expect(fetchApi).toHaveBeenCalledTimes(1); // just the lookup

    fetchApi.mockResolvedValueOnce({ saved_at: 'now', dropped: [] });
    rerender({ formData: { '1': 'Dana' }, page: 0, enabled: true });
    await wait(DRAFT_SAVE_DELAY_MS - 10);
    expect(fetchApi).toHaveBeenCalledTimes(1); // still waiting out the delay
    await wait(20);

    expect(fetchApi).toHaveBeenCalledTimes(2);
    const [url, options] = fetchApi.mock.calls[1];
    expect(url).toBe('/forms/hack/draft/');
    expect(options.method).toBe('PUT');
    expect(JSON.parse(options.body)).toEqual({ answers: { '1': 'Dana' }, current_page: 0 });
    expect(result.current.status).toBe('saved');
    expect(result.current.savedAt).toBeInstanceOf(Date);
  });

  it('waits for the person to stop typing and saves only the last value', async () => {
    fetchApi.mockResolvedValueOnce({ draft: null });
    const { rerender } = setup({});
    await flush();
    fetchApi.mockResolvedValue({ saved_at: 'now', dropped: [] });

    rerender({ formData: { '1': 'D' }, page: 0, enabled: true });
    await wait(500);
    rerender({ formData: { '1': 'Da' }, page: 0, enabled: true });
    await wait(500);
    rerender({ formData: { '1': 'Dana' }, page: 0, enabled: true });
    await wait(DRAFT_SAVE_DELAY_MS + 10);

    const saves = fetchApi.mock.calls.filter(([, o]) => o?.method === 'PUT');
    expect(saves).toHaveLength(1);
    expect(JSON.parse(saves[0][1].body).answers).toEqual({ '1': 'Dana' });
  });

  it('saves a page change even when no answer changed', async () => {
    fetchApi.mockResolvedValueOnce({ draft: null });
    const { rerender } = setup({ '1': 'Dana' });
    await flush();
    fetchApi.mockResolvedValue({ saved_at: 'now', dropped: [] });
    rerender({ formData: { '1': 'Dana' }, page: 1, enabled: true });
    await wait(DRAFT_SAVE_DELAY_MS + 10);
    const save = fetchApi.mock.calls.find(([, o]) => o?.method === 'PUT');
    expect(JSON.parse(save![1].body).current_page).toBe(1);
  });

  it('does not save again when nothing new has happened since the restore', async () => {
    fetchApi.mockResolvedValueOnce({ draft: { answers: { '1': 'Dana' }, current_page: 1, form_changed: false } });
    setup({ '1': 'Dana' }, { page: 1 });
    await flush();
    await wait(DRAFT_SAVE_DELAY_MS * 2);
    expect(fetchApi).toHaveBeenCalledTimes(1);
  });

  it('reports a failed save and keeps trying on later changes', async () => {
    fetchApi.mockResolvedValueOnce({ draft: null });
    const { rerender, result } = setup({});
    await flush();
    fetchApi.mockRejectedValueOnce(Object.assign(new Error('offline'), { status: 502 }));
    rerender({ formData: { '1': 'a' }, page: 0, enabled: true });
    await wait(DRAFT_SAVE_DELAY_MS + 10);
    expect(result.current.status).toBe('error');

    fetchApi.mockResolvedValueOnce({ saved_at: 'now', dropped: [] });
    rerender({ formData: { '1': 'ab' }, page: 0, enabled: true });
    await wait(DRAFT_SAVE_DELAY_MS + 10);
    expect(result.current.status).toBe('saved');
  });

  it('gives up for good once the server says the form no longer takes drafts', async () => {
    fetchApi.mockResolvedValueOnce({ draft: null });
    const { rerender } = setup({});
    await flush();
    fetchApi.mockRejectedValueOnce(Object.assign(new Error('closed'), { status: 409 }));
    rerender({ formData: { '1': 'a' }, page: 0, enabled: true });
    await wait(DRAFT_SAVE_DELAY_MS + 10);
    const callsAfterClose = fetchApi.mock.calls.length;
    rerender({ formData: { '1': 'ab' }, page: 0, enabled: true });
    await wait(DRAFT_SAVE_DELAY_MS * 2);
    expect(fetchApi.mock.calls.length).toBe(callsAfterClose);
  });

  it('stops saving once the response is submitted', async () => {
    fetchApi.mockResolvedValueOnce({ draft: null });
    const { rerender } = setup({});
    await flush();
    rerender({ formData: { '1': 'Dana' }, page: 0, enabled: false });
    await wait(DRAFT_SAVE_DELAY_MS * 2);
    expect(fetchApi.mock.calls.filter(([, o]) => o?.method === 'PUT')).toHaveLength(0);
  });
});

describe('the copy kept in this tab', () => {
  const KEY = 'srkrcc_form_backup:hack:7';
  const setupFor = (owner: number | null, formData: Record<string, any>) => {
    const onRestore = vi.fn();
    const hook = renderHook(
      (props: { formData: Record<string, any> }) => useFormDraft({
        slug: 'hack', owner, fields, enabled: true, formData: props.formData, currentPage: 0, onRestore,
      }),
      { initialProps: { formData } },
    );
    return { ...hook, onRestore };
  };
  beforeEach(() => sessionStorage.clear());

  it('is written as soon as an answer changes, before the server save has even run', async () => {
    fetchApi.mockResolvedValueOnce({ draft: null });
    const { rerender } = setupFor(7, {});
    await flush();
    rerender({ formData: { '1': 'Dana' } });
    expect(JSON.parse(sessionStorage.getItem(KEY)!).answers).toEqual({ '1': 'Dana' });
  });

  it('brings the answers back when the server has no draft (the session ran out before the autosave)', async () => {
    sessionStorage.setItem(KEY, JSON.stringify({ answers: { '1': 'Dana' }, current_page: 1, at: Date.now() }));
    fetchApi.mockResolvedValueOnce({ draft: null });
    const { onRestore } = setupFor(7, {});
    await flush();
    expect(onRestore).toHaveBeenCalledWith({ answers: { '1': 'Dana' }, current_page: 1, form_changed: false });
  });

  it('also does when the lookup itself fails', async () => {
    sessionStorage.setItem(KEY, JSON.stringify({ answers: { '1': 'Dana' }, current_page: 0, at: Date.now() }));
    fetchApi.mockRejectedValueOnce(new Error('offline'));
    const { onRestore } = setupFor(7, {});
    await flush();
    expect(onRestore).toHaveBeenCalledTimes(1);
  });

  it('prefers the server draft when there is one', async () => {
    sessionStorage.setItem(KEY, JSON.stringify({ answers: { '1': 'old local' }, current_page: 0, at: Date.now() }));
    fetchApi.mockResolvedValueOnce({ draft: { answers: { '1': 'server' }, current_page: 0, form_changed: false } });
    const { onRestore } = setupFor(7, {});
    await flush();
    expect(onRestore).toHaveBeenCalledTimes(1);
    expect(onRestore.mock.calls[0][0].answers).toEqual({ '1': 'server' });
  });

  it('is never offered to a different person signing in on the same tab', async () => {
    sessionStorage.setItem(KEY, JSON.stringify({ answers: { '1': 'Dana' }, current_page: 0, at: Date.now() }));
    fetchApi.mockResolvedValueOnce({ draft: null });
    const { onRestore } = setupFor(8, {});
    await flush();
    expect(onRestore).not.toHaveBeenCalled();
  });

  it('ignores a copy older than a day, and a damaged one', async () => {
    sessionStorage.setItem(KEY, JSON.stringify({ answers: { '1': 'Dana' }, current_page: 0, at: Date.now() - 25 * 3600_000 }));
    fetchApi.mockResolvedValueOnce({ draft: null });
    const stale = setupFor(7, {});
    await flush();
    expect(stale.onRestore).not.toHaveBeenCalled();

    sessionStorage.setItem(KEY, '{not json');
    fetchApi.mockResolvedValueOnce({ draft: null });
    const damaged = setupFor(7, {});
    await flush();
    expect(damaged.onRestore).not.toHaveBeenCalled();
  });

  it('is pushed to the server by the next save after it was restored', async () => {
    sessionStorage.setItem(KEY, JSON.stringify({ answers: { '1': 'Dana' }, current_page: 0, at: Date.now() }));
    fetchApi.mockResolvedValueOnce({ draft: null }).mockResolvedValue({ saved_at: 'now' });
    const { rerender } = setupFor(7, {});
    await flush();
    rerender({ formData: { '1': 'Dana' } }); // the page applies the restored answers
    await wait(DRAFT_SAVE_DELAY_MS + 10);
    expect(fetchApi).toHaveBeenCalledWith('/forms/hack/draft/', expect.objectContaining({ method: 'PUT' }));
  });
});

describe('typing before the saved draft has been looked up', () => {
  it('still counts as the person\'s change and is saved, not mistaken for the starting point', async () => {
    let answerLookup: (v: any) => void = () => {};
    fetchApi.mockImplementationOnce(() => new Promise((resolve) => { answerLookup = resolve; })).mockResolvedValue({ saved_at: 'now' });
    const hook = renderHook(
      (props: { formData: Record<string, any> }) => useFormDraft({
        slug: 'hack', fields, enabled: true, formData: props.formData, currentPage: 0, freshAnswers: {}, onRestore: vi.fn(),
      }),
      { initialProps: { formData: {} as Record<string, any> } },
    );
    hook.rerender({ formData: { '1': 'typed early' } });
    await act(async () => { answerLookup({ draft: null }); await vi.advanceTimersByTimeAsync(0); });
    await wait(DRAFT_SAVE_DELAY_MS + 10);
    const put = fetchApi.mock.calls.find(([, o]) => o?.method === 'PUT');
    expect(JSON.parse(put![1].body).answers).toEqual({ '1': 'typed early' });
  });

  it('does not save a draft for a form nobody touched (defaults are the starting point)', async () => {
    fetchApi.mockResolvedValueOnce({ draft: null });
    renderHook(() => useFormDraft({
      slug: 'hack', fields, enabled: true, formData: { '1': 'default city' }, currentPage: 0, freshAnswers: { '1': 'default city' }, onRestore: vi.fn(),
    }));
    await flush();
    await wait(DRAFT_SAVE_DELAY_MS + 10);
    expect(fetchApi.mock.calls.filter(([, o]) => o?.method === 'PUT')).toHaveLength(0);
  });
});
