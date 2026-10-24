'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, MailCheck, TriangleAlert } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { getStoredUser } from '@/lib/auth';
import { useEmailVerification } from '@/context/EmailVerificationContext';
import { VerifyPanel, primaryButton } from '@/components/verification/VerifyPanel';

type Phase =
  | { name: 'checking' }
  | { name: 'ready'; email: string; purpose: 'VERIFY' | 'CHANGE' }
  | { name: 'confirming'; email: string; purpose: 'VERIFY' | 'CHANGE' }
  | { name: 'done'; email: string; purpose: 'VERIFY' | 'CHANGE'; already: boolean }
  | { name: 'used'; email: string }
  | { name: 'problem'; code: string; message: string };

const PROBLEM_TITLES: Record<string, string> = {
  LINK_EXPIRED: 'This link has expired',
  INVALID_LINK: 'This link is not valid',
  EMAIL_CHANGED: 'The address on this account has changed',
  EMAIL_TAKEN: 'That address is already in use',
  MISSING: 'No link found',
};

function Card({ children, title, icon }: { children: React.ReactNode; title: string; icon: React.ReactNode }) {
  return (
    <section aria-labelledby="verify-title" className="mx-auto flex min-h-[60vh] max-w-lg items-center px-4 py-12">
      <div className="glass-panel w-full space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          {icon}
          <h1 id="verify-title" className="text-xl font-extrabold text-[#1A1A2E] dark:text-white">{title}</h1>
        </div>
        {children}
      </div>
    </section>
  );
}

function VerifyEmailContent() {
  const params = useSearchParams();
  const { refresh } = useEmailVerification();
  const [phase, setPhase] = useState<Phase>({ name: 'checking' });
  const token = useRef<string>('');
  const started = useRef(false);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => setSignedIn(!!getStoredUser()), []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    token.current = (params.get('token') || '').trim();
    // Take the one-time token out of the address bar (history, screenshots, shoulder-surfing).
    try { window.history.replaceState(null, '', window.location.pathname); } catch { /* not critical */ }
    if (!token.current) {
      setPhase({ name: 'problem', code: 'MISSING', message: 'Open the link from your email. If it does not open, copy the whole address into the browser.' });
      return;
    }
    fetchApi<any>(`/auth/email/verification/status/?token=${encodeURIComponent(token.current)}`)
      .then((reply) => {
        if (reply?.valid) setPhase({ name: 'ready', email: reply.email_masked, purpose: reply.purpose });
        else if (reply?.already_verified) setPhase({ name: 'done', email: reply?.email_masked || '', purpose: reply?.purpose || 'VERIFY', already: true });
        else setPhase({ name: 'used', email: reply?.email_masked || '' });
      })
      .catch((e: any) => setPhase({ name: 'problem', code: e?.body?.code || 'INVALID_LINK', message: e?.body?.detail || e?.message || 'This link is not valid.' }));
  }, [params]);

  const confirm = useCallback(async () => {
    if (phase.name !== 'ready') return;
    const { email, purpose } = phase;
    setPhase({ name: 'confirming', email, purpose });
    try {
      const reply = await fetchApi<any>('/auth/email/verification/confirm/', { method: 'POST', body: JSON.stringify({ token: token.current }) });
      setPhase({ name: 'done', email: reply?.email_masked || email, purpose, already: !!reply?.already });
      void refresh({ force: true });
    } catch (e: any) {
      setPhase({ name: 'problem', code: e?.body?.code || 'INVALID_LINK', message: e?.body?.detail || e?.message || 'We could not confirm this link.' });
    }
  }, [phase, refresh]);

  if (phase.name === 'checking') {
    return (
      <Card title="Checking your link" icon={<Loader2 className="h-6 w-6 animate-spin text-[#FF7A00]" aria-hidden="true" />}>
        <p role="status" className="text-sm text-slate-600 dark:text-slate-300">One moment...</p>
      </Card>
    );
  }

  if (phase.name === 'ready' || phase.name === 'confirming') {
    const changing = phase.purpose === 'CHANGE';
    return (
      <Card title={changing ? 'Confirm your new email address' : 'Confirm your email address'} icon={<MailCheck className="h-6 w-6 text-[#FF7A00]" aria-hidden="true" />}>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {changing ? 'Use' : 'Confirm that'} <strong className="text-[#1A1A2E] dark:text-white">{phase.email}</strong>{' '}
          {changing ? 'as the email address of your SRKR Coding Club account.' : 'is your address for your SRKR Coding Club account.'}
        </p>
        <button type="button" onClick={() => void confirm()} disabled={phase.name === 'confirming'} className={primaryButton}>
          {phase.name === 'confirming' ? 'Confirming...' : 'Confirm my email'}
        </button>
        <p className="text-xs text-slate-600 dark:text-slate-400">Did not ask for this? Close this page. Nothing changes until you press the button.</p>
      </Card>
    );
  }

  if (phase.name === 'used') {
    return (
      <Card title="This link was already used" icon={<TriangleAlert className="h-6 w-6 text-amber-600" aria-hidden="true" />}>
        <p role="status" className="text-sm text-slate-600 dark:text-slate-300">
          This link has been used, but the address on the account is not verified right now. Sign in and ask for a new link.
        </p>
        <Link href={`/login?next=${encodeURIComponent('/profile')}`} className={primaryButton}>Sign in</Link>
      </Card>
    );
  }

  if (phase.name === 'done') {
    return (
      <Card title={phase.already ? 'Already confirmed' : 'Email confirmed'} icon={<CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden="true" />}>
        <p role="status" className="text-sm text-slate-600 dark:text-slate-300">
          {phase.already ? 'This address is already confirmed.' : 'Thank you. Your email address is verified, and private features are unlocked.'}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href={signedIn ? '/profile' : '/login'} className={primaryButton}>{signedIn ? 'Go to my account' : 'Sign in'}</Link>
          <Link href="/forms" className="inline-flex min-h-9 items-center px-2 text-sm font-semibold underline text-slate-700 dark:text-slate-200">Browse forms</Link>
        </div>
      </Card>
    );
  }

  const expired = phase.code === 'LINK_EXPIRED' || phase.code === 'EMAIL_CHANGED';
  return (
    <Card title={PROBLEM_TITLES[phase.code] || 'This link did not work'} icon={<TriangleAlert className="h-6 w-6 text-amber-600" aria-hidden="true" />}>
      <p role="alert" className="text-sm text-slate-600 dark:text-slate-300">{phase.message}</p>
      {expired && signedIn ? (
        <VerifyPanel allowChange={false} />
      ) : (
        <Link href={`/login?next=${encodeURIComponent('/profile')}`} className={primaryButton}>
          {expired ? 'Sign in to get a new link' : 'Sign in'}
        </Link>
      )}
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
