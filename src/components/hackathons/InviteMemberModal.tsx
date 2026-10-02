'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Search, UserPlus, XCircle } from 'lucide-react';
import type { HackathonTeam, UserLookupResult } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { FieldLabel, SpotlightInput } from '@/components/ui/InputField';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  team: HackathonTeam;
  slotsLeft: number;
  onInvited: (team: HackathonTeam) => void;
}

export function InviteMemberModal({ isOpen, onClose, slug, team, slotsLeft, onInvited }: InviteMemberModalProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [lookup, setLookup] = useState<UserLookupResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setLookup(null);
      setError('');
    }
  }, [isOpen]);

  // Exact-email lookup, debounced — the backend never does partial matching.
  useEffect(() => {
    const value = email.trim();
    setLookup(null);
    setError('');
    if (!EMAIL_RE.test(value)) return;
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      hackathonApi
        .lookupUser(slug, value)
        .then((r) => !cancelled && setLookup(r))
        .catch((err) => !cancelled && setError(apiErrorMessage(err)))
        .finally(() => !cancelled && setSearching(false));
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      setSearching(false);
    };
  }, [email, slug]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookup?.can_invite) return;
    setBusy(true);
    try {
      const res = await hackathonApi.invite(team.id, email.trim());
      toast.success('Invite sent', `${lookup.name} will see it on their dashboard.`);
      onInvited(res.team);
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} busy={busy} title="Invite a teammate" icon={UserPlus}>
      <form onSubmit={send} className="space-y-4">
        <p className="text-xs text-slate-500">
          Enter your teammate&apos;s <strong>exact</strong> SRKRCC account email. They must accept the invite to join.{' '}
          {slotsLeft > 0 ? `${slotsLeft} slot${slotsLeft === 1 ? '' : 's'} left.` : 'Your team is full.'}
        </p>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="invite-email" required>Email</FieldLabel>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <SpotlightInput
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@srkr.ac.in"
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        <div className="min-h-[64px]">
          {searching && (
            <p className="flex items-center gap-2 text-xs text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Looking up…</p>
          )}
          {lookup && (
            lookup.found ? (
              <div className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${lookup.can_invite ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FF7A00]/15 text-sm font-bold text-[#FF7A00]">
                  {(lookup.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#1A1A2E] dark:text-white truncate">{lookup.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{lookup.email}{lookup.club_id ? ` · ${lookup.club_id}` : ''}</p>
                  {!lookup.can_invite && <p className="mt-1 text-xs font-semibold text-amber-600 dark:text-amber-400">{lookup.reason}</p>}
                </div>
                {lookup.can_invite ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-amber-500" />}
              </div>
            ) : (
              <p className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-xs text-slate-500">{lookup.reason}</p>
            )
          )}
          {error && <p className="text-xs font-semibold text-rose-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !lookup?.can_invite}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white text-sm font-bold shadow-sm transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <UserPlus className="h-4 w-4" />
            {busy ? 'Sending…' : 'Send invite'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
