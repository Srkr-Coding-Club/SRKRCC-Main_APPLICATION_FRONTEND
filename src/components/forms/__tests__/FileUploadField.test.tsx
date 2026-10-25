import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const uploadFile = vi.fn();
const discardUpload = vi.fn();
vi.mock('@/lib/fileUpload', async () => {
  const real = await vi.importActual<typeof import('@/lib/fileUpload')>('@/lib/fileUpload');
  return { ...real, uploadFile: (...a: unknown[]) => uploadFile(...a), discardUpload: (...a: unknown[]) => discardUpload(...a) };
});

import FileUploadField from '../FileUploadField';
import { UploadError, type UploadedFile } from '@/lib/fileUpload';

const png = (name = 'me.png', size = 1000) => {
  const f = new File(['x'], name, { type: 'image/png' });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

function Harness({ multiple = false, initial, rules, onValue, onBusy, onProblem }: any) {
  const [value, setValue] = useState<any>(initial);
  return (
    <FileUploadField
      slug="demo" fieldId={4} multiple={multiple} rules={rules} defaultMb={2} value={value}
      onChange={(v) => { setValue(v); onValue?.(v); }} onBusyChange={(b) => onBusy?.(b)} onProblem={onProblem}
    />
  );
}

const pick = (files: File[]) => {
  const input = document.querySelector('input[type=file]') as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
};

beforeEach(() => {
  uploadFile.mockReset();
  discardUpload.mockReset().mockResolvedValue(undefined);
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => cleanup());

describe('FileUploadField', () => {
  it('uploads a picked image, shows a preview and progress, and reports the finished file', async () => {
    let finish!: (v: UploadedFile) => void;
    uploadFile.mockImplementation((_s, _f, _file, onProgress) => new Promise<UploadedFile>((resolve) => { onProgress(0.4); finish = resolve; }));
    const onValue = vi.fn();
    const onBusy = vi.fn();
    render(<Harness onValue={onValue} onBusy={onBusy} />);
    pick([png()]);
    expect((await screen.findByRole('progressbar', { name: 'Uploading me.png' })).getAttribute('aria-valuenow')).toBe('40');
    expect(screen.getByAltText('Preview of me.png').getAttribute('src')).toBe('blob:preview');
    await waitFor(() => expect(onBusy).toHaveBeenLastCalledWith(true));
    expect(onValue).not.toHaveBeenCalled(); // not part of the answer until it is finished

    await act(async () => finish({ upload_id: 'u1', name: 'me.png', size: 1000, type: 'image/png' }));
    await waitFor(() => expect(onValue).toHaveBeenLastCalledWith({ upload_id: 'u1', name: 'me.png', size: 1000, type: 'image/png' }));
    expect(onBusy).toHaveBeenLastCalledWith(false);
    expect(screen.getByText(/uploaded/)).toBeTruthy();
  });

  it('refuses a file over the limit before uploading anything', () => {
    const onProblem = vi.fn();
    render(<Harness onProblem={onProblem} />);
    pick([png('big.png', 3 * 1048576)]);
    expect(onProblem).toHaveBeenCalledWith(expect.stringContaining('The limit is 2 MB'));
    expect(uploadFile).not.toHaveBeenCalled();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('shows a failed upload with its reason, and retry sends it again', async () => {
    uploadFile.mockRejectedValueOnce(new UploadError('The connection dropped. Check your internet and retry.', 'NETWORK', true));
    render(<Harness />);
    pick([png()]);
    expect((await screen.findByRole('alert')).textContent).toContain('connection dropped');
    uploadFile.mockResolvedValueOnce({ upload_id: 'u2', name: 'me.png', size: 1000, type: 'image/png' });
    fireEvent.click(screen.getByRole('button', { name: /Retry/ }));
    expect(await screen.findByText(/uploaded/)).toBeTruthy();
    expect(uploadFile).toHaveBeenCalledTimes(2);
  });

  it('a refusal that cannot be retried offers only removal', async () => {
    uploadFile.mockRejectedValueOnce(new UploadError('Allowed file types: .pdf.', 'FILE_TYPE_NOT_ALLOWED', false));
    render(<Harness />);
    pick([png()]);
    expect((await screen.findByRole('alert')).textContent).toContain('Allowed file types');
    expect(screen.queryByRole('button', { name: /Retry/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Remove me.png' }));
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('removing a finished file deletes it on the server and empties the answer', async () => {
    uploadFile.mockResolvedValue({ upload_id: 'u1', name: 'me.png', size: 1000, type: 'image/png' });
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    pick([png()]);
    await screen.findByText(/uploaded/);
    fireEvent.click(screen.getByRole('button', { name: 'Remove me.png' }));
    expect(discardUpload).toHaveBeenCalledWith('demo', 'u1');
    await waitFor(() => expect(onValue).toHaveBeenLastCalledWith(undefined));
  });

  it('cancelling an upload in progress aborts it', async () => {
    let signal!: AbortSignal;
    uploadFile.mockImplementation((_s, _f, _file, _p, s) => { signal = s; return new Promise(() => undefined); });
    render(<Harness />);
    pick([png()]);
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel upload of me.png' }));
    expect(signal.aborted).toBe(true);
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('a single-file question replaces the earlier file with a new pick', async () => {
    uploadFile.mockResolvedValueOnce({ upload_id: 'u1', name: 'one.png', size: 10, type: 'image/png' })
      .mockResolvedValueOnce({ upload_id: 'u2', name: 'two.png', size: 10, type: 'image/png' });
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    pick([png('one.png')]);
    await screen.findByText(/uploaded/);
    pick([png('two.png')]);
    await waitFor(() => expect(onValue).toHaveBeenLastCalledWith(expect.objectContaining({ upload_id: 'u2' })));
    expect(discardUpload).toHaveBeenCalledWith('demo', 'u1');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('a multi-file question keeps several files, stops at its maximum, and sends at most three at a time', async () => {
    let running = 0;
    let peak = 0;
    const release: (() => void)[] = [];
    uploadFile.mockImplementation((_s, _f, file: File) => new Promise<UploadedFile>((resolve) => {
      running += 1;
      peak = Math.max(peak, running);
      release.push(() => { running -= 1; resolve({ upload_id: `id-${file.name}`, name: file.name, size: 10, type: 'image/png' }); });
    }));
    const onProblem = vi.fn();
    const onValue = vi.fn();
    render(<Harness multiple rules={{ maxFiles: 4 }} onProblem={onProblem} onValue={onValue} />);
    pick([1, 2, 3, 4, 5].map((n) => png(`f${n}.png`)));
    await waitFor(() => expect(release).toHaveLength(3));
    expect(peak).toBe(3);
    expect(onProblem).toHaveBeenCalledWith('You can attach at most 4 files.');
    while (release.length || running) {
      await act(async () => { release.shift()?.(); await Promise.resolve(); });
    }
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(4));
    await waitFor(() => expect(onValue.mock.lastCall![0]).toHaveLength(4));
    expect((screen.getByRole('button', { name: 'Choose files' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows files saved earlier (a draft or an edit) as done, without uploading anything', () => {
    render(<Harness initial={{ upload_id: 'u9', name: 'saved.pdf', size: 2048, type: 'application/pdf' }} />);
    expect(screen.getByText('saved.pdf')).toBeTruthy();
    expect(screen.getByText(/2 KB · uploaded/)).toBeTruthy();
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it('picks up files that arrive after it first appeared (a draft restored, an edit loaded)', () => {
    const props = { slug: 'demo', fieldId: 4, multiple: false, defaultMb: 2, onChange: vi.fn(), onBusyChange: vi.fn() };
    const { rerender } = render(<FileUploadField {...props} value={undefined} />);
    expect(screen.queryByRole('list')).toBeNull();
    rerender(<FileUploadField {...props} value={{ upload_id: 'u5', name: 'back.png', size: 10, type: 'image/png' }} />);
    expect(screen.getByText('back.png')).toBeTruthy();
    expect(props.onChange).not.toHaveBeenCalled(); // it was told, it did not say anything new
  });

  it('asks the browser before leaving mid-upload, and not otherwise', async () => {
    uploadFile.mockImplementation(() => new Promise(() => undefined));
    render(<Harness />);
    const idle = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(idle);
    expect(idle.defaultPrevented).toBe(false);
    pick([png()]);
    await screen.findByRole('progressbar');
    const busy = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(busy);
    expect(busy.defaultPrevented).toBe(true);
  });

  it('has no accessibility violations while idle and after a failure', async () => {
    uploadFile.mockRejectedValueOnce(new UploadError('Nope', 'X', false));
    const { container } = render(<Harness />);
    const run = async () => (await axe.run(container, { rules: { region: { enabled: false } } })).violations.map((v) => v.id);
    expect(await run()).toEqual([]);
    pick([png()]);
    await screen.findByRole('alert');
    expect(await run()).toEqual([]);
  });
});
