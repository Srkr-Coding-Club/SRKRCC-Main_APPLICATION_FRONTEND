'use client';

import React, { useState } from 'react';
import { ExternalLink, Mail, Pencil, Phone } from 'lucide-react';
import type { DirectoryUser } from '@/lib/userDirectory';
import { EmailStatusBadge, emailStatusText } from './EmailStatusBadge';

const FIELD = 'rounded-xl border border-journey-text/10 bg-journey-text/[0.03] p-3.5';
const BUTTON = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-10';

const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
const link = (url: string) => (url.startsWith('http') ? url : `https://${url}`);

function Field({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className={FIELD}>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-journey-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-semibold text-journey-text">{children || <span className="font-normal italic text-journey-muted">Not set</span>}</dd>
    </div>
  );
}

export interface VerificationActions {
  busy: boolean;
  onMarkVerified: () => void;
  onExtend: (days: number) => void;
  onResend: () => void;
}

interface UserDetailPanelProps {
  user: DirectoryUser;
  /** Only a full admin may vouch for, extend or resend a person's email; a club lead only reads the state. */
  verification: VerificationActions | null;
  onEdit: () => void;
}

/** Everything about one person: who they are, whether their email is proved, and the controls to fix it. */
export function UserDetailPanel({ user, verification, onEdit }: UserDetailPanelProps) {
  const [days, setDays] = useState('7');
  const college = user.college?.name || user.other_college_name;
  const unverified = user.email_state !== 'VERIFIED';
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-extrabold text-journey-text">{user.full_name}</h3>
          <p className="break-all text-sm text-journey-muted">{user.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {user.club_id && <span className="rounded-lg border border-journey-accent/30 bg-journey-accent/10 px-2.5 py-0.5 font-mono text-xs font-bold text-journey-accent">{user.club_id}</span>}
            <span className="rounded bg-journey-text/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-journey-text">{user.role}</span>
            <span className="rounded bg-journey-text/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-journey-muted">{user.membership_status}</span>
          </div>
        </div>
        <button type="button" onClick={onEdit} className={`${BUTTON} shrink-0 bg-journey-accent text-journey-on-accent hover:opacity-90`}><Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit</button>
      </div>

      <section aria-label="Email verification" className="space-y-3 rounded-xl border border-journey-text/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-journey-text">Email verification</h4>
          <EmailStatusBadge user={user} />
        </div>
        <p className="text-sm text-journey-muted">{emailStatusText(user)}.</p>
        <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
          <div><dt className="font-bold uppercase text-journey-muted">Verified</dt><dd className="text-journey-text">{when(user.email_verified_at) || 'Not yet'}</dd></div>
          {unverified && <div><dt className="font-bold uppercase text-journey-muted">Deadline</dt><dd className="text-journey-text">{when(user.email_deadline) || 'None'}</dd></div>}
          {user.email_disputed_at && <div className="sm:col-span-2"><dt className="font-bold uppercase text-rose-600 dark:text-rose-400">Disputed</dt><dd className="text-journey-text">{when(user.email_disputed_at)}: the address owner said they did not sign up. Check before verifying.</dd></div>}
          <div><dt className="font-bold uppercase text-journey-muted">Last sign-in</dt><dd className="text-journey-text">{when(user.last_login) || 'Never'}</dd></div>
          <div><dt className="font-bold uppercase text-journey-muted">Password</dt><dd className="text-journey-text">{user.password_status === 'NEEDS_SETUP' ? 'Not set up yet (imported account)' : 'Set'}</dd></div>
        </dl>
        {unverified && verification && (
          <div className="flex flex-wrap items-end gap-2 border-t border-journey-text/10 pt-3">
            <button type="button" onClick={verification.onMarkVerified} disabled={verification.busy} className={`${BUTTON} bg-emerald-600 text-white hover:bg-emerald-700`}>Mark as verified</button>
            <button type="button" onClick={verification.onResend} disabled={verification.busy} className={`${BUTTON} border border-journey-text/15 text-journey-text hover:bg-journey-text/10`}><Mail className="h-3.5 w-3.5" aria-hidden="true" /> Resend link</button>
            <span className="flex items-end gap-2">
              <label className="text-[11px] font-bold text-journey-muted">
                Give more time
                <select value={days} onChange={(event) => setDays(event.target.value)} className="mt-1 block min-h-11 rounded-lg border border-journey-text/15 bg-journey-surface px-2 text-xs font-bold text-journey-text sm:min-h-10">
                  {[3, 7, 14, 30].map((option) => <option key={option} value={option}>{option} days</option>)}
                </select>
              </label>
              <button type="button" onClick={() => verification.onExtend(Number(days))} disabled={verification.busy} className={`${BUTTON} border border-journey-text/15 text-journey-text hover:bg-journey-text/10`}>Extend</button>
            </span>
          </div>
        )}
        {unverified && !verification && <p className="border-t border-journey-text/10 pt-3 text-xs text-journey-muted">Only an Admin can verify, resend or extend.</p>}
      </section>

      <dl className="grid grid-cols-2 gap-3">
        <Field label="Roll number"><span className="font-mono">{user.roll_number}</span></Field>
        <Field label="Branch / year">{[user.branch, user.year ? `Year ${user.year}` : ''].filter(Boolean).join(' · ')}</Field>
        <Field label="College">{college}</Field>
        <Field label="Phone">{user.phone_number && <a href={`tel:${user.phone_number}`} className="inline-flex items-center gap-1 text-journey-accent hover:underline"><Phone className="h-3 w-3" aria-hidden="true" /> {user.phone_number}</a>}</Field>
        <Field label="Referred by">{user.referred_by_display}</Field>
        <Field label="Member since">{when(user.registered_at || user.created_at)}</Field>
      </dl>

      {(user.github_profile || user.linkedin_profile) && (
        <div className={`${FIELD} flex flex-wrap gap-4 text-xs font-semibold`}>
          {user.github_profile && <a href={link(user.github_profile)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-journey-accent hover:underline">GitHub <ExternalLink className="h-3 w-3" aria-hidden="true" /></a>}
          {user.linkedin_profile && <a href={link(user.linkedin_profile)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-journey-accent hover:underline">LinkedIn <ExternalLink className="h-3 w-3" aria-hidden="true" /></a>}
        </div>
      )}

      <p className="text-xs text-journey-muted">Account source: <strong className="text-journey-text">{user.created_from}</strong> · created {when(user.created_at)}</p>
    </div>
  );
}
