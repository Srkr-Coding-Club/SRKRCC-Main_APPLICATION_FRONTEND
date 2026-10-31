'use client';

import React, { useState } from 'react';
import { ArrowRightLeft, Hash, Lock, Trash2, UserPlus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';
import { apiErrorMessage } from '@/lib/api/hackathons';
import { clubIdApi, type ClubIdCounter } from '@/lib/clubIds';
import type { DirectoryUser } from '@/lib/userDirectory';
import { PersonPicker } from './PersonPicker';

const INPUT = 'min-h-11 w-full rounded-lg border border-journey-text/15 bg-journey-surface px-3 text-base text-journey-text focus:border-journey-accent focus:outline-none sm:min-h-10 sm:text-sm';
const BUTTON = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-10';

interface ShellProps {
  title: string;
  icon: React.ElementType;
  intro: string;
  confirmLabel: string;
  danger?: boolean;
  canSubmit: boolean;
  working: boolean;
  onClose: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
}

/** Every change asks for a reason (kept in the history) inside the same frame. */
function Shell({ title, icon, intro, confirmLabel, danger, canSubmit, working, onClose, onSubmit, children }: ShellProps) {
  return (
    <Modal
      isOpen
      onClose={onClose}
      busy={working}
      title={title}
      icon={icon}
      footer={(
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} disabled={working} className={`${BUTTON} text-journey-muted hover:bg-journey-text/10`}>Cancel</button>
          <button type="button" onClick={onSubmit} disabled={!canSubmit || working} className={`${BUTTON} ${danger ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-journey-accent text-journey-on-accent hover:opacity-90'}`}>{working ? 'Working…' : confirmLabel}</button>
        </div>
      )}
    >
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (canSubmit && !working) onSubmit(); }}>
        <p className="text-sm text-journey-muted">{intro}</p>
        {children}
      </form>
    </Modal>
  );
}

function Reason({ value, onChange, optional = false }: { value: string; onChange: (text: string) => void; optional?: boolean }) {
  return (
    <div>
      <label htmlFor="club-id-reason" className="mb-1 block text-xs font-bold text-journey-text">Reason{optional ? ' (optional)' : ''}: kept in the history</label>
      <textarea id="club-id-reason" rows={2} maxLength={300} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-journey-text/15 bg-journey-surface px-3 py-2 text-base text-journey-text focus:border-journey-accent focus:outline-none sm:text-sm" />
    </div>
  );
}

function Typed({ expected, value, onChange }: { expected: string; value: string; onChange: (text: string) => void }) {
  return (
    <div>
      <label htmlFor="club-id-confirm" className="mb-1 block text-xs font-bold text-journey-text">Type <span className="font-mono text-journey-accent">{expected}</span> to confirm</label>
      <input id="club-id-confirm" value={value} onChange={(event) => onChange(event.target.value)} className={`${INPUT} font-mono`} autoComplete="off" />
    </div>
  );
}

interface DialogProps { onClose: () => void; onDone: () => void }

/** Runs a call; on success tells the person and closes, on refusal shows the server's sentence under the form. */
function useRunner({ onClose, onDone }: DialogProps) {
  const { toast } = useToast();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const run = async (call: () => Promise<string>) => {
    setWorking(true);
    setError('');
    try {
      toast.success(await call());
      onDone();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, 'That could not be done.'));
      setWorking(false);
    }
  };
  return { working, error, run };
}

const Problem = ({ text }: { text: string }) => (text ? <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">{text}</p> : null);

export function AllocateDialog({ onClose, onDone, year }: DialogProps & { year: number }) {
  const [person, setPerson] = useState<DirectoryUser | null>(null);
  const [reason, setReason] = useState('');
  const { working, error, run } = useRunner({ onClose, onDone });
  return (
    <Shell title="Give the next number" icon={UserPlus} confirmLabel="Give the next number" canSubmit={Boolean(person && reason.trim())} working={working} onClose={onClose}
      intro={`The person gets the next free number of ${year} from the counter. Numbers that are held, reserved or retired are skipped.`}
      onSubmit={() => person && run(async () => { const { person: updated } = await clubIdApi.allocate({ user_id: person.id, reason: reason.trim(), year }); return `${updated.name} now holds ${updated.club_id}`; })}>
      <PersonPicker id="allocate-person" label="Who gets it" value={person} onChange={setPerson} withoutId />
      <Reason value={reason} onChange={setReason} />
      <Problem text={error} />
    </Shell>
  );
}

export function AssignDialog({ onClose, onDone, presetId = '' }: DialogProps & { presetId?: string }) {
  const [person, setPerson] = useState<DirectoryUser | null>(null);
  const [clubId, setClubId] = useState(presetId);
  const [reason, setReason] = useState('');
  const [allowRetired, setAllowRetired] = useState(false);
  const { working, error, run } = useRunner({ onClose, onDone });
  return (
    <Shell title="Assign a particular Club ID" icon={Hash} confirmLabel="Assign" canSubmit={Boolean(person && clubId.trim() && reason.trim())} working={working} onClose={onClose}
      intro="Use this for an id from the old records. It is refused when somebody holds it or it is reserved for someone else."
      onSubmit={() => person && run(async () => { const { person: updated } = await clubIdApi.assign({ user_id: person.id, club_id: clubId.trim(), reason: reason.trim(), allow_retired: allowRetired }); return `${updated.name} now holds ${updated.club_id}`; })}>
      <PersonPicker id="assign-person" label="Who gets it" value={person} onChange={setPerson} withoutId />
      <div>
        <label htmlFor="assign-club-id" className="mb-1 block text-xs font-bold text-journey-text">Club ID</label>
        <input id="assign-club-id" value={clubId} onChange={(event) => setClubId(event.target.value.toUpperCase())} placeholder="e.g. 25SCC277 or 21CCA041" className={`${INPUT} font-mono`} autoComplete="off" />
      </div>
      <label className="flex min-h-10 items-start gap-2 text-xs text-journey-muted"><input type="checkbox" checked={allowRetired} onChange={(event) => setAllowRetired(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#FF7A00]" /> This id was retired earlier and I mean to give it out again</label>
      <Reason value={reason} onChange={setReason} />
      <Problem text={error} />
    </Shell>
  );
}

export function MoveDialog({ onClose, onDone, holder }: DialogProps & { holder: { id: number; name: string; email: string; club_id: string; role: string } }) {
  const [person, setPerson] = useState<DirectoryUser | null>(null);
  const [reason, setReason] = useState('');
  const [typed, setTyped] = useState('');
  const { working, error, run } = useRunner({ onClose, onDone });
  return (
    <Shell title={`Move ${holder.club_id}`} icon={ArrowRightLeft} danger confirmLabel="Move the id" canSubmit={Boolean(person && reason.trim() && typed.trim())} working={working} onClose={onClose}
      intro={`${holder.name} (${holder.email}) loses ${holder.club_id} and the person you choose receives it.${holder.role === 'AFFILIATE' ? ' As an affiliate, they become a non-affiliate.' : ''} The id is not retired.`}
      onSubmit={() => person && run(async () => { await clubIdApi.reassign({ club_id: holder.club_id, to_user_id: person.id, reason: reason.trim(), confirm: typed.trim() }); return `${holder.club_id} now belongs to ${person.full_name}`; })}>
      <PersonPicker id="move-person" label="Who receives it" value={person} onChange={setPerson} withoutId />
      <Reason value={reason} onChange={setReason} />
      <Typed expected={holder.club_id} value={typed} onChange={setTyped} />
      <Problem text={error} />
    </Shell>
  );
}

export function ClearDialog({ onClose, onDone, holder }: DialogProps & { holder: { id: number; name: string; email: string; club_id: string; role: string } }) {
  const [reason, setReason] = useState('');
  const [typed, setTyped] = useState('');
  const { working, error, run } = useRunner({ onClose, onDone });
  return (
    <Shell title={`Clear ${holder.club_id}`} icon={Trash2} danger confirmLabel="Clear and retire" canSubmit={Boolean(reason.trim() && typed.trim())} working={working} onClose={onClose}
      intro={`${holder.name} (${holder.email}) loses ${holder.club_id}${holder.role === 'AFFILIATE' ? ' and becomes a non-affiliate' : ''}. The id is retired: it is not handed out again unless an Admin assigns it on purpose.`}
      onSubmit={() => run(async () => { await clubIdApi.clear({ user_id: holder.id, reason: reason.trim(), confirm: typed.trim() }); return `${holder.club_id} was cleared and retired`; })}>
      <Reason value={reason} onChange={setReason} />
      <Typed expected={holder.club_id} value={typed} onChange={setTyped} />
      <Problem text={error} />
    </Shell>
  );
}

export function ReserveDialog({ onClose, onDone, year }: DialogProps & { year: number }) {
  const [email, setEmail] = useState('');
  const [clubId, setClubId] = useState('');
  const [reason, setReason] = useState('');
  const { working, error, run } = useRunner({ onClose, onDone });
  return (
    <Shell title="Reserve a Club ID" icon={Lock} confirmLabel="Reserve" canSubmit={Boolean((email.trim() || reason.trim()) && !(clubId && !email.trim() && !reason.trim()))} working={working} onClose={onClose}
      intro={`Hold an id for someone who has no account yet. Nobody else can be given it, and it is attached when they register with that email. Leave the id blank to reserve the next number of ${year}.`}
      onSubmit={() => run(async () => { const row = await clubIdApi.reserve({ email: email.trim(), club_id: clubId.trim() || undefined, reason: reason.trim(), year }); return `${row.club_id} is reserved${row.email ? ` for ${row.email}` : ''}`; })}>
      <div>
        <label htmlFor="reserve-email" className="mb-1 block text-xs font-bold text-journey-text">Email of the person</label>
        <input id="reserve-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={INPUT} autoComplete="off" />
      </div>
      <div>
        <label htmlFor="reserve-id" className="mb-1 block text-xs font-bold text-journey-text">Club ID (optional)</label>
        <input id="reserve-id" value={clubId} onChange={(event) => setClubId(event.target.value.toUpperCase())} placeholder="Blank = the next number" className={`${INPUT} font-mono`} autoComplete="off" />
      </div>
      <Reason value={reason} onChange={setReason} optional={Boolean(email.trim())} />
      <Problem text={error} />
    </Shell>
  );
}

export function CounterDialog({ onClose, onDone, counter }: DialogProps & { counter: ClubIdCounter }) {
  const [next, setNext] = useState(String(counter.next_sequence + 1));
  const [reason, setReason] = useState('');
  const { working, error, run } = useRunner({ onClose, onDone });
  const value = Number(next);
  const valid = Number.isInteger(value) && value > counter.next_sequence && value > counter.highest;
  return (
    <Shell title={`Move the ${counter.year} counter`} icon={Hash} confirmLabel="Move the counter" canSubmit={valid && Boolean(reason.trim())} working={working} onClose={onClose}
      intro={`The counter is at ${counter.next_sequence} (next id ${counter.next_id}). It only moves forward, and never onto a number already in use (the highest is ${counter.highest}). Numbers it skips are not used.`}
      onSubmit={() => run(async () => { await clubIdApi.setCounter({ year: counter.year, next_sequence: value, reason: reason.trim(), prefix: counter.prefix }); return `The counter is now at ${value}`; })}>
      <div>
        <label htmlFor="counter-next" className="mb-1 block text-xs font-bold text-journey-text">Next number</label>
        <input id="counter-next" inputMode="numeric" value={next} onChange={(event) => setNext(event.target.value.replace(/\D/g, ''))} className={`${INPUT} font-mono`} />
        {next && !valid && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">It must be higher than {Math.max(counter.next_sequence, counter.highest)}.</p>}
      </div>
      <Reason value={reason} onChange={setReason} />
      <Problem text={error} />
    </Shell>
  );
}
