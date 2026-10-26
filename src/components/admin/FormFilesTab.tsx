'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckSquare, ChevronLeft, ChevronRight, Download, Eye, Loader2, RefreshCw, Replace, Search, Square, Trash2 } from 'lucide-react';
import { FormSelect } from '@/components/ui/FormSelect';
import { Modal } from '@/components/ui/Modal';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/context/ToastContext';
import { deleteFiles, fileLink, listFiles, replaceFile, type FormFile, type FormFilesPage } from '@/lib/formFiles';
import { formatSize, isImageType } from '@/lib/fileUpload';
import { FileThumb, openStoredFile } from './StoredFile';

interface Props {
  slug: string;
  /** The form's file questions, for the "question" filter. */
  fileFields: { id: number; label: string }[];
}

const KINDS = [
  { value: '', label: 'All types' },
  { value: 'images', label: 'Images' },
  { value: 'documents', label: 'Documents' },
];
const PAGE_SIZE = 24;
const dateOf = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** Every file uploaded to one form: look at it, download it, delete it, or replace it. */
export function FormFilesTab({ slug, fileFields }: Props) {
  const { toast } = useToast();
  const { confirm, dialog } = useConfirmDialog();
  const [data, setData] = useState<FormFilesPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [field, setField] = useState('');
  const [kind, setKind] = useState<'' | 'images' | 'documents'>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<{ file: FormFile; url: string } | null>(null);
  const [working, setWorking] = useState<Record<string, number | 'deleting'>>({});
  const replaceInput = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<FormFile | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await listFiles(slug, { page, pageSize: PAGE_SIZE, search: debounced, field, kind }));
    } catch (failure: any) {
      setError(failure?.message || 'Could not load the files.');
    } finally {
      setLoading(false);
    }
  }, [slug, page, debounced, field, kind]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setSelected(new Set()); }, [slug, page, debounced, field, kind]);

  const files = data?.results ?? [];
  const allSelected = files.length > 0 && selected.size === files.length;
  const toggle = (id: string) => setSelected((prev) => { const next = new Set(prev); if (!next.delete(id)) next.add(id); return next; });

  const view = async (file: FormFile) => {
    try {
      if (file.is_image) setViewing({ file, url: (await fileLink(slug, file.id, true)).url });
      else await openStoredFile(slug, file.id, file.type);
    } catch (failure: any) {
      toast.error('Could not open the file', failure?.message || 'Please try again.');
    }
  };

  const download = async (file: FormFile) => {
    try { await openStoredFile(slug, file.id, file.type, true); } catch (failure: any) { toast.error('Could not download', failure?.message || 'Please try again.'); }
  };

  const remove = async (targets: FormFile[]) => {
    const required = targets.filter((f) => fileFields.length && f.field && fileFields.some((q) => q.id === f.field!.id));
    const ok = await confirm({
      title: targets.length === 1 ? 'Delete this file?' : `Delete ${targets.length} files?`,
      danger: true,
      confirmLabel: 'Delete',
      message: (
        <div className="space-y-2">
          <p>{targets.length === 1
            ? <>"{targets[0].name}" from {targets[0].uploader?.name || 'an unknown person'} will be removed from their response and from storage. This cannot be undone.</>
            : <>These files will be removed from their responses and from storage. This cannot be undone.</>}</p>
          {required.length > 0 && <p className="text-xs text-slate-500 dark:text-slate-400">If a question needs a file, that response will be left without one.</p>}
        </div>
      ),
    });
    if (!ok) return;
    setWorking((prev) => ({ ...prev, ...Object.fromEntries(targets.map((f) => [f.id, 'deleting' as const])) }));
    try {
      const result = await deleteFiles(slug, targets.map((f) => f.id));
      toast.success('Deleted', `${result.removed} file${result.removed === 1 ? '' : 's'} removed.`);
      if (result.responses_missing_required_file.length) {
        toast.warning('A required file is now missing', `Response ${result.responses_missing_required_file.map((id) => `#${id}`).join(', ')} no longer has a file for a question that needs one.`);
      }
      setSelected(new Set());
      await load();
    } catch (failure: any) {
      toast.error('Delete failed', failure?.message || 'Could not delete the files.');
    } finally {
      setWorking((prev) => { const next = { ...prev }; targets.forEach((f) => delete next[f.id]); return next; });
    }
  };

  const chooseReplacement = (file: FormFile) => { replaceTarget.current = file; replaceInput.current?.click(); };

  const doReplace = async (picked: File | undefined) => {
    const target = replaceTarget.current;
    if (!picked || !target) return;
    setWorking((prev) => ({ ...prev, [target.id]: 0 }));
    try {
      await replaceFile(slug, target, picked, (fraction) => setWorking((prev) => ({ ...prev, [target.id]: fraction })));
      toast.success('File replaced', `"${target.name}" was replaced by "${picked.name}".`);
      await load();
    } catch (failure: any) {
      toast.error('Could not replace the file', failure?.message || 'Please try again.');
    } finally {
      setWorking((prev) => { const next = { ...prev }; delete next[target.id]; return next; });
    }
  };

  const pages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;
  const control = 'rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm text-[#1A1A2E] focus:border-orange-500/60 focus:outline-none dark:border-slate-700 dark:text-white';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500 dark:text-slate-400" aria-hidden="true" />
          <input type="text" aria-label="Search files" placeholder="File or person…" value={search} onChange={(e) => setSearch(e.target.value)} className={`${control} w-52 pl-9`} />
        </div>
        <FormSelect
          value={field}
          options={[{ value: '', label: 'All questions' }, ...fileFields.map((q) => ({ value: String(q.id), label: q.label }))]}
          placeholder="All questions"
          onChange={(value) => { setField(value); setPage(1); }}
          className="min-w-[170px]"
        />
        <FormSelect value={kind} placeholder="All types" options={KINDS} onChange={(value) => { setKind(value as typeof kind); setPage(1); }} className="min-w-[140px]" />
        <button type="button" onClick={() => void load()} aria-label="Refresh files" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:border-slate-700 dark:hover:text-white">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </div>

      {data && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span><strong className="text-[#1A1A2E] dark:text-white">{data.count}</strong> file{data.count === 1 ? '' : 's'}</span>
          <span><strong className="text-[#1A1A2E] dark:text-white">{formatSize(data.total_bytes)}</strong> in total</span>
          {files.length > 0 && (
            <button type="button" onClick={() => setSelected(allSelected ? new Set() : new Set(files.map((f) => f.id)))} className="ml-auto inline-flex min-h-9 items-center gap-1.5 font-semibold hover:text-[#1A1A2E] dark:hover:text-white">
              {allSelected ? <CheckSquare className="h-4 w-4" aria-hidden="true" /> : <Square className="h-4 w-4" aria-hidden="true" />}
              {allSelected ? 'Clear selection' : 'Select all on this page'}
            </button>
          )}
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-2.5" role="region" aria-label="Selected files">
          <span className="text-xs font-bold text-orange-500">{selected.size} selected</span>
          <button type="button" onClick={() => void remove(files.filter((f) => selected.has(f.id)))} className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-400">
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
          </button>
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">Clear</button>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
          <span>{error}</span>
          <button type="button" onClick={() => void load()} className="font-bold underline">Try again</button>
        </div>
      )}

      {!error && data && files.length === 0 && (
        <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">{debounced || field || kind ? 'No files match these filters.' : 'No files have been uploaded to this form yet.'}</p>
      )}

      {loading && !data && <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" aria-label="Loading files" /></div>}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Uploaded files">
        {files.map((file) => {
          const state = working[file.id];
          const isSelected = selected.has(file.id);
          return (
            <li key={file.id} className={`flex flex-col gap-3 rounded-xl border p-3 ${isSelected ? 'border-orange-500/50 bg-orange-500/5' : 'border-slate-200 dark:border-slate-800'}`}>
              <div className="flex items-start gap-3">
                <button type="button" onClick={() => toggle(file.id)} aria-pressed={isSelected} aria-label={`${isSelected ? 'Deselect' : 'Select'} ${file.name}`} className="-m-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white">
                  {isSelected ? <CheckSquare className="h-4 w-4" aria-hidden="true" /> : <Square className="h-4 w-4" aria-hidden="true" />}
                </button>
                <FileThumb slug={slug} id={file.id} type={file.type} name={file.name} className="h-16 w-16" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#1A1A2E] dark:text-white" title={file.name}>{file.name}</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">{formatSize(file.size)} · {file.type || 'unknown type'}</p>
                  <p className="truncate text-[11px] text-slate-600 dark:text-slate-400" title={file.uploader?.email}>{file.uploader ? `${file.uploader.name} · ${file.uploader.email}` : 'Unknown person'}</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">{file.field?.label || 'Removed question'} · response #{file.response_id} · {dateOf(file.uploaded_at)}</p>
                  {file.replaced_a_file && <p className="text-[11px] font-semibold text-purple-500">Replaced by an admin</p>}
                </div>
              </div>

              {typeof state === 'number' && (
                <div role="progressbar" aria-label={`Replacing ${file.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(state * 100)} className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div className="h-full bg-[#FF7A00]" style={{ width: `${Math.round(state * 100)}%` }} />
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {([
                  { label: file.is_image ? 'View' : 'Open', icon: Eye, run: () => view(file), danger: false },
                  { label: 'Download', icon: Download, run: () => download(file), danger: false },
                  { label: 'Replace', icon: Replace, run: () => chooseReplacement(file), danger: false },
                  { label: 'Delete', icon: Trash2, run: () => remove([file]), danger: true },
                ] as const).map(({ label, icon: Icon, run, danger }) => (
                  <button
                    key={label}
                    type="button"
                    disabled={state !== undefined}
                    onClick={() => void run()}
                    aria-label={`${label} ${file.name}`}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${danger ? 'border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10' : 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                  >
                    {state === 'deleting' && danger ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
                    {label}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      {data && pages > 1 && (
        <nav aria-label="Pages of files" className="flex items-center justify-center gap-3 pt-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 disabled:opacity-40 dark:border-slate-700"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
          <span className="text-xs text-slate-500 dark:text-slate-400">Page {page} of {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="Next page" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 disabled:opacity-40 dark:border-slate-700"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
        </nav>
      )}

      <input ref={replaceInput} type="file" tabIndex={-1} aria-hidden="true" className="sr-only" onChange={(e) => { const picked = e.target.files?.[0]; e.target.value = ''; void doReplace(picked); }} />

      {viewing && (
        <Modal isOpen onClose={() => setViewing(null)} title={viewing.file.name} maxWidth="max-w-3xl">
          {isImageType(viewing.file.type, viewing.file.name) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={viewing.url} alt={viewing.file.name} className="mx-auto max-h-[70vh] max-w-full rounded object-contain" />
          )}
          <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">{viewing.file.uploader?.name} · {formatSize(viewing.file.size)}</p>
        </Modal>
      )}
      {dialog}
    </div>
  );
}
