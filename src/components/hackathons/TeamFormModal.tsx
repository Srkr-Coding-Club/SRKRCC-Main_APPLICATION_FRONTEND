'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Lightbulb, ListChecks, Pencil, UsersRound } from 'lucide-react';
import type { HackathonTeam, ProblemStatement } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { FormSelect } from '@/components/ui/FormSelect';
import { FieldLabel, SpotlightInput, SpotlightTextarea } from '@/components/ui/InputField';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { apiErrorMessage, hackathonApi, type TeamProblemBody } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';

type ProblemMode = 'statement' | 'open' | 'none';

const DESCRIPTION_LIMIT = 5000;
const TITLE_LIMIT = 255;
const DOMAIN_LIMIT = 100;

interface TeamFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  problemStatements: ProblemStatement[];
  allowOpenInnovation: boolean;
  /** Present = edit mode (leader renaming / changing the problem). */
  team?: HackathonTeam | null;
  onSaved: (team: HackathonTeam) => void;
}

type FieldErrors = Partial<Record<
  'name' | 'problem_statement' | 'open_innovation' | 'custom_problem_title' | 'custom_problem_description' | 'custom_problem_domain' | 'form',
  string
>>;

const FIELD_KEYS: (keyof FieldErrors)[] = [
  'name', 'problem_statement', 'open_innovation', 'custom_problem_title', 'custom_problem_description', 'custom_problem_domain',
];

function ModeButton({ active, icon: Icon, children, onClick }: { active: boolean; icon: React.ElementType; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition ${
        active
          ? 'border-[#FF7A00] bg-[#FF7A00]/10 text-[#C25A00] dark:text-[#FF9A4A]'
          : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-[#FF7A00]/50'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

export function TeamFormModal({ isOpen, onClose, slug, problemStatements, allowOpenInnovation, team, onSaved }: TeamFormModalProps) {
  const { toast } = useToast();
  const editing = Boolean(team);
  const [name, setName] = useState('');
  const [mode, setMode] = useState<ProblemMode>('statement');
  const [psId, setPsId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const active = useMemo(() => problemStatements.filter((p) => p.is_active), [problemStatements]);
  const domains = useMemo(() => [...new Set(active.map((p) => p.domain).filter(Boolean))], [active]);
  const hasStatements = active.length > 0;

  useEffect(() => {
    if (!isOpen) return;
    setName(team?.name ?? '');
    setPsId(team?.problem_statement ? String(team.problem_statement.id) : '');
    setTitle(team?.open_innovation?.title ?? '');
    setDescription(team?.open_innovation?.description ?? '');
    setDomain(team?.open_innovation?.domain ?? '');
    setMode(team?.open_innovation ? 'open' : hasStatements ? 'statement' : 'none');
    setErrors({});
  }, [isOpen, team, hasStatements]);

  const options = active.map((p) => {
    const mine = team?.problem_statement?.id === p.id;
    const full = p.slots_left === 0 && !mine;
    return {
      value: String(p.id),
      label: `${p.code}: ${p.title}`,
      hint: full ? 'Full' : p.slots_left !== null ? `${p.slots_left} left` : undefined,
      disabled: full,
    };
  });
  const selected = active.find((p) => String(p.id) === psId);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = 'Team name is required.';
    if (mode === 'statement' && !psId) next.problem_statement = 'Pick a problem statement.';
    if (mode === 'open') {
      if (!title.trim()) next.custom_problem_title = 'Problem title is required.';
      if (!domain.trim()) next.custom_problem_domain = 'Problem domain is required.';
      if (!description.trim()) next.custom_problem_description = 'Problem description is required.';
    }
    return next;
  };

  const problemBody = (): TeamProblemBody => {
    if (mode === 'open') return { open_innovation: { title: title.trim(), description: description.trim(), domain: domain.trim() } };
    if (mode === 'statement') return { problem_statement: Number(psId) };
    return editing ? { problem_statement: null } : {};
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const body = { name: name.trim(), ...problemBody() };
      const saved = editing ? await hackathonApi.updateTeam(team!.id, body) : await hackathonApi.createTeam(slug, body);
      toast.success(editing ? 'Team updated' : 'Team created', editing ? undefined : 'Now invite your teammates by email.');
      onSaved(saved);
      onClose();
    } catch (err: any) {
      const field = err?.body?.field as keyof FieldErrors | undefined;
      const message = apiErrorMessage(err);
      setErrors(field && FIELD_KEYS.includes(field) ? { [field]: message } : { form: message });
    } finally {
      setBusy(false);
    }
  };

  const showModeSwitch = allowOpenInnovation && (hasStatements || !editing || mode === 'open');

  return (
    <Modal isOpen={isOpen} onClose={onClose} busy={busy} title={editing ? 'Edit team' : 'Create your team'} icon={editing ? Pencil : UsersRound} maxWidth="max-w-xl">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <FieldLabel htmlFor="team-name" required>Team name</FieldLabel>
          <SpotlightInput
            id="team-name"
            value={name}
            maxLength={150}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Bug Slayers"
            hasError={!!errors.name}
            autoFocus
          />
          {errors.name && <p className="text-xs text-rose-500">{errors.name}</p>}
        </div>

        {(hasStatements || allowOpenInnovation) && (
          <div className="space-y-2">
            <FieldLabel required={hasStatements}>Your problem</FieldLabel>
            {showModeSwitch && (
              <div className="flex gap-2" role="group" aria-label="How will your team choose a problem?">
                {hasStatements ? (
                  <ModeButton active={mode === 'statement'} icon={ListChecks} onClick={() => setMode('statement')}>Pick a statement</ModeButton>
                ) : (
                  <ModeButton active={mode === 'none'} icon={ListChecks} onClick={() => setMode('none')}>Decide later</ModeButton>
                )}
                <ModeButton active={mode === 'open'} icon={Lightbulb} onClick={() => setMode('open')}>Open innovation</ModeButton>
              </div>
            )}

            {mode === 'statement' && hasStatements && (
              <div className="space-y-2">
                <FormSelect value={psId} onChange={setPsId} options={options} placeholder="Select a problem statement" allowClear={false} />
                {errors.problem_statement && <p className="text-xs text-rose-500">{errors.problem_statement}</p>}
                {selected && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-white/[0.02] p-3 text-xs space-y-1">
                    <p className="font-bold text-[#8B2E3B] dark:text-rose-300">{selected.code} · {selected.domain}</p>
                    {selected.description?.trim() && <MarkdownRenderer content={selected.description} />}
                  </div>
                )}
              </div>
            )}

            {mode === 'open' && (
              <div className="space-y-3 rounded-lg border border-[#FF7A00]/30 bg-[#FF7A00]/5 p-3">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Bring your own idea. Describe the problem you will solve. The organizers review it. All three fields are required.
                </p>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="oi-title" required>Problem title</FieldLabel>
                  <SpotlightInput
                    id="oi-title"
                    value={title}
                    maxLength={TITLE_LIMIT}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Smart waste bins for the campus"
                    hasError={!!errors.custom_problem_title}
                  />
                  {errors.custom_problem_title && <p className="text-xs text-rose-500">{errors.custom_problem_title}</p>}
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="oi-domain" required>Domain</FieldLabel>
                  <SpotlightInput
                    id="oi-domain"
                    list="open-innovation-domains"
                    value={domain}
                    maxLength={DOMAIN_LIMIT}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="e.g. IoT, HealthTech, EdTech"
                    hasError={!!errors.custom_problem_domain}
                  />
                  <datalist id="open-innovation-domains">
                    {domains.map((d) => <option key={d} value={d} />)}
                  </datalist>
                  {errors.custom_problem_domain && <p className="text-xs text-rose-500">{errors.custom_problem_domain}</p>}
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="oi-description" required>Description</FieldLabel>
                  <SpotlightTextarea
                    id="oi-description"
                    rows={5}
                    value={description}
                    maxLength={DESCRIPTION_LIMIT}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is the problem, who faces it, and how will your team approach it?"
                    hasError={!!errors.custom_problem_description}
                  />
                  <div className="flex justify-between text-xs">
                    <span className="text-rose-500">{errors.custom_problem_description}</span>
                    <span className="text-slate-400">{description.length}/{DESCRIPTION_LIMIT}</span>
                  </div>
                </div>
                {errors.open_innovation && <p className="text-xs text-rose-500">{errors.open_innovation}</p>}
              </div>
            )}
          </div>
        )}

        {!editing && (
          <p className="text-xs text-slate-500">
            You&apos;ll be the team leader, so only you can edit the team and invite members.
          </p>
        )}
        {errors.form && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400">{errors.form}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-5 py-2 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white text-sm font-bold shadow-sm transition active:scale-95 disabled:opacity-60"
          >
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Create team'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
