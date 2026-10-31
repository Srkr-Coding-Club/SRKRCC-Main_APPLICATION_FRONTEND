'use client';

import React, { useState } from 'react';
import { Loader2, Mail, Send } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';
import { fetchApi } from '@/lib/api-client';
import { apiErrorMessage } from '@/lib/api/hackathons';
import { directoryApi, type DirectoryFilters, type DirectoryScope } from '@/lib/userDirectory';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';

const INPUT = 'w-full rounded-xl border border-journey-text/15 bg-journey-surface px-3.5 py-2.5 text-base text-journey-text focus:border-journey-accent focus:outline-none sm:text-sm';

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  scope: DirectoryScope;
  filters: DirectoryFilters;
  /** How many people the filters match (what the person is about to email). */
  count: number;
}

/** An email to everyone the current filters match: the count is shown and confirmed before anything is sent. */
export function BroadcastModal({ isOpen, onClose, scope, filters, count }: BroadcastModalProps) {
  const { toast } = useToast();
  const { confirm, dialog } = useConfirmDialog();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error('Missing fields', 'Please enter both a subject and a message.');
      return;
    }
    const ok = await confirm({ title: `Email ${count} ${count === 1 ? 'person' : 'people'}?`, message: 'Everyone matching the current filters gets this email. It cannot be undone.', confirmLabel: 'Send email' });
    if (!ok) return;
    setSending(true);
    try {
      const { recipients, truncated, limit } = await directoryApi.recipients(filters, scope);
      if (truncated) {
        toast.error('Too many people', `At most ${limit} people can be emailed at once. Narrow the filters first.`);
        return;
      }
      await fetchApi('/auth/emails/send/', {
        method: 'POST',
        body: JSON.stringify({ template_name: 'member_announcement', recipients: recipients.map((row) => row.email), campaign_name: subject.trim(), message: message.trim() }),
      });
      toast.success('Email queued', `Sent to ${recipients.length} ${recipients.length === 1 ? 'person' : 'people'}.`);
      setSubject('');
      setMessage('');
      onClose();
    } catch (err) {
      toast.error('Could not send', apiErrorMessage(err, 'The email could not be queued.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {dialog}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        busy={sending}
        title="Email these people"
        icon={Mail}
        footer={(
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={onClose} disabled={sending} className="min-h-11 rounded-xl px-4 text-xs font-bold text-journey-muted hover:bg-journey-text/10 sm:min-h-10">Cancel</button>
            <button type="button" onClick={send} disabled={sending} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-journey-accent px-4 text-xs font-bold text-journey-on-accent hover:opacity-90 disabled:opacity-50 sm:min-h-10">
              {sending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Sending…</> : <><Send className="h-3.5 w-3.5" aria-hidden="true" /> Send to {count}</>}
            </button>
          </div>
        )}
      >
        <div className="space-y-4">
          <p className="text-sm text-journey-muted">Goes to <strong className="text-journey-text">{count}</strong> {count === 1 ? 'person' : 'people'} matching the current search and filters.</p>
          <div>
            <label htmlFor="broadcast-subject" className="mb-1 block text-xs font-bold text-journey-text">Subject</label>
            <input id="broadcast-subject" value={subject} onChange={(event) => setSubject(event.target.value)} className={INPUT} placeholder="e.g. Welcome to SRKR Coding Club" />
          </div>
          <div>
            <label htmlFor="broadcast-message" className="mb-1 block text-xs font-bold text-journey-text">Message</label>
            <textarea id="broadcast-message" rows={5} value={message} onChange={(event) => setMessage(event.target.value)} className={INPUT} placeholder="Hello {{full_name}}, your Club ID is {{club_id}}…" />
            <p className="mt-1 text-[11px] text-journey-muted">You can use {'{{full_name}}'}, {'{{club_id}}'}, {'{{branch}}'} and {'{{email}}'}.</p>
          </div>
        </div>
      </Modal>
    </>
  );
}
