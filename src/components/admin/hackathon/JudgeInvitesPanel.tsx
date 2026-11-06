'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { MailPlus, RefreshCw, UserX } from 'lucide-react';
import type { JudgeInviteRow, JudgeInviteState } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusPill, type PillTone } from '@/components/ui/StatusPill';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, INPUT, LABEL, TAP } from './shared';

const STATE: Record<JudgeInviteState, { tone: PillTone; label: string }> = {
  INVITED: { tone: 'amber', label: 'Waiting for them' },
  ACTIVE: { tone: 'green', label: 'Ready' },
  EXPIRED: { tone: 'orange', label: 'Link expired' },
  REVOKED: { tone: 'slate', label: 'Revoked' },
};

const EMAIL = /[^\s<>,;"']+@[^\s<>,;"']+\.[^\s<>,;"']+/;

/** "Asha Rao, asha@x.org" or "Asha Rao <asha@x.org>" or just an address, one per line. */
export function parseJudgeLines(text: string): { name: string; email: string }[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const email = line.match(EMAIL)?.[0] ?? '';
    const name = line.replace(email, '').replace(/[<>,;"']/g, ' ').replace(/\s+/g, ' ').trim();
    return { name: name || email.split('@')[0], email };
  });
}

interface JudgeInvitesPanelProps {
  slug: string;
  /** Called after the list changed (someone invited or revoked) so a panel picker can reload its judges. */
  onChanged?: () => void;
}

/** Invite judges by name and email: new people get a one-time link to choose their own password, nobody handles a password. */
export function JudgeInvitesPanel({ slug, onChanged }: JudgeInvitesPanelProps) {
  const { toast } = useToast();
  const { confirm, dialog } = useConfirmDialog();
  const [invites, setInvites] = useState<JudgeInviteRow[]>([]);
  const [several, setSeveral] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pasted, setPasted] = useState('');
  const [busy, setBusy] = useState<number | 'form' | null>(null);
  const [problem, setProblem] = useState('');

  const load = useCallback(() => {
    hackathonApi.admin.judgeInvites(slug).then(setInvites).catch(() => setInvites([]));
  }, [slug]);
  useEffect(load, [load]);

  const done = () => { load(); onChanged?.(); };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setProblem('');
    setBusy('form');
    try {
      if (several) {
        const rows = parseJudgeLines(pasted);
        if (rows.length === 0) { setProblem('Paste at least one email address.'); return; }
        const { results } = await hackathonApi.admin.inviteJudges(slug, rows);
        const failed = results.filter((row) => !row.ok);
        const sent = results.length - failed.length;
        if (sent) toast.success(`${sent} judge${sent === 1 ? '' : 's'} invited`);
        if (failed.length) {
          setProblem(failed.map((row) => `${'email' in row ? row.email : ''}: ${'detail' in row ? row.detail : ''}`).join(' '));
          setPasted(failed.map((row) => ('email' in row ? row.email : '')).join('\n'));
        } else {
          setPasted('');
        }
      } else {
        const invite = await hackathonApi.admin.inviteJudge(slug, { name: name.trim(), email: email.trim() });
        if (invite.email_sent === false) toast.warning('Invited, but the email did not go out', 'Use Resend to try again.');
        else toast.success(`${invite.name} invited`, invite.state === 'ACTIVE' ? 'They already had an account and can sign in.' : 'They got a link to choose their password.');
        setName('');
        setEmail('');
      }
      done();
    } catch (err) {
      setProblem(apiErrorMessage(err, 'Could not send the invitation.'));
    } finally {
      setBusy(null);
    }
  };

  const resend = async (invite: JudgeInviteRow) => {
    setBusy(invite.id);
    try {
      const sent = await hackathonApi.admin.resendJudgeInvite(slug, invite.id);
      if (sent.email_sent === false) toast.warning('The email did not go out', 'Try again in a minute.');
      else toast.success(`Sent a new link to ${invite.email}`);
      load();
    } catch (err) {
      toast.error('Could not resend', apiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const revoke = async (invite: JudgeInviteRow) => {
    const ok = await confirm({
      title: `Revoke ${invite.name}?`,
      message: 'They are removed from this hackathon\'s judges and any unused link stops working. Their account is kept.',
      confirmLabel: 'Revoke', danger: true,
    });
    if (!ok) return;
    setBusy(invite.id);
    try {
      await hackathonApi.admin.revokeJudgeInvite(slug, invite.id);
      toast.success(`${invite.name} revoked`);
      done();
    } catch (err) {
      toast.error('Could not revoke', apiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Give a name and an email. Someone new gets an account and a one-time link, valid for 7 days, to choose their own password: nobody ever sees or sends a password.
        Someone who already has an account is simply added. People on a team in this hackathon cannot be judges.
      </p>
      <form onSubmit={submit} className="space-y-2" aria-label="Invite judges">
        {several ? (
          <div>
            <label htmlFor="judge-invite-list" className={LABEL}>One judge per line</label>
            <textarea
              id="judge-invite-list" rows={4} value={pasted} onChange={(e) => setPasted(e.target.value)} className={INPUT}
              placeholder={'Asha Rao, asha@college.ac.in\nBen Roy <ben@company.com>'}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label htmlFor="judge-invite-name" className={LABEL}>Name</label>
              <input id="judge-invite-name" required value={name} maxLength={100} onChange={(e) => setName(e.target.value)} className={INPUT} placeholder="Dr. Asha Rao" />
            </div>
            <div>
              <label htmlFor="judge-invite-email" className={LABEL}>Email</label>
              <input id="judge-invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} placeholder="name@college.ac.in" />
            </div>
          </div>
        )}
        {problem && <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">{problem}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={busy === 'form'} className={`${BTN_PRIMARY} ${TAP}`}><MailPlus className="h-3.5 w-3.5" /> {busy === 'form' ? 'Sending…' : 'Send invitation'}</button>
          <button type="button" onClick={() => { setSeveral((v) => !v); setProblem(''); }} className={`${BTN_GHOST} ${TAP}`}>{several ? 'Invite one person' : 'Invite several at once'}</button>
        </div>
      </form>

      {invites.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800" aria-label="Invitations">
          {invites.map((invite) => {
            const state = STATE[invite.state];
            return (
              <li key={invite.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#1A1A2E] dark:text-white">{invite.name}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {invite.email}{invite.last_sent_at ? ` · sent ${formatDateTime(invite.last_sent_at)}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusPill tone={state.tone}>{state.label}</StatusPill>
                  {(invite.state === 'INVITED' || invite.state === 'EXPIRED') && (
                    <button type="button" onClick={() => void resend(invite)} disabled={busy !== null} className={`${BTN_GHOST} ${TAP}`} aria-label={`Resend the link to ${invite.email}`}>
                      <RefreshCw className="h-3.5 w-3.5" /> Resend
                    </button>
                  )}
                  {invite.state !== 'REVOKED' && (
                    <button type="button" onClick={() => void revoke(invite)} disabled={busy !== null} className={`${BTN_DANGER} ${TAP}`} aria-label={`Revoke ${invite.email}`}>
                      <UserX className="h-3.5 w-3.5" /> Revoke
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {dialog}
    </div>
  );
}
