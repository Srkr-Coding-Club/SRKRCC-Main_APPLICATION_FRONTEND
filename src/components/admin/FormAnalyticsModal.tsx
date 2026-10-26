'use client';

import { useDialog } from '@/lib/hooks/useDialog';
import React, { useEffect, useState } from 'react';
import { BarChart3, X } from 'lucide-react';
import Portal from '@/components/ui/Portal';
import { fetchApi } from '@/lib/api-client';
import { FormAnalytics, barWidth, percent } from '@/lib/formAnalytics';
import { plural } from '@/lib/formHistory';

const RANGES = [7, 30, 90];

function Bar({ label, count, total }: { label: string; count: number; total: number }) {
  return (
    <li className="text-[11px]">
      <div className="flex justify-between gap-2 text-slate-600 dark:text-slate-300"><span className="truncate">{label}</span><span>{count}</span></div>
      <div className="h-1.5 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-[#FF7A00]" style={{ width: `${barWidth(count, total)}%` }} /></div>
    </li>
  );
}

/** How a form is doing: responses over time, how each question was answered, and where people stop. */
export function FormAnalyticsModal({ slug, isOpen, onClose }: { slug: string; isOpen: boolean; onClose: () => void }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<FormAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setData(null);
    fetchApi<FormAnalytics>(`/forms/${slug}/analytics/?days=${days}`)
      .then((res) => {
        // A reply in the wrong shape (an older server, a proxy error page) must not take the whole page down.
        if (!res || !Array.isArray(res.timeline) || !Array.isArray(res.fields) || !res.unfinished) throw new Error('The analytics came back in a form this page does not understand.');
        setData(res);
      })
      .catch((e: Error) => setError(e.message || 'Could not load the analytics.'));
  }, [isOpen, slug, days]);

  const dialogRef = useDialog(onClose);
  if (!isOpen) return null;
  const peak = data ? Math.max(1, ...data.timeline.map((t) => t.count)) : 1;

  return (
    <Portal>
      <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 outline-none" role="dialog" aria-modal="true" aria-label="Form analytics">
        <div className="glass-panel rounded-xl max-w-3xl w-full h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-4">
            <div className="flex items-center gap-2 text-journey-accent">
              <BarChart3 className="w-5 h-5" />
              <h3 className="text-base font-bold text-[#1A1A2E] dark:text-white">Analytics</h3>
            </div>
            <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg text-slate-400 hover:text-[#1A1A2E] dark:hover:text-white active:scale-90"><X className="w-5 h-5" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {error && <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
            {!data && !error && <p className="text-xs text-slate-400">Loading...</p>}
            {data && (
              <>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-3xl font-black text-[#1A1A2E] dark:text-white" data-testid="total-responses">{data.total_responses}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{plural(data.total_responses, 'response')}{data.unfinished.count > 0 && ` · ${data.unfinished.count} started but not finished`}</p>
                    {data.truncated && <p className="text-[11px] text-amber-700 dark:text-amber-400">Only the newest {data.responses_analysed} responses are analysed below.</p>}
                  </div>
                  <div className="inline-flex rounded border border-slate-300 dark:border-slate-700 text-[11px] font-bold overflow-hidden" role="group" aria-label="Period">
                    {RANGES.map((r) => (
                      <button key={r} onClick={() => setDays(r)} aria-pressed={days === r} className={`px-3 py-1.5 ${days === r ? 'bg-journey-accent text-journey-on-accent' : 'text-slate-600 dark:text-slate-300'}`}>{r} days</button>
                    ))}
                  </div>
                </div>

                <div aria-label="Responses per day" role="img" className="flex items-end gap-px h-20">
                  {data.timeline.map((t) => (
                    <div key={t.date} title={`${t.date}: ${t.count}`} className="flex-1 bg-[#FF7A00]/70 rounded-t" style={{ height: `${Math.max(t.count ? 6 : 1, (t.count / peak) * 100)}%`, opacity: t.count ? 1 : 0.25 }} />
                  ))}
                </div>

                {data.unfinished.count > 0 && (
                  <section aria-label="Where people stop">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Where unfinished responses stopped</h4>
                    <ul className="space-y-1.5">
                      {data.unfinished.stopped_after.map((s) => <Bar key={s.field_id ?? 'none'} label={s.field_id === null ? s.label : `After "${s.label}"`} count={s.count} total={data.unfinished.count} />)}
                    </ul>
                  </section>
                )}

                <section aria-label="Questions" className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Questions</h4>
                  {data.fields.map((f) => (
                    <div key={f.field_id} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-2">
                      <div className="flex justify-between gap-3">
                        <p className="text-sm font-bold text-[#1A1A2E] dark:text-white">{f.label}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">{f.answered} answered ({percent(f.answer_rate)})</p>
                      </div>
                      {f.options && (
                        <ul className="space-y-1.5">
                          {f.options.map((o) => <Bar key={o.option} label={o.option} count={o.count} total={f.answered} />)}
                          {!!f.other_count && <Bar label="Other / older options" count={f.other_count} total={f.answered} />}
                        </ul>
                      )}
                      {f.numeric && <p className="text-[11px] text-slate-500 dark:text-slate-400">Lowest {f.numeric.min} · average {f.numeric.average} · highest {f.numeric.max}</p>}
                      {f.most_common && f.most_common.length > 0 && (
                        <ul className="space-y-1.5">{f.most_common.map((m) => <Bar key={m.value} label={m.value} count={m.count} total={f.answered} />)}</ul>
                      )}
                    </div>
                  ))}
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
