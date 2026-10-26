'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { clampDelay, safeRedirectTarget } from '@/lib/afterSubmit';
import { translate } from '@/lib/i18n/formStrings';

/**
 * What a respondent sees after submitting: the form's own thank-you text (or the default), and - when the form sets a
 * redirect - a countdown that ends in a navigation they can also trigger or skip themselves.
 */
export function SubmissionThanks({ title, message, redirectUrl, delaySeconds, updated, showAttendanceNote, language, navigate }: {
  title: string;
  /** Already piped; blank uses the default. */
  message?: string;
  redirectUrl?: string;
  delaySeconds?: number;
  updated?: boolean;
  showAttendanceNote?: boolean;
  /** The form's language (see lib/i18n/formStrings.ts); English when absent. */
  language?: string;
  /** Replaceable for tests; the default sends the browser there. */
  navigate?: (target: string) => void;
}) {
  const target = safeRedirectTarget(redirectUrl);
  const delay = clampDelay(delaySeconds);
  const [left, setLeft] = useState(delay);
  const [stopped, setStopped] = useState(false);
  const go = navigate ?? ((to: string) => window.location.assign(to));

  useEffect(() => {
    if (!target || stopped) return;
    if (left <= 0) { go(target); return; }
    const timer = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, stopped, left]);

  const text = (message || '').trim();
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) => translate(language, key, values);
  return (
    <div className="relative glass-panel rounded-xl p-8 sm:p-12 border border-emerald-200 dark:border-emerald-900/50 shadow-md text-center space-y-4">
      <div
        className="pointer-events-none absolute -inset-6 -z-10 hidden rounded-[28px] opacity-70 blur-2xl sm:block"
        style={{ background: 'radial-gradient(circle at 50% 20%, #10b98144, transparent 70%)' }}
      />
      <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-10 h-10" />
      </div>
      <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A2E] dark:text-white">
        {updated ? t('thanksUpdated') : t('thanksTitle')}
      </h2>
      {text ? (
        <p data-testid="thank-you-message" className="text-slate-600 dark:text-slate-300 text-sm max-w-md mx-auto leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">{text}</p>
      ) : (
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
          {t('thanksDefault', { title })}
        </p>
      )}

      {showAttendanceNote && (
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          {t('attendanceNote')}
        </p>
      )}

      {target && !stopped && (
        <p role="status" className="text-xs text-slate-500 dark:text-slate-400">
          {left === 1 ? t('redirectInOne') : t('redirectIn', { n: left })}{' '}
          <button type="button" onClick={() => setStopped(true)} className="inline-flex min-h-8 items-center px-2 font-bold underline">{t('stayHere')}</button>
          {' · '}
          <button type="button" onClick={() => go(target)} className="inline-flex min-h-8 items-center px-2 font-bold underline">{t('goNow')}</button>
        </p>
      )}

      <div className="pt-4">
        <Link
          href="/forms"
          className="inline-flex items-center space-x-2 px-6 py-3 rounded-lg bg-journey-accent text-journey-on-accent font-bold text-sm shadow-sm hover:opacity-90 transition"
        >
          <span>{t('returnToForms')}</span>
        </Link>
      </div>
    </div>
  );
}
