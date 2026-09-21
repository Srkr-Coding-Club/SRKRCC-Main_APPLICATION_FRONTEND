"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Code2,
  Edit3,
  ExternalLink,
  FileText,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { fetchApi } from "@/lib/api-client";
import type { CodeQuestSubmission, Problem } from "@/lib/types";

type Difficulty = Problem["difficulty"];
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
  title: "",
  difficulty: "MEDIUM",
  scheduled_date: "",
  statement: "",
  constraints: "",
  sample_input: "",
  sample_output: "",
  tags: "",
  external_url: "",
  external_platform: "",
});

const difficultyClass: Record<Difficulty, string> = {
  EASY: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  MEDIUM: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  HARD: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

const toForm = (p: Problem): ProblemForm => ({
  title: p.title,
  difficulty: p.difficulty,
  scheduled_date: p.scheduled_date,
  statement: p.statement,
  constraints: p.constraints ?? "",
  sample_input: p.sample_input ?? "",
  sample_output: p.sample_output ?? "",
  tags: (p.tags ?? []).join(", "),
  external_url: p.external_url ?? "",
  external_platform: p.external_platform ?? "",
});

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

export function CodeQuestTab() {
  const { toast } = useToast();
  const [problems, setProblems] = useState<Problem[]>([]),
    [submissions, setSubmissions] = useState<CodeQuestSubmission[]>([]);
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [reviewing, setReviewing] = useState<number | null>(null);

  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState<Difficulty | "ALL">("ALL");

  const [form, setForm] = useState<ProblemForm>(blank),
    [editing, setEditing] = useState<Problem | null>(null),
    [editorOpen, setEditorOpen] = useState(false),
    [detail, setDetail] = useState<CodeQuestSubmission | null>(null);

  const load = async () => {
    setLoading(true);

    try {
      const [p, s] = await Promise.all([
        fetchApi<Problem[]>("/codequest/"),
        fetchApi<CodeQuestSubmission[]>("/codequest/submissions/"),
      ]);
      setProblems(p);
      setSubmissions(s);
    } catch (e) {
      toast.error("Could not load CodeQuest", message(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const shown = useMemo(
    () =>
      problems.filter(
        (p) =>
          (filter === "ALL" || p.difficulty === filter) &&
          `${p.title} ${(p.tags ?? []).join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [problems, filter, query],
  );
  const set = <K extends keyof ProblemForm>(key: K, value: ProblemForm[K]) =>
    setForm((old) => ({ ...old, [key]: value }));
  const openNew = () => {
    setEditing(null);
    setForm(blank());
    setEditorOpen(true);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();

    if (!form.title.trim() || !form.statement.trim() || !form.scheduled_date) {
      toast.warning(
        "Complete required fields",
        "Title, schedule date, and statement are required.",
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
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    };

    try {
      const saved = editing
        ? await fetchApi<Problem>(`/codequest/${editing.slug}/`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await fetchApi<Problem>(
            "/codequest/",

            {
              method: "POST",
              body: JSON.stringify(payload),
            },
          );
      setProblems((old) =>
        editing
          ? old.map((x) => (x.id === saved.id ? saved : x))
          : [saved, ...old],
      );
      toast.success(
        editing ? "Problem updated" : "Problem scheduled",
        saved.title,
      );
      setEditorOpen(false);
    } catch (e) {
      toast.error("Could not save problem", message(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Problem) => {
    if (
      !window.confirm(
        `Delete “${p.title}”? Its submissions will also be deleted.`,
      )
    )
      return;
    try {
      await fetchApi(`/codequest/${p.slug}/`, { method: "DELETE" });
      setProblems((old) => old.filter((x) => x.id !== p.id));
      toast.success("Problem deleted");
    } catch (e) {
      toast.error("Could not delete problem", message(e));
    }
  };
  const review = async (s: CodeQuestSubmission, is_correct: boolean) => {
    setReviewing(s.id);
    try {
      const updated = await fetchApi<CodeQuestSubmission>(
        `/codequest/submissions/${s.id}/review/`,
        { method: "POST", body: JSON.stringify({ is_correct }) },
      );
      setSubmissions((old) =>
        old.map((x) => (x.id === updated.id ? updated : x)),
      );
      setDetail((old) => (old?.id === updated.id ? updated : old));
      toast.success(
        is_correct ? "Submission accepted" : "Submission marked incorrect",
        "The member streak was recalculated.",
      );
    } catch (e) {
      toast.error("Could not record verdict", message(e));
    } finally {
      setReviewing(null);
    }
  };
  const accepted = submissions.filter((s) => s.is_correct).length,
    upcoming = problems.filter(
      (p) => p.scheduled_date >= new Date().toISOString().slice(0, 10),
    ).length;

  return (
    <>
      <div className="space-y-6">
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
          <div className="flex gap-2">
            <button
              onClick={() => void load()}
              disabled={loading}
              className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700"
              aria-label="Refresh"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={openNew}
              className="inline-flex items-center gap-2 rounded-lg bg-[#FF7A00] px-4 py-2.5 text-sm font-bold text-white"
            >
              <Plus className="h-4 w-4" /> Schedule problem
            </button>
          </div>
        </header>
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
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 dark:border-slate-800 sm:flex-row">
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
  onChange={(e) => setFilter(e.target.value as Difficulty | "ALL")}
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
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <Empty text="Loading scheduled problems…" />
            ) : shown.length === 0 ? (
              <Empty text="No problems match this view." />
            ) : (
              shown.map((p) => (
                <article
                  key={p.id}
                  className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
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
                          <ExternalLink className="h-3 w-3" />{" "}
                          {p.external_platform || "External link"}
                        </a>
                      )}
                    </div>
                    <h2 className="font-bold text-[#1A1A2E] dark:text-white">
                      {p.title}
                    </h2>
                    <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                      {p.statement}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => {
                        setEditing(p);
                        setForm(toForm(p));
                        setEditorOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold dark:border-slate-700"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => void remove(p)}
                      className="rounded-lg border border-rose-200 p-2 text-rose-600 dark:border-rose-900"
                      aria-label={`Delete ${p.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
        <section className="rounded-2xl glass-panel">
          <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
            <div>
              <h2 className="font-extrabold text-[#1A1A2E] dark:text-white">
                Submission review queue
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Accepting a solution securely recalculates that member’s streak.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold dark:bg-slate-800">
              {submissions.length}
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <Empty text="Loading submissions…" />
            ) : submissions.length === 0 ? (
              <Empty text="No submissions have been received." />
            ) : (
              submissions.slice(0, 20).map((s) => (
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
                      {s.user_name || s.user_email} · {s.language} ·{" "}
                      {new Date(s.created_at).toLocaleString()}
                    </p>
                  </button>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-bold ${s.is_correct ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800"}`}
                    >
                      {s.is_correct ? "ACCEPTED" : "PENDING / INCORRECT"}
                    </span>
                    <Verdict
                      onClick={() => void review(s, true)}
                      disabled={reviewing === s.id}
                      accept
                    />
                    <Verdict
                      onClick={() => void review(s, false)}
                      disabled={reviewing === s.id}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
      {editorOpen && (
        <Editor
          form={form}
          set={set}
          editing={!!editing}
          saving={saving}
          close={() => setEditorOpen(false)}
          submit={save}
        />
      )}
      {detail && (
        <SubmissionDetail
          submission={detail}
          close={() => setDetail(null)}
          review={review}
        />
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
      className={`rounded-lg p-2 disabled:opacity-50 ${accept ? "bg-emerald-600 text-white" : "border border-rose-200 text-rose-600 dark:border-rose-900"}`}
      aria-label={accept ? "Accept submission" : "Reject submission"}
    >
      {accept ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
    </button>
  );
}
function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "sm:col-span-2" : ""}>
      <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
        {label}
      </span>
      {children}
    </label>
  );
}
const input =
  "w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[#FF7A00] dark:border-slate-700";
function Editor({
  form,
  set,
  editing,
  saving,
  close,
  submit,
}: {
  form: ProblemForm;
  set: <K extends keyof ProblemForm>(key: K, value: ProblemForm[K]) => void;
  editing: boolean;
  saving: boolean;
  close: () => void;
  submit: (e: FormEvent) => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="mx-auto my-8 max-w-3xl rounded-2xl glass-panel shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
          <div>
            <h2 className="font-extrabold text-[#1A1A2E] dark:text-white">
              {editing
                ? "Edit scheduled problem"
                : "Schedule a CodeQuest problem"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              One problem can be assigned to each calendar date.
            </p>
          </div>
          <button type="button" onClick={close}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Title *">
            <input
              className={input}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              required
            />
          </Field>
          <Field label="Schedule date *">
            <input
              className={input}
              type="date"
              value={form.scheduled_date}
              onChange={(e) => set("scheduled_date", e.target.value)}
              required
            />
          </Field>
          <Field label="Difficulty">
            <select
              className={input}
              value={form.difficulty}
              onChange={(e) => set("difficulty", e.target.value as Difficulty)}
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </Field>
          <Field label="Topics / tags">
            <input
              className={input}
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="Arrays, Hashing, DP"
            />
          </Field>
          <Field label="External platform">
            <input
              className={input}
              value={form.external_platform}
              onChange={(e) => set("external_platform", e.target.value)}
              placeholder="LeetCode"
            />
          </Field>
          <Field label="External problem URL">
            <input
              className={input}
              type="url"
              value={form.external_url}
              onChange={(e) => set("external_url", e.target.value)}
              placeholder="https://…"
            />
          </Field>
          <Field label="Problem statement *" wide>
            <textarea
              className={input}
              rows={6}
              value={form.statement}
              onChange={(e) => set("statement", e.target.value)}
              required
            />
          </Field>
          <Field label="Constraints" wide>
            <textarea
              className={input}
              rows={2}
              value={form.constraints}
              onChange={(e) => set("constraints", e.target.value)}
            />
          </Field>
          <Field label="Sample input">
            <textarea
              className={input}
              rows={3}
              value={form.sample_input}
              onChange={(e) => set("sample_input", e.target.value)}
            />
          </Field>
          <Field label="Sample output">
            <textarea
              className={input}
              rows={3}
              value={form.sample_output}
              onChange={(e) => set("sample_output", e.target.value)}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 p-5 dark:border-slate-800">
          <button
            type="button"
            onClick={close}
            className="px-4 py-2 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FF7A00] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : editing ? "Save changes" : "Schedule problem"}
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
  review: (s: CodeQuestSubmission, verdict: boolean) => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="mx-auto my-12 max-w-3xl rounded-2xl glass-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
          <div>
            <h2 className="font-extrabold text-[#1A1A2E] dark:text-white">
              {submission.problem_title}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {submission.user_name || submission.user_email} ·{" "}
              {submission.language}
            </p>
          </div>
          <button onClick={close}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <pre className="max-h-[55vh] overflow-auto whitespace-pre-wrap bg-slate-950 p-5 font-mono text-xs leading-relaxed text-slate-100">
          {submission.code}
        </pre>
        <div className="flex justify-end gap-2 p-5">
          <button
            onClick={() => void review(submission, false)}
            className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-bold text-rose-600"
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
      </div>
    </div>
  );
}
