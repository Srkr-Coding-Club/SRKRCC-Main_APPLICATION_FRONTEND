'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, FileSpreadsheet, KeyRound, Mail, SearchX, UserPlus, Users } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { getStoredUser } from '@/lib/auth';
import { apiErrorMessage } from '@/lib/api/hackathons';
import { downloadDatasetRows } from '@/lib/exportApi';
import { formatYearOrdinal } from '@/lib/hooks/useAdminData';
import { useUserDirectory } from '@/lib/hooks/useUserDirectory';
import { directoryApi, PAGE_SIZE, type DirectoryMembership, type DirectoryRole, type DirectoryScope, type DirectoryUser } from '@/lib/userDirectory';
import { ExportMenu } from '@/components/ui/ExportMenu';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DetailDrawer } from '../DetailDrawer';
import { EditUserModal } from '../EditUserModal';
import { AssignAffiliateModal } from '../AssignAffiliateModal';
import { LoadError } from '../hackathon/LoadError';
import { BroadcastModal } from './BroadcastModal';
import { DirectoryFilterBar } from './DirectoryFilterBar';
import { DirectoryRows } from './DirectoryRows';
import { DirectorySummaryTiles } from './DirectorySummaryTiles';
import { UserDetailPanel } from './UserDetailPanel';

const COPY = {
  users: { title: 'Users', blurb: 'Everyone who has an account, with whether their email is verified.', noun: 'people' },
  members: { title: 'Club members', blurb: 'People who hold a Club ID (25SCC…). Everyone else is in Users.', noun: 'members' },
} as const;
const BUTTON = 'inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition active:scale-95 sm:min-h-10';

/** The edit and assign dialogs were written for the older, camel-cased user record. */
function legacyRecord(user: DirectoryUser) {
  return {
    id: user.id, firstName: user.first_name || null, lastName: user.last_name || null, name: user.full_name, email: user.email,
    rollNumber: user.roll_number || 'Not set', college: user.college, otherCollegeName: user.other_college_name || null,
    branch: user.branch || '', year: formatYearOrdinal(user.year), role: user.role, membershipStatus: user.membership_status,
    clubId: user.club_id, phoneNumber: user.phone_number, githubProfile: user.github_profile, linkedinProfile: user.linkedin_profile,
  };
}

interface UserDirectoryProps {
  scope: DirectoryScope;
  /** Users page only: opens the "create account" dialog (which reports back through `reloadKey`). */
  onCreate?: () => void;
  /** Changes whenever something outside the list changed it (an account was created), so the list reloads. */
  reloadKey?: number;
}

/** The one directory behind the Users and Members pages: server-side search, filters, numbers, paging and per-person controls. */
export function UserDirectory({ scope, onCreate, reloadKey = 0 }: UserDirectoryProps) {
  const { toast } = useToast();
  const { confirm, dialog } = useConfirmDialog();
  const directory = useUserDirectory(scope);
  const { filters, page, summary, loading, error, reload } = directory;
  const [viewed, setViewed] = useState<DirectoryUser | null>(null);
  const [editing, setEditing] = useState<DirectoryUser | null>(null);
  const [assigning, setAssigning] = useState<DirectoryUser | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);

  const me = getStoredUser();
  const isAdmin = me?.role === 'ADMIN';
  const copy = COPY[scope];

  React.useEffect(() => { if (reloadKey) reload(); }, [reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = page?.results ?? [];
  const total = page?.count ?? 0;
  const first = total === 0 ? 0 : (filters.page - 1) * PAGE_SIZE + 1;
  const last = Math.min(filters.page * PAGE_SIZE, total);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // A drawer that is open keeps showing the freshest copy of its person after every reload.
  const live = useMemo(() => (viewed ? rows.find((row) => row.id === viewed.id) ?? viewed : null), [viewed, rows]);

  const save = async (user: DirectoryUser, fields: Record<string, unknown>, done: string) => {
    try {
      await directoryApi.update(user.id, fields);
      toast.success(done, user.full_name);
      reload();
    } catch (err) {
      toast.error('Not saved', apiErrorMessage(err, `Could not update ${user.full_name}.`));
      reload();
    }
  };

  const verificationAction = async (user: DirectoryUser, run: () => Promise<unknown>, done: string) => {
    setVerifyBusy(true);
    try {
      await run();
      toast.success(done, user.full_name);
      reload();
    } catch (err) {
      toast.error('Could not do that', apiErrorMessage(err));
    } finally {
      setVerifyBusy(false);
    }
  };

  const markVerified = async (user: DirectoryUser) => {
    const ok = await confirm({
      title: `Mark ${user.full_name}'s email as verified?`,
      message: `You are vouching that ${user.email} belongs to them, without them clicking the link. This is recorded in the audit log.`,
      confirmLabel: 'Mark as verified',
    });
    if (ok) await verificationAction(user, () => directoryApi.markVerified(user.id), 'Email marked as verified');
  };

  const copyClubId = (clubId: string) => {
    navigator.clipboard?.writeText(clubId).catch(() => undefined);
    setCopiedId(clubId);
    toast.success('Club ID copied', clubId);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  const exportFile = async (format: Parameters<Parameters<typeof ExportMenu>[0]['onExport']>[0]) => {
    const { recipients, truncated, limit } = await directoryApi.recipients(filters, scope);
    if (truncated) throw new Error(`At most ${limit} people can be exported at once. Narrow the filters first.`);
    await downloadDatasetRows('users', recipients.map((row) => String(row.id)), format);
  };

  const empty = !loading && !error && rows.length === 0;

  return (
    <div className="space-y-6">
      {dialog}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-journey-text">
            <Users className="h-5 w-5 text-journey-accent" aria-hidden="true" /> {copy.title}
            {summary && <span className="rounded-full bg-journey-accent/10 px-2.5 py-0.5 text-xs font-extrabold tabular-nums text-journey-accent">{summary.total}</span>}
          </h1>
          <p className="mt-1 text-sm text-journey-muted">{copy.blurb}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {scope === 'members' && (
            <>
              <Link href="/admin/club-ids" className={`${BUTTON} border border-journey-text/15 text-journey-text hover:bg-journey-text/10`}><KeyRound className="h-4 w-4" aria-hidden="true" /> Club ID panel</Link>
              <Link href="/admin/reconcile" className={`${BUTTON} border border-journey-text/15 text-journey-text hover:bg-journey-text/10`}><FileSpreadsheet className="h-4 w-4" aria-hidden="true" /> Compare past members</Link>
              <Link href="/admin/csv-ingestion" className={`${BUTTON} border border-journey-text/15 text-journey-text hover:bg-journey-text/10`}><FileSpreadsheet className="h-4 w-4" aria-hidden="true" /> Import backup data</Link>
              <button type="button" onClick={() => setBroadcasting(true)} disabled={total === 0} className={`${BUTTON} border border-journey-text/15 text-journey-text hover:bg-journey-text/10 disabled:opacity-40`}><Mail className="h-4 w-4" aria-hidden="true" /> Email these members</button>
            </>
          )}
          <ExportMenu
            subject={copy.noun}
            disabled={total === 0}
            onExport={exportFile}
            triggerClassName={`${BUTTON} border border-journey-text/15 text-journey-text hover:bg-journey-text/10 disabled:opacity-40`}
          />
          {onCreate && <button type="button" onClick={onCreate} className={`${BUTTON} bg-journey-accent text-journey-on-accent hover:opacity-90`}><UserPlus className="h-4 w-4" aria-hidden="true" /> Create user</button>}
        </div>
      </header>

      <DirectorySummaryTiles scope={scope} summary={summary} filters={filters} onFilter={directory.apply} onClear={directory.clear} />

      <section className="glass-panel overflow-hidden rounded-xl border border-journey-text/10" aria-label={copy.title}>
        <div className="border-b border-journey-text/10 p-4 sm:p-5">
          <DirectoryFilterBar scope={scope} filters={filters} searchText={directory.searchText} onSearch={directory.setSearchText} onChange={directory.apply} onClear={directory.clear} />
        </div>

        {error && <div className="p-4"><LoadError message={error} onRetry={reload} /></div>}

        {loading && rows.length === 0 && !error && (
          <ul className="divide-y divide-journey-text/10" aria-busy="true" aria-label="Loading">
            {[1, 2, 3, 4, 5].map((key) => <li key={key} className="flex animate-pulse items-center gap-3 px-4 py-4"><span className="h-9 w-9 rounded-full bg-journey-text/10" /><span className="space-y-2"><span className="block h-3.5 w-40 rounded bg-journey-text/10" /><span className="block h-3 w-56 rounded bg-journey-text/10" /></span></li>)}
          </ul>
        )}

        {empty && (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
            <SearchX className="h-8 w-8 text-journey-muted" aria-hidden="true" />
            <p className="text-sm font-bold text-journey-text">No {copy.noun} match.</p>
            <p className="text-xs text-journey-muted">Try a different search or remove a filter.</p>
            <button type="button" onClick={directory.clear} className="mt-2 min-h-10 text-xs font-bold text-journey-accent hover:underline">Clear filters</button>
          </div>
        )}

        {rows.length > 0 && (
          <div className={loading ? 'opacity-60 transition' : 'transition'} aria-busy={loading}>
            <DirectoryRows
              rows={rows}
              actions={{
                canElevate: isAdmin, copiedId, onCopyClubId: copyClubId,
                onView: setViewed, onEdit: setEditing,
                onRole: (user, role: DirectoryRole) => (role === 'AFFILIATE' ? setAssigning(user) : save(user, { role }, `Now ${role}`)),
                onStatus: (user, status: DirectoryMembership) => save(user, { membership_status: status }, `Membership ${status.toLowerCase()}`),
              }}
            />
          </div>
        )}

        {total > 0 && (
          <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-journey-text/10 px-4 py-3 text-xs text-journey-muted" aria-label="Pages">
            <p aria-live="polite">Showing <strong className="text-journey-text">{first}–{last}</strong> of <strong className="text-journey-text">{total}</strong></p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => directory.apply({ page: filters.page - 1 })} disabled={filters.page <= 1} className={`${BUTTON} border border-journey-text/15 text-journey-text disabled:opacity-40`}><ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous</button>
              <span className="tabular-nums">Page {filters.page} of {pages}</span>
              <button type="button" onClick={() => directory.apply({ page: filters.page + 1 })} disabled={filters.page >= pages} className={`${BUTTON} border border-journey-text/15 text-journey-text disabled:opacity-40`}>Next <ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
            </div>
          </nav>
        )}
      </section>

      <AnimatePresence>
        {live && (
          <DetailDrawer isOpen onClose={() => setViewed(null)} title="Person details">
            <UserDetailPanel
              user={live}
              onEdit={() => { setEditing(live); setViewed(null); }}
              verification={isAdmin ? {
                busy: verifyBusy,
                onMarkVerified: () => markVerified(live),
                onExtend: (days) => verificationAction(live, () => directoryApi.extendDeadline(live.id, days), `Deadline extended by ${days} days`),
                onResend: () => verificationAction(live, () => directoryApi.resendVerification(live.id), 'Verification link sent'),
              } : null}
            />
          </DetailDrawer>
        )}
      </AnimatePresence>

      {editing && (
        <EditUserModal
          isOpen
          onClose={() => setEditing(null)}
          user={legacyRecord(editing)}
          canAssignElevatedRoles={isAdmin}
          onSave={async (userId, fields) => {
            try {
              await directoryApi.update(userId, fields);
              toast.success('Saved', editing.full_name);
              reload();
            } catch (err) {
              toast.error('Update failed', apiErrorMessage(err));
              throw err;
            }
          }}
        />
      )}

      <AssignAffiliateModal
        isOpen={assigning !== null}
        onClose={() => setAssigning(null)}
        user={assigning ? legacyRecord(assigning) : null}
        onConfirm={async (userId, clubId) => {
          await directoryApi.update(userId, { role: 'AFFILIATE', club_id: clubId || undefined });
          toast.success('Now an affiliate', assigning?.full_name ?? '');
          setAssigning(null);
          reload();
        }}
      />

      <BroadcastModal isOpen={broadcasting} onClose={() => setBroadcasting(false)} scope={scope} filters={filters} count={total} />
    </div>
  );
}
