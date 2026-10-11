'use client';

import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Code2,
  Edit3,
  ExternalLink,
  FileText,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Tags,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { fetchApi } from '@/lib/api-client';
import type { Problem, CodeQuestSubmission } from '@/lib/types';
import Link from 'next/link';
import { CodeQuestMiniCalendar } from '@/components/admin/CodeQuestMiniCalendar';

type Difficulty = Problem['difficulty'];
type ProblemForm = {
  title: string;
  difficulty: Difficulty;
  scheduled_date: string;
  statement: string;
  constraints: string;
  sample_input: string;
  sample_output: string;
  tags: string;
  external_url: string;
  external_platform: string;
};
const blank = (): ProblemForm => ({
  title: '',
  difficulty: 'MEDIUM',
  scheduled_date: '',
  statement: '',
  constraints: '',
  sample_input: '',
  sample_output: '',
  tags: '',
  external_url: '',
  external_platform: '',
});

type TabId = 'PROBLEMS' | 'REVIEW';

const difficultyClass: Record<Difficulty, string> = {
  EASY: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  MEDIUM: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  HARD: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
};

const toForm = (p: Problem): ProblemForm => ({
  title: p.title,
  difficulty: p.difficulty,
  scheduled_date: p.scheduled_date,
  statement: p.statement,
  constraints: p.constraints ?? '',
  sample_input: p.sample_input ?? '',
  sample_output: p.sample_output ?? '',
  tags: (p.tags ?? []).join(', '),
  external_url: p.external_url ?? '',
  external_platform: p.external_platform ?? '',
});

const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Please try again.';

const toLocalIso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

const isValidHttpsUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.length > 0;
  } catch {
    return false;
  }
};

export function CodeQuestTab() {
  const { toast } = useToast();
  const [problems, setProblems] = useState<Problem[]>([]),
    [submissions, setSubmissions] = useState<CodeQuestSubmission[]>([]);
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [reviewing, setReviewing] = useState<number | null>(null);

  const [query, setQuery] = useState(''),
    [filter, setFilter] = useState<Difficulty | 'ALL'>('ALL'),
    [problemView, setProblemView] = useState<'UPCOMING' | 'ARCHIVED' | 'ALL'>(
      'UPCOMING',
    );

  const [tab, setTab] = useState<TabId>('PROBLEMS');

  const [userRole, setUserRole] = useState<'ADMIN' | 'CLUB_LEAD' | null>(null);

  const [form, setForm] = useState<ProblemForm>(blank),
    [editing, setEditing] = useState<Problem | null>(null),
    [editorOpen, setEditorOpen] = useState(false),
    [attemptedSubmit, setAttemptedSubmit] = useState(false),
    [pendingDelete, setPendingDelete] = useState<Problem | null>(null),
    [deletingNow, setDeletingNow] = useState(false),
    [detail, setDetail] = useState<CodeQuestSubmission | null>(null),
    [reviewFilter, setReviewFilter] = useState<'PENDING' | 'ALL'>('PENDING'),
    [pendingVerdict, setPendingVerdict] = useState<{
      submission: CodeQuestSubmission;
      is_correct: boolean;
    } | null>(null);

  const load = async () => {
    setLoading(true);

    try {
      const [p, s] = await Promise.all([
        fetchApi<Problem[]>('/codequest/'),
        fetchApi<CodeQuestSubmission[]>('/codequest/submissions/'),
      ]);
      setProblems(p);
      setSubmissions(s);
    } catch (e) {
      toast.error('Could not load CodeQuest', message(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    async function fetchUserRole() {
      try {
        const response = await fetchApi<{
          role?: 'ADMIN' | 'CLUB_LEAD';
        }>('/api/auth/me/', {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (response && response.role) {
          setUserRole(response.role);
        }
      } catch {
        // If auth check fails, hide admin-only sections for safety
      }
    }
    fetchUserRole();
  }, []);

  const today = toLocalIso(new Date());
  const canManage = userRole === 'ADMIN' || userRole === 'CLUB_LEAD';

  // The problem bank can be sliced by lifecycle: the living upcoming schedule,
  // the completed archive, or everything at once.
  const shown = useMemo(
    () =>
      problems
        .filter((p) => {
          if (problemView === 'UPCOMING' && p.scheduled_date < today)
            return false;
          if (problemView === 'ARCHIVED' && p.scheduled_date >= today)
            return false;
          return (
            (filter === 'ALL' || p.difficulty === filter) &&
            `${p.title} ${(p.tags ?? []).join(' ')}`
              .toLowerCase()
              .includes(query.toLowerCase())
          );
        })
        .sort((a, b) => {
          if (problemView === 'ARCHIVED')
            return b.scheduled_date.localeCompare(a.scheduled_date);
          if (a.scheduled_date === b.scheduled_date) return 0;
          if (a.scheduled_date === today) return -1;
          if (b.scheduled_date === today) return 1;
          return a.scheduled_date.localeCompare(b.scheduled_date);
        }),
    [problems, filter, query, today, problemView],
  );
  const set = <K extends keyof ProblemForm>(key: K, value: ProblemForm[K]) =>
    setForm((old) => ({ ...old, [key]: value }));
  const dateErrorFor = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    // An existing problem keeps its own (possibly past) date; only moving to a
    // new past date is blocked.
    if (value < today && value !== editing?.scheduled_date)
      return 'Previous dates cannot be scheduled.';
    if (problems.some((p) => p.scheduled_date === value && p.id !== editing?.id))
      return 'A problem is already scheduled on this date.';
    return null;
  };
  const urlErrorFor = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return 'External problem URL is required.';
    return isValidHttpsUrl(trimmed)
      ? null
      : 'Enter a valid HTTPS URL starting with https://.';
  };
  const setScheduledDate = (value: string) => {
    if (!value) {
      set('scheduled_date', '');
      return;
    }
    const message = dateErrorFor(value);
    if (message) {
      setAttemptedSubmit(true);
      toast.warning('Date unavailable', message);
      return;
    }
    set('scheduled_date', value);
  };
  const openNew = (date?: string) => {
    setEditing(null);
    setForm({ ...blank(), scheduled_date: date ?? '' });
    setAttemptedSubmit(false);
    setEditorOpen(true);
  };
  const startEdit = (p: Problem) => {
    setEditing(p);
    setForm(toForm(p));
    setAttemptedSubmit(false);
    setEditorOpen(true);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();

    if (!form.title.trim() || !form.statement.trim() || !form.scheduled_date) {
      toast.warning(
        'Complete required fields',
        'Title, schedule date, and statement are required.',
      );
      return;
    }
    const dateMessage = dateErrorFor(form.scheduled_date);
    const urlMessage = urlErrorFor(form.external_url);
    if (dateMessage || urlMessage) {
      setAttemptedSubmit(true);
      toast.warning(
        'Fix validation errors',
        [dateMessage, urlMessage].filter(Boolean).join(' '),
      );
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      title: form.title.trim(),
      statement: form.statement.trim(),
      constraints: form.constraints.trim(),
      sample_input: form.sample_input.trim(),
      sample_output: form.sample_output.trim(),
      external_url: form.external_url.trim(),
      external_platform: form.external_platform.trim(),
      tags: form.tags
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    };

    try {
      const saved = editing
        ? await fetchApi<Problem>(`/codequest/${editing.slug}/`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          })
        : await fetchApi<Problem>('/codequest/', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
      setProblems((old) =>
        editing
          ? old.map((x) => (x.id === saved.id ? saved : x))
          : [saved, ...old],
      );
      toast.success(
        editing ? 'Problem updated' : 'Problem scheduled',
        saved.title,
      );
      setEditorOpen(false);
    } catch (e) {
      toast.error('Could not save problem', message(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Problem) => {
    setPendingDelete(null);
    setDeletingNow(true);
    try {
      await fetchApi(`/codequest/${p.slug}/`, { method: 'DELETE' });
      setProblems((old) => old.filter((x) => x.id !== p.id));
      toast.success('Problem deleted', p.title);
    } catch (e) {
      toast.error('Could not delete problem', message(e));
    } finally {
      setDeletingNow(false);
    }
  };
  const review = async (s: CodeQuestSubmission, is_correct: boolean) => {
    setReviewing(s.id);
    try {
      const updated = await fetchApi<CodeQuestSubmission>(
        `/codequest/submissions/${s.id}/review/`,
        {
          method: 'POST',
          body: JSON.stringify({ is_correct }),
        },
      );
      setSubmissions((old) =>
        old.map((x) => (x.id === updated.id ? updated : x)),
      );
      setDetail((old) => (old?.id === updated.id ? updated : old));
      toast.success(
        is_correct ? 'Submission accepted' : 'Submission marked incorrect',
        'The member streak was recalculated.',
      );
    } catch (e) {
      toast.error('Could not record verdict', message(e));
    } finally {
      setReviewing(null);
    }
  };
  const accepted = submissions.filter((s) => s.is_correct).length,
    upcoming = problems.filter((p) => p.scheduled_date >= today).length;

  const pendingCount = submissions.filter((s) => !s.is_reviewed).length;
  const visibleSubmissions =
    reviewFilter === 'PENDING'
      ? submissions.filter((s) => !s.is_reviewed)
      : submissions;

  const tabs: { id: TabId; label: string; icon: typeof FileText }[] = [
    { id: 'PROBLEMS', label: 'Problems', icon: ClipboardList },
    {
      id: 'REVIEW',
      label: pendingCount > 0 ? `Review · ${pendingCount}` : 'Review',
      icon: ShieldCheck,
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="order-2 space-y-6 lg:order-1">
        <header className="flex flex-col gap-4 rounded-2xl glass-panel p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[#FF7A00]">
              <Code2 className="h-4 w-4" /> CodeQuest operations
            </p>
            <h1 className="text-2xl font-extrabold text-[#1A1A2E] dark:text-white">
              Daily problem workspace
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Schedule daily challenges and review member solutions from one
              source of truth.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void load()}
              disabled={loading}
              className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700"
              aria-label="Refresh"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
            </button>
            <button
              onClick={() => openNew()}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#FF7A00] to-[#FFA500] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#FF7A00]/25 transition hover:brightness-105 hover:shadow-[#FF7A00]/40 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" /> Schedule problem
            </button>
            {canManage && (
              <Link
                href="/codequest/batch-schedule"
                className="inline-flex items-center gap-2 rounded-lg border border-[#FF7A00]/50 px-4 py-2.5 text-sm font-bold text-[#FF7A00] transition hover:bg-[#FF7A00]/10 active:scale-[0.98]"
              >
                <Tags className="h-4 w-4" /> Batch Schedule
              </Link>
            )}
            <Link
              href="/admin/codequest/stats"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-[#FF7A00]/50 hover:text-[#FF7A00] dark:border-slate-700 dark:text-slate-300"
            >
              <BarChart3 className="h-4 w-4" /> Stats
            </Link>
          </div>
        </header>

        <nav className="flex flex-wrap gap-1 rounded-xl glass-panel p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-bold transition ${
                tab === id
                  ? 'bg-[#FF7A00] text-white'
                  : 'text-slate-500 hover:text-[#FF7A00]'
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>

        {tab === 'PROBLEMS' && (
          <>
            <section className="grid gap-4 sm:grid-cols-3">
              <Stat
                icon={FileText}
                value={problems.length}
                label="Problems in bank"
              />
              <Stat
                icon={CalendarDays}
                value={upcoming}
                label="Today or upcoming"
              />
              <Stat icon={Users} value={accepted} label="Accepted solutions" />
            </section>
            <section className="rounded-2xl glass-panel">
              <div className="flex flex-col gap-3 border-b border-slate-200 p-5 dark:border-slate-800 lg:flex-row lg:items-center">
                <label className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search title or tags"
                    className="w-full rounded-lg border border-slate-200 bg-transparent py-2.5 pl-9 pr-3 text-sm dark:border-slate-700"
                  />
                </label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as Difficulty | 'ALL')}
                  aria-label="Filter by difficulty"
                  className="rounded-lg border border-slate-200 bg-transparent px-3 py-2.5 text-sm dark:border-slate-700 dark:[color-scheme:dark]"
                >
                  <option value="ALL" className="bg-white text-slate-900 dark:bg-[#151722] dark:text-slate-100">
                    All difficulties
                  </option>
                  <option value="EASY" className="bg-white text-slate-900 dark:bg-[#151722] dark:text-slate-100">
                    Easy
                  </option>
                  <option value="MEDIUM" className="bg-white text-slate-900 dark:bg-[#151722] dark:text-slate-100">
                    Medium
                  </option>
                  <option value="HARD" className="bg-white text-slate-900 dark:bg-[#151722] dark:text-slate-100">
                    Hard
                  </option>
                </select>
                <div className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
                  {(
                    [
                      ['UPCOMING', `Upcoming · ${upcoming}`],
                      ['ARCHIVED', `Archived · ${problems.length - upcoming}`],
                      ['ALL', `All · ${problems.length}`],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setProblemView(value)}
                      className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                        problemView === value
                          ? 'bg-[#FF7A00] text-white'
                          : 'text-slate-500 hover:text-[#FF7A00]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <Empty text="Loading scheduled problems…" />
                ) : shown.length === 0 ? (
                  <Empty text="No problems to show for this view." />
                ) : (
                  shown.map((p) => {
                    const isToday = p.scheduled_date === today;
                    return (
                      <article
                        key={p.id}
                        className={`flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between ${
                          isToday
                            ? 'rounded-xl bg-[#FFF4EA] ring-2 ring-[#FF7A00]/60 dark:bg-[#FF7A00]/10 dark:ring-[#FF7A00]/40'
                            : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            {isToday && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF7A00] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />{' '}
                                Today
                              </span>
                            )}
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold ${difficultyClass[p.difficulty]}`}
                            >
                              {p.difficulty}
                            </span>
                            <span className="text-xs font-mono text-slate-500">
                              {p.scheduled_date}
                            </span>
                            {p.external_url && (
                              <a
                                href={p.external_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-[#FF7A00]"
                              >
                                <ExternalLink className="h-3 w-3" />{' '}
                                {p.external_platform || 'External link'}
                              </a>
                            )}
                          </div>
                          <h2 className="font-bold text-[#1A1A2E] dark:text-white">
                            {p.title}
                          </h2>
                          <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                            {p.statement}
                          </p>
                          <p className="mt-2 text-xs font-semibold text-slate-400">
                            {p.submissions_count ?? 0} submissions ·{' '}
                            {p.solved_count ?? 0} solved
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            onClick={() => startEdit(p)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold dark:border-slate-700"
                          >
                            <Edit3 className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => setPendingDelete(p)}
                            className="rounded-lg border border-rose-200 p-2 text-rose-600 dark:border-rose-900"
                            aria-label={`Delete ${p.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          </>
        )}

        {tab === 'REVIEW' && (
          <section className="rounded-2xl glass-panel">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-extrabold text-[#1A1A2E] dark:text-white">
                  Submission review queue
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Accepting a solution securely recalculates that member’s streak.
                </p>
              </div>
              <div className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
                <button
                  onClick={() => setReviewFilter('PENDING')}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                    reviewFilter === 'PENDING'
                      ? 'bg-[#FF7A00] text-white'
                      : 'text-slate-500 hover:text-[#FF7A00]'
                  }`}
                >
                  Pending · {pendingCount}
                </button>
                <button
                  onClick={() => setReviewFilter('ALL')}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                    reviewFilter === 'ALL'
                      ? 'bg-[#FF7A00] text-white'
                      : 'text-slate-500 hover:text-[#FF7A00]'
                  }`}
                >
                  All · {submissions.length}
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <Empty text="Loading submissions…" />
              ) : visibleSubmissions.length === 0 ? (
                <Empty
                  text={
                    reviewFilter === 'PENDING'
                      ? 'Nothing is waiting for review.'
                      : 'No submissions have been received.'
                  }
                />
              ) : (
                visibleSubmissions.slice(0, 20).map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <button
                      onClick={() => setDetail(s)}
                      className="min-w-0 text-left"
                    >
                      <p className="truncate text-sm font-bold text-[#1A1A2E] dark:text-white">
                        {s.problem_title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {s.user_name || s.user_email} · {s.language} ·{' '}
                        {new Date(s.created_at).toLocaleString()}
                      </p>
                      {s.is_reviewed && (
                        <p className="mt-1 text-[11px] text-slate-400">
                          Reviewed by {s.reviewed_by_name || 'a lead'}
                          {s.reviewed_at
                            ? ` · ${new Date(s.reviewed_at).toLocaleString()}`
                            : ''}
                        </p>
                      )}
                    </button>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                          s.is_correct
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : s.is_reviewed
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {s.is_correct
                          ? 'ACCEPTED'
                          : s.is_reviewed
                            ? 'INCORRECT'
                            : 'PENDING'}
                      </span>
                      <Verdict
                        onClick={() =>
                          setPendingVerdict({ submission: s, is_correct: true })
                        }
                        disabled={reviewing === s.id}
                        accept
                      />
                      <Verdict
                        onClick={() =>
                          setPendingVerdict({ submission: s, is_correct: false })
                        }
                        disabled={reviewing === s.id}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        </div>
        <aside className="order-1 lg:order-2 lg:sticky lg:top-6">
          <CodeQuestMiniCalendar
            problems={problems}
            onSelect={startEdit}
            onCreate={(date) => openNew(date)}
          />
        </aside>
      </div>
      {editorOpen && (
        <Editor
          form={form}
          set={set}
          editing={editing}
          saving={saving}
          close={() => {
            setEditorOpen(false);
            setAttemptedSubmit(false);
          }}
          submit={save}
          onDateChange={setScheduledDate}
          dateErrorFor={dateErrorFor}
          urlErrorFor={urlErrorFor}
          attemptedSubmit={attemptedSubmit}
        />
      )}
      {detail && (
        <SubmissionDetail
          submission={detail}
          close={() => setDetail(null)}
          review={(s, is_correct) =>
            setPendingVerdict({ submission: s, is_correct })
          }
        />
      )}
      {pendingVerdict && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl glass-panel p-6 shadow-2xl">
            <h2 className="font-extrabold text-[#1A1A2E] dark:text-white">
              {pendingVerdict.is_correct
                ? 'Accept this solution?'
                : 'Mark this submission incorrect?'}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {pendingVerdict.is_correct
                ? 'Accepting this solution records your verdict and recalculates the member’s streak.'
                : 'Marking this submission incorrect records your verdict without awarding XP.'}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingVerdict(null)}
                disabled={reviewing !== null}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold disabled:opacity-50 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  void review(
                    pendingVerdict.submission,
                    pendingVerdict.is_correct,
                  )
                }
                disabled={reviewing !== null}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-60 ${
                  pendingVerdict.is_correct ? 'bg-emerald-600' : 'bg-rose-600'
                }`}
              >
                {pendingVerdict.is_correct ? 'Accept solution' : 'Mark incorrect'}
              </button>
            </div>
          </div>
        </div>
      )}
      {pendingDelete && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl glass-panel p-6 shadow-2xl">
            <h2 className="font-extrabold text-[#1A1A2E] dark:text-white">
              Delete problem?
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Delete “{pendingDelete.title}”? Its submissions will also be
              deleted. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={deletingNow}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold disabled:opacity-50 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void remove(pendingDelete)}
                disabled={deletingNow}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {deletingNow ? 'Deleting…' : 'Delete problem'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof FileText;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-xl glass-panel p-4">
      <Icon className="mb-3 h-5 w-5 text-[#FF7A00]" />
      <p className="text-2xl font-extrabold text-[#1A1A2E] dark:text-white">
        {value}
      </p>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="p-8 text-center text-sm text-slate-500">{text}</p>;
}
function Verdict({
  accept = false,
  disabled,
  onClick,
}: {
  accept?: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg p-2 text-xs font-bold disabled:opacity-60 ${
        accept
          ? 'bg-emerald-600 text-white'
          : 'border border-rose-200 px-3 text-rose-600 dark:border-rose-900'
      }`}
    >
      {accept ? 'Accept' : 'Reject'}
    </button>
  );
}
function Field({
  label,
  children,
  wide,
  required,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
  required?: boolean;
}) {
  return (
    <label className={wide ? 'sm:col-span-2' : ''}>
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}
function Editor({
  form,
  set,
  editing,
  saving,
  close,
  submit,
  onDateChange,
  dateErrorFor,
  urlErrorFor,
  attemptedSubmit,
}: {
  form: ProblemForm;
  set: <K extends keyof ProblemForm>(key: K, value: ProblemForm[K]) => void;
  editing: Problem | null;
  saving: boolean;
  close: () => void;
  submit: (event: FormEvent) => void;
  onDateChange: (value: string) => void;
  dateErrorFor: (value: string) => string | null;
  urlErrorFor: (value: string) => string | null;
  attemptedSubmit: boolean;
}) {
  const field =
    'w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[#FF7A00] dark:border-slate-700';
  const today = toLocalIso(new Date());
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="my-8 w-full max-w-2xl rounded-2xl glass-panel shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
          <h2 className="font-extrabold text-[#1A1A2E] dark:text-white">
            {editing ? 'Edit problem' : 'Schedule a problem'}
          </h2>
          <button type="button" onClick={close} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Title" required>
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              className={field}
              required
            />
          </Field>
          <Field label="Schedule date" required>
            <input
              type="date"
              value={form.scheduled_date}
              min={editing ? undefined : today}
              onChange={(e) => onDateChange(e.target.value)}
              className={`${field} [color-scheme:light] dark:[color-scheme:dark]`}
              required
            />
            {attemptedSubmit && dateErrorFor(form.scheduled_date) && (
              <span className="mt-1 block text-xs font-semibold text-rose-600">
                {dateErrorFor(form.scheduled_date)}
              </span>
            )}
          </Field>
          <Field label="Difficulty">
            <select
              value={form.difficulty}
              onChange={(e) => set('difficulty', e.target.value as Difficulty)}
              className={`${field} [color-scheme:light] dark:[color-scheme:dark]`}
            >
              <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white" value="EASY">
                Easy
              </option>
              <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white" value="MEDIUM">
                Medium
              </option>
              <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white" value="HARD">
                Hard
              </option>
            </select>
          </Field>
          <Field label="Tags (comma separated)">
            <input
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              className={field}
            />
          </Field>
          <Field label="External URL">
            <input
              value={form.external_url}
              onChange={(e) => set('external_url', e.target.value)}
              className={field}
            />
            {attemptedSubmit && urlErrorFor(form.external_url) && (
              <span className="mt-1 block text-xs font-semibold text-rose-600">
                {urlErrorFor(form.external_url)}
              </span>
            )}
          </Field>
          <Field label="Platform">
            <input
              value={form.external_platform}
              onChange={(e) => set('external_platform', e.target.value)}
              className={field}
            />
          </Field>
          <Field label="Problem statement" required wide>
            <textarea
              value={form.statement}
              onChange={(e) => set('statement', e.target.value)}
              rows={4}
              className={field}
              required
            />
          </Field>
          <Field label="Constraints" wide>
            <textarea
              value={form.constraints}
              onChange={(e) => set('constraints', e.target.value)}
              rows={2}
              className={field}
            />
          </Field>
          <Field label="Sample input">
            <textarea
              value={form.sample_input}
              onChange={(e) => set('sample_input', e.target.value)}
              rows={3}
              className={field}
            />
          </Field>
          <Field label="Sample output">
            <textarea
              value={form.sample_output}
              onChange={(e) => set('sample_output', e.target.value)}
              rows={3}
              className={field}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 p-5 dark:border-slate-800">
          <button type="button" onClick={close} className="px-4 py-2 text-sm font-bold">
            Cancel
          </button>
          <button
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FF7A00] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Schedule problem'}
          </button>
        </div>
      </form>
    </div>
  );
}
function SubmissionDetail({
  submission,
  close,
  review,
}: {
  submission: CodeQuestSubmission;
  close: () => void;
  review: (s: CodeQuestSubmission, is_correct: boolean) => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-2xl glass-panel shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800">
          <div>
            <h2 className="font-extrabold text-[#1A1A2E] dark:text-white">
              {submission.problem_title}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {submission.user_name || submission.user_email} · {submission.language}
            </p>
          </div>
          <button onClick={close} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap bg-slate-950 p-5 font-mono text-xs leading-relaxed text-slate-100">
          {submission.code}
        </pre>
        {submission.is_reviewed ? (
          <div className="flex items-center justify-between gap-3 p-5">
            <p className="text-xs text-slate-500">
              Reviewed by {submission.reviewed_by_name || 'a lead'}
              {submission.reviewed_at
                ? ` · ${new Date(submission.reviewed_at).toLocaleString()}`
                : ''}
            </p>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                submission.is_correct
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {submission.is_correct ? 'ACCEPTED' : 'INCORRECT'}
            </span>
          </div>
        ) : (
          <div className="flex justify-end gap-3 p-5">
            <button
              onClick={() => void review(submission, false)}
              className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-bold text-rose-600 dark:border-rose-900"
            >
              Mark incorrect
            </button>
            <button
              onClick={() => void review(submission, true)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
            >
              Accept solution
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
