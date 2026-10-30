'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Archive, Hash, KeyRound, Lock, UserPlus, Users } from 'lucide-react';
import { getStoredUser } from '@/lib/auth';
import { apiErrorMessage } from '@/lib/api/hackathons';
import { clubIdApi, type ClubIdCounter, type ClubIdOverview } from '@/lib/clubIds';
import { membershipApi } from '@/lib/clubMembership';
import { Kpi } from '../hackathon/OverviewParts';
import { LoadError } from '../hackathon/LoadError';
import { AllocateDialog, AssignDialog, ClearDialog, CounterDialog, MoveDialog, ReserveDialog } from './ClubIdDialogs';
import { CountersTab, HistoryTab, RegistryTab, ReservationsTab, type HolderTarget } from './ClubIdTabs';
import { LookupBox } from './LookupBox';
import { RequestsTab } from './RequestsTab';

const TABS = [['requests', 'Requests'], ['registry', 'Registry'], ['reservations', 'Reservations'], ['counters', 'Counters'], ['history', 'History']] as const;
type TabKey = (typeof TABS)[number][0];
const BUTTON = 'inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition active:scale-95 sm:min-h-10';

type Dialog =
  | { kind: 'allocate' } | { kind: 'assign'; presetId: string } | { kind: 'reserve' }
  | { kind: 'move'; holder: HolderTarget } | { kind: 'clear'; holder: HolderTarget } | { kind: 'counter'; counter: ClubIdCounter };

/** The control panel for Club IDs: look anything up, see what is held, reserved and retired, and (as an Admin) change it with a reason. */
export function ClubIdPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = searchParams?.get('tab');
  const tab: TabKey = TABS.find(([key]) => key === requested)?.[0] ?? 'registry';
  const isAdmin = getStoredUser()?.role === 'ADMIN';
  const year = new Date().getFullYear();

  const [overview, setOverview] = useState<ClubIdOverview | null>(null);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [waiting, setWaiting] = useState(0);

  const loadOverview = useCallback(() => {
    clubIdApi.overview().then((data) => { setOverview(data); setError(''); }).catch((err) => setError(apiErrorMessage(err, 'Could not load the Club ID panel.')));
  }, []);
  useEffect(loadOverview, [loadOverview, refreshKey]);
  useEffect(() => { membershipApi.queue({ status: 'PENDING' }).then((page) => setWaiting(page.counts.PENDING)).catch(() => setWaiting(0)); }, [refreshKey]);

  const changed = () => setRefreshKey((key) => key + 1);
  const goTo = (key: TabKey) => router.replace(`${pathname}?tab=${key}`, { scroll: false });
  const counters = overview?.counters ?? [];
  const thisYear = counters.find((counter) => counter.prefix === 'SCC' && counter.year === year);
  const nextThisYear = thisYear?.next_id ?? `${String(year % 100).padStart(2, '0')}SCC001`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-journey-text"><KeyRound className="h-5 w-5 text-journey-accent" aria-hidden="true" /> Club IDs</h1>
          <p className="mt-1 text-sm text-journey-muted"><Link href="/admin/reconcile" className="font-bold text-journey-accent hover:underline">Compare a past-member sheet</Link> · Who holds which id, what is held back or retired, and every change with its reason.{!isAdmin && ' You can look; only an Admin can change an id.'}</p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setDialog({ kind: 'allocate' })} className={`${BUTTON} bg-journey-accent text-journey-on-accent hover:opacity-90`}><UserPlus className="h-4 w-4" aria-hidden="true" /> Give the next number</button>
            <button type="button" onClick={() => setDialog({ kind: 'assign', presetId: '' })} className={`${BUTTON} border border-journey-text/15 text-journey-text hover:bg-journey-text/10`}><Hash className="h-4 w-4" aria-hidden="true" /> Assign an id</button>
            <button type="button" onClick={() => setDialog({ kind: 'reserve' })} className={`${BUTTON} border border-journey-text/15 text-journey-text hover:bg-journey-text/10`}><Lock className="h-4 w-4" aria-hidden="true" /> Reserve an id</button>
          </div>
        )}
      </header>

      {error && <LoadError message={error} onRetry={loadOverview} />}

      {waiting > 0 && tab !== 'requests' && (
        <button type="button" onClick={() => goTo('requests')} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left text-sm text-journey-text hover:border-amber-500/60">
          <span><strong>{waiting}</strong> {waiting === 1 ? 'person is' : 'people are'} waiting to become club members.</span>
          <span className="text-xs font-bold text-journey-accent">Open the requests</span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi icon={Users} label="Hold a Club ID" value={overview?.totals.holders ?? '—'} hint="members with an id" onClick={() => goTo('registry')} />
        <Kpi icon={Lock} label="Reserved" value={overview?.totals.reserved ?? '—'} hint="held for people with no account" tone="amber" onClick={() => goTo('reservations')} />
        <Kpi icon={Archive} label="Retired" value={overview?.totals.retired ?? '—'} hint="cleared, not given again" tone="red" onClick={() => goTo('history')} />
        <Kpi icon={Hash} label={`Next in ${year}`} value={<span className="font-mono text-2xl">{nextThisYear}</span>} hint="from the counter" tone="green" onClick={() => goTo('counters')} />
      </div>

      <LookupBox
        isAdmin={isAdmin}
        refreshKey={refreshKey}
        onAssign={(presetId) => setDialog({ kind: 'assign', presetId })}
        onReserve={() => setDialog({ kind: 'reserve' })}
        onAllocate={() => setDialog({ kind: 'allocate' })}
        onMove={(holder) => setDialog({ kind: 'move', holder })}
        onClear={(holder) => setDialog({ kind: 'clear', holder })}
      />

      <div className="glass-panel space-y-5 rounded-xl border border-journey-text/10 p-4 sm:p-5">
        <div role="tablist" aria-label="Club ID sections" className="flex flex-wrap gap-1.5">
          {TABS.map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => goTo(key)} className={`min-h-11 rounded-lg px-4 text-xs font-bold sm:min-h-10 ${tab === key ? 'bg-journey-accent text-journey-on-accent' : 'border border-journey-text/10 text-journey-muted hover:text-journey-text'}`}>{label}{key === 'requests' && waiting > 0 ? <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 text-[11px] tabular-nums">{waiting}</span> : null}</button>
          ))}
        </div>
        {tab === 'requests' && <RequestsTab isAdmin={isAdmin} refreshKey={refreshKey} onChanged={changed} />}
        {tab === 'registry' && <RegistryTab isAdmin={isAdmin} counters={counters} refreshKey={refreshKey} onMove={(holder) => setDialog({ kind: 'move', holder })} onClear={(holder) => setDialog({ kind: 'clear', holder })} />}
        {tab === 'reservations' && <ReservationsTab isAdmin={isAdmin} refreshKey={refreshKey} onReserve={() => setDialog({ kind: 'reserve' })} onChanged={changed} />}
        {tab === 'counters' && <CountersTab isAdmin={isAdmin} counters={counters} onMove={(counter) => setDialog({ kind: 'counter', counter })} />}
        {tab === 'history' && <HistoryTab refreshKey={refreshKey} />}
      </div>

      {dialog?.kind === 'allocate' && <AllocateDialog year={year} onClose={() => setDialog(null)} onDone={changed} />}
      {dialog?.kind === 'assign' && <AssignDialog presetId={dialog.presetId} onClose={() => setDialog(null)} onDone={changed} />}
      {dialog?.kind === 'reserve' && <ReserveDialog year={year} onClose={() => setDialog(null)} onDone={changed} />}
      {dialog?.kind === 'move' && <MoveDialog holder={dialog.holder} onClose={() => setDialog(null)} onDone={changed} />}
      {dialog?.kind === 'clear' && <ClearDialog holder={dialog.holder} onClose={() => setDialog(null)} onDone={changed} />}
      {dialog?.kind === 'counter' && <CounterDialog counter={dialog.counter} onClose={() => setDialog(null)} onDone={changed} />}
    </div>
  );
}
