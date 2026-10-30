import React from 'react';
import { AlertTriangle, BadgeCheck, Clock, MailQuestion } from 'lucide-react';
import { StatusPill, type PillTone } from '@/components/ui/StatusPill';
import type { DirectoryUser } from '@/lib/userDirectory';

const SHORT_DATE: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

/** The sentence a screen reader (and the tooltip) gets for a person's email state. */
export function emailStatusText(user: Pick<DirectoryUser, 'email_state' | 'email_verified_at' | 'email_days_left'>): string {
  switch (user.email_state) {
    case 'VERIFIED':
      return user.email_verified_at ? `Email verified on ${new Date(user.email_verified_at).toLocaleDateString('en-IN', SHORT_DATE)}` : 'Email verified';
    case 'OVERDUE':
      return 'Email not verified and past its deadline';
    case 'DISPUTED':
      return "Email not verified: the owner said it was not them";
    default:
      return user.email_days_left === null ? 'Email not verified' : `Email not verified, ${user.email_days_left} ${user.email_days_left === 1 ? 'day' : 'days'} left`;
  }
}

/** Whether a person has proved their email address: the first thing an organizer wants to know about a sign-up. */
export function EmailStatusBadge({ user, compact = false }: { user: DirectoryUser; compact?: boolean }) {
  const text = emailStatusText(user);
  let tone: PillTone = 'amber';
  let label = 'Unverified';
  let Icon = MailQuestion;
  if (user.email_state === 'VERIFIED') { tone = 'green'; label = 'Verified'; Icon = BadgeCheck; }
  else if (user.email_state === 'OVERDUE') { tone = 'red'; label = 'Overdue'; Icon = AlertTriangle; }
  else if (user.email_state === 'DISPUTED') { tone = 'red'; label = 'Disputed'; Icon = AlertTriangle; }
  else if (!compact && user.email_days_left !== null) { label = `Unverified · ${user.email_days_left}d left`; Icon = Clock; }
  return (
    <span title={text} className="inline-flex">
      <StatusPill tone={tone} icon={Icon}>{label}</StatusPill>
      <span className="sr-only">{text}</span>
    </span>
  );
}
