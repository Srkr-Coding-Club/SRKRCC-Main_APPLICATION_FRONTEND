'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { fileLink } from '@/lib/formFiles';
import { formatSize, isImageType } from '@/lib/fileUpload';

/** Opens a stored file: images and PDFs in a new tab, everything else as a download. The link is fetched on click. */
export async function openStoredFile(slug: string, id: string, type: string, download = false) {
  const viewable = !download && (isImageType(type, '') || type === 'application/pdf');
  const link = await fileLink(slug, id, viewable);
  if (viewable) window.open(link.url, '_blank', 'noopener,noreferrer');
  else window.location.assign(link.url);
}

/** The picture of an image file (loaded when it scrolls into view), or an icon for anything else. */
export function FileThumb({ slug, id, type, name, className = 'h-16 w-16' }: { slug: string; id: string; type: string; name: string; className?: string }) {
  const image = isImageType(type, name);
  const holder = useRef<HTMLSpanElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!image) return;
    let live = true;
    const load = () => fileLink(slug, id, true).then((l) => live && setSrc(l.url)).catch(() => live && setFailed(true));
    if (typeof IntersectionObserver === 'undefined' || !holder.current) { void load(); return () => { live = false; }; }
    const watcher = new IntersectionObserver((seen) => { if (seen[0].isIntersecting) { watcher.disconnect(); void load(); } });
    watcher.observe(holder.current);
    return () => { live = false; watcher.disconnect(); };
  }, [slug, id, image]);

  return (
    <span ref={holder} className={`${className} flex shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800`}>
      {image && src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <FileText className="h-5 w-5 text-slate-400" aria-hidden="true" />
      )}
    </span>
  );
}

/** A file inside a response (table cell or drawer): thumbnail, name and size; click to open. */
export function StoredFile({ slug, file }: { slug: string; file: { upload_id: string; name: string; size?: number; type?: string } }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const type = file.type || '';
  const open = async (event: React.MouseEvent) => {
    event.stopPropagation();
    setBusy(true);
    setError(false);
    try { await openStoredFile(slug, file.upload_id, type); } catch { setError(true); } finally { setBusy(false); }
  };
  return (
    <button
      type="button"
      onClick={open}
      disabled={busy}
      title={error ? 'This file is not available any more' : `Open ${file.name}`}
      className="flex max-w-[140px] flex-col items-center gap-1 text-[11px] font-semibold text-blue-500 hover:text-blue-400 disabled:opacity-60"
    >
      <FileThumb slug={slug} id={file.upload_id} type={type} name={file.name} />
      <span className="max-w-[130px] truncate">{file.name}</span>
      {error ? <span className="font-normal not-italic text-rose-500">unavailable</span> : file.size ? <span className="flex items-center gap-1 font-normal text-slate-500"><Download className="h-3 w-3" aria-hidden="true" />{formatSize(file.size)}</span> : null}
    </button>
  );
}
