'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, IdCard, Loader2, Mail, Search, UserPlus, X, XCircle } from 'lucide-react';
import type { HackathonTeam, UserLookupResult } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { FieldLabel, SpotlightInput } from '@/components/ui/InputField';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';

const DEBOUNCE_DELAY_MS = 300;
const MIN_SEARCH_LENGTH = 3;

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
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserLookupResult | null>(null);
  const [suggestions, setSuggestions] = useState<UserLookupResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedUser(null);
      setSuggestions([]);
      setShowDropdown(false);
      setError('');
      setSearching(false);
      setNoResults(false);
      setRateLimited(false);
    }
  }, [isOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search (runs on partial name, email, or club ID)
  useEffect(() => {
    const trimmed = query.trim();
    setError('');

    // If query is short, clear suggestions
    if (!trimmed || trimmed.length < MIN_SEARCH_LENGTH) {
      setSuggestions([]);
      setShowDropdown(false);
      setSearching(false);
      setNoResults(false);
      return;
    }

    // If user has already selected someone and the query equals their email, don't re-query
    if (selectedUser && selectedUser.email?.toLowerCase() === trimmed.toLowerCase()) {
      setShowDropdown(false);
      return;
    }

    let isSubscribed = true;
    setSearching(true);
    setNoResults(false);

    const debounceTimer = setTimeout(() => {
      hackathonApi
        .lookupUser(slug, trimmed, team.id)
        .then((res) => {
          if (!isSubscribed) return;
          setRateLimited(false);
          const list = res.results && res.results.length > 0 ? res.results : res.found ? [res] : [];
          setSuggestions(list);
          setActiveIndex(0);
          setShowDropdown(true);
          setNoResults(list.length === 0);

          // If exact email typed, auto-select
          if (trimmed.includes('@') && trimmed.includes('.')) {
            const exact = list.find((u) => u.email?.toLowerCase() === trimmed.toLowerCase());
            if (exact) {
              setSelectedUser(exact);
              setShowDropdown(false);
            }
          }
        })
        .catch((err: { status?: number }) => {
          if (!isSubscribed) return;
          setSuggestions([]);
          // A throttled or failed search is not the same thing as "no such member".
          setRateLimited(err?.status === 429);
          setNoResults(err?.status !== 429);
          if (err?.status !== 429) setError('Could not search members right now. Try again.');
        })
        .finally(() => {
          if (isSubscribed) {
            setSearching(false);
          }
        });
    }, DEBOUNCE_DELAY_MS);

    return () => {
      isSubscribed = false;
      clearTimeout(debounceTimer);
    };
  }, [query, slug, team.id, selectedUser]);

  const handleSelectUser = (user: UserLookupResult) => {
    setSelectedUser(user);
    setQuery(user.email || '');
    setShowDropdown(false);
    setError('');
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const listOpen = showDropdown && suggestions.length > 0;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!suggestions.length) return;
      event.preventDefault();
      setShowDropdown(true);
      setActiveIndex((index) => (event.key === 'ArrowDown' ? Math.min(index + 1, suggestions.length - 1) : Math.max(index - 1, 0)));
    } else if (event.key === 'Enter' && listOpen) {
      event.preventDefault();
      handleSelectUser(suggestions[activeIndex]);
    } else if (event.key === 'Escape' && listOpen) {
      // Close the list only; the modal's own Escape handler must not also fire.
      event.nativeEvent.stopImmediatePropagation();
      setShowDropdown(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedUser(null);
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    setNoResults(false);
    setError('');
  };

  const trimmedQuery = query.trim();
  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedQuery);

  const sendEmailInvite = async () => {
    if (busy || !looksLikeEmail) return;
    setBusy(true);
    try {
      const res = await hackathonApi.inviteByEmail(team.id, trimmedQuery);
      toast.success('Invite emailed', `${trimmedQuery} will find the invite on their dashboard once they sign up with this address.`);
      onInvited(res.team);
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = selectedUser?.email || query.trim();
    if (!targetEmail || !selectedUser?.can_invite || busy) return;

    setBusy(true);
    try {
      const res = await hackathonApi.invite(team.id, targetEmail);
      toast.success('Invite sent', `${selectedUser.name} will receive an invitation email and notification.`);
      onInvited(res.team);
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} busy={busy} title="Invite Teammate" icon={UserPlus} maxWidth="max-w-lg">
      <form onSubmit={send} className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Search by <strong>name</strong>, <strong>email</strong>, or <strong>Club ID</strong>. Suggestions appear as you type.
          {slotsLeft > 0 ? (
            <span className="ml-1 font-semibold text-slate-700 dark:text-slate-300">
              ({slotsLeft} open slot{slotsLeft === 1 ? '' : 's'} remaining)
            </span>
          ) : (
            <span className="ml-1 font-semibold text-rose-500">(Your team is full)</span>
          )}
        </p>

        {/* Live Search Input with Instant Dropdown */}
        <div className="relative space-y-1.5" ref={dropdownRef}>
          <FieldLabel htmlFor="invite-search" required>
            Find Teammate
          </FieldLabel>
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#FF7A00]" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </div>
            <SpotlightInput
              id="invite-search"
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (selectedUser) setSelectedUser(null);
              }}
              onFocus={() => {
                if (suggestions.length > 0) setShowDropdown(true);
              }}
              role="combobox"
              aria-expanded={showDropdown && suggestions.length > 0}
              aria-controls="invite-suggestions"
              aria-autocomplete="list"
              aria-activedescendant={showDropdown && suggestions[activeIndex] ? `invite-option-${suggestions[activeIndex].id}` : undefined}
              onKeyDown={handleSearchKeyDown}
              placeholder="Start typing name, email, or club ID (e.g. Rahul, 25SCC...)"
              className="pl-9 pr-9"
              autoFocus
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
                title="Clear"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <ul
              id="invite-suggestions"
              role="listbox"
              aria-label="Matching members"
              className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl divide-y divide-slate-100 dark:divide-slate-800/60"
            >
              {suggestions.map((user, index) => (
                <li
                  key={user.id || user.email}
                  id={`invite-option-${user.id}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => handleSelectUser(user)}
                  className={`flex cursor-pointer items-start justify-between gap-3 px-3 py-2.5 transition ${index === activeIndex ? 'bg-[#FF7A00]/10' : ''}`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ring-2 ${
                        user.can_invite
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600 ring-emerald-500/20'
                          : 'bg-gradient-to-br from-amber-500 to-orange-600 ring-amber-500/20'
                      }`}
                    >
                      {getInitials(user.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-bold text-[#1A1A2E] dark:text-white">{user.name}</span>
                        {user.club_id && (
                          <span className="rounded border border-slate-200/60 bg-slate-100 px-1 font-mono text-[9px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800">
                            {user.club_id}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-slate-400">{user.email}</p>
                      {!user.can_invite && user.reason && (
                        <p className="mt-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">{user.reason}</p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                      user.can_invite
                        ? 'border-emerald-500/20 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'border-amber-500/20 bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                    }`}
                  >
                    {user.can_invite ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {user.can_invite ? 'Eligible' : 'Unavailable'}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* No results message */}
          {rateLimited && !searching && (
            <p role="alert" className="pt-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
              You are searching too fast. Wait a few seconds and keep typing.
            </p>
          )}
          {noResults && !searching && !rateLimited && !looksLikeEmail && query.trim().length >= MIN_SEARCH_LENGTH && (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic pt-1">
              No members found matching &quot;{query.trim()}&quot;. Check spelling or ask them to register.
            </p>
          )}
        </div>

        {noResults && !searching && !rateLimited && looksLikeEmail && !selectedUser && (
          <div className="space-y-2 rounded-xl border border-sky-500/30 bg-sky-500/[0.05] p-4">
            <p className="text-sm font-bold text-[#1A1A2E] dark:text-white">No account uses {trimmedQuery} yet</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              We can email them a link to sign up. The invite waits on their dashboard once they create an account with this exact address.
              It uses one of your team&apos;s open slots until they respond.
            </p>
            <button
              type="button"
              onClick={sendEmailInvite}
              disabled={busy || slotsLeft === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-sky-700 active:scale-95 disabled:opacity-40"
            >
              <Mail className="h-3.5 w-3.5" /> {busy ? 'Sending…' : 'Email them an invite'}
            </button>
          </div>
        )}

        {/* Selected Member Preview Card */}
        <div className="min-h-[96px] transition-all">
          {searching && !selectedUser && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-white/[0.02] p-6 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-[#FF7A00]" />
              <span>Searching club members…</span>
            </div>
          )}

          {selectedUser && (
            <div
              className={`relative overflow-hidden rounded-xl border p-4 transition-all ${
                selectedUser.can_invite
                  ? 'border-emerald-500/40 bg-emerald-500/[0.04] shadow-sm shadow-emerald-500/5'
                  : 'border-amber-500/40 bg-amber-500/[0.04] shadow-sm shadow-amber-500/5'
              }`}
            >
              <div className="flex items-start gap-3.5">
                {/* Avatar */}
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold text-sm text-white shadow-sm ring-2 ${
                    selectedUser.can_invite
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 ring-emerald-500/20'
                      : 'bg-gradient-to-br from-amber-500 to-orange-600 ring-amber-500/20'
                  }`}
                >
                  {getInitials(selectedUser.name)}
                </div>

                {/* Member Information */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-[#1A1A2E] dark:text-white truncate">
                      {selectedUser.name}
                    </h4>
                    {selectedUser.club_id && (
                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        <IdCard className="h-2.5 w-2.5" /> {selectedUser.club_id}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {selectedUser.email}
                  </p>

                  {/* Status Badge & Reasoning */}
                  <div className="pt-1.5">
                    {selectedUser.can_invite ? (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>Eligible to join this team</span>
                      </div>
                    ) : (
                      <div className="flex items-start gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{selectedUser.reason}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !selectedUser?.can_invite}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white text-sm font-bold shadow-sm transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <UserPlus className="h-4 w-4" />
            {busy ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
