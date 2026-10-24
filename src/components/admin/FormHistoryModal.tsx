'use client';

import { useDialog } from '@/lib/hooks/useDialog';
import React, { useCallback, useEffect, useState } from 'react';
import { History, RotateCcw, X } from 'lucide-react';
import Portal from '@/components/ui/Portal';
import { FormChanges } from '@/components/admin/FormChanges';
import { fetchApi } from '@/lib/api-client';
import { FormDiff, VersionRow, plural, whenText } from '@/lib/formHistory';

interface VersionDetail { version: number; note: string; created_at: string; diff: FormDiff | null }

/** Every saved version of a form, what changed in each, and a way back to any of them. */
export function FormHistoryModal({ slug, isOpen, onClose, onRestored }: {
  slug: string; isOpen: boolean; onClose: () => void; onRestored: () => void | Promise<unknown>;
}) {
  const [rows, setRows] = useState<VersionRow[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [against, setAgainst] = useState<'previous' | 'current'>('previous');
  const [detail, setDetail] = useState<VersionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    setSelected(null);
    setDetail(null);
    fetchApi<VersionRow[]>(`/forms/${slug}/versions/`)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setRows(list);
        if (list.length) setSelected(list[0].version);
      })
      .catch((e: Error) => setError(e.message || 'Could not load the history.'))
      .finally(() => setLoading(false));
  }, [isOpen, slug]);

  const loadDetail = useCallback(async () => {
    if (selected === null) return;
    try {
      const query = against === 'current' ? '?against=current' : '';
      setDetail(await fetchApi<VersionDetail>(`/forms/${slug}/versions/${selected}/${query}`));
    } catch (e) {
      setError((e as Error).message || 'Could not load that version.');
    }
  }, [slug, selected, against]);

  useEffect(() => {
    setConfirming(false);
    setDetail(null);
    void loadDetail();
  }, [loadDetail]);

  const dialogRef = useDialog(onClose);
  if (!isOpen) return null;

  const current = rows.find((r) => r.is_current);
  const chosen = rows.find((r) => r.version === selected);

  const restore = async () => {
    if (selected === null) return;
    setRestoring(true);
    setError(null);
    try {
      await fetchApi(`/forms/${slug}/versions/${selected}/restore/`, { method: 'POST' });
      await onRestored();
      onClose();
    } catch (e: any) {
      const first = e?.body?.errors?.[0]?.message;
      setError(first || e?.message || 'Could not restore that version.');
      setConfirming(false);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Portal>
      <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 outline-none" role="dialog" aria-modal="true" aria-label="Form history">
        <div className="glass-panel rounded-xl max-w-4xl w-full h-[80vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-4">
            <div className="flex items-center gap-2 text-[#FF7A00]">
              <History className="w-5 h-5" />
              <h3 className="text-base font-bold text-[#1A1A2E] dark:text-white">Form history</h3>
            </div>
            <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg text-slate-400 hover:text-[#1A1A2E] dark:hover:text-white active:scale-90">
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && <p role="alert" className="mx-4 mt-3 text-xs font-semibold text-rose-500">{error}</p>}

          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[16rem_1fr]">
            <ul className="border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 overflow-y-auto max-h-48 md:max-h-none" aria-label="Versions">
              {loading && <li className="p-4 text-xs text-slate-400">Loading...</li>}
              {!loading && rows.length === 0 && <li className="p-4 text-xs text-slate-400">No saved versions yet.</li>}
              {rows.map((row) => (
                <li key={row.version}>
                  <button
                    onClick={() => setSelected(row.version)}
                    aria-current={selected === row.version}
                    className={`w-full text-left px-4 py-3 border-b border-slate-100 dark:border-slate-800/60 text-xs ${
                      selected === row.version ? 'bg-orange-50 dark:bg-orange-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#1A1A2E] dark:text-white">Version {row.version}</span>
                      {row.is_current && <span className="text-[10px] font-bold text-emerald-600">Current</span>}
                    </span>
                    <span className="block text-slate-500">{row.note || 'Saved'}</span>
                    <span className="block text-slate-400">{whenText(row.created_at)}{row.created_by ? ` · ${row.created_by}` : ''}</span>
                    {row.summary && !(row.summary.settings + row.summary.added + row.summary.removed + row.summary.changed === 0 && !row.summary.reordered) && (
                      <span className="block text-slate-400 mt-0.5">
                        {[
                          row.summary.added && `+${row.summary.added}`,
                          row.summary.removed && `-${row.summary.removed}`,
                          row.summary.changed && `~${row.summary.changed}`,
                          row.summary.settings && plural(row.summary.settings, 'setting'),
                        ].filter(Boolean).join('  ')}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chosen && (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-[#1A1A2E] dark:text-white">Version {chosen.version}</h4>
                      <div className="inline-flex rounded border border-slate-300 dark:border-slate-700 text-[11px] font-bold overflow-hidden" role="group" aria-label="Compare with">
                        <button onClick={() => setAgainst('previous')} aria-pressed={against === 'previous'}
                          className={`px-3 py-1.5 ${against === 'previous' ? 'bg-[#FF7A00] text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                          What this version changed
                        </button>
                        <button onClick={() => setAgainst('current')} aria-pressed={against === 'current'}
                          className={`px-3 py-1.5 ${against === 'current' ? 'bg-[#FF7A00] text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                          What going back would change
                        </button>
                      </div>
                    </div>
                    {detail?.diff ? <FormChanges diff={detail.diff} /> : detail ? <p className="text-xs text-slate-500">This is the first saved version.</p> : <p className="text-xs text-slate-400">Loading...</p>}
                  </>
                )}
              </div>

              {chosen && !chosen.is_current && (
                <div className="border-t border-slate-100 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-2">
                  {confirming ? (
                    <>
                      <p className="text-xs text-slate-500 max-w-md">
                        Go back to version {chosen.version}? It is saved as version {(current?.version ?? chosen.version) + 1}; nothing is lost and responses stay as they are.
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => setConfirming(false)} className="px-3 py-2 rounded border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">Cancel</button>
                        <button onClick={restore} disabled={restoring} className="px-3 py-2 rounded bg-[#FF7A00] text-white text-xs font-bold disabled:opacity-50">
                          {restoring ? 'Restoring...' : `Restore version ${chosen.version}`}
                        </button>
                      </div>
                    </>
                  ) : (
                    <button onClick={() => setConfirming(true)} className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded border border-[#FF7A00] text-[#FF7A00] text-xs font-bold active:scale-95">
                      <RotateCcw className="w-3.5 h-3.5" /> Restore this version
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
