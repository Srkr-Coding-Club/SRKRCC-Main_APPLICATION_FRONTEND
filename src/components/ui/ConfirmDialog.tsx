'use client';

import React, { useCallback, useState } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

export interface ConfirmOptions {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button for destructive actions. */
  danger?: boolean;
}

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (confirmed: boolean) => void;
}

/**
 * Themed replacement for window.confirm: `await confirm({...})` resolves true/false.
 * Render the returned `dialog` once anywhere in the component.
 */
export function useConfirmDialog() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ options, resolve })),
    [],
  );

  const settle = (confirmed: boolean) => {
    pending?.resolve(confirmed);
    setPending(null);
  };

  const dialog = pending ? (
    <Modal
      isOpen
      onClose={() => settle(false)}
      title={pending.options.title}
      icon={pending.options.danger ? AlertTriangle : HelpCircle}
      maxWidth="max-w-md"
    >
      <div className="space-y-5">
        <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{pending.options.message}</div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => settle(false)}
            className="rounded-lg px-4 py-2 text-sm font-bold text-slate-500 dark:text-slate-400 transition hover:text-slate-800 dark:hover:text-slate-200"
          >
            {pending.options.cancelLabel ?? 'Cancel'}
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => settle(true)}
            className={`rounded-lg px-5 py-2 text-sm font-bold shadow-sm transition active:scale-95 ${
              pending.options.danger ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-journey-accent text-journey-on-accent hover:opacity-90'
            }`}
          >
            {pending.options.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </Modal>
  ) : null;

  return { confirm, dialog };
}
