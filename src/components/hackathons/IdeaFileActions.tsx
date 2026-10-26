'use client';

import React, { useState } from 'react';
import { Download, Eye, FileText } from 'lucide-react';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { formatSize } from '@/lib/fileUpload';
import { previewKindOf } from '@/lib/filePreview';
import { FilePreviewDialog } from './FilePreviewDialog';

interface IdeaFileActionsProps {
  slug: string;
  ideaId: number;
  kind: 'deck' | 'payment';
  file: { name: string; size: number; type: string };
  /** Shown before the name, e.g. "Payment screenshot". */
  label?: string;
}

/** A saved idea file: the name with Preview (PDF, images) and Download. The links are fetched when used and expire in a minute. */
export function IdeaFileActions({ slug, ideaId, kind, file, label }: IdeaFileActionsProps) {
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState('');
  const canPreview = previewKindOf(file.type, file.name) !== null;

  const download = async () => {
    setError('');
    try {
      const link = await hackathonApi.ideaFileLink(slug, ideaId, kind, false);
      window.location.assign(link.url);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not download the file.'));
    }
  };
  const loadPreview = async () => (await hackathonApi.ideaFileLink(slug, ideaId, kind, true)).url;
  const button = 'inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-journey-text/15 px-3 text-xs font-semibold text-journey-text hover:bg-journey-text/5 dark:border-slate-700';

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold text-journey-text">
          <FileText className="h-4 w-4 shrink-0 text-journey-accent" aria-hidden="true" />
          {label && <span className="font-bold">{label}</span>}
          <span className="max-w-[14rem] truncate">{file.name}</span>
          <span className="font-normal text-journey-muted">{formatSize(file.size)}</span>
        </span>
        {canPreview && (
          <button type="button" onClick={() => setPreviewing(true)} aria-label={`Preview ${file.name}`} className={button}>
            <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Preview
          </button>
        )}
        <button type="button" onClick={download} aria-label={`Download ${file.name}`} className={button}>
          <Download className="h-3.5 w-3.5" aria-hidden="true" /> Download
        </button>
      </div>
      {!canPreview && <p className="text-[11px] text-journey-muted">PowerPoint files cannot be previewed in the browser. Download to open.</p>}
      {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      {previewing && (
        <FilePreviewDialog name={file.name} type={file.type} source={{ kind: 'saved', loadUrl: loadPreview }} onClose={() => setPreviewing(false)} onDownload={download} />
      )}
    </div>
  );
}
