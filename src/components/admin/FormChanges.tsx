'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { ChangeImpact, FormDiff, describeFieldChange, impactWarnings, plural, showValue } from '@/lib/formHistory';

/** What changed between two versions of a form, and (when given) what that means for the responses already collected. */
export function FormChanges({ diff, impact }: { diff: FormDiff; impact?: ChangeImpact }) {
  const warnings = impact ? impactWarnings(impact) : [];
  if (diff.is_empty) {
    return <p className="text-xs text-slate-500">No difference.</p>;
  }

  return (
    <div className="space-y-3 text-xs">
      {warnings.length > 0 && (
        <div role="alert" className="rounded-lg border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-1.5">
          <p className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" /> Before you continue
          </p>
          <ul className="list-disc pl-5 space-y-0.5 text-amber-800 dark:text-amber-300">
            {warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </div>
      )}

      {diff.form.length > 0 && (
        <section>
          <h4 className="font-bold text-[#1A1A2E] dark:text-white mb-1">Settings</h4>
          <ul className="space-y-0.5 text-slate-600 dark:text-slate-300">
            {diff.form.map((s) => (
              <li key={s.key}><span className="font-semibold">{s.label}:</span> {showValue(s.before)} <span aria-hidden>→</span> {showValue(s.after)}</li>
            ))}
          </ul>
        </section>
      )}

      {(diff.fields.added.length > 0 || diff.fields.removed.length > 0 || diff.fields.changed.length > 0 || diff.fields.reordered) && (
        <section>
          <h4 className="font-bold text-[#1A1A2E] dark:text-white mb-1">Questions</h4>
          <ul className="space-y-1 text-slate-600 dark:text-slate-300">
            {diff.fields.added.map((f, i) => (
              <li key={`a${f.id ?? i}`}><span className="font-bold text-emerald-600">+ Added</span> "{f.label}" <span className="text-slate-400">({f.type})</span></li>
            ))}
            {diff.fields.removed.map((f) => (
              <li key={`r${f.id}`}><span className="font-bold text-rose-600">- Removed</span> "{f.label}" <span className="text-slate-400">({f.type})</span></li>
            ))}
            {diff.fields.changed.map((f) => (
              <li key={`c${f.id}`}>
                <span className="font-bold text-sky-600">~ Changed</span> "{f.label}"
                <ul className="pl-5 list-disc text-slate-500 dark:text-slate-400">
                  {f.changes.map((c) => <li key={c.key}>{describeFieldChange(c)}</li>)}
                </ul>
              </li>
            ))}
            {diff.fields.reordered && <li><span className="font-bold text-sky-600">~</span> The order of the questions changed</li>}
          </ul>
        </section>
      )}

      {impact && impact.response_count > 0 && (
        <p className="text-slate-400">This form has {plural(impact.response_count, 'response')} so far.</p>
      )}
    </div>
  );
}
