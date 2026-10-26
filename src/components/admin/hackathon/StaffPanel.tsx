'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import type { HackathonStaffMember } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { BTN_DANGER, BTN_PRIMARY, INPUT, LABEL } from './shared';

interface StaffPanelProps {
  slug: string;
  role: HackathonStaffMember['role'];
  /** What this role can do, shown above the list. */
  description: string;
  noun: string;
}

/** People limited to one hackathon (judges, check-in volunteers), added by the email on their account. */
export function StaffPanel({ slug, role, description, noun }: StaffPanelProps) {
  const { toast } = useToast();
  const [people, setPeople] = useState<HackathonStaffMember[]>([]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    hackathonApi.admin.staff(slug).then((all) => setPeople(all.filter((person) => person.role === role))).catch(() => setPeople([]));
  }, [slug, role]);

  useEffect(load, [load]);

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await hackathonApi.admin.addStaff(slug, email.trim(), role);
      setEmail('');
      load();
      toast.success(`${noun} added`);
    } catch (err) {
      toast.error(`Could not add ${noun.toLowerCase()}`, apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (person: HackathonStaffMember) => {
    try {
      await hackathonApi.admin.removeStaff(slug, person.id);
      setPeople((current) => current.filter((item) => item.id !== person.id));
    } catch (err) {
      toast.error('Could not remove', apiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      <form onSubmit={add} className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1 basis-60">
          <label htmlFor={`staff-${role}`} className={LABEL}>{noun} email</label>
          <input id={`staff-${role}`} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@college.ac.in" className={INPUT} />
        </div>
        <button type="submit" disabled={busy || !email.trim()} className={BTN_PRIMARY}><UserPlus className="h-3.5 w-3.5" /> Add</button>
      </form>
      {people.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">No {noun.toLowerCase()}s yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {people.map((person) => (
            <li key={person.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#1A1A2E] dark:text-white">{person.name}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{person.email}</p>
              </div>
              <button type="button" onClick={() => remove(person)} aria-label={`Remove ${person.name}`} className={BTN_DANGER}><Trash2 className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
