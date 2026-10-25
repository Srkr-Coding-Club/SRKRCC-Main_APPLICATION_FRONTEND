'use client';

import React, { useEffect, useRef, useState } from 'react';
import { UserPlus, X, Loader2 } from 'lucide-react';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { sanitizeAffiliateIdInput, sanitizePhoneNumberInput, sanitizeRollNumberInput } from '@/lib/validation/auth';
import {
  BRANCHES,
  YEAR_OPTIONS,
  firstErrorField,
  mapRegisterErrors,
  validateNewUser,
  type NewUserErrors,
  type NewUserField,
  type NewUserForm,
} from '@/lib/adminUserForm';
import { CollegeSelect } from '@/components/CollegeSelect';
import Portal from '@/components/ui/Portal';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Resolves when the account was created; rejects (with the API error attached) when it was not. */
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
  newUser: NewUserForm;
  setNewUser: React.Dispatch<React.SetStateAction<NewUserForm>>;
}

const INPUT = 'w-full px-3.5 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00] aria-[invalid=true]:border-rose-500';
const LABEL = 'block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1';
const FIELD_ID: Record<NewUserField, string> = {
  name: 'create-user-name', email: 'create-user-email', rollNumber: 'create-user-roll', phoneNumber: 'create-user-phone',
  college: 'create-user-college', branch: 'create-user-branch', year: 'create-user-year', role: 'create-user-role',
  clubId: 'create-user-club-id', password: 'create-user-password',
};

export function CreateUserModal({ isOpen, onClose, onSubmit, newUser, setNewUser }: CreateUserModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<NewUserErrors>({});
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
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // A form that is opened again starts without the last attempt's complaints.
  useEffect(() => { if (isOpen) setErrors({}); }, [isOpen]);

  if (!isOpen) return null;

  const update = <K extends keyof NewUserForm>(key: K, value: NewUserForm[K], field: NewUserField) => {
    setNewUser((current) => ({ ...current, [key]: value }));
    // Typing in a field takes its complaint away; a new one can only come back when the form is sent again.
    setErrors((current) => (current[field] || current.form ? { ...current, [field]: undefined, form: undefined } : current));
  };

  const focusField = (field: NewUserField) => {
    document.getElementById(FIELD_ID[field])?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const found = validateNewUser(newUser);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      const first = firstErrorField(found);
      if (first) focusField(first);
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      await onSubmit(e);
    } catch (err: any) {
      const fromServer = mapRegisterErrors(err?.body);
      const mapped = Object.keys(fromServer).length > 0 ? fromServer : { form: err?.message || 'The account could not be created. Nothing was saved.' };
      setErrors(mapped);
      const first = firstErrorField(mapped);
      if (first) focusField(first);
    } finally {
      setIsSubmitting(false);
    }
  };

  const describe = (field: NewUserField) => (errors[field] ? `${FIELD_ID[field]}-error` : undefined);
  const FieldError = ({ field }: { field: NewUserField }) => errors[field]
    ? <p id={`${FIELD_ID[field]}-error`} role="alert" className="mt-1 text-[11px] font-semibold text-rose-500">{errors[field]}</p>
    : null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-user-title"
          tabIndex={-1}
          className="glass-panel rounded-xl max-w-lg w-full my-auto p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-[#FF7A00]" />
              <h3 id="create-user-title" className="text-lg font-bold text-[#1A1A2E] dark:text-white">Create New User Account</h3>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="flex items-center justify-center min-h-9 min-w-9 p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition-transform duration-100 active:scale-90">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor={FIELD_ID.name} className={LABEL}>Full Name *</label>
              <input
                id={FIELD_ID.name} type="text" autoComplete="off" placeholder="e.g. Ramesh Reddy" value={newUser.name}
                onChange={(e) => update('name', e.target.value, 'name')}
                aria-invalid={!!errors.name} aria-describedby={describe('name')} className={INPUT}
              />
              <FieldError field="name" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor={FIELD_ID.email} className={LABEL}>Email *</label>
                <input
                  id={FIELD_ID.email} type="email" autoComplete="off" placeholder="student@srkr.ac.in" value={newUser.email}
                  onChange={(e) => update('email', e.target.value, 'email')}
                  aria-invalid={!!errors.email} aria-describedby={describe('email')} className={INPUT}
                />
                <FieldError field="email" />
              </div>
              <div>
                <label htmlFor={FIELD_ID.rollNumber} className={LABEL}>Roll Number <span className="normal-case font-medium text-slate-400">(optional)</span></label>
                <input
                  id={FIELD_ID.rollNumber} type="text" autoCapitalize="characters" spellCheck={false} placeholder="22B91A0501" value={newUser.rollNumber}
                  onChange={(e) => update('rollNumber', sanitizeRollNumberInput(e.target.value), 'rollNumber')}
                  aria-invalid={!!errors.rollNumber} aria-describedby={describe('rollNumber')} className={`${INPUT} font-mono`}
                />
                <FieldError field="rollNumber" />
              </div>
            </div>

            <div>
              <label htmlFor={FIELD_ID.phoneNumber} className={LABEL}>Phone Number <span className="normal-case font-medium text-slate-400">(optional)</span></label>
              <input
                id={FIELD_ID.phoneNumber} type="tel" inputMode="numeric" placeholder="9876543210" value={newUser.phoneNumber}
                onChange={(e) => update('phoneNumber', sanitizePhoneNumberInput(e.target.value), 'phoneNumber')}
                aria-invalid={!!errors.phoneNumber} aria-describedby={describe('phoneNumber')} className={INPUT}
              />
              <FieldError field="phoneNumber" />
            </div>

            <div>
              <label htmlFor={FIELD_ID.college} className={LABEL}>College *</label>
              <CollegeSelect
                id={FIELD_ID.college}
                value={newUser.college}
                onChange={(choice) => update('college', choice, 'college')}
                aria-invalid={!!errors.college}
                aria-describedby={describe('college')}
              />
              <FieldError field="college" />
              {!newUser.college.college && newUser.college.otherName === null && (
                <p className="mt-1 text-[11px] text-slate-400">Not chosen: the account is created under SRKR Engineering College.</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor={FIELD_ID.branch} className={LABEL}>Branch *</label>
                <select id={FIELD_ID.branch} value={newUser.branch} onChange={(e) => update('branch', e.target.value, 'branch')} aria-invalid={!!errors.branch} aria-describedby={describe('branch')} className={INPUT}>
                  {BRANCHES.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
                </select>
                <FieldError field="branch" />
              </div>
              <div>
                <label htmlFor={FIELD_ID.year} className={LABEL}>Year of Study *</label>
                <select id={FIELD_ID.year} value={newUser.year} onChange={(e) => update('year', e.target.value, 'year')} aria-invalid={!!errors.year} aria-describedby={describe('year')} className={INPUT}>
                  {YEAR_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <FieldError field="year" />
              </div>
            </div>

            <div>
              <label htmlFor={FIELD_ID.role} className={LABEL}>Platform Role *</label>
              <select
                id={FIELD_ID.role} value={newUser.role}
                onChange={(e) => update('role', e.target.value as NewUserForm['role'], 'role')}
                aria-invalid={!!errors.role} aria-describedby={describe('role')} className={INPUT}
              >
                <option value="AFFILIATE">AFFILIATE</option>
                <option value="NON_AFFILIATE">NON_AFFILIATE</option>
                <option value="VOLUNTEER">VOLUNTEER</option>
              </select>
              <FieldError field="role" />
              <p className="mt-1 text-[11px] text-slate-400">Judge, Club Lead, or Admin can be granted afterward from the Users tab.</p>
            </div>

            {newUser.role === 'AFFILIATE' && (
              <div>
                <label htmlFor={FIELD_ID.clubId} className={LABEL}>Affiliate ID (Club ID) *</label>
                <input
                  id={FIELD_ID.clubId} type="text" autoCapitalize="characters" spellCheck={false} placeholder="25SCC277" value={newUser.clubId}
                  onChange={(e) => update('clubId', sanitizeAffiliateIdInput(e.target.value), 'clubId')}
                  aria-invalid={!!errors.clubId} aria-describedby={describe('clubId')} className={`${INPUT} font-mono tracking-wide`}
                />
                <FieldError field="clubId" />
                <p className="mt-1 text-[11px] text-slate-400">Formats: 25SCC277 or 21CCA041. Required for Affiliate: this member won&apos;t be created without a valid, unclaimed Club ID.</p>
              </div>
            )}

            <div>
              <label htmlFor={FIELD_ID.password} className={LABEL}>Password *</label>
              <input
                id={FIELD_ID.password} type="password" autoComplete="new-password" placeholder="Set user account password..." value={newUser.password}
                onChange={(e) => update('password', e.target.value, 'password')}
                aria-invalid={!!errors.password} aria-describedby={describe('password')} className={INPUT}
              />
              <FieldError field="password" />
            </div>

            {errors.form && <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400">{errors.form}</p>}

            <div className="pt-4 flex justify-end space-x-3">
              <button
                type="button" onClick={onClose} disabled={isSubmitting}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-50 transition-transform duration-100 active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={isSubmitting}
                className="px-5 py-2 rounded-lg text-xs font-bold bg-[#FF7A00] hover:bg-[#E06B00] text-white shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-transform duration-100 active:scale-95"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isSubmitting ? 'Saving...' : 'Save User Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}
