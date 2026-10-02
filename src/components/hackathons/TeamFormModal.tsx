'use client';

import React, { useEffect, useState } from 'react';
import { Pencil, UsersRound } from 'lucide-react';
import type { HackathonTeam, ProblemStatement } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { FormSelect } from '@/components/ui/FormSelect';
import { FieldLabel, SpotlightInput } from '@/components/ui/InputField';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';

interface TeamFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  problemStatements: ProblemStatement[];
  /** Present = edit mode (leader renaming / switching problem statement). */
  team?: HackathonTeam | null;
  onSaved: (team: HackathonTeam) => void;
}

export function TeamFormModal({ isOpen, onClose, slug, problemStatements, team, onSaved }: TeamFormModalProps) {
  const { toast } = useToast();
  const editing = Boolean(team);
  const [name, setName] = useState('');
  const [psId, setPsId] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; problem_statement?: string; form?: string }>({});

  useEffect(() => {
    if (!isOpen) return;
    setName(team?.name ?? '');
    setPsId(team?.problem_statement ? String(team.problem_statement.id) : '');
    setErrors({});
  }, [isOpen, team]);

  const active = problemStatements.filter((p) => p.is_active);
  const options = active.map((p) => {
    const mine = team?.problem_statement?.id === p.id;
    const full = p.slots_left === 0 && !mine;
    return {
      value: String(p.id),
      label: `${p.code} — ${p.title}`,
      hint: full ? 'Full' : p.slots_left !== null ? `${p.slots_left} left` : undefined,
      disabled: full,
    };
  });
  const selected = active.find((p) => String(p.id) === psId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Team name is required.';
    if (active.length > 0 && !psId) next.problem_statement = 'Pick a problem statement.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const body = { name: name.trim(), problem_statement: psId ? Number(psId) : null };
      const saved = editing ? await hackathonApi.updateTeam(team!.id, body) : await hackathonApi.createTeam(slug, body);
      toast.success(editing ? 'Team updated' : 'Team created', editing ? undefined : 'Now invite your teammates by email.');
      onSaved(saved);
      onClose();
    } catch (err: any) {
      const field = err?.body?.field as keyof typeof errors | undefined;
      const msg = apiErrorMessage(err);
      setErrors(field ? { [field]: msg } : { form: msg });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} busy={busy} title={editing ? 'Edit team' : 'Create your team'} icon={editing ? Pencil : UsersRound}>
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

        {active.length > 0 && (
          <div className="space-y-1.5">
            <FieldLabel required>Problem statement</FieldLabel>
            <FormSelect value={psId} onChange={setPsId} options={options} placeholder="Select a problem statement" allowClear={false} />
            {errors.problem_statement && <p className="text-xs text-rose-500">{errors.problem_statement}</p>}
            {selected?.description?.trim() && (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-white/[0.02] p-3 text-xs">
                <MarkdownRenderer content={selected.description} />
              </div>
            )}
          </div>
        )}

        {!editing && (
          <p className="text-xs text-slate-500">
            You&apos;ll be the team leader — only you can edit the team and invite members.
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
