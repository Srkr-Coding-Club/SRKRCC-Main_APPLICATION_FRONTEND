'use client';

import React from 'react';
import Link from 'next/link';
import { Form } from '@/lib/types';

interface ManageFormsTabProps {
  publishedForms: Form[] | { results?: Form[] };
  onOpenManualModal: (form: Form) => void;
}

export function ManageFormsTab({ publishedForms, onOpenManualModal }: ManageFormsTabProps) {
  const formsList: Form[] = Array.isArray(publishedForms)
    ? publishedForms
    : (publishedForms?.results || []);

  return (
    <div className="bg-white dark:bg-[#151722] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white">Form Directory & Access Controls</h3>
          <p className="text-xs text-slate-500">Live active forms, version tracking, and manual overrides.</p>
        </div>
        <button onClick={() => alert('Exporting all form responses to CSV...')} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm">
          Export CSV Payload
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-[#FAFAFC] dark:bg-[#0D0E15] text-xs uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-6 py-4 font-bold">Form Title</th>
              <th className="px-6 py-4 font-bold">Category</th>
              <th className="px-6 py-4 font-bold">Version</th>
              <th className="px-6 py-4 font-bold">Status</th>
              <th className="px-6 py-4 font-bold text-right">Admin Special Controls</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {formsList.map((f) => (
              <tr key={f.id}>
                <td className="px-6 py-4 font-bold text-xs">{f.title}</td>
                <td className="px-6 py-4 text-xs font-bold text-[#FF7A00]">{f.category || 'General'}</td>
                <td className="px-6 py-4 text-xs font-mono font-bold text-slate-400">v{f.version || 1}</td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 rounded text-xs font-bold bg-slate-100 dark:bg-slate-800">
                    {f.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {f.status === 'CLOSED' ? (
                    <button
                      onClick={() => onOpenManualModal(f)}
                      className="px-3 py-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold border border-rose-200"
                    >
                      + Manual Admin Entry (Closed)
                    </button>
                  ) : (
                    <Link href={`/forms/${f.slug}`} className="px-3 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold">
                      View Live
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
