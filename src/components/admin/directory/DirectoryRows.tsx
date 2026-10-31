'use client';

import React from 'react';
import { Check, Copy, Eye, Pencil } from 'lucide-react';
import type { DirectoryMembership, DirectoryRole, DirectoryUser } from '@/lib/userDirectory';
import { EmailStatusBadge } from './EmailStatusBadge';

export const ALL_ROLES: DirectoryRole[] = ['AFFILIATE', 'NON_AFFILIATE', 'VOLUNTEER', 'JUDGE', 'CLUB_LEAD', 'ADMIN'];
export const ALL_STATUSES: DirectoryMembership[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'ALUMNI', 'PENDING'];
export const ELEVATED_ROLES = new Set<DirectoryRole>(['ADMIN', 'CLUB_LEAD']);

const EDITOR = 'min-h-10 rounded-lg border border-journey-text/15 bg-journey-surface px-2 text-xs font-bold text-journey-text focus:border-journey-accent focus:outline-none';
const ICON_BUTTON = 'inline-flex min-h-10 items-center gap-1 rounded-lg px-3 text-xs font-bold transition active:scale-95';
const YEAR = (year: number | null) => (year ? `Year ${year}` : '');

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export interface DirectoryRowActions {
  canElevate: boolean;
  copiedId: string | null;
  onCopyClubId: (clubId: string) => void;
  onView: (user: DirectoryUser) => void;
  onEdit: (user: DirectoryUser) => void;
  onRole: (user: DirectoryUser, role: DirectoryRole) => void;
  onStatus: (user: DirectoryUser, status: DirectoryMembership) => void;
}

function ClubIdChip({ user, actions }: { user: DirectoryUser; actions: DirectoryRowActions }) {
  if (!user.club_id) return <span className="text-xs italic text-journey-muted">No Club ID</span>;
  const copied = actions.copiedId === user.club_id;
  return (
    <button
      type="button"
      onClick={() => actions.onCopyClubId(user.club_id!)}
      aria-label={`Copy Club ID ${user.club_id}`}
      className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-journey-accent/30 bg-journey-accent/10 px-2.5 font-mono text-xs font-bold text-journey-accent transition hover:bg-journey-accent/20 active:scale-95"
    >
      {user.club_id}
      {copied ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3 opacity-70" aria-hidden="true" />}
    </button>
  );
}

function RoleSelect({ user, actions }: { user: DirectoryUser; actions: DirectoryRowActions }) {
  return (
    <select
      aria-label={`Role of ${user.full_name}`}
      value={user.role}
      onChange={(event) => actions.onRole(user, event.target.value as DirectoryRole)}
      className={EDITOR}
    >
      {ALL_ROLES.filter((role) => !ELEVATED_ROLES.has(role) || actions.canElevate || role === user.role).map((role) => <option key={role} value={role}>{role}</option>)}
    </select>
  );
}

function StatusSelect({ user, actions }: { user: DirectoryUser; actions: DirectoryRowActions }) {
  return (
    <select
      aria-label={`Membership status of ${user.full_name}`}
      value={user.membership_status}
      onChange={(event) => actions.onStatus(user, event.target.value as DirectoryMembership)}
      className={EDITOR}
    >
      {ALL_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
    </select>
  );
}

function RowButtons({ user, actions }: { user: DirectoryUser; actions: DirectoryRowActions }) {
  return (
    <span className="flex flex-wrap gap-2 md:flex-nowrap">
      <button type="button" onClick={() => actions.onEdit(user)} aria-label={`Edit ${user.full_name}`} className={`${ICON_BUTTON} bg-journey-accent/10 text-journey-accent hover:bg-journey-accent/20`}><Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit</button>
      <button type="button" onClick={() => actions.onView(user)} aria-label={`View ${user.full_name}`} className={`${ICON_BUTTON} bg-journey-text/10 text-journey-text hover:bg-journey-text/15`}><Eye className="h-3.5 w-3.5" aria-hidden="true" /> View</button>
    </span>
  );
}

function Person({ user }: { user: DirectoryUser }) {
  return (
    <span className="flex min-w-0 items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-journey-accent/15 text-xs font-extrabold text-journey-accent" aria-hidden="true">{initials(user.full_name)}</span>
      <span className="min-w-0">
        <span className="block break-words text-sm font-bold text-journey-text">{user.full_name}</span>
        <span className="block break-all text-xs text-journey-muted">{user.email}</span>
        <span className="mt-1.5 block"><EmailStatusBadge user={user} /></span>
      </span>
    </span>
  );
}

function Academic({ user }: { user: DirectoryUser }) {
  const line = [user.branch, YEAR(user.year)].filter(Boolean).join(' · ');
  const college = user.college?.name || user.other_college_name;
  return (
    <span className="block text-xs">
      {user.roll_number ? <span className="block font-mono font-bold text-journey-text">{user.roll_number}</span> : <span className="block italic text-journey-muted">No roll number</span>}
      <span className="block text-journey-muted">{line || 'No branch or year'}</span>
      {college && <span className="block max-w-[16rem] truncate text-journey-muted" title={college}>{college}</span>}
    </span>
  );
}

/** The people as a table from tablet width up, and as cards on a phone. */
export function DirectoryRows({ rows, actions }: { rows: DirectoryUser[]; actions: DirectoryRowActions }) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <caption className="sr-only">People</caption>
          <thead className="border-b border-journey-text/10 text-[11px] font-bold uppercase tracking-wider text-journey-muted">
            <tr>
              <th scope="col" className="px-4 py-3">Person</th>
              <th scope="col" className="px-4 py-3">Academic</th>
              <th scope="col" className="px-4 py-3">Role</th>
              <th scope="col" className="px-4 py-3">Membership</th>
              <th scope="col" className="px-4 py-3">Club ID</th>
              <th scope="col" className="px-4 py-3">Joined</th>
              <th scope="col" className="px-4 py-3 text-right"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-journey-text/10">
            {rows.map((user) => (
              <tr key={user.id} className="align-top transition hover:bg-journey-text/[0.03]">
                <td className="px-4 py-3.5"><Person user={user} /></td>
                <td className="px-4 py-3.5"><Academic user={user} /></td>
                <td className="px-4 py-3.5"><RoleSelect user={user} actions={actions} /></td>
                <td className="px-4 py-3.5"><StatusSelect user={user} actions={actions} /></td>
                <td className="px-4 py-3.5"><ClubIdChip user={user} actions={actions} /></td>
                <td className="px-4 py-3.5 text-xs text-journey-muted">{day(user.registered_at || user.created_at)}</td>
                <td className="px-4 py-3.5 text-right"><span className="inline-flex justify-end"><RowButtons user={user} actions={actions} /></span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-journey-text/10 md:hidden">
        {rows.map((user) => (
          <li key={user.id} className="space-y-3 px-4 py-4">
            <Person user={user} />
            <Academic user={user} />
            <span className="flex flex-wrap items-center gap-2"><ClubIdChip user={user} actions={actions} /><span className="text-xs text-journey-muted">Joined {day(user.registered_at || user.created_at)}</span></span>
            <span className="flex flex-wrap gap-2"><RoleSelect user={user} actions={actions} /><StatusSelect user={user} actions={actions} /></span>
            <RowButtons user={user} actions={actions} />
          </li>
        ))}
      </ul>
    </>
  );
}
