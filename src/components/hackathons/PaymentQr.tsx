'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, QrCode } from 'lucide-react';
import { hackathonApi } from '@/lib/api/hackathons';

/**
 * The QR code the organizers uploaded for paying. Its link lasts one minute, so it is fetched when this appears
 * (and again after a failure or when `version` changes, e.g. a new QR was uploaded).
 */
export function PaymentQr({ slug, version, size = 224, className = '', loadLink }: {
  slug: string; version?: string; size?: number; className?: string;
  /** Where the link comes from when it is not the hackathon's own QR (a payment step's). */
  loadLink?: () => Promise<{ url: string }>;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    setUrl(null);
    (loadLink ? loadLink() : hackathonApi.ideaQrLink(slug)).then((link) => setUrl(link.url)).catch(() => setFailed(true));
    // loadLink is recreated by the caller on every render; `version` says when to load again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(load, [load, version]);

  return (
    <div className={`inline-flex flex-col items-center gap-2 ${className}`}>
      <div className="flex items-center justify-center overflow-hidden rounded-xl border border-journey-text/10 bg-white p-2" style={{ width: size, height: size }}>
        {url && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Payment QR code" onError={() => setFailed(true)} className="h-full w-full object-contain" />
        ) : failed ? (
          <div className="space-y-2 p-2 text-center text-xs text-slate-600">
            <QrCode className="mx-auto h-6 w-6 text-slate-500 dark:text-slate-400" aria-hidden="true" />
            <p>The QR code could not be loaded.</p>
            <button type="button" onClick={load} className="font-bold text-orange-800 underline">Try again</button>
          </div>
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-slate-500 dark:text-slate-400" aria-label="Loading the QR code" />
        )}
      </div>
    </div>
  );
}
