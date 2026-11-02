'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

type ActionButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  /** The request is under way: a spinner takes the label's place beside it and the button is disabled. */
  pending?: boolean;
  /** Set to true when the request has just succeeded; shows a check for a moment, then clears itself via onSuccessShown. */
  success?: boolean;
  onSuccessShown?: () => void;
  /** Words shown beside the check while it is up. */
  successLabel?: string;
  children: React.ReactNode;
};

const SUCCESS_MS = 1100;

/**
 * A button for something that saves or sends. It keeps its width while the spinner and the check come
 * and go, so nothing beside it moves, and tells assistive technology it is busy.
 */
export function ActionButton({ pending = false, success = false, onSuccessShown, successLabel = 'Done', children, className = '', disabled, ...rest }: ActionButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [width, setWidth] = useState<number | undefined>(undefined);
  const showing = success && !pending;

  // Measure the resting width so the busy and success looks can never be narrower than it.
  useLayoutEffect(() => {
    if (!pending && !showing && ref.current) setWidth(ref.current.getBoundingClientRect().width);
  }, [pending, showing, children]);

  useEffect(() => {
    if (!showing) return;
    const timer = window.setTimeout(() => onSuccessShown?.(), SUCCESS_MS);
    return () => window.clearTimeout(timer);
  }, [showing, onSuccessShown]);

  return (
    <button
      {...rest}
      ref={ref}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      style={{ ...rest.style, minWidth: width }}
      className={`inline-flex items-center justify-center gap-2 transition-colors ${showing ? '!bg-emerald-600 !text-white' : ''} ${className}`}
    >
      {pending && <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />}
      {showing && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
      <span>{showing ? successLabel : children}</span>
    </button>
  );
}
