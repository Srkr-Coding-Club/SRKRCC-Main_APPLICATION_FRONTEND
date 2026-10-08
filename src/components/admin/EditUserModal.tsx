'use client';

import React, { useEffect, useState } from 'react';
import { UserCog, Sparkles, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { fetchApi } from '@/lib/api-client';
import {
  sanitizeRollNumberInput,
  validateRollNumber,
  sanitizePhoneNumberInput,
  validatePhoneNumber,
  sanitizeAffiliateIdInput,
  validateAffiliateId,
} from '@/lib/validation/auth';

interface UserRecord {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  name: string;
  email: string;
  rollNumber: string;
  branch: string;
  year: string;
  role: 'AFFILIATE' | 'NON_AFFILIATE' | 'VOLUNTEER' | 'JUDGE' | 'CLUB_LEAD' | 'ADMIN';
  membershipStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ALUMNI' | 'PENDING';
  clubId?: string | null;
  phoneNumber?: string | null;
  githubProfile?: string | null;
  linkedinProfile?: string | null;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserRecord | null;
  onSave: (userId: number, updatedFields: Record<string, any>) => Promise<void>;
  canAssignElevatedRoles?: boolean;
}

const ALL_ROLES: UserRecord['role'][] = [
  'AFFILIATE',
  'NON_AFFILIATE',
  'VOLUNTEER',
  'JUDGE',
  'CLUB_LEAD',
  'ADMIN',
];
const ELEVATED_ROLES = new Set<UserRecord['role']>(['ADMIN', 'CLUB_LEAD']);
const ALL_MEMBERSHIP_STATUSES: UserRecord['membershipStatus'][] = [
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
  'ALUMNI',
  'PENDING',
];

const COMMON_BRANCHES = [
  'CSE',
  'IT',
  'AIML',
  'AIDS',
  'CSBS',
  'CSD',
  'ECE',
  'EEE',
  'MECH',
  'CIVIL',
  'OTHER',
];

export function EditUserModal({
  isOpen,
  onClose,
  user,
  onSave,
  canAssignElevatedRoles = false,
}: EditUserModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [branch, setBranch] = useState('CSE');
  const [year, setYear] = useState('1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<UserRecord['role']>('NON_AFFILIATE');
  const [membershipStatus, setMembershipStatus] = useState<UserRecord['membershipStatus']>('ACTIVE');
  const [clubId, setClubId] = useState('');
  const [githubProfile, setGithubProfile] = useState('');
  const [linkedinProfile, setLinkedinProfile] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingClubId, setIsFetchingClubId] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      const parts = (user.name || '').trim().split(' ');
      setFirstName(user.firstName ?? (parts[0] !== user.email ? parts[0] : ''));
      setLastName(user.lastName ?? (parts.length > 1 ? parts.slice(1).join(' ') : ''));
      setRollNumber(user.rollNumber !== 'Not set' ? user.rollNumber : '');
      setBranch(user.branch || 'CSE');

      const yearMatch = (user.year || '').match(/\d+/);
      setYear(yearMatch ? yearMatch[0] : '1');

      setPhoneNumber(user.phoneNumber || '');
      setRole(user.role || 'NON_AFFILIATE');
      setMembershipStatus(user.membershipStatus || 'ACTIVE');
      setClubId(user.clubId || '');
      setGithubProfile(user.githubProfile || '');
      setLinkedinProfile(user.linkedinProfile || '');
      setErrors({});
    }
  }, [user, isOpen]);

  if (!user) return null;

  const handleFetchNextClubId = async () => {
    setIsFetchingClubId(true);
    try {
      const data = await fetchApi<{ next_club_id: string }>('/auth/club-ids/next/');
      if (data?.next_club_id) {
        setClubId(data.next_club_id.toUpperCase());
        setErrors((prev) => {
          const next = { ...prev };
          delete next.clubId;
          return next;
        });
      }
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        clubId: err?.message || 'Failed to fetch next sequential Club ID.',
      }));
    } finally {
      setIsFetchingClubId(false);
    }
  };

  const normalizeSocialUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return null;
    if (!/^https?:\/\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required.';
    }

    if (rollNumber.trim()) {
      const rollErr = validateRollNumber(rollNumber);
      if (rollErr) newErrors.rollNumber = rollErr;
    }

    if (phoneNumber.trim()) {
      const phoneErr = validatePhoneNumber(phoneNumber);
      if (phoneErr) newErrors.phoneNumber = phoneErr;
    }

    // Role invariant: AFFILIATE requires club_id
    if (role === 'AFFILIATE') {
      const sanitizedClubId = sanitizeAffiliateIdInput(clubId);
      if (!sanitizedClubId) {
        newErrors.clubId = 'Affiliate members must have a valid Club ID.';
      } else {
        const clubErr = validateAffiliateId(sanitizedClubId);
        if (clubErr) newErrors.clubId = clubErr;
      }
    } else if (clubId.trim()) {
      const clubErr = validateAffiliateId(sanitizeAffiliateIdInput(clubId));
      if (clubErr) newErrors.clubId = clubErr;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    try {
      const payload: Record<string, any> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        roll_number: rollNumber.trim() ? sanitizeRollNumberInput(rollNumber) : null,
        branch: branch.trim(),
        year: parseInt(year, 10) || 1,
        phone_number: phoneNumber.trim() ? sanitizePhoneNumberInput(phoneNumber) : null,
        role,
        membership_status: membershipStatus,
        club_id: clubId.trim() ? sanitizeAffiliateIdInput(clubId) : null,
        github_profile: normalizeSocialUrl(githubProfile),
        linkedin_profile: normalizeSocialUrl(linkedinProfile),
      };

      await onSave(user.id, payload);
      onClose();
    } catch (err: any) {
      if (err?.body && typeof err.body === 'object' && !Array.isArray(err.body)) {
        const fieldErrors: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.body)) {
          const key =
            k === 'first_name' ? 'firstName'
            : k === 'last_name' ? 'lastName'
            : k === 'roll_number' ? 'rollNumber'
            : k === 'phone_number' ? 'phoneNumber'
            : k === 'club_id' ? 'clubId'
            : k === 'github_profile' ? 'githubProfile'
            : k === 'linkedin_profile' ? 'linkedinProfile'
            : k;
          fieldErrors[key] = Array.isArray(v) ? v.join(' ') : String(v);
        }
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
          return;
        }
      }
      setErrors({ form: err?.message || 'Could not update user details. Please check the values and retry.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Member Details"
      icon={UserCog}
      busy={isSubmitting}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* User Identity Banner */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-sm text-[#1A1A2E] dark:text-white">{user.name}</span>
            <p className="font-mono text-slate-500 text-[11px] mt-0.5">{user.email}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400">User ID</span>
            <p className="font-mono font-bold text-slate-700 dark:text-slate-300">#{user.id}</p>
          </div>
        </div>

        {errors.form && (
          <div className="p-3 rounded-lg text-xs font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
            {errors.form}
          </div>
        )}

        {/* Name Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">
              First Name *
            </label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]"
            />
            {errors.firstName && <p className="text-[10px] text-rose-500 mt-1">{errors.firstName}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]"
            />
          </div>
        </div>

        {/* Academic Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">
              Roll Number
            </label>
            <input
              type="text"
              placeholder="e.g. 21B91A0501"
              autoCapitalize="characters"
              spellCheck={false}
              value={rollNumber}
              onChange={(e) => setRollNumber(sanitizeRollNumberInput(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border text-sm font-mono bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]"
            />
            {errors.rollNumber && <p className="text-[10px] text-rose-500 mt-1">{errors.rollNumber}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">
              Branch
            </label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]"
            >
              {COMMON_BRANCHES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">
              Year of Study
            </label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]"
            >
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </div>
        </div>

        {/* Roles & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">
              Platform Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRecord['role'])}
              className="w-full px-3 py-2 rounded-lg border text-sm font-bold bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]"
            >
              {ALL_ROLES
                .filter((r) => !ELEVATED_ROLES.has(r) || canAssignElevatedRoles || r === user.role)
                .map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">
              Membership Status
            </label>
            <select
              value={membershipStatus}
              onChange={(e) => setMembershipStatus(e.target.value as UserRecord['membershipStatus'])}
              className="w-full px-3 py-2 rounded-lg border text-sm font-bold bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]"
            >
              {ALL_MEMBERSHIP_STATUSES.map((statusOption) => (
                <option key={statusOption} value={statusOption}>{statusOption}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Club ID (Affiliate ID) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white">
              Affiliate ID (Club ID) {role === 'AFFILIATE' && <span className="text-[#FF7A00]">*</span>}
            </label>
            <button
              type="button"
              onClick={handleFetchNextClubId}
              disabled={isFetchingClubId || isSubmitting}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#FF7A00] hover:text-[#E06B00] disabled:opacity-50 transition"
            >
              {isFetchingClubId ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              <span>Suggest Next ID</span>
            </button>
          </div>
          <input
            type="text"
            placeholder="e.g. 25SCC001"
            autoCapitalize="characters"
            spellCheck={false}
            value={clubId}
            onChange={(e) => setClubId(sanitizeAffiliateIdInput(e.target.value))}
            className="w-full px-3 py-2 rounded-lg border text-sm font-mono bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]"
          />
          {errors.clubId && <p className="text-[10px] text-rose-500 mt-1">{errors.clubId}</p>}
        </div>

        {/* Contact & Social Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              placeholder="10 digits"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(sanitizePhoneNumberInput(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]"
            />
            {errors.phoneNumber && <p className="text-[10px] text-rose-500 mt-1">{errors.phoneNumber}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">
              GitHub Profile
            </label>
            <input
              type="url"
              placeholder="https://github.com/..."
              value={githubProfile}
              onChange={(e) => setGithubProfile(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]"
            />
            {errors.githubProfile && <p className="text-[10px] text-rose-500 mt-1">{errors.githubProfile}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">
              LinkedIn Profile
            </label>
            <input
              type="url"
              placeholder="https://linkedin.com/in/..."
              value={linkedinProfile}
              onChange={(e) => setLinkedinProfile(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]"
            />
            {errors.linkedinProfile && <p className="text-[10px] text-rose-500 mt-1">{errors.linkedinProfile}</p>}
          </div>
        </div>

        {/* Buttons */}
        <div className="pt-3 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
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
            {isSubmitting ? 'Saving Changes...' : 'Save User Details'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
