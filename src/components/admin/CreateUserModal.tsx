'use client';

import React, { useEffect, useRef, useState } from 'react';
import { UserPlus, X, Loader2 } from 'lucide-react';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { sanitizePhoneNumberInput } from '@/lib/validation/auth';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
  newUser: {
    name: string;
    email: string;
    rollNumber: string;
    branch: string;
    year: string;
    phoneNumber: string;
    role: 'AFFILIATE' | 'NON_AFFILIATE' | 'VOLUNTEER' | 'JUDGE' | 'CLUB_LEAD' | 'ADMIN';
    clubId: string;
    password: string;
  };
  setNewUser: React.Dispatch<React.SetStateAction<{
    name: string;
    email: string;
    rollNumber: string;
    branch: string;
    year: string;
    phoneNumber: string;
    role: 'AFFILIATE' | 'NON_AFFILIATE' | 'VOLUNTEER' | 'JUDGE' | 'CLUB_LEAD' | 'ADMIN';
    clubId: string;
    password: string;
  }>>;
}

export function CreateUserModal({ isOpen, onClose, onSubmit, newUser, setNewUser }: CreateUserModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    setIsSubmitting(true);
    try {
      await onSubmit(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="glass-panel rounded-xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-[#FF7A00]" />
            <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white">Create New User Account</h3>
          </div>
          <button onClick={onClose} className="flex items-center justify-center min-h-9 min-w-9 p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition-transform duration-100 active:scale-90">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Reddy"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              className="w-full px-3.5 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                placeholder="student@srkr.ac.in"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">
                Roll Number <span className="normal-case font-medium text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="22B91A0501"
                value={newUser.rollNumber}
                onChange={(e) => setNewUser({ ...newUser, rollNumber: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">
              Phone Number <span className="normal-case font-medium text-slate-400">(optional)</span>
            </label>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="9876543210"
              value={newUser.phoneNumber}
              onChange={(e) => setNewUser({ ...newUser, phoneNumber: sanitizePhoneNumberInput(e.target.value) })}
              className="w-full px-3.5 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">
                Branch *
              </label>
              <select
                value={newUser.branch}
                onChange={(e) => setNewUser({ ...newUser, branch: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
              >
                <option value="CSE">CSE</option>
                <option value="IT">IT</option>
                <option value="AIML">AIML</option>
                <option value="AIDS">AIDS</option>
                <option value="CIC">CIC</option>
                <option value="CSBS">CSBS</option>
                <option value="CSIT">CSIT</option>
                <option value="CSD">CSD</option>
                <option value="ECE">ECE</option>
                <option value="EEE">EEE</option>
                <option value="MECH">MECH</option>
                <option value="CIVIL">CIVIL</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">
                Platform Role *
              </label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                className="w-full px-3.5 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
              >
                <option value="AFFILIATE">AFFILIATE</option>
                <option value="NON_AFFILIATE">NON_AFFILIATE</option>
                <option value="VOLUNTEER">VOLUNTEER</option>
              </select>
              <p className="mt-1 text-[11px] text-slate-400">
                Judge, Club Lead, or Admin can be granted afterward from the Users tab.
              </p>
            </div>
          </div>

          {newUser.role === 'AFFILIATE' && (
            <div>
              <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">
                Affiliate ID (Club ID) *
              </label>
              <input
                type="text"
                required
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="25SCC277"
                value={newUser.clubId}
                onChange={(e) => setNewUser({ ...newUser, clubId: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 font-mono tracking-wide"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Required for Affiliate — this member won't be created without a valid, unclaimed Club ID.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">
              Password *
            </label>
            <input
              type="password"
              required
              placeholder="Set user account password..."
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="w-full px-3.5 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
            />
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-50 transition-transform duration-100 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg text-xs font-bold bg-[#FF7A00] hover:bg-[#E06B00] text-white shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-transform duration-100 active:scale-95"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isSubmitting ? 'Saving...' : 'Save User Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
