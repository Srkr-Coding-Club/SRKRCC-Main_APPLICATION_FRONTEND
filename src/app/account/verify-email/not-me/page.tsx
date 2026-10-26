'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, ShieldAlert, TriangleAlert } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { primaryButton } from '@/components/verification/VerifyPanel';

type Phase =
  | { name: 'ready' }
  | { name: 'working' }
  | { name: 'done'; removed: boolean; already: boolean }
  | { name: 'problem'; message: string };

function Card({ children, title, icon }: { children: React.ReactNode; title: string; icon: React.ReactNode }) {
  return (
    <section aria-labelledby="notme-title" className="mx-auto flex min-h-[60vh] max-w-lg items-center px-4 py-12">
      <div className="glass-panel w-full space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          {icon}
          <h1 id="notme-title" className="text-xl font-extrabold text-[#1A1A2E] dark:text-white">{title}</h1>
        </div>
        {children}
      </div>
    </section>
  );
}

function NotMeContent() {
  const params = useSearchParams();
  const token = useRef('');
  const started = useRef(false);
  const [phase, setPhase] = useState<Phase>({ name: 'ready' });

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    token.current = (params.get('token') || '').trim();
    try { window.history.replaceState(null, '', window.location.pathname); } catch { /* not critical */ }
    if (!token.current) setPhase({ name: 'problem', message: 'Open the link from your email. If it does not open, copy the whole address into the browser.' });
  }, [params]);

  const press = useCallback(async () => {
    setPhase({ name: 'working' });
    try {
      const reply = await fetchApi<any>('/auth/email/verification/dispute/', { method: 'POST', body: JSON.stringify({ token: token.current }) });
      setPhase({ name: 'done', removed: !!reply?.removed, already: !!reply?.already });
    } catch (e: any) {
      setPhase({ name: 'problem', message: e?.body?.detail || e?.message || 'We could not complete this. Please try again.' });
    }
  }, []);

  if (phase.name === 'done') {
    return (
      <Card title="Thank you, it is done" icon={<CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden="true" />}>
        <p role="status" className="text-sm text-slate-600 dark:text-slate-300">
          {phase.already
            ? 'This was already reported.'
            : phase.removed
              ? 'The account that used your address has been removed, and we will not send verification emails to your address for a while.'
              : 'The account that used your address has been switched off, and an admin will look at it. We will not send verification emails to your address for a while.'}
        </p>
        <Link href="/" className={primaryButton}>Back to the home page</Link>
      </Card>
    );
  }

  if (phase.name === 'problem') {
    return (
      <Card title="This link did not work" icon={<TriangleAlert className="h-6 w-6 text-amber-700 dark:text-amber-400" aria-hidden="true" />}>
        <p role="alert" className="text-sm text-slate-600 dark:text-slate-300">{phase.message}</p>
        <Link href="/" className={primaryButton}>Back to the home page</Link>
      </Card>
    );
  }

  return (
    <Card title="Was this not you?" icon={<ShieldAlert className="h-6 w-6 text-rose-600" aria-hidden="true" />}>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        If you did not sign up (or did not ask to use this address), press the button. The account that used your address will be
        switched off, and we will stop sending verification emails to your address. If this was you, just close this page.
      </p>
      <button
        type="button"
        onClick={() => void press()}
        disabled={phase.name === 'working'}
        className="inline-flex min-h-9 items-center justify-center rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {phase.name === 'working' ? 'Working...' : "This wasn't me"}
      </button>
    </Card>
  );
}

export default function NotMePage() {
  return (
    <Suspense fallback={null}>
      <NotMeContent />
    </Suspense>
  );
}
