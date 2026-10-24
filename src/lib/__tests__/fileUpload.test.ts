import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchApi = vi.fn();
vi.mock('@/lib/api-client', () => ({ fetchApi: (...args: unknown[]) => fetchApi(...args) }));

import { checkBeforeUpload, formatSize, isImageType, uploadFile } from '../fileUpload';

const file = (name: string, size: number, type = 'image/png') => {
  const made = new File(['x'], name, { type });
  Object.defineProperty(made, 'size', { value: size });
  return made;
};

describe('checkBeforeUpload', () => {
  it('uses the question limit, else the default', () => {
    expect(checkBeforeUpload(file('a.png', 3 * 1048576), {}, 2)).toContain('The limit is 2 MB');
    expect(checkBeforeUpload(file('a.png', 3 * 1048576), { maxFileSizeMB: 5 }, 2)).toBeNull();
    expect(checkBeforeUpload(file('a.png', 6 * 1048576), { maxFileSizeMB: '5' }, 2)).toContain('The limit is 5 MB');
  });

  it('refuses empty files and types that are not allowed', () => {
    expect(checkBeforeUpload(file('a.png', 0), {}, 2)).toContain('empty');
    expect(checkBeforeUpload(file('a.png', 10), { allowedFileTypes: '.pdf, .docx' }, 2)).toContain('Allowed: .pdf, .docx');
    expect(checkBeforeUpload(file('a.PDF', 10), { allowedFileTypes: '.pdf' }, 2)).toBeNull();
    expect(checkBeforeUpload(file('noext', 10), { allowedFileTypes: '.pdf' }, 2)).toContain('not an allowed type');
  });
});

describe('helpers', () => {
  it('formats sizes and recognises images (never svg)', () => {
    expect(formatSize(2 * 1048576)).toBe('2.0 MB');
    expect(formatSize(500)).toBe('1 KB');
    expect(isImageType('image/png', 'a')).toBe(true);
    expect(isImageType('image/svg+xml', 'a.svg')).toBe(false);
    expect(isImageType('', 'photo.JPG')).toBe(true);
    expect(isImageType('application/pdf', 'a.pdf')).toBe(false);
  });
});

describe('uploadFile', () => {
  let sent: { url: string; entries: [string, unknown][] } | null;
  let reply: { status: number; text?: string } | 'network';

  beforeEach(() => {
    fetchApi.mockReset();
    sent = null;
    reply = { status: 204 };
    class FakeXhr {
      upload: { onprogress?: (e: unknown) => void } = {};
      status = 0;
      responseText = '';
      onload?: () => void;
      onerror?: () => void;
      open(_method: string, url: string) { sent = { url, entries: [] }; }
      send(body: FormData) {
        sent!.entries = Array.from(body.entries());
        this.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 });
        if (reply === 'network') return this.onerror?.();
        this.status = reply.status;
        this.responseText = reply.text || '';
        this.onload?.();
      }
      abort() {}
    }
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
  });
  afterEach(() => vi.unstubAllGlobals());

  const grant = { upload: { id: 'u1' }, post: { url: 'https://bucket.example/', fields: { key: 'k', 'Content-Type': 'image/png', policy: 'p' } }, max_bytes: 100 };

  it('asks, sends the signed fields then the file last, and confirms', async () => {
    fetchApi.mockResolvedValueOnce(grant).mockResolvedValueOnce({ upload: { id: 'u1', name: 'a.png', size: 7, type: 'image/png' } });
    const progress = vi.fn();
    const done = await uploadFile('demo', 4, file('a.png', 7), progress);
    expect(done).toEqual({ upload_id: 'u1', name: 'a.png', size: 7, type: 'image/png' });
    expect(sent!.url).toBe('https://bucket.example/');
    expect(sent!.entries.map(([name]) => name)).toEqual(['key', 'Content-Type', 'policy', 'file']);
    expect(progress).toHaveBeenCalledWith(0.5);
    expect(JSON.parse(fetchApi.mock.calls[0][1].body)).toEqual({ field_id: 4, name: 'a.png', size: 7, type: 'image/png' });
    expect(fetchApi.mock.calls[1][0]).toBe('/forms/demo/uploads/u1/complete/');
  });

  it('passes the servers refusal on, without starting an upload', async () => {
    fetchApi.mockRejectedValueOnce(Object.assign(new Error('Allowed file types: .pdf.'), { status: 400, body: { code: 'FILE_TYPE_NOT_ALLOWED' } }));
    await expect(uploadFile('demo', 4, file('a.png', 7), vi.fn())).rejects.toMatchObject({ code: 'FILE_TYPE_NOT_ALLOWED', retryable: false, message: 'Allowed file types: .pdf.' });
    expect(sent).toBeNull();
  });

  it('a dropped connection is retryable and the half-made upload is discarded', async () => {
    reply = 'network';
    fetchApi.mockResolvedValueOnce(grant).mockResolvedValueOnce(null);
    await expect(uploadFile('demo', 4, file('a.png', 7), vi.fn())).rejects.toMatchObject({ code: 'NETWORK', retryable: true });
    expect(fetchApi.mock.calls[1][0]).toBe('/forms/demo/uploads/u1/');
    expect(fetchApi.mock.calls[1][1].method).toBe('DELETE');
  });

  it('storage saying the file is too big is not retryable', async () => {
    reply = { status: 400, text: '<Code>EntityTooLarge</Code>' };
    fetchApi.mockResolvedValueOnce(grant).mockResolvedValueOnce(null);
    await expect(uploadFile('demo', 4, file('a.png', 7), vi.fn())).rejects.toMatchObject({ code: 'FILE_TOO_LARGE', retryable: false });
  });

  it('a file the server cannot find after sending asks to retry', async () => {
    fetchApi.mockResolvedValueOnce(grant).mockRejectedValueOnce(Object.assign(new Error('The file did not arrive.'), { status: 409, body: { code: 'UPLOAD_MISSING' } }));
    await expect(uploadFile('demo', 4, file('a.png', 7), vi.fn())).rejects.toMatchObject({ code: 'UPLOAD_MISSING', retryable: true });
  });
});
