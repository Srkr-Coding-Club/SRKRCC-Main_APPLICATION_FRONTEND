'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Settings, X, Loader2 } from 'lucide-react';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { useToast } from '@/context/ToastContext';
import { fetchApi } from '@/lib/api-client';
import { ordinalYear } from '@/lib/utils';

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

  const update = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        className="bg-white dark:bg-[#151722] rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6"
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
                className="w-full px-3.5 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
              />
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
                className="w-full px-3.5 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={form.phone_number}
                onChange={(e) => update('phone_number', e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">
                Roll Number
              </label>
              <input
                type="text"
                placeholder="22B91A0501"
                value={form.roll_number}
                onChange={(e) => update('roll_number', e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
              />
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
              className="w-full px-3.5 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
            />
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
              className="w-full px-3.5 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
            />
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
