'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Award, CalendarPlus, ClipboardList, Search, Share2, Trophy } from 'lucide-react';
import type { Hackathon, HackathonTeam, MyTeamPayload } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { downloadHackathonCalendar } from '@/lib/calendar';
import { useToast } from '@/context/ToastContext';
import { Switch } from '@/components/ui/Switch';
import { StatusPill } from '@/components/ui/StatusPill';
import { SpotlightInput } from '@/components/ui/InputField';
import { BTN_ACCENT, BTN_QUIET, H2, PANEL } from './dashboardStyles';
import {
  RegistrationDetailsFields, registrationErrors, toRegistrationInput, type RegistrationValue,
} from './RegistrationDetailsFields';

/** What the organizers still need from you (questions added later, or you were added by an admin). */
export function MyRegistrationCard({ hackathon, registration, onSaved }: { hackathon: Hackathon; registration: NonNullable<MyTeamPayload['registration']>; onSaved: () => void }) {
  const { toast } = useToast();
  const [value, setValue] = useState<RegistrationValue>({ acceptRules: registration.rules_accepted, answers: registration.answers });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (registration.missing.length === 0) return null;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const missing = registrationErrors(hackathon, value);
    setErrors(missing);
    if (Object.keys(missing).length) return;
    setBusy(true);
    try {
      await hackathonApi.saveMyRegistration(hackathon.slug, toRegistrationInput(value));
      toast.success('Thanks, saved');
      onSaved();
    } catch (err: any) {
      const field = err?.body?.field as string | undefined;
      setErrors({ [field ?? 'form']: apiErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`${PANEL} space-y-4 border-amber-500/40`}>
      <h2 className={H2}><ClipboardList className="h-4 w-4" /> The organizers need a few details from you</h2>
      <form onSubmit={save} className="space-y-4">
        <RegistrationDetailsFields config={hackathon} value={value} onChange={setValue} errors={errors} />
        {errors.form && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{errors.form}</p>}
        <button type="submit" disabled={busy} className={BTN_ACCENT}>{busy ? 'Saving…' : 'Save details'}</button>
      </form>
    </section>
  );
}

export { CheckInCard } from './CheckInCard';

/** A link to the printable certificate once the organizers release it. */
export function CertificateCard({ hackathon }: { hackathon: Hackathon }) {
  const released = Boolean(hackathon.certificate_config?.released);
  return (
    <section className={`${PANEL} space-y-3`}>
      <h2 className={H2}><Award className="h-4 w-4" /> Certificate</h2>
      {released ? (
        <>
          <p className="text-sm text-journey-text/80">Your certificate is ready to download or print.</p>
          <Link href={`/hackathons/${hackathon.slug}/certificate`} className={BTN_ACCENT}>Open my certificate</Link>
        </>
      ) : (
        <p className="text-sm text-journey-muted">Certificates will appear here once the organizers release them.</p>
      )}
    </section>
  );
}

/** Winners are out: point people at them. */
export function ResultsNotice({ hackathon }: { hackathon: Hackathon }) {
  return (
    <section className={`${PANEL} space-y-3 border-journey-accent/40`}>
      <h2 className={H2}><Trophy className="h-4 w-4" /> Results are out</h2>
      <p className="text-sm text-journey-text/80">Thank you for taking part in {hackathon.title}. See who won and browse the projects.</p>
      <Link href={`/hackathons/${hackathon.slug}#results`} className={BTN_ACCENT}>See the results</Link>
    </section>
  );
}

/** Let other participants find your team and say who you need. */
export function RecruitingCard({ hackathon, team, onSaved }: { hackathon: Hackathon; team: HackathonTeam; onSaved: () => void }) {
  const { toast } = useToast();
  const [looking, setLooking] = useState(Boolean(team.looking_for_members));
  const [note, setNote] = useState(team.looking_for ?? '');
  const [busy, setBusy] = useState(false);
  const full = team.member_count >= (hackathon.max_team_size ?? 1);

  const save = async (nextLooking: boolean) => {
    setBusy(true);
    try {
      await hackathonApi.updateTeamRecruiting(team.id, { looking_for_members: nextLooking, looking_for: note });
      setLooking(nextLooking);
      toast.success(nextLooking ? 'Your team is listed in the team finder' : 'Your team is no longer listed');
      onSaved();
    } catch (err) {
      toast.error('Could not update', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`${PANEL} space-y-3`}>
      <h2 className={H2}><Search className="h-4 w-4" /> Team finder</h2>
      <Switch label="We are looking for teammates" description={full ? 'Your team is full.' : 'Your team appears in the finder with the note below.'} checked={looking} onChange={save} disabled={busy || full} />
      {looking && (
        <div className="space-y-2">
          <SpotlightInput value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="e.g. a UI designer or someone who knows Flutter" aria-label="Who your team needs" />
          <button type="button" onClick={() => save(true)} disabled={busy} className={BTN_QUIET}>Update note</button>
        </div>
      )}
      <Link href={`/hackathons/${hackathon.slug}/finder`} className="inline-flex min-h-8 items-center text-xs font-bold text-journey-accent hover:underline">Browse people looking for a team</Link>
    </section>
  );
}

/** Calendar download and share link for the key dates. */
export function CalendarShareCard({ hackathon }: { hackathon: Hackathon }) {
  const { toast } = useToast();
  const share = async () => {
    const url = `${window.location.origin}/hackathons/${hackathon.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: hackathon.title, text: hackathon.theme, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied');
      }
    } catch {
      /* the person closed the share sheet */
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => downloadHackathonCalendar(hackathon)} className={BTN_QUIET}><CalendarPlus className="h-3.5 w-3.5" /> Add to calendar</button>
      <button type="button" onClick={share} className={BTN_QUIET}><Share2 className="h-3.5 w-3.5" /> Share</button>
    </div>
  );
}

export function WaitlistNotice() {
  return (
    <p role="status" className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
      <StatusPill tone="amber">Waitlisted</StatusPill>{' '}
      The hackathon is full. Your team is in the queue and is placed automatically, oldest first, when a spot opens. You will be notified.
    </p>
  );
}

