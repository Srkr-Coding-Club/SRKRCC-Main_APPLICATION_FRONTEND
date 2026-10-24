'use client';

import { useDialog } from '@/lib/hooks/useDialog';
import React, { useEffect, useState } from 'react';
import { LayoutTemplate, X } from 'lucide-react';
import Portal from '@/components/ui/Portal';
import { fetchApi } from '@/lib/api-client';
import { Form } from '@/lib/types';

/** Reusable starting points: pick one and get a new draft form with the same questions. */
export function FormTemplatesModal({ isOpen, onClose, onUse }: {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the template and the title the new form should get; resolves when the new form exists. */
  onUse: (template: Form, title: string) => Promise<void>;
}) {
  const [templates, setTemplates] = useState<Form[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [using, setUsing] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    fetchApi<any>('/forms/?templates=only')
      .then((data) => setTemplates(Array.isArray(data) ? data : data?.results ?? []))
      .catch((e: Error) => setError(e.message || 'Could not load the templates.'))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const dialogRef = useDialog(onClose);
  if (!isOpen) return null;

  const use = async (template: Form) => {
    const title = window.prompt('Name for the new form', template.title.replace(/\s*\(template\)\s*$/i, ''));
    if (!title || !title.trim()) return;
    setUsing(template.slug);
    try {
      await onUse(template, title.trim());
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Could not create the form.');
    } finally {
      setUsing(null);
    }
  };

  return (
    <Portal>
      <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 outline-none" role="dialog" aria-modal="true" aria-label="Start from a template">
        <div className="glass-panel rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-4">
            <div className="flex items-center gap-2 text-[#FF7A00]">
              <LayoutTemplate className="w-5 h-5" />
              <h3 className="text-base font-bold text-[#1A1A2E] dark:text-white">Start from a template</h3>
            </div>
            <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg text-slate-400 hover:text-[#1A1A2E] dark:hover:text-white active:scale-90">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 overflow-y-auto space-y-2">
            {error && <p role="alert" className="text-xs font-semibold text-rose-500">{error}</p>}
            {loading && <p className="text-xs text-slate-400">Loading...</p>}
            {!loading && !error && templates.length === 0 && (
              <p className="text-xs text-slate-500">
                No templates yet. Open a form and choose "Save as template" to keep it as a starting point.
              </p>
            )}
            {templates.map((template) => (
              <div key={template.slug} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#1A1A2E] dark:text-white truncate">{template.title}</p>
                  <p className="text-[11px] text-slate-400">
                    {(template.fields?.filter((f) => f.type !== 'SECTION' && f.type !== 'PAGE_BREAK').length ?? 0)} questions
                  </p>
                </div>
                <button
                  onClick={() => use(template)}
                  disabled={using !== null}
                  className="px-3 py-1.5 rounded bg-[#C25100] hover:bg-[#A84600] text-white text-xs font-bold disabled:opacity-50 active:scale-95"
                >
                  {using === template.slug ? 'Creating...' : 'Use'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Portal>
  );
}
