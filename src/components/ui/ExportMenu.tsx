'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import { EXPORT_FORMATS, type ExportFormat } from '@/lib/exportApi';
import { useToast } from '@/context/ToastContext';

const DEFAULT_TRIGGER =
  'inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 sm:min-h-0';

interface ExportMenuProps {
  /** Produces and saves the file. A rejection becomes an error toast; the menu has no other error state. */
  onExport: (format: ExportFormat) => Promise<void>;
  disabled?: boolean;
  /** Name of what is exported, for screen readers: "Export teams". */
  subject?: string;
  /** Replaces the button styling when the surrounding toolbar looks different. */
  triggerClassName?: string;
}

/** The one Export control of the app: pick CSV, Excel or JSON and the server's file is downloaded. */
export function ExportMenu({ onExport, disabled = false, subject, triggerClassName = DEFAULT_TRIGGER }: ExportMenuProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [open]);

  const items = () => Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key === 'Tab') { setOpen(false); return; }
    const move = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (!move) return;
    event.preventDefault();
    if (!open) {
      setOpen(true);
      requestAnimationFrame(() => items()[0]?.focus());
      return;
    }
    const list = items();
    const at = list.indexOf(document.activeElement as HTMLButtonElement);
    list[Math.min(Math.max(at + move, 0), list.length - 1)]?.focus();
  };

  const choose = async (format: ExportFormat) => {
    setOpen(false);
    triggerRef.current?.focus();
    setBusy(true);
    try {
      await onExport(format);
    } catch (err) {
      toast.error('Could not export', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={rootRef} className="relative inline-block" onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={disabled || busy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={subject ? `Export ${subject}` : undefined}
        className={triggerClassName}
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        {busy ? 'Preparing…' : 'Export'}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={subject ? `Export ${subject} as` : 'Export as'}
          className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-[11rem] rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_35px_rgba(0,0,0,0.15)] dark:border-slate-700 dark:bg-[#151622] dark:shadow-[0_15px_40px_rgba(0,0,0,0.5)]"
        >
          {EXPORT_FORMATS.map((format) => (
            <button
              key={format.value}
              type="button"
              role="menuitem"
              onClick={() => void choose(format.value)}
              className="flex min-h-11 w-full items-center rounded-lg px-3 py-2 text-left text-sm text-[#1A1A2E] transition-colors hover:bg-[#FF7A00]/[0.08] focus:bg-[#FF7A00]/[0.08] focus:outline-none dark:text-slate-200 sm:min-h-9"
            >
              {format.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
