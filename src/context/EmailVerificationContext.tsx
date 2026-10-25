'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchApi } from '@/lib/api-client';
import { AUTH_CHANGE_EVENT, getStoredUser } from '@/lib/auth';
import {
  EmailVerificationState,
  VERIFICATION_REQUIRED_EVENT,
  VerificationRequiredDetail,
} from '@/lib/emailVerification';

interface Value {
  /** null = signed out, not loaded yet, or the feature is off for this site. */
  state: EmailVerificationState | null;
  /** The first look at the server has finished (also true when signed out). */
  loaded: boolean;
  /** Ask the server again. Passive callers are skipped if a look just happened; `force` (a button) always asks. */
  refresh: (options?: { force?: boolean }) => Promise<void>;
  /** The "Verify email" button: ask for the link. */
  send: () => Promise<void>;
  sending: boolean;
  /** Masked address the last link went to. */
  sentTo: string | null;
  error: string | null;
  /** Seconds until another link can be requested. */
  cooldown: number;
  changeEmail: (newEmail: string, password: string) => Promise<boolean>;
  changeMessage: string | null;
  dialogOpen: boolean;
  dialogReason: VerificationRequiredDetail | null;
  openDialog: (reason?: VerificationRequiredDetail) => void;
  closeDialog: () => void;
}

const Ctx = createContext<Value | null>(null);

const POLL_WHILE_BLOCKED_MS = 15_000;
/** Sign-in announcements (other parts of the site fire several) re-check at most this often. */
const PASSIVE_REFRESH_GAP_MS = 3_000;
/** Tab focus and visibility change arrive together: one look, not two. */
const VISIBLE_COALESCE_MS = 400;
/** A page that asks for many things gets many refusals at once: look again once in this window. */
const REFUSAL_REFRESH_GAP_MS = 2_000;
/** After the person closes the dialog, refusals do not pop it up again for this long. */
const DIALOG_QUIET_MS = 60_000;
const USER_STORAGE_KEY = 'srkrcc_user';

export function EmailVerificationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<EmailVerificationState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [changeMessage, setChangeMessage] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogReason, setDialogReason] = useState<VerificationRequiredDetail | null>(null);

  const busy = useRef(false);
  const inflight = useRef<Promise<void> | null>(null);
  const lastFinished = useRef(0);
  /** Bumped on every sign-in, sign-out or account switch, so a late answer for the old account is thrown away. */
  const epoch = useRef(0);
  const userId = useRef<number | string | null>(null);
  const dismissedAt = useRef(0);
  const lastVisibleRefresh = useRef(0);
  const lastRefusalRefresh = useRef(0);

  const refresh = useCallback(async (options?: { force?: boolean }) => {
    if (!getStoredUser()) {
      setState(null);
      setLoaded(true);
      return;
    }
    if (inflight.current) return inflight.current;
    if (!options?.force && Date.now() - lastFinished.current < PASSIVE_REFRESH_GAP_MS) return;

    const mine = epoch.current;
    const run = (async () => {
      try {
        // silentVerification: a refusal of THIS call must not raise the dialog event, or looking again would loop.
        const me = await fetchApi<{ email_verification?: EmailVerificationState }>('/auth/me/', {
          silentAuth: true, silentVerification: true, cache: 'no-store',
        } as RequestInit);
        if (mine === epoch.current) setState(me?.email_verification ?? null);
      } catch {
        // Signed out, offline or a hiccup: keep whatever we knew rather than flash the screen.
      } finally {
        if (mine === epoch.current) setLoaded(true);
        lastFinished.current = Date.now();
        inflight.current = null;
      }
    })();
    inflight.current = run;
    return run;
  }, []);

  // Follow signing in and out (this tab and others), and a different person signing in.
  useEffect(() => {
    const sync = () => {
      const stored = getStoredUser();
      const now = !!stored;
      const id = stored?.id ?? null;
      if (id !== userId.current) {
        userId.current = id;
        epoch.current += 1;
        inflight.current = null;
        setState(null);
        setSentTo(null);
        setError(null);
        setCooldown(0);
        setChangeMessage(null);
        setDialogOpen(false);
        lastFinished.current = 0;
      }
      setSignedIn(now);
      if (now) void refresh();
      else setLoaded(true);
    };
    // Only this site's own sign-in record matters: another tab saving a form draft must not set us off.
    const onStorage = (event: StorageEvent) => { if (event.key === null || event.key === USER_STORAGE_KEY) sync(); };
    sync();
    window.addEventListener(AUTH_CHANGE_EVENT, sync);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, sync);
      window.removeEventListener('storage', onStorage);
    };
  }, [refresh]);

  // Someone verified on their phone: notice when they come back to this tab, and keep checking while blocked.
  const unverified = !!state && !state.verified;
  const blocked = !!state?.blocked;
  useEffect(() => {
    if (!signedIn || !unverified) return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastVisibleRefresh.current < VISIBLE_COALESCE_MS) return;
      lastVisibleRefresh.current = Date.now();
      void refresh({ force: true });
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    const timer = blocked ? setInterval(() => void refresh({ force: true }), POLL_WHILE_BLOCKED_MS) : undefined;
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      if (timer) clearInterval(timer);
    };
  }, [signedIn, unverified, blocked, refresh]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const openDialog = useCallback((reason?: VerificationRequiredDetail) => {
    setDialogReason(reason ?? null);
    setDialogOpen(true);
  }, []);
  const closeDialog = useCallback(() => {
    dismissedAt.current = Date.now();
    setDialogOpen(false);
    setError(null);
    setChangeMessage(null);
  }, []);

  // A request the API refused because the address is not verified: explain it, wherever it happened. Several refusals
  // at once (a page that asks for many things) look again once, and a dialog the person just closed stays closed.
  useEffect(() => {
    const onRequired = (event: Event) => {
      const detail = ((event as CustomEvent).detail || {}) as VerificationRequiredDetail;
      if (Date.now() - lastRefusalRefresh.current > REFUSAL_REFRESH_GAP_MS) {
        lastRefusalRefresh.current = Date.now();
        void refresh({ force: true });
      }
      if (Date.now() - dismissedAt.current < DIALOG_QUIET_MS) return;
      openDialog(detail);
    };
    window.addEventListener(VERIFICATION_REQUIRED_EVENT, onRequired);
    return () => window.removeEventListener(VERIFICATION_REQUIRED_EVENT, onRequired);
  }, [refresh, openDialog]);

  const send = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setSending(true);
    setError(null);
    try {
      const reply = await fetchApi<{ email_masked?: string; already_verified?: boolean }>('/auth/email/verification/request/', { method: 'POST' });
      if (reply?.already_verified) {
        await refresh({ force: true });
        return;
      }
      setChangeMessage(null);
      setSentTo(reply?.email_masked ?? state?.email_masked ?? null);
      setCooldown(60);
    } catch (e: any) {
      const retry = Number(e?.body?.retry_after ?? e?.retryAfter);
      if (e?.status === 429 && Number.isFinite(retry) && retry > 0 && retry <= 120) setCooldown(Math.ceil(retry));
      else if (e?.status === 503) setCooldown(15);
      setError(e?.body?.detail || e?.message || 'We could not send the email. Please try again.');
    } finally {
      busy.current = false;
      setSending(false);
    }
  }, [refresh, state?.email_masked]);

  const changeEmail = useCallback(async (newEmail: string, password: string) => {
    setChangeMessage(null);
    setError(null);
    try {
      const reply = await fetchApi<{ detail?: string }>('/auth/email/change/', {
        method: 'POST',
        body: JSON.stringify({ new_email: newEmail, password }),
      });
      setSentTo(null); // the earlier "we sent a link to <old address>" no longer applies
      setChangeMessage(reply?.detail || 'We sent a link to your new address.');
      setCooldown(60);
      await refresh({ force: true });
      return true;
    } catch (e: any) {
      setError(e?.body?.detail || e?.message || 'We could not change the address. Please try again.');
      return false;
    }
  }, [refresh]);

  const value = useMemo<Value>(() => ({
    state, loaded, refresh, send, sending, sentTo, error, cooldown, changeEmail, changeMessage,
    dialogOpen, dialogReason, openDialog, closeDialog,
  }), [state, loaded, refresh, send, sending, sentTo, error, cooldown, changeEmail, changeMessage, dialogOpen, dialogReason, openDialog, closeDialog]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const INERT: Value = {
  state: null, loaded: true, refresh: async () => {}, send: async () => {}, sending: false, sentTo: null, error: null, cooldown: 0,
  changeEmail: async () => false, changeMessage: null, dialogOpen: false, dialogReason: null, openDialog: () => {}, closeDialog: () => {},
};

/** Safe to call anywhere: outside the provider (tests, isolated pages) it reports "nothing to verify". */
export function useEmailVerification(): Value {
  return useContext(Ctx) ?? INERT;
}
