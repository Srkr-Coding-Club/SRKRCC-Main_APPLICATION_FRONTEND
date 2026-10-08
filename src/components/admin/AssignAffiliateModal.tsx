'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Sparkles, Pencil, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { fetchApi } from '@/lib/api-client';
import { sanitizeAffiliateIdInput, validateAffiliateId } from '@/lib/validation/auth';

interface UserRecord {
  id: number;
  name: string;
  email: string;
  rollNumber: string;
  branch: string;
  year: string;
  role: 'AFFILIATE' | 'NON_AFFILIATE' | 'VOLUNTEER' | 'JUDGE' | 'CLUB_LEAD' | 'ADMIN';
  membershipStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ALUMNI' | 'PENDING';
  clubId?: string | null;
}

interface AssignAffiliateModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserRecord | null;
  onConfirm: (userId: number, clubId: string) => Promise<void>;
}

export function AssignAffiliateModal({
  isOpen,
  onClose,
  user,
  onConfirm,
}: AssignAffiliateModalProps) {
  const [entryMode, setEntryMode] = useState<'manual' | 'auto'>('manual');
  const [clubId, setClubId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingNext, setIsFetchingNext] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setClubId(user.clubId || '');
      setEntryMode(user.clubId ? 'manual' : 'manual');
      setError(null);
    }
  }, [user, isOpen]);

  if (!user) return null;

  const handleFetchNext = async () => {
    setIsFetchingNext(true);
    setError(null);
    try {
      const data = await fetchApi<{ next_club_id: string }>('/auth/club-ids/next/');
      if (data?.next_club_id) {
        setClubId(data.next_club_id.toUpperCase());
      }
    } catch (err: any) {
      setError(err?.message || 'Could not fetch the next available Club ID from server.');
    } finally {
      setIsFetchingNext(false);
    }
  };

  const handleSwitchToAuto = async () => {
    setEntryMode('auto');
    await handleFetchNext();
  };

  const handleSwitchToManual = () => {
    setEntryMode('manual');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = sanitizeAffiliateIdInput(clubId);
    const validationError = validateAffiliateId(sanitized);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(user.id, sanitized);
      onClose();
    } catch (err: any) {
      if (err?.body?.club_id) {
        setError(Array.isArray(err.body.club_id) ? err.body.club_id.join(' ') : String(err.body.club_id));
      } else {
        setError(err?.message || 'Could not assign Affiliate ID. Please verify the ID and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCurrentIdValid = !validateAffiliateId(sanitizeAffiliateIdInput(clubId));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Affiliate Role"
      icon={ShieldCheck}
      busy={isSubmitting}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* User Summary Card */}
        <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-bold text-sm text-[#1A1A2E] dark:text-white">{user.name}</p>
              <p className="text-slate-500 font-mono text-[11px]">{user.email}</p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Current: {user.role}
            </span>
          </div>
          <div className="text-slate-500 flex gap-4 text-[11px]">
            <span>
              Roll: <strong className="text-slate-700 dark:text-slate-300 font-mono">{user.rollNumber}</strong>
            </span>
            <span>
              Branch: <strong className="text-slate-700 dark:text-slate-300">{user.branch}</strong>
            </span>
          </div>
        </div>

        {/* Entry Mode Switcher Tabs */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Club ID Assignment Method
          </label>
          <div className="grid grid-cols-2 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 gap-1">
            <button
              type="button"
              onClick={handleSwitchToManual}
              disabled={isSubmitting}
              className={`py-1.5 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                entryMode === 'manual'
                  ? 'bg-white dark:bg-slate-800 text-[#FF7A00] shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Enter Manually</span>
            </button>
            <button
              type="button"
              onClick={handleSwitchToAuto}
              disabled={isSubmitting || isFetchingNext}
              className={`py-1.5 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                entryMode === 'auto'
                  ? 'bg-white dark:bg-slate-800 text-[#FF7A00] shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isFetchingNext ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>Auto-Generate</span>
            </button>
          </div>
        </div>

        {/* Club ID Input Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="affiliate-club-id" className="block text-xs font-bold uppercase tracking-wider text-[#1A1A2E] dark:text-white">
              {entryMode === 'manual' ? 'Manual Affiliate ID (Club ID)' : 'Auto-Assigned Club ID'}{' '}
              <span className="text-[#FF7A00]">*</span>
            </label>
            {entryMode === 'manual' ? (
              <button
                type="button"
                onClick={handleFetchNext}
                disabled={isFetchingNext || isSubmitting}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#FF7A00] hover:text-[#E06B00] disabled:opacity-50 transition"
              >
                {isFetchingNext ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                <span>Suggest Next ID</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFetchNext}
                disabled={isFetchingNext || isSubmitting}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#FF7A00] hover:text-[#E06B00] disabled:opacity-50 transition"
              >
                {isFetchingNext ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                <span>Refresh Next ID</span>
              </button>
            )}
          </div>

          <div className="relative">
            <input
              id="affiliate-club-id"
              type="text"
              required
              autoFocus
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="e.g. 25SCC001"
              value={clubId}
              disabled={isSubmitting}
              onChange={(e) => {
                setClubId(sanitizeAffiliateIdInput(e.target.value));
                setError(null);
              }}
              className="w-full px-3.5 py-2.5 pr-10 rounded-lg border text-sm font-mono tracking-wider bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00] transition"
            />
            {clubId && (
              <div className="absolute right-3 top-3">
                {isCurrentIdValid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                )}
              </div>
            )}
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              Format: <span className="font-mono text-slate-600 dark:text-slate-300">YY + SCC + Sequence</span> (e.g. 25SCC001)
            </span>
            {clubId && isCurrentIdValid && (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Valid Format</span>
            )}
          </div>

          {error && (
            <p className="mt-2 text-xs font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-2.5 rounded-lg">
              {error}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition active:scale-95"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-lg text-xs font-bold bg-[#FF7A00] hover:bg-[#E06B00] text-white shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition active:scale-95"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isSubmitting ? 'Updating Role...' : 'Confirm Affiliate Role'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
