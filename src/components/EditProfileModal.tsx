'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Settings, X, Loader2, AlertCircle } from 'lucide-react';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { useToast } from '@/context/ToastContext';
import { fetchApi } from '@/lib/api-client';
import { ordinalYear } from '@/lib/utils';
import {
  sanitizePhoneNumberInput,
  sanitizeRollNumberInput,
  validateFullName,
  validatePhoneNumber,
  validateRollNumber,
} from '@/lib/validation/auth';

// Kept in sync with the Branch options offered on the signup form.
const BRANCH_OPTIONS = ['CSE', 'IT', 'AIML', 'AIDS', 'ECE', 'EEE', 'MECH', 'CIVIL'];
const YEAR_OPTIONS = [1, 2, 3, 4];

interface EditableProfile {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  branch?: string;
  year?: number | string;
  github_profile?: string;
  linkedin_profile?: string;
  roll_number?: string;
}

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: EditableProfile | null;
  onSaved: (data: any) => void;
}

interface FormState {
  first_name: string;
  last_name: string;
  phone_number: string;
  branch: string;
  year: string;
  github_profile: string;
  linkedin_profile: string;
  roll_number: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-xs font-semibold text-rose-500">
      <AlertCircle className="mt-px h-3.5 w-3.5 flex-shrink-0" />
      <span>{message}</span>
    </p>
  );
}

const BASE_INPUT_CLASSES =
  'w-full px-3.5 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white';

function inputClasses(hasError: boolean): string {
  return `${BASE_INPUT_CLASSES} ${hasError ? 'border-rose-400 dark:border-rose-500' : 'border-slate-200 dark:border-slate-800'}`;
}

/** Optional field — a blank value is valid; only checks shape when filled in. */
function validateProfileUrl(value: string, label: string): string | undefined {
  if (!value.trim()) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return `${label} must start with http:// or https://.`;
    }
  } catch {
    return `Enter a valid ${label.toLowerCase()}, e.g. https://...`;
  }
  return undefined;
}

function validateForm(form: FormState, rollNumberLocked: boolean): FormErrors {
  const errors: FormErrors = {};

  if (!form.first_name.trim()) {
    errors.first_name = 'First name is required.';
  } else {
    const err = validateFullName(form.first_name);
    if (err) errors.first_name = err;
  }

  if (form.last_name.trim()) {
    const err = validateFullName(form.last_name);
    if (err) errors.last_name = err;
  }

  const phoneErr = validatePhoneNumber(form.phone_number);
  if (phoneErr) errors.phone_number = phoneErr;

  // Once set, roll_number is disabled in the UI (only an admin can change
  // it from here on — see UserProfileDetailSerializer.validate_roll_number
  // on the backend), so there's nothing to validate.
  if (!rollNumberLocked) {
    const rollErr = validateRollNumber(form.roll_number);
    if (rollErr) errors.roll_number = rollErr;
  }

  const githubErr = validateProfileUrl(form.github_profile, 'GitHub Profile URL');
  if (githubErr) errors.github_profile = githubErr;

  const linkedinErr = validateProfileUrl(form.linkedin_profile, 'LinkedIn Profile URL');
  if (linkedinErr) errors.linkedin_profile = linkedinErr;

  return errors;
}

function toFormState(profile: EditableProfile | null): FormState {
  return {
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    phone_number: profile?.phone_number || '',
    branch: profile?.branch || '',
    year: profile?.year !== undefined && profile?.year !== null ? String(profile.year) : '',
    github_profile: profile?.github_profile || '',
    linkedin_profile: profile?.linkedin_profile || '',
    roll_number: profile?.roll_number || '',
  };
}

export function EditProfileModal({ isOpen, onClose, profile, onSaved }: EditProfileModalProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(() => toFormState(profile));
  const [initialForm, setInitialForm] = useState<FormState>(() => toFormState(profile));
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen);

  // Re-seed the form from the current profile every time the modal opens,
  // so stale edits from a previous open (or a cancel) never leak back in.
  useEffect(() => {
    if (isOpen) {
      const seeded = toFormState(profile);
      setForm(seeded);
      setInitialForm(seeded);
      setErrors({});
    }
  }, [isOpen, profile]);

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

  // A member can set their own roll number once; after that, only an admin
  // (via the Users tab) can change or clear it — see
  // UserProfileDetailSerializer.validate_roll_number on the backend. Locked
  // on the ORIGINAL value, not the in-progress form state, so it can't be
  // bypassed by clearing the field client-side.
  const rollNumberLocked = Boolean(initialForm.roll_number);

  const update = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm(form, rollNumberLocked);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Only send fields that actually changed.
      const payload: Record<string, any> = {};
      (Object.keys(form) as (keyof FormState)[]).forEach((key) => {
        if (form[key] === initialForm[key]) return;
        payload[key] = key === 'year' ? (form.year ? Number(form.year) : null) : form[key];
      });

      if (Object.keys(payload).length === 0) {
        onClose();
        return;
      }

      const updated = await fetchApi<any>('/auth/me/', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      onSaved(updated);
      toast.success('Profile Updated', 'Your profile details have been saved.');
      onClose();
    } catch (err: any) {
      // Anchor field-specific server errors (e.g. "roll number already taken")
      // to their input instead of only surfacing them as one flattened toast.
      const body = err?.body;
      if (body && typeof body === 'object') {
        const fieldErrors: FormErrors = {};
        (Object.keys(form) as (keyof FormState)[]).forEach((key) => {
          const value = body[key];
          if (value) fieldErrors[key] = Array.isArray(value) ? String(value[0]) : String(value);
        });
        if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
      }
      toast.error('Update Failed', err?.message || 'Could not save your profile changes. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  // Preserve an out-of-list value (e.g. legacy data) instead of silently changing it.
  const branchOptions = form.branch && !BRANCH_OPTIONS.includes(form.branch)
    ? [form.branch, ...BRANCH_OPTIONS]
    : BRANCH_OPTIONS;
  const yearOptions = form.year && !YEAR_OPTIONS.includes(Number(form.year))
    ? [Number(form.year), ...YEAR_OPTIONS]
    : YEAR_OPTIONS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Edit Profile"
        tabIndex={-1}
        className="glass-panel rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-[#FF7A00]" />
            <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white">Edit Profile</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex items-center justify-center min-h-9 min-w-9 p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 transition-transform duration-100 active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">
                First Name
              </label>
              <input
                type="text"
                placeholder="e.g. Ramesh"
                value={form.first_name}
                onChange={(e) => update('first_name', e.target.value)}
                aria-invalid={Boolean(errors.first_name)}
                aria-describedby={errors.first_name ? 'edit-profile-first-name-error' : undefined}
                className={inputClasses(Boolean(errors.first_name))}
              />
              <FieldError id="edit-profile-first-name-error" message={errors.first_name} />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">
                Last Name
              </label>
              <input
                type="text"
                placeholder="e.g. Reddy"
                value={form.last_name}
                onChange={(e) => update('last_name', e.target.value)}
                aria-invalid={Boolean(errors.last_name)}
                aria-describedby={errors.last_name ? 'edit-profile-last-name-error' : undefined}
                className={inputClasses(Boolean(errors.last_name))}
              />
              <FieldError id="edit-profile-last-name-error" message={errors.last_name} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="e.g. 9876543210"
                value={form.phone_number}
                onChange={(e) => update('phone_number', sanitizePhoneNumberInput(e.target.value))}
                aria-invalid={Boolean(errors.phone_number)}
                aria-describedby={errors.phone_number ? 'edit-profile-phone-error' : undefined}
                className={inputClasses(Boolean(errors.phone_number))}
              />
              <FieldError id="edit-profile-phone-error" message={errors.phone_number} />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">
                Roll Number {!rollNumberLocked && <span className="normal-case font-medium text-slate-400">(optional)</span>}
              </label>
              <input
                type="text"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="22B91A0501"
                value={form.roll_number}
                onChange={(e) => update('roll_number', sanitizeRollNumberInput(e.target.value))}
                disabled={rollNumberLocked}
                aria-invalid={Boolean(errors.roll_number)}
                aria-describedby={errors.roll_number ? 'edit-profile-roll-number-error' : rollNumberLocked ? 'edit-profile-roll-number-locked' : undefined}
                className={`${inputClasses(Boolean(errors.roll_number))} font-mono tracking-wide ${rollNumberLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
              {rollNumberLocked ? (
                <p id="edit-profile-roll-number-locked" className="mt-1 text-[11px] text-slate-400">
                  Already set — contact an admin to change it.
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-400">
                  You can set this once — after saving, only an admin can change it.
                </p>
              )}
              <FieldError id="edit-profile-roll-number-error" message={errors.roll_number} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">
                Branch
              </label>
              <select
                value={form.branch}
                onChange={(e) => update('branch', e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
              >
                <option value="">Not set</option>
                {branchOptions.map((branch) => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">
                Year
              </label>
              <select
                value={form.year}
                onChange={(e) => update('year', e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
              >
                <option value="">Not set</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>{ordinalYear(year)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">
              GitHub Profile URL
            </label>
            <input
              type="url"
              placeholder="https://github.com/yourusername"
              value={form.github_profile}
              onChange={(e) => update('github_profile', e.target.value)}
              aria-invalid={Boolean(errors.github_profile)}
              aria-describedby={errors.github_profile ? 'edit-profile-github-error' : undefined}
              className={inputClasses(Boolean(errors.github_profile))}
            />
            <FieldError id="edit-profile-github-error" message={errors.github_profile} />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">
              LinkedIn Profile URL
            </label>
            <input
              type="url"
              placeholder="https://linkedin.com/in/yourusername"
              value={form.linkedin_profile}
              onChange={(e) => update('linkedin_profile', e.target.value)}
              aria-invalid={Boolean(errors.linkedin_profile)}
              aria-describedby={errors.linkedin_profile ? 'edit-profile-linkedin-error' : undefined}
              className={inputClasses(Boolean(errors.linkedin_profile))}
            />
            <FieldError id="edit-profile-linkedin-error" message={errors.linkedin_profile} />
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
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
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
