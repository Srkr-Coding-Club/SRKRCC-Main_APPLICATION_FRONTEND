'use client';

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Search, UserPlus, Eye, Pencil, Check, X as XIcon } from 'lucide-react';
import { getStoredUser } from '@/lib/auth';
import { sanitizeRollNumberInput, validateRollNumber } from '@/lib/validation/auth';
import { DetailDrawer } from './DetailDrawer';

interface UserRecord {
  id: number;
  name: string;
  email: string;
  rollNumber: string;
  branch: string;
  year: string;
  role: 'AFFILIATE' | 'NON_AFFILIATE' | 'VOLUNTEER' | 'JUDGE' | 'CLUB_LEAD' | 'ADMIN';
  membershipStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ALUMNI' | 'PENDING';
  scopedAssignments?: { type: 'EVENT' | 'HACKATHON'; targetTitle: string; role: string }[];
  isActive: boolean;
  joinedDate: string;
  clubId?: string | null;
  phoneNumber?: string | null;
  githubProfile?: string | null;
  linkedinProfile?: string | null;
  registeredAt?: string | null;
  createdFrom?: string;
  referredBy?: string;
}

const ALL_ROLES: UserRecord['role'][] = ['AFFILIATE', 'NON_AFFILIATE', 'VOLUNTEER', 'JUDGE', 'CLUB_LEAD', 'ADMIN'];
const ELEVATED_ROLES = new Set<UserRecord['role']>(['ADMIN', 'CLUB_LEAD']);
const ALL_MEMBERSHIP_STATUSES: UserRecord['membershipStatus'][] = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'ALUMNI', 'PENDING'];

function DrawerField({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{label}</p>
      <p className="text-sm text-[#1A1A2E] dark:text-white mt-0.5 break-words">
        {value || <span className="italic text-slate-400">Not set</span>}
      </p>
    </div>
  );
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800 pb-1.5">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

/**
 * Roll Number is the one Academic field an admin can edit from this drawer —
 * unlike everything else here (read-only display), a member can only
 * self-set their OWN roll number ONCE (see
 * UserProfileDetailSerializer.validate_roll_number on the backend); after
 * that, only an admin can add/correct/clear it, which is what this does.
 */
function EditableRollNumberField({
  userId,
  initialValue,
  onSave,
}: {
  userId: number;
  initialValue: string;
  onSave: (userId: number, value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [savedValue, setSavedValue] = useState(initialValue);
  const [draft, setDraft] = useState(initialValue);
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const startEditing = () => {
    setDraft(savedValue);
    setError(undefined);
    setEditing(true);
  };

  const handleSave = async () => {
    const err = validateRollNumber(draft);
    if (err) {
      setError(err);
      return;
    }
    setSaving(true);
    try {
      const sanitized = sanitizeRollNumberInput(draft);
      await onSave(userId, sanitized);
      setSavedValue(sanitized);
      setEditing(false);
    } catch (err: any) {
      setError(err?.message || 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Roll Number</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-sm text-[#1A1A2E] dark:text-white break-words">
            {savedValue || <span className="italic text-slate-400">Not set</span>}
          </p>
          <button
            type="button"
            onClick={startEditing}
            aria-label="Edit roll number"
            className="text-slate-400 hover:text-[#FF7A00] transition"
          >
            <Pencil className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Roll Number</p>
      <div className="mt-1 space-y-1">
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            autoCapitalize="characters"
            spellCheck={false}
            autoFocus
            disabled={saving}
            value={draft}
            onChange={(e) => {
              setDraft(sanitizeRollNumberInput(e.target.value));
              setError(undefined);
            }}
            className="w-full px-2 py-1 rounded border text-xs font-mono bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            aria-label="Save roll number"
            className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 disabled:opacity-50 transition"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={saving}
            aria-label="Cancel"
            className="p-1 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>
        {error && <p className="text-[10px] text-rose-500">{error}</p>}
      </div>
    </div>
  );
}

function UserDrawerContent({
  user,
  onRollNumberChange,
}: {
  user: UserRecord;
  onRollNumberChange: (userId: number, value: string) => Promise<void>;
}) {
  return (
    <div className="space-y-6">
      <DrawerSection title="Identity">
        <DrawerField label="Name" value={user.name} />
        <DrawerField label="Email" value={user.email} />
        <DrawerField label="Club ID" value={user.clubId} />
      </DrawerSection>

      <DrawerSection title="Academic">
        <EditableRollNumberField
          userId={user.id}
          initialValue={user.rollNumber !== 'Not set' ? user.rollNumber : ''}
          onSave={onRollNumberChange}
        />
        <DrawerField label="Branch" value={user.branch} />
        <DrawerField label="Year" value={user.year} />
      </DrawerSection>

      <DrawerSection title="Contact">
        <DrawerField label="Phone" value={user.phoneNumber} />
        <DrawerField
          label="GitHub"
          value={
            user.githubProfile ? (
              <a href={user.githubProfile} target="_blank" rel="noreferrer" className="text-[#FF7A00] hover:underline break-all">
                {user.githubProfile}
              </a>
            ) : undefined
          }
        />
        <DrawerField
          label="LinkedIn"
          value={
            user.linkedinProfile ? (
              <a href={user.linkedinProfile} target="_blank" rel="noreferrer" className="text-[#FF7A00] hover:underline break-all">
                {user.linkedinProfile}
              </a>
            ) : undefined
          }
        />
      </DrawerSection>

      <DrawerSection title="Membership">
        <DrawerField label="Status" value={user.membershipStatus} />
        <DrawerField label="Role" value={user.role} />
        <DrawerField
          label="Registered At"
          value={user.registeredAt ? new Date(user.registeredAt).toLocaleDateString('en-IN') : undefined}
        />
        <DrawerField label="Created From" value={user.createdFrom} />
        <DrawerField label="Referred By" value={user.referredBy} />
      </DrawerSection>
    </div>
  );
}

interface UsersTabProps {
  userSearch: string;
  setUserSearch: (val: string) => void;
  filteredUsers: UserRecord[];
  onOpenCreateModal: () => void;
  onRoleChange: (userId: number, role: UserRecord['role']) => void;
  onMembershipStatusChange: (userId: number, status: UserRecord['membershipStatus']) => void;
  onRollNumberChange: (userId: number, value: string) => Promise<void>;
  isLoading?: boolean;
}

export function UsersTab({
  userSearch,
  setUserSearch,
  filteredUsers,
  onOpenCreateModal,
  onRoleChange,
  onMembershipStatusChange,
  onRollNumberChange,
  isLoading = false,
}: UsersTabProps) {
  const [viewedUser, setViewedUser] = useState<UserRecord | null>(null);
  // Only a full ADMIN may grant ADMIN/CLUB_LEAD (the backend enforces this too —
  // see UserDetailView.perform_update — this just keeps the dropdown from
  // offering an option that would fail with a confusing 403 for a CLUB_LEAD viewer).
  const canAssignElevatedRoles = getStoredUser()?.role === 'ADMIN';
  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search user by name, email, roll..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]"
          />
        </div>

        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-sm shadow-sm transition active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Create New User</span>
        </button>
      </div>

      {/* Users Directory Table */}
      <div className="glass-panel rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-[#FAFAFC] dark:bg-[#0D0E15] text-xs uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-bold">User Name</th>
                <th className="px-6 py-4 font-bold">Roll / Branch</th>
                <th className="px-6 py-4 font-bold">Platform Role</th>
                <th className="px-6 py-4 font-bold">Membership Status</th>
                <th className="px-6 py-4 font-bold">Scoped Assignments</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4 space-y-1.5">
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-36" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-48" />
                    </td>
                    <td className="px-6 py-4 space-y-1.5">
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-28" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded w-24" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded w-24" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-32" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded w-16 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4 font-medium text-[#1A1A2E] dark:text-white">
                      <div>
                        <p className="font-bold">{user.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{user.email}</p>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs font-mono">
                      {user.rollNumber === 'Not set' ? (
                        <p className="italic text-slate-400">Not set</p>
                      ) : (
                        <p className="font-bold text-[#1A1A2E] dark:text-white">{user.rollNumber}</p>
                      )}
                      <p className="text-slate-500">{user.branch} ({user.year})</p>
                    </td>

                    <td className="px-6 py-4">
                      <select
                        value={user.role}
                        onChange={(e) => onRoleChange(user.id, e.target.value as UserRecord['role'])}
                        className="px-2.5 py-1 rounded border text-xs font-bold bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]"
                      >
                        {ALL_ROLES
                          .filter((role) => !ELEVATED_ROLES.has(role) || canAssignElevatedRoles || role === user.role)
                          .map((role) => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                      </select>
                    </td>

                    <td className="px-6 py-4">
                      <select
                        value={user.membershipStatus}
                        onChange={(e) => onMembershipStatusChange(user.id, e.target.value as UserRecord['membershipStatus'])}
                        className="px-2.5 py-1 rounded border text-xs font-bold bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]"
                      >
                        {ALL_MEMBERSHIP_STATUSES.map((statusOption) => (
                          <option key={statusOption} value={statusOption}>{statusOption}</option>
                        ))}
                      </select>
                    </td>

                    <td className="px-6 py-4 text-xs">
                      {user.scopedAssignments && user.scopedAssignments.length > 0 ? (
                        <div className="space-y-1">
                          {user.scopedAssignments.map((sa, idx) => (
                            <span key={idx} className="inline-block px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-semibold text-[11px] border border-purple-200 dark:border-purple-800">
                              {sa.role} ({sa.targetTitle})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => setViewedUser(user)}
                        className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Drawer */}
      <AnimatePresence>
        {viewedUser && (
          <DetailDrawer
            isOpen={!!viewedUser}
            onClose={() => setViewedUser(null)}
            title={viewedUser.name}
          >
            {/* key forces a remount (and fresh EditableRollNumberField local
                state) when switching from one viewed user to another. */}
            <UserDrawerContent key={viewedUser.id} user={viewedUser} onRollNumberChange={onRollNumberChange} />
          </DetailDrawer>
        )}
      </AnimatePresence>
    </div>
  );
}
