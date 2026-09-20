'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  QrCode,
  Camera,
  CameraOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  ClipboardList,
  ScanLine,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { useToast } from '@/context/ToastContext';
import { Form, AttendanceSession, AttendanceReport, AttendanceScanResult } from '@/lib/types';
import { AttendanceReportTab } from '@/components/admin/AttendanceReportTab';

const QR_REGION_ID = 'attendance-qr-scanner-region';
// Ignore a repeat decode of the SAME token within this window — the camera
// keeps handing back the same frame's result for as long as the badge sits
// in view, and without this the scan endpoint would be hit dozens of times
// for one physical scan.
const SAME_TOKEN_COOLDOWN_MS = 3000;

function sessionLabelText(s: AttendanceSession): string {
  const label = s.session_label.charAt(0) + s.session_label.slice(1).toLowerCase();
  return `Day ${s.day_index + 1} · ${label} (${s.date})`;
}

/**
 * Picks the session whose scheduled start is closest to right now. Falls
 * back to today's date + session-label ordering when a session has no
 * opens_at set (AttendanceSession.opens_at is optional on the backend).
 */
function pickClosestSession(sessions: AttendanceSession[]): AttendanceSession | null {
  if (sessions.length === 0) return null;
  const now = Date.now();
  const withOpensAt = sessions.filter((s) => !!s.opens_at);
  if (withOpensAt.length > 0) {
    return withOpensAt.reduce((best, s) =>
      Math.abs(new Date(s.opens_at as string).getTime() - now) <
      Math.abs(new Date(best.opens_at as string).getTime() - now)
        ? s
        : best
    );
  }
  const labelOrder: Record<string, number> = { MORNING: 0, AFTERNOON: 1, EVENING: 2 };
  const todayStr = new Date().toISOString().slice(0, 10);
  const todays = sessions.filter((s) => s.date === todayStr);
  const pool = todays.length > 0 ? todays : sessions;
  return [...pool].sort(
    (a, b) => a.date.localeCompare(b.date) || labelOrder[a.session_label] - labelOrder[b.session_label]
  )[0];
}

type ScanResultBanner =
  | { kind: 'new'; displayName: string; scannedAt: string }
  | { kind: 'already'; displayName: string; scannedAt: string }
  | { kind: 'error'; message: string };

export function AttendanceScannerTab() {
  const { toast } = useToast();

  const [forms, setForms] = useState<Form[]>([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const [selectedFormId, setSelectedFormId] = useState<number | ''>('');

  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<number | ''>('');

  const [viewMode, setViewMode] = useState<'scan' | 'report'>('scan');

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [resultBanner, setResultBanner] = useState<ScanResultBanner | null>(null);

  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const html5QrRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ token: string; time: number }>({ token: '', time: 0 });
  const processingRef = useRef(false);
  const selectedSessionIdRef = useRef<number | ''>('');
  selectedSessionIdRef.current = selectedSessionId;

  // Load attendance-enabled forms.
  useEffect(() => {
    let cancelled = false;
    async function loadForms() {
      setLoadingForms(true);
      try {
        const res = await fetchApi<Form[] | { results: Form[] }>('/forms/');
        const list = Array.isArray(res) ? res : res?.results || [];
        const attendanceForms = list.filter((f) => f.attendance_enabled && typeof f.id === 'number');
        if (!cancelled) {
          setForms(attendanceForms);
          if (attendanceForms.length > 0) setSelectedFormId(attendanceForms[0].id as number);
        }
      } catch {
        if (!cancelled) toast.error('Failed to Load', 'Could not load the list of forms.');
      } finally {
        if (!cancelled) setLoadingForms(false);
      }
    }
    loadForms();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load sessions whenever the selected form changes.
  useEffect(() => {
    let cancelled = false;
    async function loadSessions() {
      if (!selectedFormId) {
        setSessions([]);
        setSelectedSessionId('');
        return;
      }
      setLoadingSessions(true);
      try {
        const res = await fetchApi<AttendanceSession[]>(`/forms/${selectedFormId}/attendance/sessions/`);
        if (cancelled) return;
        setSessions(res || []);
        const closest = pickClosestSession(res || []);
        setSelectedSessionId(closest ? closest.id : '');
      } catch {
        if (!cancelled) {
          setSessions([]);
          toast.error('Failed to Load', 'Could not load attendance sessions for this form.');
        }
      } finally {
        if (!cancelled) setLoadingSessions(false);
      }
    }
    loadSessions();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFormId]);

  // Load the report whenever the Report view is active for the selected form.
  const loadReport = useCallback(async () => {
    if (!selectedFormId) return;
    setLoadingReport(true);
    try {
      const res = await fetchApi<AttendanceReport>(`/forms/${selectedFormId}/attendance/report/`);
      setReport(res);
    } catch {
      toast.error('Failed to Load', 'Could not load the attendance report.');
      setReport(null);
    } finally {
      setLoadingReport(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFormId]);

  useEffect(() => {
    if (viewMode === 'report') loadReport();
  }, [viewMode, loadReport]);

  const handleDecoded = useCallback(
    async (decodedText: string) => {
      const now = Date.now();
      if (
        decodedText === lastScanRef.current.token &&
        now - lastScanRef.current.time < SAME_TOKEN_COOLDOWN_MS
      ) {
        return;
      }
      if (processingRef.current) return;
      const sessionId = selectedSessionIdRef.current;
      if (!sessionId) {
        toast.warning('Select a Session', 'Choose an attendance session before scanning.');
        return;
      }

      processingRef.current = true;
      lastScanRef.current = { token: decodedText, time: now };
      try {
        const res = await fetchApi<AttendanceScanResult>('/attendance/scan/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: decodedText, session_id: sessionId }),
        });
        if (res.new_scan) {
          setResultBanner({ kind: 'new', displayName: res.display_name, scannedAt: res.scanned_at });
          toast.success('Checked In', `${res.display_name} — attendance recorded.`);
        } else {
          setResultBanner({ kind: 'already', displayName: res.display_name, scannedAt: res.scanned_at });
          toast.warning('Already Recorded', `${res.display_name} was already checked in for this session.`);
        }
      } catch (err: any) {
        const message = err?.body?.error || err?.message || 'Invalid or unrecognized attendance badge.';
        setResultBanner({ kind: 'error', message });
        toast.error('Scan Failed', message);
      } finally {
        processingRef.current = false;
      }
    },
    [toast]
  );

  // Camera lifecycle — starts/stops the html5-qrcode scanner against the
  // #attendance-qr-scanner-region div. Kept running continuously between
  // scans (never stopped after a hit) so volunteers don't have to reopen the
  // camera for every registrant — only the cooldown above throttles repeats.
  useEffect(() => {
    if (!cameraActive) return;
    let cancelled = false;
    const instance = new Html5Qrcode(QR_REGION_ID);
    html5QrRef.current = instance;
    setCameraError(null);

    instance
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleDecoded(decodedText);
        },
        () => {
          // Per-frame "no QR found" callback — expected on almost every frame, ignore.
        }
      )
      .catch((err) => {
        if (!cancelled) {
          setCameraError(
            'Could not access the camera. Check browser permissions and that no other app is using it.'
          );
          setCameraActive(false);
          console.error('[AttendanceScanner] camera start failed:', err);
        }
      });

    return () => {
      cancelled = true;
      const running = html5QrRef.current;
      html5QrRef.current = null;
      if (running && running.isScanning) {
        running
          .stop()
          .then(() => running.clear())
          .catch(() => {});
      }
    };
  }, [cameraActive, handleDecoded]);

  const attendanceForms = forms;
  const selectedForm = attendanceForms.find((f) => f.id === selectedFormId) || null;

  return (
    <div className="space-y-6">
      {/* Header + form/session pickers */}
      <div className="bg-white dark:bg-[#151722] rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-slate-100 dark:bg-slate-800 text-[#FF7A00]">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-extrabold text-[#1A1A2E] dark:text-white uppercase tracking-wider">
              Attendance Scanner
            </h3>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('scan')}
              className={`min-h-[44px] px-4 py-2 rounded-md text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                viewMode === 'scan'
                  ? 'bg-white dark:bg-[#151722] text-[#FF7A00] shadow'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <ScanLine className="w-3.5 h-3.5" />
              Scan
            </button>
            <button
              type="button"
              onClick={() => setViewMode('report')}
              className={`min-h-[44px] px-4 py-2 rounded-md text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                viewMode === 'report'
                  ? 'bg-white dark:bg-[#151722] text-[#FF7A00] shadow'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Report
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Form</label>
            <select
              value={selectedFormId}
              onChange={(e) => setSelectedFormId(e.target.value ? Number(e.target.value) : '')}
              disabled={loadingForms}
              className="w-full min-h-[44px] px-3 py-2 rounded border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
            >
              {loadingForms && <option>Loading…</option>}
              {!loadingForms && attendanceForms.length === 0 && <option value="">No attendance-enabled forms</option>}
              {attendanceForms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Session</label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value ? Number(e.target.value) : '')}
              disabled={loadingSessions || sessions.length === 0}
              className="w-full min-h-[44px] px-3 py-2 rounded border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
            >
              {loadingSessions && <option>Loading…</option>}
              {!loadingSessions && sessions.length === 0 && <option value="">No sessions</option>}
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {sessionLabelText(s)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {viewMode === 'scan' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Camera */}
          <div className="bg-white dark:bg-[#151722] rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Camera</h4>
              <button
                type="button"
                onClick={() => setCameraActive((v) => !v)}
                className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                  cameraActive
                    ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                    : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                }`}
              >
                {cameraActive ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                {cameraActive ? 'Stop Camera' : 'Start Camera'}
              </button>
            </div>

            <div
              id={QR_REGION_ID}
              className="w-full aspect-square rounded-xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center"
            >
              {!cameraActive && (
                <p className="text-xs text-slate-400 px-6 text-center">
                  Camera is off. Press &quot;Start Camera&quot; and point it at a registrant&apos;s QR badge.
                </p>
              )}
            </div>

            {cameraError && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg border border-rose-500/20 bg-rose-500/5">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-rose-600 dark:text-rose-300">{cameraError}</p>
              </div>
            )}

            <p className="text-[11px] text-slate-400">
              Scanning continues automatically between registrants — no need to stop and restart the camera. A
              {' '}
              {SAME_TOKEN_COOLDOWN_MS / 1000}s cooldown prevents the same badge from double-scanning in one pass.
            </p>
          </div>

          {/* Latest result */}
          <div className="bg-white dark:bg-[#151722] rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Latest Scan Result</h4>

            {!resultBanner ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-xs font-semibold text-slate-400">
                Scan a badge to see the result here.
              </div>
            ) : resultBanner.kind === 'new' ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{resultBanner.displayName}</p>
                <p className="text-xs font-bold text-emerald-600/80 dark:text-emerald-400/80 uppercase tracking-wide">
                  New check-in recorded
                </p>
                <p className="text-[11px] text-slate-500">{new Date(resultBanner.scannedAt).toLocaleString('en-IN')}</p>
              </div>
            ) : resultBanner.kind === 'already' ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-center space-y-2">
                <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
                <p className="text-lg font-black text-amber-600 dark:text-amber-400">{resultBanner.displayName}</p>
                <p className="text-xs font-bold text-amber-600/80 dark:text-amber-400/80 uppercase tracking-wide">
                  Already recorded for this session
                </p>
                <p className="text-[11px] text-slate-500">{new Date(resultBanner.scannedAt).toLocaleString('en-IN')}</p>
              </div>
            ) : (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-center space-y-2">
                <XCircle className="w-10 h-10 text-rose-500 mx-auto" />
                <p className="text-sm font-black text-rose-600 dark:text-rose-400 uppercase tracking-wide">Scan Failed</p>
                <p className="text-xs text-rose-600/80 dark:text-rose-400/80">{resultBanner.message}</p>
              </div>
            )}

            {selectedForm && (
              <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Users className="w-3.5 h-3.5" />
                <span>
                  Scanning against <strong className="text-slate-600 dark:text-slate-300">{selectedForm.title}</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={loadReport}
              disabled={loadingReport || !selectedFormId}
              className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingReport ? 'animate-spin text-orange-500' : ''}`} />
              Refresh
            </button>
          </div>
          <AttendanceReportTab report={report} loading={loadingReport} formTitle={selectedForm?.title} />
        </div>
      )}
    </div>
  );
}
