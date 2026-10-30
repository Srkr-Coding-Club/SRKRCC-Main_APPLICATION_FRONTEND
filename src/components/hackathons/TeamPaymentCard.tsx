'use client';

import React from 'react';
import { CheckCircle2, Clock, IndianRupee, Mail, Phone, XCircle } from 'lucide-react';
import type { Hackathon, HackathonTeam, TeamPaymentSummary } from '@/lib/types';
import { StatusPill } from '@/components/ui/StatusPill';
import { BTN_QUIET, H2, PANEL } from './dashboardStyles';
import { formatDateTime } from './HackathonAnnouncementsFeed';

interface TeamPaymentCardProps {
  hackathon: Hackathon;
  team: HackathonTeam;
  payment: TeamPaymentSummary | null;
  isLeader: boolean;
  busy: boolean;
  onCancel: () => void;
}

/** The club representatives to ask when something is wrong with a payment: the contacts the organizers listed on the hackathon. */
export function ClubContacts({ hackathon }: { hackathon: Hackathon }) {
  const contacts = (hackathon.contacts ?? []).filter((contact) => contact.name || contact.email || contact.phone);
  if (contacts.length === 0) return <p className="text-xs text-journey-muted">Ask the organizers of {hackathon.title}.</p>;
  return (
    <ul aria-label="Club representatives" className="space-y-2">
      {contacts.map((contact) => (
        <li key={`${contact.name}-${contact.email}`} className="rounded-lg border border-journey-text/10 bg-journey-text/[0.03] px-3 py-2 text-sm">
          <p className="font-semibold text-journey-text">{contact.name}{contact.role && <span className="ml-2 text-xs font-normal text-journey-muted">{contact.role}</span>}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {contact.email && <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 font-semibold text-journey-accent hover:underline"><Mail className="h-3 w-3" aria-hidden="true" /> {contact.email}</a>}
            {contact.phone && <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 font-semibold text-journey-accent hover:underline"><Phone className="h-3 w-3" aria-hidden="true" /> {contact.phone}</a>}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** A team whose registration fee is waiting for an organizer, or was turned down. It holds no place until the payment is verified. */
export function TeamPaymentCard({ hackathon, team, payment, isLeader, busy, onCancel }: TeamPaymentCardProps) {
  const rejected = team.status === 'PAYMENT_REJECTED';
  return (
    <section className={`${PANEL} space-y-4 ${rejected ? 'border-rose-500/40' : 'border-amber-500/40'}`} aria-label="Registration payment">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={H2}><IndianRupee className="h-4 w-4" /> Registration payment</h2>
        {rejected
          ? <StatusPill tone="red" icon={XCircle}>Could not be verified</StatusPill>
          : <StatusPill tone="amber" icon={Clock}>Waiting for the organizers</StatusPill>}
      </div>

      {rejected ? (
        <div className="space-y-3" role="status">
          <p className="text-sm font-semibold text-journey-text">Your payment could not be verified. Please contact the club representatives.</p>
          <ClubContacts hackathon={hackathon} />
          <p className="text-xs text-journey-muted">Your team holds no place until this is sorted out. The organizers can check it again once you have spoken to them.</p>
        </div>
      ) : (
        <div className="space-y-2" role="status">
          <p className="text-sm text-journey-text/80">
            We received your payment. The organizers will check it, and your team is registered once it is verified. Nothing else is needed from you meanwhile.
          </p>
          <p className="flex items-center gap-1.5 text-xs text-journey-muted"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" /> Your team does not hold a place until the payment is verified.</p>
        </div>
      )}

      {payment && (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
          <div><dt className="font-bold uppercase text-journey-muted">Amount</dt><dd className="text-sm font-semibold text-journey-text">₹{payment.amount}</dd></div>
          <div><dt className="font-bold uppercase text-journey-muted">Transaction ID</dt><dd className="break-all text-sm font-semibold text-journey-text">{payment.transaction_id}</dd></div>
          <div><dt className="font-bold uppercase text-journey-muted">Sent</dt><dd className="text-sm font-semibold text-journey-text">{formatDateTime(payment.submitted_at)}</dd></div>
        </dl>
      )}

      {isLeader && !rejected && (
        <div className="flex flex-wrap items-center gap-3 border-t border-journey-text/10 pt-3">
          <button type="button" onClick={onCancel} disabled={busy} className={BTN_QUIET}>Cancel and start again</button>
          <p className="text-xs text-journey-muted">Made a mistake? Cancel this and create the team again with the right details.</p>
        </div>
      )}
    </section>
  );
}
