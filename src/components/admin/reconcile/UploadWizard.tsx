'use client';

import React, { useRef, useState } from 'react';
import { FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';
import { apiErrorMessage } from '@/lib/api/hackathons';
import { reconciliationApi, type ColumnMapping, type Inspection, type RunSummary } from '@/lib/reconciliation';

const SELECT = 'min-h-11 w-full rounded-lg border border-journey-text/15 bg-journey-surface px-3 text-base text-journey-text focus:border-journey-accent focus:outline-none sm:min-h-10 sm:text-sm';
const BUTTON = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-10';
const FIELDS: { key: keyof ColumnMapping; label: string; hint: string }[] = [
  { key: 'name', label: 'Name', hint: 'Used to spot a different person' },
  { key: 'email', label: 'Email', hint: 'How the person is found in the app' },
  { key: 'club_id', label: 'Club ID or Affiliate ID', hint: 'e.g. 25SCC277 or 21CCA041' },
];
const MAX_MB = 10;

/** Choose a sheet, say which column is which (we suggest), and compare. Nothing is changed in any account by this. */
export function UploadWizard({ onClose, onCreated }: { onClose: () => void; onCreated: (run: RunSummary) => void }) {
  const { toast } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [sheet, setSheet] = useState('');
  const [mapping, setMapping] = useState<ColumnMapping>({ name: '', email: '', club_id: '' });
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const inspect = async (chosen: File, sheetName?: string) => {
    setWorking(true);
    setError('');
    try {
      const result = await reconciliationApi.inspect(chosen, sheetName);
      setInspection(result);
      setSheet(result.sheet);
      setMapping(result.suggested);
    } catch (err) {
      setInspection(null);
      setError(apiErrorMessage(err, 'That file could not be read.'));
    } finally {
      setWorking(false);
    }
  };

  const pick = (chosen: File | undefined) => {
    if (!chosen) return;
    if (chosen.size > MAX_MB * 1024 * 1024) { setError(`That file is larger than ${MAX_MB} MB.`); return; }
    setFile(chosen);
    void inspect(chosen);
  };

  const compare = async () => {
    if (!file || !inspection) return;
    setWorking(true);
    setError('');
    try {
      const run = await reconciliationApi.create(file, inspection.sheets.length > 1 ? sheet : undefined, mapping);
      toast.success('Compared', `${run.total} rows read from ${run.filename}.`);
      onCreated(run);
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, 'The sheet could not be compared.'));
      setWorking(false);
    }
  };

  const ready = Boolean(inspection && (mapping.email || mapping.club_id));
  return (
    <Modal
      isOpen
      onClose={onClose}
      busy={working}
      title="Compare a past-member sheet"
      icon={FileSpreadsheet}
      footer={(
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} disabled={working} className={`${BUTTON} text-journey-muted hover:bg-journey-text/10`}>Cancel</button>
          <button type="button" onClick={compare} disabled={!ready || working} className={`${BUTTON} bg-journey-accent text-journey-on-accent hover:opacity-90`}>
            {working && inspection ? <><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Comparing…</> : `Compare ${inspection?.total_rows ?? ''} rows`}
          </button>
        </div>
      )}
    >
      <div className="space-y-4">
        <p className="text-sm text-journey-muted">Upload your Excel (.xlsx) or CSV. Each row is matched to an account by email and Club ID. <strong className="text-journey-text">Nothing is created or changed</strong> until you act on a row.</p>
        <div>
          <input ref={input} id="reconcile-file" type="file" accept=".xlsx,.csv" className="sr-only" onChange={(event) => pick(event.target.files?.[0])} />
          <button type="button" onClick={() => input.current?.click()} disabled={working} className="flex min-h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-journey-text/20 px-4 py-4 text-center hover:border-journey-accent">
            <Upload className="h-5 w-5 text-journey-accent" aria-hidden="true" />
            <span className="text-sm font-bold text-journey-text">{file ? file.name : 'Choose the Excel or CSV file'}</span>
            <span className="text-xs text-journey-muted">{file ? `${(file.size / 1024).toFixed(0)} KB` : `Up to ${MAX_MB} MB and 10,000 rows`}</span>
          </button>
        </div>
        {working && !inspection && <p className="flex items-center gap-2 text-sm text-journey-muted" role="status"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Reading the file…</p>}
        {error && <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        {inspection && (
          <>
            {inspection.sheets.length > 1 && (
              <div>
                <label htmlFor="reconcile-sheet" className="mb-1 block text-xs font-bold text-journey-text">Which sheet?</label>
                <select id="reconcile-sheet" className={SELECT} value={sheet} onChange={(event) => { setSheet(event.target.value); if (file) void inspect(file, event.target.value); }}>
                  {inspection.sheets.map((item) => <option key={item.name} value={item.name}>{item.name} ({item.rows} rows)</option>)}
                </select>
              </div>
            )}
            <fieldset className="space-y-3">
              <legend className="text-xs font-bold uppercase tracking-wider text-journey-muted">Which column is which?</legend>
              {FIELDS.map((field) => (
                <div key={field.key}>
                  <label htmlFor={`map-${field.key}`} className="mb-1 block text-xs font-bold text-journey-text">{field.label} <span className="font-normal text-journey-muted">· {field.hint}</span></label>
                  <select id={`map-${field.key}`} className={SELECT} value={mapping[field.key]} onChange={(event) => setMapping({ ...mapping, [field.key]: event.target.value })}>
                    <option value="">Not in the sheet</option>
                    {inspection.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                  </select>
                </div>
              ))}
              {!mapping.email && !mapping.club_id && <p className="text-xs text-rose-600 dark:text-rose-400">Choose the email column, the Club ID column, or both.</p>}
            </fieldset>
            {inspection.sample.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-journey-text/10" tabIndex={0} aria-label="First rows of the sheet">
                <table className="w-full min-w-[28rem] text-left text-xs">
                  <thead className="bg-journey-text/5 text-journey-muted"><tr>{inspection.headers.slice(0, 6).map((header) => <th key={header} scope="col" className="px-3 py-2 font-bold">{header}</th>)}</tr></thead>
                  <tbody className="divide-y divide-journey-text/10">
                    {inspection.sample.map((row, index) => <tr key={index}>{inspection.headers.slice(0, 6).map((header) => <td key={header} className="max-w-[12rem] truncate px-3 py-2 text-journey-text" title={row[header]}>{row[header]}</td>)}</tr>)}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
