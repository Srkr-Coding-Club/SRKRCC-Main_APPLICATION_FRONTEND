'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { AlertTriangle, Camera, CameraOff, CheckCircle2, CloudOff, Flashlight, FlashlightOff, Keyboard, Maximize2, RotateCcw, Search, Undo2, X, XCircle } from 'lucide-react';
import type { CheckInHeldBack as HeldBackPerson, CheckInParticipant, CheckInRoster } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { dequeueScan, enqueueScan, isNetworkFailure, loadQueue } from '@/lib/checkInQueue';
import { playScanFeedback, type ScanTone } from '@/lib/scanFeedback';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';
import { LoadError } from '@/components/admin/hackathon/LoadError';
import { ExportMenu } from '@/components/ui/ExportMenu';
import { CheckInHeldBack } from './CheckInHeldBack';
import { BTN_GHOST, BTN_PRIMARY, INPUT, PANEL } from '@/components/admin/hackathon/shared';

const SCAN_REGION_ID = 'hackathon-check-in-scanner';
const SAME_CODE_COOLDOWN_MS = 4000;
const ROSTER_REFRESH_MS = 30000;
const ROSTER_PAGE_SIZE = 100;
const SEARCH_DEBOUNCE_MS = 300;

const RECENT_LIMIT = 5;

type ScanOutcome = { tone: ScanTone | 'queued'; message: string; detail?: string; userId?: number };

const TONE_STYLE: Record<ScanOutcome['tone'], string> = {
  success: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
  repeat: 'border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-amber-200',
  queued: 'border-sky-500/50 bg-sky-500/15 text-sky-800 dark:text-sky-200',
  error: 'border-rose-500/50 bg-rose-500/15 text-rose-800 dark:text-rose-200',
};

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
  const [search, setSearch] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [pageSize, setPageSize] = useState(ROSTER_PAGE_SIZE);
  const [bigScreen, setBigScreen] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [typedCode, setTypedCode] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [recent, setRecent] = useState<ScanOutcome[]>([]);
  const [queued, setQueued] = useState(0);
  const [online, setOnline] = useState(true);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const lastScan = useRef<{ code: string; at: number }>({ code: '', at: 0 });

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(query.trim()); setPageSize(ROSTER_PAGE_SIZE); }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  /** Filtering and paging happen on the server, so a big event never downloads its whole roster on every refresh. */
  const load = useCallback(() => {
    hackathonApi.checkIn.roster(slug, { q: search, missing: onlyMissing, limit: pageSize })
      .then((data) => { setRoster(data); setError(''); })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load the roster.')));
  }, [slug, search, onlyMissing, pageSize]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, ROSTER_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const report = useCallback((next: ScanOutcome) => {
    setOutcome(next);
    setRecent((list) => [next, ...list].slice(0, RECENT_LIMIT));
    playScanFeedback(next.tone === 'queued' ? 'success' : next.tone);
  }, []);

  /** Sends every scan saved while offline. Stops at the first network failure; a server refusal drops that scan. */
  const flushing = useRef(false);
  const flushQueue = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      for (const item of loadQueue(slug)) {
        try {
          const result = await hackathonApi.checkIn.checkIn(slug, { token: item.code, scanned_at: item.scannedAt });
          report({ tone: result.created ? 'success' : 'repeat', message: `${result.name} ${result.created ? 'synced' : 'was already checked in'}`, detail: result.team_name, userId: result.created ? result.user_id : undefined });
        } catch (err) {
          if (isNetworkFailure(err)) break;
          report({ tone: 'error', message: apiErrorMessage(err, 'A saved scan was refused.') });
        }
        dequeueScan(slug, item.code);
      }
    } finally {
      flushing.current = false;
      setQueued(loadQueue(slug).length);
      load();
    }
  }, [slug, load, report]);

  useEffect(() => {
    setQueued(loadQueue(slug).length);
    setOnline(navigator.onLine);
    const goOnline = () => { setOnline(true); void flushQueue(); };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    void flushQueue();
    const timer = window.setInterval(() => { if (loadQueue(slug).length) void flushQueue(); }, ROSTER_REFRESH_MS);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); window.clearInterval(timer); };
  }, [slug, flushQueue]);

  const handleCode = useCallback(async (code: string) => {
    const now = Date.now();
    if (lastScan.current.code === code && now - lastScan.current.at < SAME_CODE_COOLDOWN_MS) return;
    lastScan.current = { code, at: now };
    try {
      const result = await hackathonApi.checkIn.checkIn(slug, { token: code });
      if (result.created) report({ tone: 'success', message: `${result.name} checked in`, detail: result.team_name, userId: result.user_id });
      else report({ tone: 'repeat', message: `${result.name} was already checked in`, detail: `${result.team_name} · ${formatDateTime(result.checked_in_at)}${result.checked_in_by ? ` by ${result.checked_in_by}` : ''}` });
      load();
    } catch (err) {
      if (isNetworkFailure(err)) {
        setQueued(enqueueScan(slug, code).length);
        report({ tone: 'queued', message: 'Saved on this phone', detail: 'No connection. It will be sent automatically when you are back online.' });
      } else {
        report({ tone: 'error', message: apiErrorMessage(err, 'That code could not be checked in.') });
      }
    }
  }, [slug, load, report]);

  const handleCodeRef = useRef(handleCode);
  useEffect(() => { handleCodeRef.current = handleCode; }, [handleCode]);

  useEffect(() => {
    if (!cameraOn) return;
    let cancelled = false;
    const scanner = new Html5Qrcode(SCAN_REGION_ID);
    scannerRef.current = scanner;
    setCameraError('');
    const starting = scanner
      .start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 240 } }, (text) => void handleCodeRef.current(text), () => undefined)
      .then(() => {
        if (cancelled) return;
        try {
          setTorchSupported(Boolean(scanner.getRunningTrackCameraCapabilities().torchFeature().isSupported()));
        } catch {
          setTorchSupported(false);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setCameraError(describeCameraError(err));
        setCameraOn(false);
      });
    return () => {
      cancelled = true;
      scannerRef.current = null;
      setTorchSupported(false);
      setTorchOn(false);
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
      report({ tone: 'error', message: apiErrorMessage(err) });
    } finally {
      setPendingId(null);
    }
  };

  const undoRecent = async (entry: ScanOutcome) => {
    if (entry.userId === undefined) return;
    try {
      await hackathonApi.checkIn.undo(slug, entry.userId);
      setRecent((list) => list.map((item) => (item === entry ? { ...item, userId: undefined, tone: 'repeat', message: `${entry.message} (undone)` } : item)));
      load();
    } catch (err) {
      report({ tone: 'error', message: apiErrorMessage(err) });
    }
  };

  const toggleTorch = async () => {
    try {
      await scannerRef.current?.getRunningTrackCameraCapabilities().torchFeature().apply(!torchOn);
      setTorchOn((on) => !on);
    } catch {
      setTorchSupported(false);
      setCameraError('The torch could not be switched on this phone.');
    }
  };

  const submitTypedCode = (event: React.FormEvent) => {
    event.preventDefault();
    const code = typedCode.trim();
    if (!code) return;
    setTypedCode('');
    void handleCode(code);
  };

  const letIn = async (person: HeldBackPerson, reason: string) => {
    try {
      const result = await hackathonApi.checkIn.checkIn(slug, { user_id: person.user_id, override: true, reason });
      report({ tone: 'success', message: `${result.name} checked in`, detail: `${result.team_name} · let in by an organizer`, userId: result.user_id });
      load();
    } catch (err) {
      report({ tone: 'error', message: apiErrorMessage(err) });
    }
  };

  const visible = roster?.participants ?? [];

  const percent = roster && roster.total ? Math.round((roster.checked_in / roster.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* While offline the banner below already explains why the list is stale, so a red fetch error would only alarm. */}
      {error && online && <LoadError message={error} onRetry={load} />}

      {bigScreen && (
        <div role="dialog" aria-modal="true" aria-label="Check-in progress" className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[var(--background)] p-6 text-center">
          <button type="button" onClick={() => setBigScreen(false)} className={`${BTN_GHOST} absolute right-4 top-4`}><X className="h-4 w-4" /> Close</button>
          <p className="text-[clamp(4rem,18vw,12rem)] font-extrabold leading-none tabular-nums text-journey-text">{roster?.checked_in ?? 0}<span className="text-journey-muted"> / {roster?.total ?? 0}</span></p>
          <p className="text-xl font-semibold text-journey-muted">participants checked in ({percent}%)</p>
          <div className="h-4 w-full max-w-3xl overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full bg-[#FF7A00] transition-all" style={{ width: `${percent}%` }} /></div>
        </div>
      )}

      <section className={`${PANEL} space-y-3`}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-3xl font-extrabold tabular-nums text-[#1A1A2E] dark:text-white">{roster?.checked_in ?? 0}<span className="text-lg text-slate-500 dark:text-slate-400"> / {roster?.total ?? 0}</span></p>
            <p className="text-xs text-slate-500 dark:text-slate-400">participants checked in ({percent}%)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setCameraOn((on) => !on)} className={cameraOn ? BTN_GHOST : BTN_PRIMARY}>
              {cameraOn ? <><CameraOff className="h-3.5 w-3.5" /> Stop camera</> : <><Camera className="h-3.5 w-3.5" /> Scan QR codes</>}
            </button>
            <button type="button" onClick={load} className={BTN_GHOST}><RotateCcw className="h-3.5 w-3.5" /> Refresh</button>
            <ExportMenu subject="check-in list" disabled={!roster?.total} onExport={(format) => hackathonApi.exportFile(slug, 'check-in', format)} triggerClassName={BTN_GHOST} />
            <button type="button" onClick={() => setBigScreen(true)} className={BTN_GHOST}><Maximize2 className="h-3.5 w-3.5" /> Big screen</button>
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Check-in progress">
          <div className="h-full bg-[#FF7A00] transition-all" style={{ width: `${percent}%` }} />
        </div>

        {cameraError && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{cameraError}</p>}
        {cameraOn && <div id={SCAN_REGION_ID} className="mx-auto w-full max-w-sm overflow-hidden rounded-lg" />}
        {cameraOn && torchSupported && (
          <button type="button" onClick={() => void toggleTorch()} aria-pressed={torchOn} className={`${BTN_GHOST} mx-auto flex`}>
            {torchOn ? <><FlashlightOff className="h-3.5 w-3.5" /> Torch off</> : <><Flashlight className="h-3.5 w-3.5" /> Torch on</>}
          </button>
        )}
        <form onSubmit={submitTypedCode} className="flex flex-wrap items-center gap-2">
          <label htmlFor="check-in-typed-code" className="sr-only">Enter or paste a QR code</label>
          <div className="relative min-w-0 flex-1 basis-56">
            <Keyboard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" aria-hidden="true" />
            <input id="check-in-typed-code" value={typedCode} onChange={(e) => setTypedCode(e.target.value)} autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder="No camera? Paste or type a code" className={`${INPUT} pl-9`} />
          </div>
          <button type="submit" disabled={!typedCode.trim()} className={BTN_GHOST}>Check in code</button>
        </form>
        {(!online || queued > 0) && (
          <p role="status" className="flex items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-800 dark:text-sky-200">
            <CloudOff className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!online ? 'You are offline. Scans are saved on this phone and sent when you reconnect.' : 'Sending saved scans…'}
            {queued > 0 && <span className="ml-auto tabular-nums">{queued} waiting</span>}
          </p>
        )}
        <div aria-live="assertive" aria-atomic="true">
          {outcome && (
            <div className={`flex items-start gap-3 rounded-xl border-2 px-4 py-3 ${TONE_STYLE[outcome.tone]}`}>
              {outcome.tone === 'success' ? <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" /> : outcome.tone === 'error' ? <XCircle className="mt-0.5 h-6 w-6 shrink-0" /> : outcome.tone === 'queued' ? <CloudOff className="mt-0.5 h-6 w-6 shrink-0" /> : <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" />}
              <p className="min-w-0 text-lg font-bold leading-snug">{outcome.message}{outcome.detail && <span className="block text-sm font-medium opacity-90">{outcome.detail}</span>}</p>
            </div>
          )}
        </div>
        {recent.length > 1 && (
          <ul aria-label="Recent scans" className="divide-y divide-slate-100 text-xs dark:divide-slate-800">
            {recent.slice(1).map((entry, index) => (
              <li key={`${index}-${entry.message}`} className="flex items-center justify-between gap-2 py-1.5 text-slate-600 dark:text-slate-300">
                <span className="min-w-0 truncate"><strong>{entry.message}</strong>{entry.detail && <span className="opacity-70"> · {entry.detail}</span>}</span>
                {entry.userId !== undefined && (
                  <button type="button" onClick={() => void undoRecent(entry)} className="inline-flex min-h-11 shrink-0 items-center gap-1 font-bold text-journey-accent sm:min-h-0"><Undo2 className="h-3.5 w-3.5" /> Undo</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${PANEL} space-y-3`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1 basis-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" aria-hidden="true" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email or team…" aria-label="Search participants" className={`${INPUT} pl-9`} />
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} className="h-4 w-4 accent-[#FF7A00]" /> Not arrived yet
          </label>
        </div>
        <CheckInHeldBack people={roster?.held_back ?? []} onLetIn={letIn} />
        {visible.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{roster ? 'Nobody matches.' : 'Loading…'}</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {visible.map((person) => (
              <li key={person.user_id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#1A1A2E] dark:text-white">{person.name}{person.role === 'LEADER' && <span className="ml-2 text-[11px] font-bold uppercase text-journey-accent">Leader</span>}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{person.team_name} · {person.email}</p>
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
        {roster && roster.count > visible.length && (
          <button type="button" onClick={() => setPageSize((size) => size + ROSTER_PAGE_SIZE)} className={`${BTN_GHOST} mx-auto flex`}>Show more ({roster.count - visible.length} left)</button>
        )}
      </section>
    </div>
  );
}
