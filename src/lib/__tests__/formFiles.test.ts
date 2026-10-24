import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchApi = vi.fn();
const uploadFile = vi.fn();
vi.mock('@/lib/api-client', () => ({ fetchApi: (...args: unknown[]) => fetchApi(...args) }));
vi.mock('@/lib/fileUpload', () => ({ uploadFile: (...args: unknown[]) => uploadFile(...args) }));

import { deleteFiles, fileLink, forgetLinks, listFiles, replaceFile, type FormFile } from '../formFiles';

beforeEach(() => {
  fetchApi.mockReset();
  uploadFile.mockReset();
  forgetLinks();
  vi.useRealTimers();
});

describe('listFiles', () => {
  it('sends only the filters that are set', async () => {
    fetchApi.mockResolvedValue({ results: [] });
    await listFiles('demo form', { page: 2, search: 'ada', kind: 'images' });
    const url = fetchApi.mock.calls[0][0] as string;
    expect(url.startsWith('/forms/demo%20form/files/?')).toBe(true);
    const params = new URLSearchParams(url.split('?')[1]);
    expect(Object.fromEntries(params)).toEqual({ page: '2', page_size: '24', search: 'ada', kind: 'images' });
  });
});

describe('fileLink', () => {
  it('reuses a link for a few seconds, then asks again', async () => {
    vi.useFakeTimers();
    fetchApi.mockResolvedValue({ url: 'https://x/1', expires_in: 60, inline: true });
    await fileLink('demo', 'f1', true);
    await fileLink('demo', 'f1', true);
    expect(fetchApi).toHaveBeenCalledTimes(1);
    await fileLink('demo', 'f1', false); // a download link is a different link
    expect(fetchApi).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(41_000);
    await fileLink('demo', 'f1', true);
    expect(fetchApi).toHaveBeenCalledTimes(3);
    expect(fetchApi.mock.calls[0][0]).toBe('/forms/demo/files/f1/link/?inline=1');
    expect(fetchApi.mock.calls[1][0]).toBe('/forms/demo/files/f1/link/');
  });

  it('does not remember a failure', async () => {
    fetchApi.mockRejectedValueOnce(new Error('gone')).mockResolvedValueOnce({ url: 'https://x/2', expires_in: 60, inline: false });
    await expect(fileLink('demo', 'f2', false)).rejects.toThrow('gone');
    expect((await fileLink('demo', 'f2', false)).url).toBe('https://x/2');
  });
});

describe('deleteFiles and replaceFile', () => {
  const old = { id: 'old-1', name: 'a.png', field: { id: 21, label: 'Photo' } } as FormFile;

  it('deletes by id', async () => {
    fetchApi.mockResolvedValue({ removed: 2, responses_missing_required_file: [] });
    await deleteFiles('demo', ['a', 'b']);
    expect(JSON.parse(fetchApi.mock.calls[0][1].body)).toEqual({ ids: ['a', 'b'] });
  });

  it('uploads the replacement for the same question, then swaps it in and forgets old links', async () => {
    fetchApi.mockResolvedValueOnce({ url: 'https://x/old', expires_in: 60, inline: true });
    await fileLink('demo', 'old-1', true);
    uploadFile.mockResolvedValue({ upload_id: 'new-1', name: 'b.png', size: 1, type: 'image/png' });
    fetchApi.mockResolvedValueOnce({ file: { id: 'new-1', name: 'b.png' } });
    const progress = vi.fn();
    const done = await replaceFile('demo', old, new File(['x'], 'b.png'), progress);
    expect(uploadFile).toHaveBeenCalledWith('demo', 21, expect.any(File), progress);
    expect(fetchApi.mock.calls[1][0]).toBe('/forms/demo/files/old-1/replace/');
    expect(JSON.parse(fetchApi.mock.calls[1][1].body)).toEqual({ upload_id: 'new-1' });
    expect(done.id).toBe('new-1');
    fetchApi.mockResolvedValueOnce({ url: 'https://x/fresh', expires_in: 60, inline: true });
    expect((await fileLink('demo', 'old-1', true)).url).toBe('https://x/fresh');
  });

  it('refuses a file whose question was removed', async () => {
    await expect(replaceFile('demo', { ...old, field: null }, new File(['x'], 'b.png'), vi.fn())).rejects.toThrow('no longer belongs');
    expect(uploadFile).not.toHaveBeenCalled();
  });
});
