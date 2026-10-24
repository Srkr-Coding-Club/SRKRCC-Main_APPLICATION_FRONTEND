'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, FileText, Loader2, RotateCcw, Upload, X } from 'lucide-react';
import { checkBeforeUpload, discardUpload, formatSize, isImageType, uploadFile, UploadError, type UploadedFile } from '@/lib/fileUpload';

type Entry = {
  key: string;
  name: string;
  size: number;
  type: string;
  preview?: string;
  state: 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
  retryable?: boolean;
  file?: File;
  uploaded?: UploadedFile;
};

interface Props {
  slug: string;
  fieldId: number;
  multiple: boolean;
  rules?: { maxFileSizeMB?: number | string; allowedFileTypes?: string; maxFiles?: number | string };
  defaultMb: number;
  /** The answer as saved so far (references to files already uploaded). */
  value: UploadedFile | UploadedFile[] | null | undefined;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  onChange: (value: UploadedFile | UploadedFile[] | undefined) => void;
  /** True while any file of this question is still being sent. */
  onBusyChange: (busy: boolean) => void;
  onBlur?: () => void;
  onProblem?: (message: string | null) => void;
}

const MAX_PARALLEL = 3;
const asList = (value: Props['value']): UploadedFile[] => (Array.isArray(value) ? value : value ? [value] : []);

export default function FileUploadField({ slug, fieldId, multiple, rules, defaultMb, value, disabled, invalid, describedBy, onChange, onBusyChange, onBlur, onProblem }: Props) {
  const [entries, setEntries] = useState<Entry[]>(() =>
    asList(value).map((u) => ({ key: u.upload_id, name: u.name, size: u.size, type: u.type, state: 'done' as const, progress: 1, uploaded: u })),
  );
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const aborts = useRef(new Map<string, AbortController>());
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const limit = Number(rules?.maxFileSizeMB) > 0 ? Number(rules?.maxFileSizeMB) : defaultMb;
  const maxFiles = multiple ? Math.max(1, Number(rules?.maxFiles) || 10) : 1;

  const patch = useCallback((key: string, change: Partial<Entry>) => {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, ...change } : e)));
  }, []);

  // Tell the form what is finished and whether anything is still going. Progress ticks change nothing here.
  const lastSent = useRef(asList(value).map((u) => u.upload_id).join(','));
  useEffect(() => {
    const done = entries.filter((e) => e.state === 'done' && e.uploaded).map((e) => e.uploaded!);
    const signature = done.map((u) => u.upload_id).join(',');
    if (signature !== lastSent.current) {
      lastSent.current = signature;
      onChange(multiple ? (done.length ? done : undefined) : done[0]);
    }
    onBusyChange(entries.some((e) => e.state === 'uploading'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  // The answer changed from outside (a saved draft came back, or an existing response finished loading).
  useEffect(() => {
    const signature = asList(value).map((u) => u.upload_id).join(',');
    if (signature === lastSent.current || entriesRef.current.some((e) => e.state === 'uploading')) return;
    lastSent.current = signature;
    setEntries(asList(value).map((u) => ({ key: u.upload_id, name: u.name, size: u.size, type: u.type, state: 'done' as const, progress: 1, uploaded: u })));
  }, [value]);

  useEffect(() => () => {
    aborts.current.forEach((c) => c.abort());
    entriesRef.current.forEach((e) => e.preview && URL.revokeObjectURL(e.preview));
    onBusyChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Leaving the page mid-upload would lose the file.
  const busy = entries.some((e) => e.state === 'uploading');
  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [busy]);

  const start = useCallback(async (entry: Entry) => {
    const controller = new AbortController();
    aborts.current.set(entry.key, controller);
    patch(entry.key, { state: 'uploading', progress: 0, error: undefined });
    try {
      const uploaded = await uploadFile(slug, fieldId, entry.file!, (progress) => patch(entry.key, { progress }), controller.signal);
      patch(entry.key, { state: 'done', progress: 1, uploaded, size: uploaded.size });
    } catch (error) {
      const failure = error as UploadError;
      if (failure.code === 'CANCELLED') return;
      patch(entry.key, { state: 'error', error: failure.message, retryable: failure.retryable });
    } finally {
      aborts.current.delete(entry.key);
    }
  }, [slug, fieldId, patch]);

  const add = useCallback(async (files: File[]) => {
    onProblem?.(null);
    const current = entriesRef.current.filter((e) => e.state !== 'error');
    let room = maxFiles - current.length;
    if (!multiple && files.length) {
      // A new pick replaces the earlier file.
      entriesRef.current.forEach((e) => remove(e, true));
      room = 1;
    }
    const added: Entry[] = [];
    for (const file of files) {
      const problem = checkBeforeUpload(file, rules, defaultMb);
      if (problem) { onProblem?.(problem); continue; }
      if (room <= 0) { onProblem?.(`You can attach at most ${maxFiles} file${maxFiles === 1 ? '' : 's'}.`); break; }
      room -= 1;
      added.push({
        key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name, size: file.size, type: file.type, file, state: 'uploading', progress: 0,
        preview: isImageType(file.type, file.name) ? URL.createObjectURL(file) : undefined,
      });
    }
    if (!added.length) return;
    setEntries((prev) => (multiple ? [...prev, ...added] : added));
    // A few at a time, so a phone on a slow connection is not asked to do everything at once.
    const queue = [...added];
    await Promise.all(Array.from({ length: Math.min(MAX_PARALLEL, queue.length) }, async () => {
      for (let next = queue.shift(); next; next = queue.shift()) await start(next);
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxFiles, multiple, rules, defaultMb, start]);

  const remove = (entry: Entry, replacing = false) => {
    aborts.current.get(entry.key)?.abort();
    if (entry.preview) URL.revokeObjectURL(entry.preview);
    if (entry.uploaded) void discardUpload(slug, entry.uploaded.upload_id).catch(() => undefined);
    setEntries((prev) => prev.filter((e) => e.key !== entry.key));
    if (!replacing) { onProblem?.(null); onBlur?.(); }
  };

  const accept = rules?.allowedFileTypes || undefined;
  const hint = `${multiple ? `Up to ${maxFiles} files. ` : ''}Max ${limit} MB each${rules?.allowedFileTypes ? ` · ${rules.allowedFileTypes}` : ''}`;
  const full = !multiple ? false : entries.filter((e) => e.state !== 'error').length >= maxFiles;

  return (
    <div
      className={`rounded-lg border-2 border-dashed p-4 text-center transition ${dragging ? 'border-[#FF7A00] bg-orange-50/40 dark:bg-orange-500/5' : 'border-slate-200 dark:border-slate-800'} bg-[#FAFAFC] dark:bg-[#0D0E15] ${disabled ? 'opacity-60' : ''}`}
      onDragOver={(e) => { if (!disabled) { e.preventDefault(); setDragging(true); } }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled && !full) void add(Array.from(e.dataTransfer.files)); }}
    >
      <Upload className="mx-auto mb-2 h-7 w-7 text-[#FF7A00]" aria-hidden="true" />
      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Drag & drop {multiple ? 'files' : 'a file'} here, or</p>
      <button
        type="button"
        id={`field-${fieldId}`}
        disabled={disabled || full}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        onClick={() => inputRef.current?.click()}
        onBlur={onBlur}
        className="mt-2 inline-flex min-h-10 items-center rounded-md bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
      >
        {multiple ? 'Choose files' : entries.length ? 'Choose a different file' : 'Choose a file'}
      </button>
      <input
        ref={inputRef}
        type="file"
        tabIndex={-1}
        className="sr-only"
        aria-hidden="true"
        multiple={multiple}
        accept={accept}
        onChange={(e) => { const picked = Array.from(e.target.files || []); e.target.value = ''; void add(picked); }}
      />
      <p className="mt-2 text-[11px] text-slate-500">{hint}</p>

      {entries.length > 0 && (
        <ul className="mt-3 space-y-2 text-left" aria-label="Attached files">
          {entries.map((entry) => (
            <li key={entry.key} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
              {entry.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.preview} alt={`Preview of ${entry.name}`} className="h-12 w-12 shrink-0 rounded border border-slate-200 object-cover dark:border-slate-700" />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                  <FileText className="h-5 w-5 text-slate-400" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{entry.name}</p>
                {entry.state === 'uploading' && (
                  <div className="mt-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" role="progressbar" aria-label={`Uploading ${entry.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(entry.progress * 100)}>
                      <div className="h-full bg-[#FF7A00] transition-[width]" style={{ width: `${Math.round(entry.progress * 100)}%` }} />
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500" aria-live="polite">Uploading… {Math.round(entry.progress * 100)}%</p>
                  </div>
                )}
                {entry.state === 'done' && <p className="text-[11px] text-slate-500">{formatSize(entry.size)} · uploaded</p>}
                {entry.state === 'error' && (
                  <p className="flex items-start gap-1 text-[11px] text-red-600" role="alert">
                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                    <span>{entry.error}</span>
                  </p>
                )}
              </div>
              {entry.state === 'uploading' && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" aria-hidden="true" />}
              {entry.state === 'error' && entry.retryable && entry.file && (
                <button type="button" onClick={() => void start(entry)} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md border border-slate-300 px-2 text-[11px] font-semibold dark:border-slate-700">
                  <RotateCcw className="h-3 w-3" aria-hidden="true" /> Retry
                </button>
              )}
              <button
                type="button"
                disabled={disabled}
                onClick={() => remove(entry)}
                aria-label={entry.state === 'uploading' ? `Cancel upload of ${entry.name}` : `Remove ${entry.name}`}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
