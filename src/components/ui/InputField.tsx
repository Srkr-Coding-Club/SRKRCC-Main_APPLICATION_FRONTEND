'use client';

/**
 * Plain form-field primitives. Same exported API as before
 * (SpotlightInput / SpotlightTextarea / SpotlightSelect / FieldLabel /
 * BottomGradient) so callers don't change - but no mouse-tracking spotlight,
 * no motion, no glow. Just a labelled input that looks like a form.
 */

import React from 'react';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const fieldBaseClass =
  // 16px on phones: iPhones zoom the whole page when a smaller text box is tapped.
  'glass-panel block w-full rounded-xl border px-3 py-2 text-base sm:text-sm ' +
  'text-[#1A1A2E] dark:text-white border-slate-300 dark:border-slate-700 ' +
  'placeholder:text-slate-400 dark:placeholder:text-slate-500 ' +
  'focus:outline-none focus:border-journey-accent focus:ring-1 focus:ring-journey-accent ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

const errorClass = 'border-rose-500 focus:border-rose-500 focus:ring-rose-500';

export const SpotlightInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }
>(({ className, hasError, 'aria-invalid': ariaInvalid, ...props }, ref) => (
  <input
    ref={ref}
    aria-invalid={ariaInvalid ?? hasError ?? undefined}
    className={cn(fieldBaseClass, 'h-10', hasError && errorClass, className)}
    {...props}
  />
));
SpotlightInput.displayName = 'SpotlightInput';

export const SpotlightTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { hasError?: boolean }
>(({ className, hasError, 'aria-invalid': ariaInvalid, ...props }, ref) => (
  <textarea
    ref={ref}
    aria-invalid={ariaInvalid ?? hasError ?? undefined}
    className={cn(fieldBaseClass, 'resize-y', hasError && errorClass, className)}
    {...props}
  />
));
SpotlightTextarea.displayName = 'SpotlightTextarea';

export const SpotlightSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean }
>(({ className, hasError, children, 'aria-invalid': ariaInvalid, ...props }, ref) => (
  <select
    ref={ref}
    aria-invalid={ariaInvalid ?? hasError ?? undefined}
    className={cn(fieldBaseClass, 'h-10', hasError && errorClass, className)}
    {...props}
  >
    {children}
  </select>
));
SpotlightSelect.displayName = 'SpotlightSelect';

export function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label id={htmlFor ? `${htmlFor}-label` : undefined} htmlFor={htmlFor} className="block text-sm font-semibold text-[#1A1A2E] dark:text-white [overflow-wrap:anywhere]">
      {children}
      {required && (
        <>
          <span className="text-rose-600 dark:text-rose-400" aria-hidden="true"> *</span>
          <span className="sr-only">(required)</span>
        </>
      )}
    </label>
  );
}

/**
 * Inline validation message. Give the field `aria-describedby={`${id}-error`}` (use `fieldErrorId`) so screen readers
 * read the message with the field; role="alert" announces it when it first appears.
 */
export const fieldErrorId = (fieldId: string) => `${fieldId}-error`;

export function FieldError({ id, children }: { id?: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
      {children}
    </p>
  );
}

/** No-op kept for API compatibility (used to render a hover glow line). */
export function BottomGradient() {
  return null;
}
