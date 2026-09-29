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
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { useToast } from '@/context/ToastContext';
import { Form, AttendanceSession, AttendanceReport, AttendanceScanResult } from '@/lib/types';
import { AttendanceReportTab } from '@/components/admin/AttendanceReportTab';

const QR_REGION_ID = 'attendance-qr-scanner-region';
const SAME_TOKEN_COOLDOWN_MS = 3000;

function describeCameraError(err: unknown): string {
  const text =
    typeof err === 'string' ? err : err instanceof Error ? `${err.name}: ${err.message}` : String(err ?? '');
  const name = /\b([A-Za-z]+Error)\b/.exec(text)?.[1];
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Camera permission was denied. Allow camera access for this site in your browser settings, then press "Start Camera" again.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera was found on this device.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'The camera is already in use by another app or browser tab. Close it there and try again.';
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return 'No camera on this device matches the required settings (e.g. a rear-facing camera).';
    case 'SecurityError':
      return 'Camera access requires a secure connection (HTTPS or localhost).';
    default:
      return 'Could not access the camera. Check browser permissions and that no other app is using it.';
  }
}

function sessionLabelText(s: AttendanceSession): string {
  const label = s.session_label.charAt(0) + s.session_label.slice(1).toLowerCase();
  return `Day ${s.day_index + 1} · ${label} (${s.date})`;
}

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

interface ScanPopupData {
  kind: 'new' | 'already' | 'error';
  displayName?: string;
  scannedAt?: string;
  message?: string;
  sessionText?: string;
  formTitle?: string;
}

type ScanResultBanner =
  | { kind: 'new'; displayName: string; scannedAt: string }
  | { kind: 'already'; displayName: string; scannedAt: string }
  | { kind: 'error'; message: string };

interface RecentScanEntry {
  id: string;
  displayName: string;
  time: string;
  kind: 'new' | 'already';
}

interface AttendanceScannerTabProps {
  hideReportTab?: boolean;
}

export function AttendanceScannerTab({ hideReportTab = false }: AttendanceScannerTabProps = {}) {
  const { toast } = useToast();

  const [forms, setForms] = useState<Form[]>([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const [selectedFormId, setSelectedFormId] = useState<number | ''>('');

  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<number | ''>('');

  const [viewMode, setViewMode] = useState<'scan' | 'report'>('scan');

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'denied' | 'prompt' | 'unsupported'>('unknown');
  
  const [scanModal, setScanModal] = useState<ScanPopupData | null>(null);
  const [resultBanner, setResultBanner] = useState<ScanResultBanner | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScanEntry[]>([]);

  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const html5QrRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ token: string; time: number }>({ token: '', time: 0 });
  const processingRef = useRef(false);
  const isModalOpenRef = useRef(false);
  isModalOpenRef.current = !!scanModal;

  const selectedSessionIdRef = useRef<number | ''>('');
  selectedSessionIdRef.current = selectedSessionId;

  const selectedFormIdRef = useRef<number | ''>('');
  selectedFormIdRef.current = selectedFormId;

  const formsRef = useRef<Form[]>([]);
  formsRef.current = forms;

  const sessionsRef = useRef<AttendanceSession[]>([]);
  sessionsRef.current = sessions;

  const closeModal = useCallback(() => {
    setScanModal(null);
    processingRef.current = false;
    // Clear last token so next attendee can scan immediately without waiting out cooldown
    lastScanRef.current = { token: '', time: 0 };
  }, []);

  // Keyboard shortcut to dismiss popup with Enter, Space, or Escape
  useEffect(() => {
    if (!scanModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scanModal, closeModal]);

  const handleDecoded = useCallback(
    async (decodedText: string) => {
      if (isModalOpenRef.current || processingRef.current) return;

      const now = Date.now();
      if (
        decodedText === lastScanRef.current.token &&
        now - lastScanRef.current.time < SAME_TOKEN_COOLDOWN_MS
      ) {
        return;
      }

      const sessionId = selectedSessionIdRef.current;
      if (!sessionId) {
        toast.warning('Select a Session', 'Choose an attendance session before scanning.');
        return;
      }

      processingRef.current = true;
      lastScanRef.current = { token: decodedText, time: now };

      const curForm = formsRef.current.find((f) => f.id === selectedFormIdRef.current);
      const curSession = sessionsRef.current.find((s) => s.id === sessionId);
      const sessionText = curSession ? sessionLabelText(curSession) : undefined;
      const formTitle = curForm?.title;

      try {
        const res = await fetchApi<AttendanceScanResult>('/attendance/scan/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: decodedText, session_id: sessionId }),
        });

        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(100);
          } catch {
            // Ignore vibration permission issues
          }
        }

        if (res.new_scan) {
          setResultBanner({ kind: 'new', displayName: res.display_name, scannedAt: res.scanned_at });
          setRecentScans((prev) => [
            {
              id: `${Date.now()}-${res.response_id}`,
              displayName: res.display_name,
              time: new Date(res.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              kind: 'new',
            },
            ...prev.slice(0, 7),
          ]);
          setScanModal({
            kind: 'new',
            displayName: res.display_name,
            scannedAt: res.scanned_at,
            sessionText,
            formTitle,
          });
          toast.success('Checked In', `${res.display_name} — attendance recorded.`);
        } else {
          setResultBanner({ kind: 'already', displayName: res.display_name, scannedAt: res.scanned_at });
          setRecentScans((prev) => [
            {
              id: `${Date.now()}-${res.response_id}`,
              displayName: res.display_name,
              time: new Date(res.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              kind: 'already',
            },
            ...prev.slice(0, 7),
          ]);
          setScanModal({
            kind: 'already',
            displayName: res.display_name,
            scannedAt: res.scanned_at,
            sessionText,
            formTitle,
          });
          toast.warning('Already Recorded', `${res.display_name} was already checked in for this session.`);
        }
      } catch (err: any) {
        const message = err?.body?.error || err?.message || 'Invalid or unrecognized attendance badge.';
        setResultBanner({ kind: 'error', message });
        setScanModal({
          kind: 'error',
          message,
          sessionText,
          formTitle,
        });
        toast.error('Scan Failed', message);
      }
    },
    [toast]
  );

  const handleDecodedRef = useRef(handleDecoded);
  handleDecodedRef.current = handleDecoded;

  const startCamera = useCallback(() => {
    if (cameraActive || cameraStarting) return;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access requires a secure connection (HTTPS or localhost). This page was not loaded securely.');
      return;
    }

    setCameraError(null);
    setCameraStarting(true);
    setCameraActive(true);
  }, [cameraActive, cameraStarting]);

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

  // Read the browser's camera permission state
  useEffect(() => {
    let permissionStatus: PermissionStatus | null = null;
    const applyState = (state: PermissionState) => setPermissionState(state);

    if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
      setPermissionState('unsupported');
      return;
    }

    navigator.permissions
      .query({ name: 'camera' as PermissionName })
      .then((status) => {
        permissionStatus = status;
        applyState(status.state);
        status.onchange = () => applyState(status.state);
      })
      .catch(() => setPermissionState('unsupported'));

    return () => {
      if (permissionStatus) permissionStatus.onchange = null;
    };
  }, []);

  // Camera lifecycle — single start call without pre-stop races
  useEffect(() => {
    if (!cameraActive) {
      setCameraStarting(false);
      return;
    }

    let cancelled = false;
    const instance = new Html5Qrcode(QR_REGION_ID);
    html5QrRef.current = instance;
    setCameraError(null);

    const startPromise = instance
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleDecodedRef.current(decodedText);
        },
        () => {
          // Per-frame callback
        }
      )
      .then(() => {
        if (!cancelled) {
          setPermissionState('granted');
          setCameraStarting(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const desc = describeCameraError(err);
          setCameraError(desc);
          setCameraActive(false);
          setCameraStarting(false);
          const text = typeof err === 'string' ? err : err?.name || '';
          if (/NotAllowedError|PermissionDeniedError/i.test(text)) {
            setPermissionState('denied');
          }
          console.error('[AttendanceScanner] camera start failed:', err);
        }
      });

    return () => {
      cancelled = true;
      if (html5QrRef.current === instance) html5QrRef.current = null;
      startPromise
        .then(() => {
          if (instance.isScanning) return instance.stop().then(() => instance.clear());
        })
        .catch(() => {});
    };
  }, [cameraActive]);

  const attendanceForms = forms;
  const selectedForm = attendanceForms.find((f) => f.id === selectedFormId) || null;

  return (
    <div className="space-y-6">
      {/* Attendance Confirmation / Result Popup Modal */}
      {scanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-[#0D0E15]/95 backdrop-blur-2xl rounded-2xl max-w-md w-full p-6 sm:p-8 border border-orange-500/20 shadow-2xl shadow-orange-500/10 space-y-6 text-center relative overflow-hidden animate-in zoom-in-95 duration-150"
          >
            {/* Top Ambient Glow matching theme */}
            <div
              className={`absolute -top-20 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full blur-3xl pointer-events-none opacity-40 ${
                scanModal.kind === 'new'
                  ? 'bg-gradient-to-r from-[#FF7A00] to-emerald-500'
                  : scanModal.kind === 'already'
                  ? 'bg-gradient-to-r from-[#FF7A00] to-amber-500'
                  : 'bg-rose-500'
              }`}
            />

            {/* Icon Status */}
            <div className="relative flex justify-center pt-1">
              {scanModal.kind === 'new' ? (
                <div className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 ring-8 ring-emerald-500/10 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
              ) : scanModal.kind === 'already' ? (
                <div className="w-20 h-20 rounded-full bg-amber-500/15 border-2 border-amber-500/40 ring-8 ring-amber-500/10 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20">
                  <AlertTriangle className="w-10 h-10" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-rose-500/15 border-2 border-rose-500/40 ring-8 ring-rose-500/10 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/20">
                  <XCircle className="w-10 h-10" />
                </div>
              )}
            </div>

            {/* Content Details */}
            <div className="space-y-3">
              <div>
                <span
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    scanModal.kind === 'new'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : scanModal.kind === 'already'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {scanModal.kind === 'new' ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-[#FF7A00]" /> Attendance Marked
                    </>
                  ) : scanModal.kind === 'already' ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Already Checked In
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-rose-400" /> Scan Failed
                    </>
                  )}
                </span>
              </div>

              {scanModal.displayName ? (
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {scanModal.displayName}
                </h3>
              ) : (
                <h3 className="text-xl font-bold text-rose-400">Invalid Badge</h3>
              )}

              {scanModal.kind === 'error' ? (
                <p className="text-xs text-rose-300 px-4">
                  {scanModal.message || 'The scanned QR code is not valid for this attendance session.'}
                </p>
              ) : (
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-1 text-xs">
                  {scanModal.sessionText && (
                    <p className="font-bold text-slate-200">{scanModal.sessionText}</p>
                  )}
                  {scanModal.formTitle && (
                    <p className="text-[11px] text-[#FF9E00] font-medium truncate">Event: {scanModal.formTitle}</p>
                  )}
                  {scanModal.scannedAt && (
                    <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-1">
                      <Clock className="w-3 h-3 text-[#FF7A00]" />
                      {new Date(scanModal.scannedAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="pt-1">
              <button
                type="button"
                autoFocus
                onClick={closeModal}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#FF7A00] via-[#FF9E00] to-[#FF7A00] hover:brightness-110 shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98]"
              >
                <span>Scan Next Participant</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header + form/session pickers */}
      <div className="glass-panel rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-slate-100 dark:bg-slate-800 text-[#FF7A00]">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#1A1A2E] dark:text-white uppercase tracking-wider">
                Attendance Scanner
              </h3>
              <p className="text-[11px] text-slate-500">Scan member QR badges to record attendance in real-time</p>
            </div>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('scan')}
              className={`min-h-[40px] px-4 py-2 rounded-md text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                viewMode === 'scan'
                  ? 'glass-panel text-[#FF7A00] shadow'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <ScanLine className="w-3.5 h-3.5" />
              Scan
            </button>
            {!hideReportTab && (
              <button
                type="button"
                onClick={() => setViewMode('report')}
                className={`min-h-[40px] px-4 py-2 rounded-md text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                  viewMode === 'report'
                    ? 'glass-panel text-[#FF7A00] shadow'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                Report
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Target Form / Event</label>
            <select
              value={selectedFormId}
              onChange={(e) => setSelectedFormId(e.target.value ? Number(e.target.value) : '')}
              disabled={loadingForms}
              className="w-full min-h-[44px] px-3 py-2 rounded border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00] outline-none"
            >
              {loadingForms && <option>Loading forms…</option>}
              {!loadingForms && attendanceForms.length === 0 && <option value="">No attendance-enabled forms</option>}
              {attendanceForms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Target Session</label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value ? Number(e.target.value) : '')}
              disabled={loadingSessions || sessions.length === 0}
              className="w-full min-h-[44px] px-3 py-2 rounded border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00] outline-none"
            >
              {loadingSessions && <option>Loading sessions…</option>}
              {!loadingSessions && sessions.length === 0 && <option value="">No sessions configured</option>}
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
          {/* Camera Viewport */}
          <div className="glass-panel rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Camera Feed</h4>
              <button
                type="button"
                onClick={() => (cameraActive ? setCameraActive(false) : startCamera())}
                disabled={cameraStarting}
                className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                  cameraActive
                    ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                    : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 disabled:opacity-60'
                }`}
              >
                {cameraActive ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                {cameraStarting ? 'Starting Camera…' : cameraActive ? 'Stop Camera' : 'Start Camera'}
              </button>
            </div>

            {/* QR Region Viewport */}
            <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-inner">
              <div id={QR_REGION_ID} className="absolute inset-0" />
              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 pointer-events-none p-6 text-center space-y-2">
                  <div className="p-3 rounded-full bg-slate-900 border border-slate-800 text-slate-500">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-medium text-slate-400">
                    Camera is inactive. Press &quot;Start Camera&quot; to scan.
                  </p>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg border border-rose-500/20 bg-rose-500/5">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-rose-600 dark:text-rose-300">{cameraError}</p>
              </div>
            )}

            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#FF7A00]" />
              Each scan displays an instant confirmation popup. Press <kbd className="font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">Enter</kbd> to dismiss and scan the next badge.
            </p>
          </div>

          {/* Right Panel: Latest Result + Session Activity */}
          <div className="space-y-5">
            {/* Latest Result Card */}
            <div className="glass-panel rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Latest Recorded Scan</h4>

              {!resultBanner ? (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-10 text-center text-xs font-semibold text-slate-400">
                  Scan a badge to view recent activity.
                </div>
              ) : resultBanner.kind === 'new' ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center space-y-1.5">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-base font-black text-emerald-600 dark:text-emerald-400">{resultBanner.displayName}</p>
                  <p className="text-[11px] font-bold text-emerald-600/80 dark:text-emerald-400/80 uppercase tracking-wide">
                    New check-in recorded
                  </p>
                  <p className="text-[10px] text-slate-500">{new Date(resultBanner.scannedAt).toLocaleString('en-IN')}</p>
                </div>
              ) : resultBanner.kind === 'already' ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-center space-y-1.5">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                  <p className="text-base font-black text-amber-600 dark:text-amber-400">{resultBanner.displayName}</p>
                  <p className="text-[11px] font-bold text-amber-600/80 dark:text-amber-400/80 uppercase tracking-wide">
                    Already recorded for this session
                  </p>
                  <p className="text-[10px] text-slate-500">{new Date(resultBanner.scannedAt).toLocaleString('en-IN')}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 text-center space-y-1.5">
                  <XCircle className="w-8 h-8 text-rose-500 mx-auto" />
                  <p className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-wide">Scan Failed</p>
                  <p className="text-xs text-rose-600/80 dark:text-rose-400/80">{resultBanner.message}</p>
                </div>
              )}

              {selectedForm && (
                <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    Form: <strong className="text-slate-600 dark:text-slate-300">{selectedForm.title}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Session Activity Feed */}
            {recentScans.length > 0 && (
              <div className="glass-panel rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Live Session Log</h4>
                  <span className="text-[10px] text-slate-400">{recentScans.length} scanned</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                  {recentScans.map((item) => (
                    <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        {item.kind === 'new' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        )}
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {item.displayName}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">{item.time}</span>
                    </div>
                  ))}
                </div>
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
              Refresh Report
            </button>
          </div>
          <AttendanceReportTab report={report} loading={loadingReport} formTitle={selectedForm?.title} />
        </div>
      )}
    </div>
  );
}
