'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, CheckCircle2, Download, RotateCcw, Search, XCircle } from 'lucide-react';
import type { CheckInParticipant, CheckInRoster } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { downloadCSV } from '@/lib/dataManagement';
import { LoadError } from '@/components/admin/hackathon/LoadError';
import { BTN_GHOST, BTN_PRIMARY, INPUT, PANEL } from '@/components/admin/hackathon/shared';

const SCAN_REGION_ID = 'hackathon-check-in-scanner';
const SAME_CODE_COOLDOWN_MS = 4000;
const ROSTER_REFRESH_MS = 30000;

type ScanOutcome = { ok: boolean; message: string; detail?: string };

function describeCameraError(err: unknown): string {
  const text = typeof err === 'string' ? err : (err as { name?: string })?.name || '';
  if (/NotAllowedError|PermissionDeniedError/i.test(text)) return 'Camera access was blocked. Allow it in the browser, or check people in from the list below.';
  if (/NotFoundError|DevicesNotFoundError/i.test(text)) return 'No camera was found on this device. Use the list below.';
  return 'The camera could not start. Use the list below.';
}

/** Scan participants' QR codes or tick them off a list. Used by organizers and by check-in volunteers. */
export function CheckInConsole({ slug }: { slug: string }) {
  const [roster, setRoster] = useState<CheckInRoster | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const lastScan = useRef<{ code: string; at: number }>({ code: '', at: 0 });

  const load = useCallback(() => {
    hackathonApi.checkIn.roster(slug).then((data) => { setRoster(data); setError(''); }).catch((err) => setError(apiErrorMessage(err, 'Could not load the roster.')));
  }, [slug]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, ROSTER_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const handleCode = useCallback(async (code: string) => {
    const now = Date.now();
    if (lastScan.current.code === code && now - lastScan.current.at < SAME_CODE_COOLDOWN_MS) return;
    lastScan.current = { code, at: now };
    try {
      const result = await hackathonApi.checkIn.checkIn(slug, { token: code });
      setOutcome({ ok: true, message: result.created ? `${result.name} checked in` : `${result.name} was already checked in`, detail: result.team_name });
      load();
    } catch (err) {
      setOutcome({ ok: false, message: apiErrorMessage(err, 'That code could not be checked in.') });
    }
  }, [slug, load]);

  const handleCodeRef = useRef(handleCode);
  useEffect(() => { handleCodeRef.current = handleCode; }, [handleCode]);

  useEffect(() => {
    if (!cameraOn) return;
    let cancelled = false;
    const scanner = new Html5Qrcode(SCAN_REGION_ID);
    setCameraError('');
    const starting = scanner
      .start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 240 } }, (text) => void handleCodeRef.current(text), () => undefined)
      .catch((err) => {
        if (cancelled) return;
        setCameraError(describeCameraError(err));
        setCameraOn(false);
      });
    return () => {
      cancelled = true;
      starting.then(() => (scanner.isScanning ? scanner.stop().then(() => scanner.clear()) : undefined)).catch(() => undefined);
    };
  }, [cameraOn]);

  const toggle = async (person: CheckInParticipant) => {
    setPendingId(person.user_id);
    try {
      if (person.checked_in) await hackathonApi.checkIn.undo(slug, person.user_id);
      else await hackathonApi.checkIn.checkIn(slug, { user_id: person.user_id });
      load();
    } catch (err) {
      setOutcome({ ok: false, message: apiErrorMessage(err) });
    } finally {
      setPendingId(null);
    }
  };

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (roster?.participants ?? []).filter((person) =>
      (!onlyMissing || !person.checked_in) &&
      (!needle || [person.name, person.email, person.team_name].some((text) => text.toLowerCase().includes(needle))));
  }, [roster, query, onlyMissing]);

  const percent = roster && roster.total ? Math.round((roster.checked_in / roster.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {error && <LoadError message={error} onRetry={load} />}

      <section className={`${PANEL} space-y-3`}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-3xl font-extrabold tabular-nums text-[#1A1A2E] dark:text-white">{roster?.checked_in ?? 0}<span className="text-lg text-slate-400"> / {roster?.total ?? 0}</span></p>
            <p className="text-xs text-slate-500">participants checked in ({percent}%)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setCameraOn((on) => !on)} className={cameraOn ? BTN_GHOST : BTN_PRIMARY}>
              {cameraOn ? <><CameraOff className="h-3.5 w-3.5" /> Stop camera</> : <><Camera className="h-3.5 w-3.5" /> Scan QR codes</>}
            </button>
            <button type="button" onClick={load} className={BTN_GHOST}><RotateCcw className="h-3.5 w-3.5" /> Refresh</button>
            <button
              type="button"
              disabled={!roster?.participants.length}
              onClick={() => roster && downloadCSV(roster.participants.map(({ user_id, team_id, ...row }) => row), `${slug}-check-in-${Date.now()}.csv`)}
              className={BTN_GHOST}
            >
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Check-in progress">
          <div className="h-full bg-[#FF7A00] transition-all" style={{ width: `${percent}%` }} />
        </div>

        {cameraError && <p role="alert" className="text-xs text-rose-500">{cameraError}</p>}
        {cameraOn && <div id={SCAN_REGION_ID} className="mx-auto w-full max-w-sm overflow-hidden rounded-lg" />}
        {outcome && (
          <div role="status" className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${outcome.ok ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'}`}>
            {outcome.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            <p className="min-w-0"><strong>{outcome.message}</strong>{outcome.detail && <span className="block text-xs opacity-80">{outcome.detail}</span>}</p>
          </div>
        )}
      </section>

      <section className={`${PANEL} space-y-3`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1 basis-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email or team…" aria-label="Search participants" className={`${INPUT} pl-9`} />
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} className="h-4 w-4 accent-[#FF7A00]" /> Not arrived yet
          </label>
        </div>
        {visible.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">{roster ? 'Nobody matches.' : 'Loading…'}</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {visible.map((person) => (
              <li key={person.user_id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#1A1A2E] dark:text-white">{person.name}{person.role === 'LEADER' && <span className="ml-2 text-[10px] font-bold uppercase text-[#FF7A00]">Leader</span>}</p>
                  <p className="truncate text-xs text-slate-500">{person.team_name} · {person.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(person)}
                  disabled={pendingId === person.user_id}
                  className={`${person.checked_in ? BTN_GHOST : BTN_PRIMARY} min-h-11 shrink-0 sm:min-h-0`}
                  aria-label={`${person.checked_in ? 'Undo check-in for' : 'Check in'} ${person.name}`}
                >
                  {person.checked_in ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Arrived</> : 'Check in'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
