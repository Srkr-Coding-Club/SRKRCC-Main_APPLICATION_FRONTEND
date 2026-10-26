'use client';

import React, { useMemo, useState } from 'react';
import { Wand2 } from 'lucide-react';
import type { AutoShortlistResult, HackathonFeatures, HackathonRound } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormSelect } from '@/components/ui/FormSelect';
import { Switch } from '@/components/ui/Switch';
import { DEFAULT_RULE_FOR_KIND, ROUND_RULES } from './roundKinds';
import { BTN_GHOST, BTN_PRIMARY, INPUT, LABEL } from './shared';

interface RoundAutoShortlistProps {
  slug: string;
  round: HackathonRound;
  features: HackathonFeatures;
  /** Called after teams were shortlisted so the round and its table reload. */
  onApplied: () => void;
}

/** Choose who goes through from the facts the platform already has, preview the list, then apply it. */
export function RoundAutoShortlist({ slug, round, features, onApplied }: RoundAutoShortlistProps) {
  const { toast } = useToast();
  const { confirm, dialog } = useConfirmDialog();
  const rules = useMemo(() => ROUND_RULES.filter((rule) => rule.needs(features)), [features]);
  const [ruleKey, setRuleKey] = useState(() => (rules.find((item) => item.key === DEFAULT_RULE_FOR_KIND[round.kind]) ?? rules[0])?.key ?? '');
  const [value, setValue] = useState('');
  const [rejectRest, setRejectRest] = useState(false);
  const [preview, setPreview] = useState<AutoShortlistResult | null>(null);
  const [busy, setBusy] = useState(false);

  const rule = rules.find((item) => item.key === ruleKey);
  if (rules.length === 0) return null;

  const body = (apply: boolean, extra: Record<string, boolean> = {}) => ({
    rule: ruleKey as NonNullable<typeof rule>['key'],
    ...(rule?.valueLabel ? { value: Number(value) } : {}),
    reject_rest: rejectRest, apply, ...(round.results_published ? { confirm_published: true } : {}), ...extra,
  });
  const ready = Boolean(rule) && (!rule?.valueLabel || (value !== '' && Number.isFinite(Number(value))));

  const run = async (apply: boolean, extra: Record<string, boolean> = {}) => {
    setBusy(true);
    try {
      const result = await hackathonApi.admin.autoShortlist(slug, round.id, body(apply, extra));
      setPreview(result);
      if (apply) {
        toast.success(`${result.selected.length} team${result.selected.length === 1 ? '' : 's'} shortlisted`, rejectRest ? 'The rest were marked not shortlisted.' : undefined);
        onApplied();
      }
    } catch (err: any) {
      if (apply && err?.body?.code === 'SHORTLIST_LIMIT') {
        const ok = await confirm({
          title: 'Shortlist more teams than planned?',
          message: `${round.name} is meant to take ${err.body.limit} teams and this would shortlist ${err.body.would_be}.`,
          confirmLabel: 'Shortlist them all',
        });
        if (ok) await run(true, { ...extra, confirm_over_limit: true });
      } else {
        toast.error(apply ? 'Could not shortlist' : 'Could not preview', apiErrorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-white/[0.02]">
      {dialog}
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200"><Wand2 className="h-4 w-4 text-journey-accent" /> Pick teams by rule</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_200px]">
        <div>
          <label className={LABEL}>Rule</label>
          <FormSelect aria-label="Rule"
            value={ruleKey}
            onChange={(next) => { setRuleKey(next as typeof ruleKey); setPreview(null); }}
            options={rules.map((item) => ({ value: item.key, label: item.label }))}
            placeholder="Choose a rule"
            allowClear={false}
          />
        </div>
        {rule?.valueLabel && (
          <div>
            <label htmlFor="rule-value" className={LABEL}>{rule.valueLabel}</label>
            <input id="rule-value" type="number" inputMode="decimal" min={0} value={value} onChange={(e) => { setValue(e.target.value); setPreview(null); }} className={INPUT} />
          </div>
        )}
      </div>
      <Switch label="Mark everyone else not shortlisted" description="Only teams still under review are changed; decisions you already made are kept." checked={rejectRest} onChange={setRejectRest} />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => run(false)} disabled={busy || !ready} className={BTN_GHOST}>Preview</button>
        <button type="button" onClick={() => run(true)} disabled={busy || !ready || !preview || preview.selected.length === 0} className={BTN_PRIMARY}>
          Shortlist {preview ? preview.selected.length : ''} team{preview?.selected.length === 1 ? '' : 's'}
        </button>
      </div>
      {preview && !preview.applied && (
        <div className="space-y-2 text-sm" aria-live="polite">
          <p className="text-slate-600 dark:text-slate-300">
            <strong>{preview.selected.length}</strong> of {preview.selected.length + preview.not_selected.length} teams match
            {preview.limit ? <> (target {preview.limit}){preview.over_limit && <span className="font-bold text-amber-700 dark:text-amber-400"> · over the target</span>}</> : null}.
          </p>
          {preview.selected.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {preview.selected.map((row) => (
                <li key={row.entry_id} className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                  {row.team_name}{row.metric !== null ? ` · ${row.metric.toFixed(1)}` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
