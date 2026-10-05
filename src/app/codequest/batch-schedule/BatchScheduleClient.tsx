'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api-client';
import type { Problem } from '@/lib/types';

type BatchProblem = Pick<Problem, 'title' | 'difficulty' | 'scheduled_date' | 'statement'> & {
  constraints: string;
  sample_input: string;
  sample_output: string;
  tags: string;
  external_url: string;
  external_platform: string;
};

type ScheduledProblem = Pick<Problem, 'id' | 'title' | 'slug' | 'difficulty' | 'scheduled_date'>;

const blankProblem = (): BatchProblem => ({
  title: '', difficulty: 'EASY', scheduled_date: '', statement: '', constraints: '',
  sample_input: '', sample_output: '', tags: '', external_url: '', external_platform: '',
});

const fieldClass = 'w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[#FF7A00] dark:border-slate-700';

export default function BatchScheduleClient() {
  const [entries, setEntries] = useState<BatchProblem[]>([blankProblem()]);
  const [scheduled, setScheduled] = useState<ScheduledProblem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    fetchApi<{ role?: string }>('/api/auth/me/')
      .then(({ role }) => setAuthorized(role === 'ADMIN' || role === 'CLUB_LEAD'))
      .catch(() => setAuthorized(false))
      .finally(() => setLoading(false));
  }, []);

  const update = <K extends keyof BatchProblem>(index: number, key: K, value: BatchProblem[K]) => {
    setEntries((current) => current.map((entry, i) => i === index ? { ...entry, [key]: value } : entry));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const response = await fetchApi<{ problems: ScheduledProblem[] }>('/codequest/batch-schedule/', {
        method: 'POST',
        body: JSON.stringify({
          problems: entries.map((entry) => ({
            ...entry,
            tags: entry.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
            external_url: entry.external_url.trim(),
            external_platform: entry.external_platform.trim(),
          })),
        }),
      });
      setScheduled(response.problems);
      setEntries([blankProblem()]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not schedule problems. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main className="mx-auto max-w-5xl p-8 text-sm text-slate-500">Checking access…</main>;
  if (!authorized) return <main className="mx-auto max-w-2xl p-8"><h1 className="text-xl font-bold">Admin or Club Lead access required</h1><p className="mt-2 text-sm text-slate-500">Sign in with an authorized account to schedule CodeQuest problems.</p></main>;

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href="/admin/codequest" className="inline-flex items-center gap-2 text-sm font-semibold text-[#FF7A00]"><ArrowLeft className="h-4 w-4" /> Back to CodeQuest</Link>
        <header className="glass-panel rounded-2xl p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-[#FF7A00]">CodeQuest operations</p>
          <h1 className="mt-2 text-2xl font-extrabold">Batch schedule problems</h1>
          <p className="mt-2 text-sm text-slate-500">Add up to five complete problems. Each becomes visible to members on its scheduled date.</p>
        </header>

        {error && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}

        <form onSubmit={submit} className="space-y-6">
          {entries.map((entry, index) => (
            <section key={index} className="glass-panel space-y-4 rounded-2xl p-5">
              <div className="flex items-center justify-between"><h2 className="font-bold">Problem {index + 1}</h2>{entries.length > 1 && <button type="button" onClick={() => setEntries((current) => current.filter((_, i) => i !== index))} aria-label={`Remove problem ${index + 1}`} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"><Trash2 className="h-4 w-4" /></button>}</div>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="sm:col-span-2"><span className="mb-1 block text-xs font-bold">Title *</span><input className={fieldClass} value={entry.title} onChange={(e) => update(index, 'title', e.target.value)} maxLength={200} required /></label>
                <label><span className="mb-1 block text-xs font-bold">Scheduled date *</span><input type="date" className={fieldClass} value={entry.scheduled_date} onChange={(e) => update(index, 'scheduled_date', e.target.value)} required /></label>
                <label><span className="mb-1 block text-xs font-bold">Difficulty</span><select className={fieldClass} value={entry.difficulty} onChange={(e) => update(index, 'difficulty', e.target.value as Problem['difficulty'])}><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option></select></label>
                <label className="sm:col-span-2"><span className="mb-1 block text-xs font-bold">Topics / tags</span><input className={fieldClass} value={entry.tags} onChange={(e) => update(index, 'tags', e.target.value)} placeholder="Arrays, Hashing, DP" /></label>
                <label className="sm:col-span-3"><span className="mb-1 block text-xs font-bold">Problem statement *</span><textarea className={fieldClass} rows={5} value={entry.statement} onChange={(e) => update(index, 'statement', e.target.value)} required /></label>
                <label className="sm:col-span-3"><span className="mb-1 block text-xs font-bold">Constraints</span><textarea className={fieldClass} rows={2} value={entry.constraints} onChange={(e) => update(index, 'constraints', e.target.value)} /></label>
                <label><span className="mb-1 block text-xs font-bold">Sample input</span><textarea className={fieldClass} rows={3} value={entry.sample_input} onChange={(e) => update(index, 'sample_input', e.target.value)} /></label>
                <label><span className="mb-1 block text-xs font-bold">Sample output</span><textarea className={fieldClass} rows={3} value={entry.sample_output} onChange={(e) => update(index, 'sample_output', e.target.value)} /></label>
                <div className="space-y-4"><label className="block"><span className="mb-1 block text-xs font-bold">External platform</span><input className={fieldClass} value={entry.external_platform} onChange={(e) => update(index, 'external_platform', e.target.value)} placeholder="LeetCode" /></label><label className="block"><span className="mb-1 block text-xs font-bold">External problem URL</span><input type="url" className={fieldClass} value={entry.external_url} onChange={(e) => update(index, 'external_url', e.target.value)} placeholder="https://…" /></label></div>
              </div>
            </section>
          ))}
          <div className="flex flex-wrap justify-between gap-3">
            <button type="button" disabled={entries.length >= 5} onClick={() => setEntries((current) => [...current, blankProblem()])} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold disabled:opacity-50 dark:border-slate-700"><Plus className="h-4 w-4" /> Add another ({entries.length}/5)</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-[#FF7A00] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Scheduling…' : 'Schedule problems'}</button>
          </div>
        </form>

        {scheduled.length > 0 && <section className="glass-panel rounded-2xl p-5"><h2 className="font-bold">Scheduled problems</h2><ul className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">{scheduled.map((problem) => <li key={problem.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span className="font-semibold">{problem.title} <span className="font-normal text-slate-500">({problem.difficulty})</span></span><time className="font-mono text-slate-500">{problem.scheduled_date}</time></li>)}</ul></section>}
      </div>
    </main>
  );
}
