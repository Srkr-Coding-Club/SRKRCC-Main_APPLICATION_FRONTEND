'use client';

import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import type { CheckInHeldBack as HeldBackPerson } from '@/lib/types';
import { BTN_GHOST, BTN_PRIMARY, INPUT } from '@/components/admin/hackathon/shared';

interface CheckInHeldBackProps {
  people: HeldBackPerson[];
  onLetIn: (person: HeldBackPerson, reason: string) => Promise<void>;
}

/** Matches whose team is not registered yet. Organizers can still let them in, with a reason that is audited. */
export function CheckInHeldBack({ people, onLetIn }: CheckInHeldBackProps) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  if (!people.length) return null;

  const submit = async (person: HeldBackPerson) => {
    setBusy(true);
    try {
      await onLetIn(person, reason.trim());
      setOpenId(null);
      setReason('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3" role="region" aria-label="Not registered yet">
      <p className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-200"><ShieldAlert className="h-4 w-4" aria-hidden="true" /> Found, but their team is not registered</p>
      <ul className="space-y-2">
        {people.map((person) => (
          <li key={person.user_id} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#1A1A2E] dark:text-white">{person.name}</p>
                <p className="truncate text-xs text-slate-600 dark:text-slate-300">{person.team_name} · {person.why} · {person.email}</p>
              </div>
              <button type="button" onClick={() => { setOpenId(openId === person.user_id ? null : person.user_id); setReason(''); }} className={`${BTN_GHOST} min-h-11 shrink-0 sm:min-h-0`}>Let in anyway</button>
            </div>
            {openId === person.user_id && (
              <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); void submit(person); }}>
                <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} required placeholder="Why are they being let in?" aria-label={`Reason for letting in ${person.name}`} className={`${INPUT} min-w-0 flex-1 basis-48`} />
                <button type="submit" disabled={busy || !reason.trim()} className={BTN_PRIMARY}>{busy ? 'Checking in…' : 'Check in'}</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
