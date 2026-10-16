'use client';

import React, { useState } from 'react';
import { Plus, Tags, X } from 'lucide-react';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { BTN_PRIMARY, INPUT, LABEL } from './shared';

interface ProblemDomainsPanelProps {
  slug: string;
  domains: string[];
  /** How many statements use each domain (lower-cased key). */
  usage: Record<string, number>;
  onChange: (domains: string[]) => void;
}

/** The hackathon's domain list: statements pick from it, and the public filter pills follow its order. */
export function ProblemDomainsPanel({ slug, domains, usage, onChange }: ProblemDomainsPanelProps) {
  const { toast } = useToast();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (next: string[]) => {
    setBusy(true);
    try {
      const saved = await hackathonApi.admin.update(slug, { problem_domains: next });
      onChange(saved.problem_domains ?? next);
      return true;
    } catch (err) {
      toast.error('Could not update domains', apiErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = draft.replace(/\s+/g, ' ').trim();
    if (!name || domains.some((existing) => existing.toLowerCase() === name.toLowerCase())) {
      setDraft('');
      return;
    }
    if (await save([...domains, name])) setDraft('');
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <div>
        <h4 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white">
          <Tags className="h-4 w-4 text-[#FF7A00]" /> Domains
        </h4>
        <p className="text-xs text-slate-500">
          Problem statements are filed under one of these. They also become the filter pills on the public page, in this order.
        </p>
      </div>

      {domains.length === 0 ? (
        <p className="text-xs text-slate-500">No domains yet. Add the first one below (for example AI, EdTech, HealthTech).</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {domains.map((domain) => {
            const used = usage[domain.toLowerCase()] ?? 0;
            return (
              <li key={domain} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-3 pr-1.5 text-xs font-semibold text-slate-700 dark:bg-white/5 dark:text-slate-200">
                {domain}
                <span className="rounded-full bg-white px-1.5 text-[10px] font-bold text-slate-500 dark:bg-white/10">{used}</span>
                <button
                  type="button"
                  disabled={busy || used > 0}
                  onClick={() => save(domains.filter((existing) => existing !== domain))}
                  title={used > 0 ? `${used} statement${used === 1 ? '' : 's'} use this domain` : `Remove ${domain}`}
                  aria-label={`Remove domain ${domain}`}
                  className="rounded-full p-0.5 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={add} className="flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1">
          <label className={LABEL} htmlFor="new-domain">Add a domain</label>
          <input id="new-domain" value={draft} maxLength={100} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. Smart Cities" className={INPUT} />
        </div>
        <button type="submit" disabled={busy || !draft.trim() || domains.length >= 30} className={BTN_PRIMARY}>
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </form>
    </div>
  );
}
