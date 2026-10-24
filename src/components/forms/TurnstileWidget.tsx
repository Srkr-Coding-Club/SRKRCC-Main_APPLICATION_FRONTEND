'use client';

import React, { useEffect, useRef } from 'react';
import { translate } from '@/lib/i18n/formStrings';

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
export const turnstileSiteKey = (): string => process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

let loading: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (!loading) {
    loading = new Promise<void>((resolve, reject) => {
      const tag = document.createElement('script');
      tag.src = SCRIPT_SRC;
      tag.async = true;
      tag.onload = () => resolve();
      tag.onerror = () => { loading = null; reject(new Error('The bot check could not be loaded.')); };
      document.head.appendChild(tag);
    });
  }
  return loading;
}

/**
 * Cloudflare Turnstile. Calls `onToken` with a fresh token when the visitor passes (and with null when it expires or
 * fails). Bump `resetSignal` to ask for a new check - a token is single-use, so do that after every attempt.
 */
export function TurnstileWidget({ onToken, resetSignal = 0, language }: { onToken: (token: string | null) => void; resetSignal?: number; language?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);
  const callback = useRef(onToken);
  callback.current = onToken;
  const siteKey = turnstileSiteKey();

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !box.current || !window.turnstile) return;
        widget.current = window.turnstile.render(box.current, {
          sitekey: siteKey,
          callback: (token: string) => callback.current(token),
          'expired-callback': () => callback.current(null),
          'error-callback': () => callback.current(null),
        });
      })
      .catch(() => callback.current(null));
    return () => {
      cancelled = true;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = undefined;
    };
  }, [siteKey]);

  useEffect(() => {
    if (resetSignal && widget.current && window.turnstile) {
      callback.current(null);
      window.turnstile.reset(widget.current);
    }
  }, [resetSignal]);

  if (!siteKey) {
    return <p role="alert" className="text-xs font-semibold text-red-600">{translate(language, 'botCheckMissing')}</p>;
  }
  return <div ref={box} data-testid="turnstile" />;
}
