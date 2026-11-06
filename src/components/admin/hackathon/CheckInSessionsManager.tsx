'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Save, Trash2 } from 'lucide-react';
import type { CheckInScanMode, CheckInSessionInfo, Hackathon } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { Switch } from '@/components/ui/Switch';
import { FormSelect } from '@/components/ui/FormSelect';
import { LoadError } from './LoadError';
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, INPUT, LABEL, PANEL, TAP, firstFieldErrors, fromLocalInput, toLocalInput } from './shared';
import { useHackathonPatch } from './useHackathonPatch';
import { ActionButton } from '@/components/ui/ActionButton';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CheckInSessionForm, WHO_OPTIONS, eventDays } from './CheckInSessionForm';

const MAX_DAYS = 14;
const MAX_SLOTS = 3;
const DAY_MS = 86_400_000;

const WINDOW_LABEL = { NOT_OPEN: 'Not open yet', OPEN: 'Open now', CLOSED: 'Closed' } as const;

/** Whole days an event spans, counting the first and the last, within what the schedule supports. */
export function daysBetween(start?: string, end?: string): number {
  if (!start || !end) return 1;
  const first = new Date(start);
  const last = new Date(end);
  if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime()) || last < first) return 1;
  const day = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.max(1, Math.min(MAX_DAYS, Math.round((day(last) - day(first)) / DAY_MS) + 1));
}

function SessionCard({ slug, session, days, onSaved }: { slug: string; session: CheckInSessionInfo; days: string[]; onSaved: () => void }) {
  const { toast } = useToast();
  const retired = session.outside_schedule;
  const [name, setName] = useState(editableName(session));
  const [opens, setOpens] = useState(toLocalInput(session.opens_at));
  const [closes, setCloses] = useState(toLocalInput(session.closes_at));
  const [needsArrival, setNeedsArrival] = useState(session.needs_arrival);
  const [counts, setCounts] = useState(session.counts_for_certificate);
  const [mode, setMode] = useState<CheckInScanMode>(session.scan_mode);
  const [active, setActive] = useState(session.is_active);
  const [day, setDay] = useState(session.date);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  // What the server now holds replaces this card's edits (after its own save); other cards keep theirs.
  const snapshot = JSON.stringify([session.name, session.opens_at, session.closes_at, session.needs_arrival, session.counts_for_certificate, session.scan_mode, session.is_active, session.date]);
  useEffect(() => {
    setName(editableName(session));
    setOpens(toLocalInput(session.opens_at));
    setCloses(toLocalInput(session.closes_at));
    setNeedsArrival(session.needs_arrival);
    setCounts(session.counts_for_certificate);
    setMode(session.scan_mode);
    setActive(session.is_active);
    setDay(session.date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await hackathonApi.admin.updateCheckInSession(slug, session.id, {
        name, opens_at: fromLocalInput(opens), closes_at: fromLocalInput(closes), scan_mode: mode,
        ...(session.is_main ? {} : { needs_arrival: needsArrival, counts_for_certificate: counts, is_active: active }),
        ...(session.is_custom && day !== session.date ? { date: day } : {}),
      });
      toast.success(`${name.trim() || session.name} saved`);
      onSaved();
    } catch (err: any) {
      setErrors(firstFieldErrors(err?.body));
      toast.error('Could not save', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: `Delete ${session.name}?`,
      message: (session.checked_in ?? 0) > 0
        ? `${session.checked_in} people are already checked in to it, so it is kept (switched off, with its check-ins) instead of deleted.`
        : 'Nobody is checked in to it yet, so it is removed.',
      confirmLabel: 'Delete session', danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const { outcome } = await hackathonApi.admin.deleteCheckInSession(slug, session.id);
      toast.success(outcome === 'retired' ? `${session.name} kept, switched off` : `${session.name} deleted`);
      onSaved();
    } catch (err: any) {
      toast.error('Could not delete it', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const bringBack = async () => {
    setBusy(true);
    try {
      await hackathonApi.admin.updateCheckInSession(slug, session.id, { outside_schedule: false });
      toast.success(`${session.name} is back`);
      onSaved();
    } catch (err: any) {
      toast.error('Could not bring it back', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const id = `session-${session.id}`;
  return (
    <form onSubmit={save} aria-label={`Settings for ${session.name}`} className={`space-y-3 rounded-xl border p-4 ${retired ? 'border-slate-300 opacity-80 dark:border-slate-700' : 'border-slate-200 dark:border-slate-800'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="break-words text-sm font-bold text-[#1A1A2E] dark:text-white">{session.name}</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Day {session.day_index + 1} · {session.slot ? session.slot.charAt(0) + session.slot.slice(1).toLowerCase() : 'Added by you'} · {session.date} · {session.checked_in ?? 0} checked in
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
          {session.is_main && <span className="rounded-full bg-journey-accent/15 px-2 py-0.5 text-journey-accent">Arrival (main)</span>}
          {session.is_custom && <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-sky-800 dark:text-sky-200">Added by you</span>}
          {retired ? <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-slate-700 dark:text-slate-300">Retired: outside the schedule</span>
            : <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-slate-600 dark:text-slate-300">{session.is_active ? WINDOW_LABEL[session.window] : 'Switched off'}</span>}
        </div>
      </div>
      {session.is_main && (
        <p className="text-xs text-slate-500 dark:text-slate-400">Certificates, round rules, no-shows and the arrival count all use this session. It cannot be switched off.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor={`${id}-name`} className={LABEL}>Name</label>
          <input id={`${id}-name`} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder={defaultName(session)} aria-invalid={Boolean(errors.name)} className={INPUT} disabled={retired} />
          {errors.name && <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor={`${id}-opens`} className={LABEL}>Opens</label>
          <input id={`${id}-opens`} type="datetime-local" value={opens} onChange={(e) => setOpens(e.target.value)} className={INPUT} disabled={retired} />
        </div>
        <div>
          <label htmlFor={`${id}-closes`} className={LABEL}>Closes</label>
          <input id={`${id}-closes`} type="datetime-local" value={closes} onChange={(e) => setCloses(e.target.value)} aria-invalid={Boolean(errors.closes_at)} className={INPUT} disabled={retired} />
          {errors.closes_at && <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.closes_at}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <span className={LABEL} id={`${id}-mode`}>Who is checked in</span>
        <FormSelect value={mode} onChange={(value) => value && setMode(value as CheckInScanMode)} options={WHO_OPTIONS} placeholder="Choose" allowClear={false} aria-labelledby={`${id}-mode`} disabled={retired} />
      </div>

      {session.is_custom && !retired && days.length > 1 && (
        <div className="max-w-xs space-y-1.5">
          <span className={LABEL} id={`${id}-day`}>Day</span>
          <FormSelect
            value={day} options={days.map((value, index) => ({ value, label: `Day ${index + 1}: ${value}` }))} placeholder="Choose the day"
            allowClear={false} onChange={(value) => value && setDay(value)} aria-labelledby={`${id}-day`}
          />
        </div>
      )}

      {!session.is_main && (
        <div className="grid gap-2 lg:grid-cols-3">
          <Switch label="Needs arrival first" description="Only people checked in to the main session can be scanned." checked={needsArrival} onChange={setNeedsArrival} disabled={retired} />
          <Switch label="Counts toward the certificate" description="Used when the certificate requires specific sessions." checked={counts} onChange={setCounts} disabled={retired} />
          <Switch label="Switched on" description="Off: nobody can be scanned into it." checked={active} onChange={setActive} disabled={retired} />
        </div>
      )}

      {errors.is_active && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{errors.is_active}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        {session.is_custom && retired && (
          <button type="button" onClick={bringBack} disabled={busy} className={`${BTN_GHOST} ${TAP}`}>Bring it back</button>
        )}
        {session.is_custom && !retired && (
          <button type="button" onClick={remove} disabled={busy} className={`${BTN_DANGER} ${TAP}`}><Trash2 className="h-3.5 w-3.5" /> Delete</button>
        )}
        <button type="submit" disabled={busy || retired} className={`${BTN_PRIMARY} ${TAP}`}><Save className="h-3.5 w-3.5" /> {busy ? 'Saving…' : 'Save session'}</button>
      </div>
      {dialog}
    </form>
  );
}

/** What the Name box holds: nothing for a generated session nobody renamed (its default shows as the hint), always the title of one you added (it must have one). */
function editableName(session: CheckInSessionInfo): string {
  return !session.is_custom && session.name === defaultName(session) ? '' : session.name;
}

/** The name a session has when nobody renamed it: "Day 2 Afternoon". */
function defaultName(session: CheckInSessionInfo): string {
  if (session.is_custom || session.slot === null) return session.name;
  return session.is_main && session.day_index === 0 && session.slot === 'MORNING' && session.name === 'Check-in'
    ? 'Check-in'
    : `Day ${session.day_index + 1} ${session.slot.charAt(0) + session.slot.slice(1).toLowerCase()}`;
}

interface CheckInSessionsManagerProps {
  hackathon: Hackathon;
  onSaved: (saved: Hackathon) => void;
}

/** How many days and slots check-in has, and each generated session's name, window and rules. */
export function CheckInSessionsManager({ hackathon, onSaved }: CheckInSessionsManagerProps) {
  const slug = hackathon.slug;
  const { busy, errors, save, saved, clearSaved } = useHackathonPatch(hackathon, onSaved);
  const [sessions, setSessions] = useState<CheckInSessionInfo[] | null>(null);
  const [error, setError] = useState('');
  const [days, setDays] = useState(String(hackathon.check_in_days ?? 1));
  const [slots, setSlots] = useState(String(hackathon.check_in_slots_per_day ?? 1));
  const eventDayList = useMemo(() => eventDays(hackathon.start_date, hackathon.end_date), [hackathon.start_date, hackathon.end_date]);

  const load = useCallback(() => {
    hackathonApi.checkIn.sessions(slug).then((list) => { setSessions(list); setError(''); }).catch((err) => setError(apiErrorMessage(err, 'Could not load the sessions.')));
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const saveSchedule = async (event: React.FormEvent) => {
    event.preventDefault();
    const ok = await save({ check_in_days: Number(days), check_in_slots_per_day: Number(slots) }, 'Schedule saved');
    if (ok) load();
  };

  return (
    <section className={`${PANEL} space-y-4`} aria-label="Check-in sessions">
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><CalendarClock className="h-4 w-4 text-journey-accent" /> Check-in sessions</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Choose how many days and slots people are checked in on and a session is generated for each, or add sessions of your own below. Each person has one code for all of them, and a team has one team code.
          A session that already has people checked in is kept, not deleted, if you shorten the schedule.
        </p>
      </div>

      <form onSubmit={saveSchedule} className="flex flex-wrap items-end gap-3">
        <div className="w-28">
          <label htmlFor="check-in-days" className={LABEL}>Days</label>
          <input id="check-in-days" type="number" min={1} max={MAX_DAYS} value={days} onChange={(e) => setDays(e.target.value)} aria-invalid={Boolean(errors.check_in_days)} className={INPUT} />
        </div>
        <div className="w-36">
          <label htmlFor="check-in-slots" className={LABEL}>Slots per day</label>
          <input id="check-in-slots" type="number" min={1} max={MAX_SLOTS} value={slots} onChange={(e) => setSlots(e.target.value)} aria-invalid={Boolean(errors.check_in_slots_per_day)} className={INPUT} />
        </div>
        <button type="button" onClick={() => setDays(String(daysBetween(hackathon.start_date, hackathon.end_date)))} className={BTN_GHOST}>Match the event dates</button>
        <ActionButton type="submit" pending={busy} success={saved} onSuccessShown={clearSaved} successLabel="Saved" className={BTN_PRIMARY}>{'Save schedule'}</ActionButton>
        {(errors.check_in_days || errors.check_in_slots_per_day) && (
          <p role="alert" className="basis-full text-xs text-rose-600 dark:text-rose-400">{errors.check_in_days || errors.check_in_slots_per_day}</p>
        )}
      </form>

      <CheckInSessionForm hackathon={hackathon} onAdded={load} />

      {error && <LoadError message={error} onRetry={load} />}
      {sessions && (
        <div className="space-y-3">
          {sessions.map((session) => <SessionCard key={session.id} slug={slug} session={session} days={eventDayList} onSaved={load} />)}
        </div>
      )}
    </section>
  );
}
