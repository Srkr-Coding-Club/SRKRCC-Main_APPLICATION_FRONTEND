'use client';

import React, { useEffect, useState } from 'react';
import { Lock, Save, Unlock } from 'lucide-react';
import type { Hackathon, ProfileFieldKey } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { BTN_GHOST, BTN_PRIMARY, INPUT, LABEL, PANEL, firstFieldErrors, fromLocalInput, toLocalInput } from './shared';

const PROFILE_FIELDS: { key: ProfileFieldKey; label: string }[] = [
  { key: 'full_name', label: 'Full name' },
  { key: 'phone_number', label: 'Phone number' },
  { key: 'branch', label: 'Branch' },
  { key: 'year', label: 'Year' },
  { key: 'roll_number', label: 'Roll number' },
  { key: 'club_id', label: 'Club ID' },
];

export function HackathonSettingsTab({ hackathon, onSaved }: { hackathon: Hackathon; onSaved: (h: Hackathon) => void }) {
  const { toast } = useToast();
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [minSize, setMinSize] = useState('1');
  const [maxSize, setMaxSize] = useState('4');
  const [locked, setLocked] = useState(false);
  const [openInnovation, setOpenInnovation] = useState(true);
  const [required, setRequired] = useState<ProfileFieldKey[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOpensAt(toLocalInput(hackathon.registration_opens_at));
    setClosesAt(toLocalInput(hackathon.registration_closes_at));
    setMinSize(String(hackathon.min_team_size ?? 1));
    setMaxSize(String(hackathon.max_team_size ?? 4));
    setLocked(!!hackathon.team_edits_locked);
    setOpenInnovation(hackathon.allow_open_innovation ?? true);
    setRequired(hackathon.required_profile_fields ?? []);
  }, [hackathon]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const saved = await hackathonApi.admin.update(hackathon.slug, {
        registration_opens_at: fromLocalInput(opensAt),
        registration_closes_at: fromLocalInput(closesAt),
        min_team_size: Number(minSize),
        max_team_size: Number(maxSize),
        team_edits_locked: locked,
        allow_open_innovation: openInnovation,
        required_profile_fields: required,
      });
      onSaved(saved);
      toast.success('Registration settings saved');
    } catch (err: any) {
      setErrors(firstFieldErrors(err?.body));
      toast.error('Could not save settings', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleOpen = async () => {
    setBusy(true);
    try {
      const saved = await hackathonApi.admin.setOpen(hackathon.slug, hackathon.status === 'CLOSED');
      onSaved(saved);
      toast.success(saved.status === 'CLOSED' ? 'Hackathon closed' : 'Hackathon reopened');
    } catch (err) {
      toast.error('Could not change status', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const closed = hackathon.status === 'CLOSED';

  return (
    <form onSubmit={save} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className={`${PANEL} space-y-5`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Registration opens</label>
            <input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className={INPUT} />
            <p className="mt-1 text-[11px] text-slate-400">Blank = open immediately.</p>
          </div>
          <div>
            <label className={LABEL}>Registration closes</label>
            <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className={INPUT} />
            {errors.registration_closes_at && <p className="mt-1 text-[11px] text-rose-500">{errors.registration_closes_at}</p>}
            <p className="mt-1 text-[11px] text-slate-400">After this, teams can no longer be created or changed.</p>
          </div>
          <div>
            <label className={LABEL}>Min team size</label>
            <input type="number" min={1} value={minSize} onChange={(e) => setMinSize(e.target.value)} className={INPUT} />
            {errors.min_team_size && <p className="mt-1 text-[11px] text-rose-500">{errors.min_team_size}</p>}
          </div>
          <div>
            <label className={LABEL}>Max team size</label>
            <input type="number" min={1} value={maxSize} onChange={(e) => setMaxSize(e.target.value)} className={INPUT} />
            {errors.max_team_size && <p className="mt-1 text-[11px] text-rose-500">{errors.max_team_size}</p>}
          </div>
        </div>

        <div>
          <label className={LABEL}>Required profile details</label>
          <p className="mb-2 text-[11px] text-slate-400">Every member must have these on their SRKRCC profile to create or join a team. No re-typing during registration.</p>
          <div className="flex flex-wrap gap-2">
            {PROFILE_FIELDS.map((f) => {
              const on = required.includes(f.key);
              return (
                <button
                  type="button"
                  key={f.key}
                  onClick={() => setRequired((prev) => (on ? prev.filter((k) => k !== f.key) : [...prev, f.key]))}
                  className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                    on ? 'border-[#FF7A00] bg-[#FF7A00]/10 text-[#C25A00] dark:text-[#FF9A4A]' : 'border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  {on ? '✓ ' : ''}{f.label}
                </button>
              );
            })}
          </div>
          {errors.required_profile_fields && <p className="mt-1 text-[11px] text-rose-500">{errors.required_profile_fields}</p>}
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-800 p-3 cursor-pointer">
          <input type="checkbox" checked={openInnovation} onChange={(e) => setOpenInnovation(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#FF7A00]" />
          <span className="text-sm">
            <span className="font-bold text-[#1A1A2E] dark:text-white">Allow open innovation</span>
            <span className="block text-xs text-slate-500">Teams may bring their own problem instead of picking a statement. They must submit a title, a description and a domain.</span>
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-800 p-3 cursor-pointer">
          <input type="checkbox" checked={locked} onChange={(e) => setLocked(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#FF7A00]" />
          <span className="text-sm">
            <span className="font-bold text-[#1A1A2E] dark:text-white">Lock team changes</span>
            <span className="block text-xs text-slate-500">Participants can no longer rename, change their problem, invite, remove or leave. Admins can still edit.</span>
          </span>
        </label>

        <div className="flex justify-end">
          <button type="submit" disabled={busy} className={BTN_PRIMARY}><Save className="h-3.5 w-3.5" /> {busy ? 'Saving…' : 'Save settings'}</button>
        </div>
      </section>

      <aside className={`${PANEL} space-y-3 self-start`}>
        <h3 className="text-sm font-bold text-[#1A1A2E] dark:text-white">Hackathon status</h3>
        <p className="text-xs text-slate-500">
          {closed
            ? 'Closed: registration is shut regardless of the window above.'
            : hackathon.is_registration_open
              ? 'Live and accepting team registrations.'
              : 'Live, but outside the registration window.'}
        </p>
        <button type="button" onClick={toggleOpen} disabled={busy} className={BTN_GHOST}>
          {closed ? <><Unlock className="h-3.5 w-3.5" /> Reopen hackathon</> : <><Lock className="h-3.5 w-3.5" /> Close hackathon</>}
        </button>
      </aside>
    </form>
  );
}
