'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Save, ShieldCheck, Trash2, UserPlus, X } from 'lucide-react';
import type { Hackathon, HackathonPermissionKey, HackathonStaffMember, HackathonStaffRole, MyHackathonPermissions } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusPill } from '@/components/ui/StatusPill';
import { LoadError } from './LoadError';
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, INPUT, LABEL, PANEL } from './shared';

const ROLE_LABEL: Record<HackathonStaffRole, string> = { ORGANIZER: 'Organizer', JUDGE: 'Judge', VOLUNTEER: 'Volunteer' };
const ROLE_BLURB: Record<HackathonStaffRole, string> = {
  ORGANIZER: 'Runs this hackathon with you: content, teams, rounds, submissions, judging setup, results and check-in. You choose exactly what.',
  JUDGE: 'Scores submitted projects on the judging page. Cannot see other judges\' scores.',
  VOLUNTEER: 'Checks participants in at the venue. Nothing else.',
};
const ROLE_TONE: Record<HackathonStaffRole, 'orange' | 'purple' | 'sky'> = { ORGANIZER: 'orange', JUDGE: 'purple', VOLUNTEER: 'sky' };

interface PermissionChecklistProps {
  catalog: MyHackathonPermissions['catalog'];
  value: HackathonPermissionKey[];
  onChange: (value: HackathonPermissionKey[]) => void;
  /** What the person editing may hand out; anything else is shown but locked. */
  grantable: HackathonPermissionKey[];
  idPrefix: string;
}

function PermissionChecklist({ catalog, value, onChange, grantable, idPrefix }: PermissionChecklistProps) {
  const toggle = (key: HackathonPermissionKey, on: boolean) => onChange(on ? [...value, key] : value.filter((item) => item !== key));
  return (
    <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <legend className="sr-only">Permissions</legend>
      {catalog.map((item) => {
        const locked = !grantable.includes(item.key);
        const id = `${idPrefix}-${item.key}`;
        return (
          <label key={item.key} htmlFor={id} className={`flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 p-2.5 dark:border-slate-800 ${locked ? 'opacity-50' : 'hover:border-[#FF7A00]/50'}`}>
            <input id={id} type="checkbox" checked={value.includes(item.key)} disabled={locked} onChange={(e) => toggle(item.key, e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF7A00]" />
            <span className="min-w-0">
              <span className="block text-sm font-bold text-[#1A1A2E] dark:text-white">{item.label}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">{item.description}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

interface RolesAdminTabProps {
  hackathon: Hackathon;
}

/** Who can do what in this hackathon: add people, pick a role, then tune its permissions. */
export function RolesAdminTab({ hackathon }: RolesAdminTabProps) {
  const { toast } = useToast();
  const { confirm, dialog } = useConfirmDialog();
  const slug = hackathon.slug;
  const [people, setPeople] = useState<HackathonStaffMember[]>([]);
  const [me, setMe] = useState<MyHackathonPermissions | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<HackathonStaffRole>('ORGANIZER');
  const [picked, setPicked] = useState<HackathonPermissionKey[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<HackathonPermissionKey[]>([]);

  const load = useCallback(() => {
    setError('');
    Promise.all([hackathonApi.admin.staff(slug), hackathonApi.myPermissions(slug)])
      .then(([staff, mine]) => {
        setPeople(staff);
        setMe(mine);
        setPicked((current) => (current.length ? current : mine.presets.ORGANIZER));
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load the team.')));
  }, [slug]);

  useEffect(load, [load]);

  if (!me) return error ? <LoadError message={error} onRetry={load} /> : <div className="h-40 animate-pulse rounded-xl bg-slate-200 dark:bg-white/5" />;

  const grantable = me.permissions;
  const chooseRole = (next: HackathonStaffRole) => {
    setRole(next);
    setPicked(me.presets[next].filter((key) => grantable.includes(key)));
  };

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await hackathonApi.admin.addStaff(slug, email.trim(), role, picked);
      setEmail('');
      toast.success(`${ROLE_LABEL[role]} added`, 'They were notified.');
      load();
    } catch (err) {
      toast.error('Could not add this person', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const savePermissions = async (person: HackathonStaffMember) => {
    setBusy(true);
    try {
      await hackathonApi.admin.updateStaffPermissions(slug, person.id, draft);
      toast.success('Permissions updated', `${person.name} has ${draft.length} permission${draft.length === 1 ? '' : 's'}.`);
      setEditingId(null);
      load();
    } catch (err) {
      toast.error('Could not update', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (person: HackathonStaffMember) => {
    const ok = await confirm({
      title: `Remove ${person.name}?`,
      message: `They lose all ${ROLE_LABEL[person.role].toLowerCase()} access to this hackathon straight away.`,
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;
    try {
      await hackathonApi.admin.removeStaff(slug, person.id);
      load();
    } catch (err) {
      toast.error('Could not remove', apiErrorMessage(err));
    }
  };

  const labelOf = (key: HackathonPermissionKey) => me.catalog.find((item) => item.key === key)?.label ?? key;

  return (
    <div className="space-y-6">
      {dialog}
      {error && <LoadError message={error} onRetry={load} />}

      <section className={`${PANEL} space-y-3`}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><ShieldCheck className="h-4 w-4 text-journey-accent" /> Roles for this hackathon</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">These apply to this hackathon only. Site-wide Admins and Club Leads can always manage every hackathon. Anyone you add needs an account on the site.</p>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(Object.keys(ROLE_LABEL) as HackathonStaffRole[]).map((item) => (
            <li key={item} className="space-y-1 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <StatusPill tone={ROLE_TONE[item]}>{ROLE_LABEL[item]}</StatusPill>
              <p className="text-xs text-slate-500 dark:text-slate-400">{ROLE_BLURB[item]}</p>
            </li>
          ))}
        </ul>
      </section>

      <form onSubmit={add} className={`${PANEL} space-y-4`}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><UserPlus className="h-4 w-4 text-journey-accent" /> Add a person</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="role-email" className={LABEL}>Account email</label>
            <input id="role-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@college.ac.in" className={INPUT} />
          </div>
          <div>
            <label htmlFor="role-role" className={LABEL}>Role</label>
            <select id="role-role" value={role} onChange={(e) => chooseRole(e.target.value as HackathonStaffRole)} className={INPUT}>
              {(Object.keys(ROLE_LABEL) as HackathonStaffRole[]).map((item) => <option key={item} value={item}>{ROLE_LABEL[item]}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <p className={LABEL}>Permissions (start from the role, then adjust)</p>
          <PermissionChecklist catalog={me.catalog} value={picked} onChange={setPicked} grantable={grantable} idPrefix="new" />
          {!me.is_site_organizer && <p className="text-[11px] text-slate-500 dark:text-slate-400">You can only hand out permissions you hold yourself.</p>}
        </div>
        <button type="submit" disabled={busy || !email.trim() || picked.length === 0} className={BTN_PRIMARY}><UserPlus className="h-3.5 w-3.5" /> {busy ? 'Adding…' : `Add ${ROLE_LABEL[role].toLowerCase()}`}</button>
      </form>

      <section className={`${PANEL} space-y-3`}>
        <h3 className="text-sm font-bold text-[#1A1A2E] dark:text-white">People ({people.length})</h3>
        {people.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">Nobody has been added yet.</p> : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {people.map((person) => {
              const editing = editingId === person.id;
              return (
                <li key={person.id} className="space-y-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#1A1A2E] dark:text-white">
                        {person.name} <StatusPill tone={ROLE_TONE[person.role]}>{ROLE_LABEL[person.role]}</StatusPill>
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{person.email}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => { setEditingId(editing ? null : person.id); setDraft(person.permissions); }} className={BTN_GHOST} aria-expanded={editing}>
                        {editing ? <><X className="h-3.5 w-3.5" /> Close</> : <><Pencil className="h-3.5 w-3.5" /> Permissions</>}
                      </button>
                      <button type="button" onClick={() => remove(person)} aria-label={`Remove ${person.name}`} className={BTN_DANGER}><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  {editing ? (
                    <div className="space-y-3">
                      <PermissionChecklist catalog={me.catalog} value={draft} onChange={setDraft} grantable={grantable} idPrefix={`edit-${person.id}`} />
                      <button type="button" onClick={() => savePermissions(person)} disabled={busy || draft.length === 0} className={BTN_PRIMARY}><Save className="h-3.5 w-3.5" /> Save permissions</button>
                    </div>
                  ) : (
                    <ul className="flex flex-wrap gap-1.5">
                      {person.permissions.map((key) => <li key={key} className="rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] text-slate-600 dark:border-slate-700 dark:text-slate-300">{labelOf(key)}</li>)}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
