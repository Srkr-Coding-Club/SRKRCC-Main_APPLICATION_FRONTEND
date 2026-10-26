'use client';

import React, { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { apiErrorMessage } from '@/lib/api/hackathons';
import { previewKindOf, type PreviewKind } from '@/lib/filePreview';

/** Where the preview comes from: a file the person just picked (nothing leaves the browser) or a saved file behind a short-lived signed link. */
export type PreviewSource =
  | { kind: 'local'; file: File }
  | { kind: 'saved'; loadUrl: () => Promise<string> };

interface FilePreviewDialogProps {
  name: string;
  type: string;
  source: PreviewSource;
  onClose: () => void;
  /** Saved files: the way to download. */
  onDownload?: () => void;
}

/** A PDF in the browser's own viewer, or an image, inside a dialog. PowerPoint cannot be shown in a browser: it is download-only. */
export function FilePreviewDialog({ name, type, source, onClose, onDownload }: FilePreviewDialogProps) {
  const kind: PreviewKind | null = previewKindOf(type, name);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!kind) return undefined;
    let cancelled = false;
    let objectUrl = '';
    if (source.kind === 'local') {
      objectUrl = URL.createObjectURL(source.file);
      setUrl(objectUrl);
    } else {
      source.loadUrl().then((next) => { if (!cancelled) setUrl(next); }).catch((err) => { if (!cancelled) setError(apiErrorMessage(err, 'Could not open the file.')); });
    }
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // The source object is recreated by the caller on every render; its identity is not what decides when to reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, name]);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={name}
      icon={FileText}
      maxWidth="max-w-4xl"
      footer={onDownload ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">Blank preview? Your browser may not show PDFs inline. Download the file instead.</p>
          <button type="button" onClick={onDownload} aria-label={`Download ${name}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            <Download className="h-3.5 w-3.5" aria-hidden="true" /> Download
          </button>
        </div>
      ) : undefined}
    >
      {!kind ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">This kind of file cannot be previewed in the browser. Download it to open it.</p>
      ) : error ? (
        <p role="alert" className="text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>
      ) : !url ? (
        <div className="h-64 animate-pulse rounded-lg bg-slate-200/60 dark:bg-white/5" aria-busy="true" aria-label="Loading preview" />
      ) : kind === 'pdf' ? (
        <iframe title={`Preview of ${name}`} src={url} className="h-[70dvh] w-full rounded-lg border border-slate-200 bg-white dark:border-slate-700" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`Preview of ${name}`} className="mx-auto max-h-[70dvh] max-w-full rounded-lg border border-slate-200 object-contain dark:border-slate-700" />
      )}
    </Modal>
  );
}
