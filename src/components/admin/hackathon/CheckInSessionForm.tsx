'use client';

import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { CheckInScanMode, Hackathon } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { Switch } from '@/components/ui/Switch';
import { FormSelect } from '@/components/ui/FormSelect';
import { BTN_PRIMARY, INPUT, LABEL, TAP, firstFieldErrors } from './shared';

const EVENT_ZONE = 'Asia/Kolkata';
const MAX_EVENT_DAYS = 14;

/** Who the session checks in, in the words an organizer thinks in. */
export const WHO_OPTIONS: { value: CheckInScanMode; label: string; hint: string }[] = [
  { value: 'BOTH', label: 'Either person or team QR', hint: "A person's own code or their team's code" },
  { value: 'MEMBERS', label: 'People: own QR code', hint: 'Each person shows their own QR code' },
  { value: 'TEAMS', label: 'Teams: team QR code', hint: 'Scan the team QR code, then pick who is present' },
];

const dayOf = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: EVENT_ZONE });

/** Every date the event runs, as YYYY-MM-DD. */
export function eventDays(start?: string, end?: string): string[] {
  if (!start) return [];
  const first = dayOf(start);
  const last = end ? dayOf(end) : first;
  const days: string[] = [];
  for (let at = new Date(`${first}T00:00:00Z`); days.length < MAX_EVENT_DAYS && at.toISOString().slice(0, 10) <= last; at = new Date(at.getTime() + 86_400_000)) {
    days.push(at.toISOString().slice(0, 10));
  }
  return days;
}

/** A date and a clock time typed in the event's own time zone, as the moment the server stores. */
function momentOf(date: string, time: string): string | null {
  return time ? new Date(`${date}T${time}:00+05:30`).toISOString() : null;
}

interface CheckInSessionFormProps {
  hackathon: Hackathon;
  onAdded: () => void;
}

/** Add a session of your own: its title, the day, optional start and end time, and who checks in. */
export function CheckInSessionForm({ hackathon, onAdded }: CheckInSessionFormProps) {
  const { toast } = useToast();
  const days = useMemo(() => eventDays(hackathon.start_date, hackathon.end_date), [hackathon.start_date, hackathon.end_date]);
  const [name, setName] = useState('');
  const [date, setDate] = useState(days[0] ?? '');
  const [from, setFrom] = useState('');
  const [until, setUntil] = useState('');
  const [who, setWho] = useState<CheckInScanMode>('BOTH');
  const [needsArrival, setNeedsArrival] = useState(true);
  const [counts, setCounts] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found: Record<string, string> = {};
    if (!name.trim()) found.name = 'Give the session a title.';
    if (!date) found.date = 'Choose the day.';
    if (from && until && until <= from) found.closes_at = 'It must end after it starts.';
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await hackathonApi.admin.createCheckInSession(hackathon.slug, {
        name: name.trim(), date, opens_at: momentOf(date, from), closes_at: momentOf(date, until),
        scan_mode: who, needs_arrival: needsArrival, counts_for_certificate: counts,
      });
      toast.success(`${name.trim()} added`);
      setName(''); setFrom(''); setUntil('');
      onAdded();
    } catch (err: any) {
      setErrors(firstFieldErrors(err?.body));
      toast.error('Could not add the session', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const dayOptions = days.map((value, index) => ({ value, label: `Day ${index + 1}: ${new Date(`${value}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}` }));
  const error = (key: string) => errors[key] && <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors[key]}</p>;

  return (
    <form onSubmit={submit} aria-label="Add a check-in session" className="space-y-3 rounded-xl border border-dashed border-journey-accent/50 p-4">
      <h4 className="flex items-center gap-1.5 text-sm font-bold text-[#1A1A2E] dark:text-white"><Plus className="h-4 w-4 text-journey-accent" /> Add a session</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400">For anything with its own title and time: lunch, a workshop, the prize ceremony. It is never removed when you change the days and slots above.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="new-session-name" className={LABEL}>Title</label>
          <input id="new-session-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Lunch, Workshop, Prize ceremony" aria-invalid={Boolean(errors.name)} className={INPUT} />
          {error('name')}
        </div>
        <div>
          <span className={LABEL} id="new-session-day">Day</span>
          <FormSelect value={date} options={dayOptions} placeholder="Choose the day" allowClear={false} onChange={(value) => value && setDate(value)} aria-labelledby="new-session-day" />
          {error('date')}
        </div>
        <div>
          <label htmlFor="new-session-from" className={LABEL}>Starts (optional)</label>
          <input id="new-session-from" type="time" value={from} onChange={(e) => setFrom(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label htmlFor="new-session-until" className={LABEL}>Ends (optional)</label>
          <input id="new-session-until" type="time" value={until} onChange={(e) => setUntil(e.target.value)} aria-invalid={Boolean(errors.closes_at)} className={INPUT} />
          {error('closes_at')}
        </div>
      </div>
      <div className="space-y-1.5">
        <span className={LABEL} id="new-session-who">Who is checked in</span>
        <FormSelect value={who} options={WHO_OPTIONS} placeholder="Choose" allowClear={false} onChange={(value) => value && setWho(value as CheckInScanMode)} aria-labelledby="new-session-who" />
        {error('scan_mode')}
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        <Switch label="Needs arrival first" description="Only people checked in to the main session can be scanned." checked={needsArrival} onChange={setNeedsArrival} />
        <Switch label="Counts toward the certificate" description="Used when the certificate requires specific sessions." checked={counts} onChange={setCounts} />
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={busy} className={`${BTN_PRIMARY} ${TAP}`}><Plus className="h-3.5 w-3.5" /> {busy ? 'Adding…' : 'Add session'}</button>
      </div>
    </form>
  );
}
