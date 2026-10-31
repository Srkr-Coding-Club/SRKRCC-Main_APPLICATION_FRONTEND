'use client';

import React, { useEffect, useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { statusMessage, type StatusInput } from '@/lib/hackathonOverview';
import { BTN_GHOST, BTN_PRIMARY } from '../shared';

/** A plain-text status the organizer can read, tweak and paste into the club's chat. Built when the dialog opens, so it is current. */
export function ShareSummary({ input }: { input: () => StatusInput }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { if (open) { setText(statusMessage(input())); setCopied(false); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked: select the text so Ctrl+C works.
      document.getElementById('status-message')?.focus();
      (document.getElementById('status-message') as HTMLTextAreaElement | null)?.select();
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${BTN_GHOST} min-h-10`}><Share2 className="h-3.5 w-3.5" aria-hidden="true" /> Share status</button>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Share a status message"
        icon={Share2}
        footer={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className={BTN_GHOST}>Close</button>
            <button type="button" onClick={copy} className={BTN_PRIMARY}>{copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />} {copied ? 'Copied' : 'Copy message'}</button>
          </div>
        }
      >
        <p className="mb-2 text-xs text-journey-muted">Plain text for WhatsApp or email. Change anything before you copy; it is made from the numbers on this page right now.</p>
        <label htmlFor="status-message" className="sr-only">Status message</label>
        <textarea id="status-message" value={text} onChange={(event) => setText(event.target.value)} rows={12} className="w-full rounded-lg border border-journey-text/10 bg-journey-text/[0.03] p-3 font-mono text-xs leading-relaxed text-journey-text focus:border-journey-accent focus:outline-none" />
        <p className="sr-only" role="status">{copied ? 'Message copied' : ''}</p>
      </Modal>
    </>
  );
}
