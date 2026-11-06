'use client';

import React from 'react';
import { Users, GraduationCap, Building2, ShieldCheck, Mail, AlertTriangle, Check } from 'lucide-react';
import { FormRestrictions } from '@/lib/types';
import { BRANCHES } from '@/lib/adminUserForm';
import { formatYearLabel } from '@/lib/formRestrictions';

const AVAILABLE_YEARS = [1, 2, 3, 4];
const AVAILABLE_ROLES: { value: NonNullable<FormRestrictions['allowed_roles']>[number]; label: string }[] = [
  { value: 'AFFILIATE', label: 'Club Member (Affiliate)' },
  { value: 'NON_AFFILIATE', label: 'General Student' },
  { value: 'VOLUNTEER', label: 'Volunteer' },
  { value: 'CLUB_LEAD', label: 'Club Lead' },
  { value: 'ADMIN', label: 'Admin' },
];

interface FormRestrictionsSettingsProps {
  restrictions?: FormRestrictions;
  onChange: (next: FormRestrictions) => void;
}

export function FormRestrictionsSettings({
  restrictions = {},
  onChange,
}: FormRestrictionsSettingsProps) {
  const isEnabled = !!restrictions.enabled;

  const toggleMaster = (enabled: boolean) => {
    onChange({ ...restrictions, enabled });
  };

  const toggleYear = (year: number) => {
    const curr = restrictions.allowed_years || [];
    const next = curr.includes(year) ? curr.filter((y) => y !== year) : [...curr, year].sort();
    onChange({ ...restrictions, allowed_years: next.length > 0 ? next : undefined });
  };

  const toggleBranch = (branch: string) => {
    const curr = restrictions.allowed_branches || [];
    const next = curr.includes(branch) ? curr.filter((b) => b !== branch) : [...curr, branch];
    onChange({ ...restrictions, allowed_branches: next.length > 0 ? next : undefined });
  };

  const toggleRole = (role: NonNullable<FormRestrictions['allowed_roles']>[number]) => {
    const curr = restrictions.allowed_roles || [];
    const next = curr.includes(role) ? curr.filter((r) => r !== role) : [...curr, role];
    onChange({ ...restrictions, allowed_roles: next.length > 0 ? next : undefined });
  };

  const handleWhitelistChange = (raw: string) => {
    const tokens = raw
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    onChange({ ...restrictions, allowed_members: tokens.length > 0 ? tokens : undefined });
  };

  return (
    <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-orange-500/10 text-journey-accent border border-orange-500/20">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#1A1A2E] dark:text-white">
              Audience & Access Restrictions
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Filter who is allowed to fill this form based on year, club membership, branch, college, or role.
            </p>
          </div>
        </div>
        <input
          type="checkbox"
          aria-label="Enable access restrictions"
          checked={isEnabled}
          onChange={(e) => toggleMaster(e.target.checked)}
          className="w-4 h-4 accent-[#FF7A00] cursor-pointer"
        />
      </div>

      {isEnabled && (
        <div className="space-y-5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Club Members Only */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
            <div className="space-y-0.5">
              <span className="font-bold text-[#1A1A2E] dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-journey-accent" />
                Club Members Only
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Only verified students with an active Club ID or affiliate membership can submit.
              </p>
            </div>
            <input
              type="checkbox"
              checked={!!restrictions.club_members_only}
              onChange={(e) => onChange({ ...restrictions, club_members_only: e.target.checked })}
              className="w-4 h-4 accent-[#FF7A00] cursor-pointer"
            />
          </div>

          {/* Academic Year of Study */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-journey-accent" />
              Allowed Academic Years (leave unselected for all)
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_YEARS.map((year) => {
                const selected = (restrictions.allowed_years || []).includes(year);
                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => toggleYear(year)}
                    className={`px-3 py-1.5 rounded-lg border font-semibold transition-all active:scale-95 text-xs flex items-center gap-1.5 ${
                      selected
                        ? 'border-[#FF7A00] bg-journey-accent text-journey-on-accent shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101117] text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    {selected && <Check className="w-3 h-3 stroke-[3]" />}
                    {formatYearLabel(year)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Branches / Departments */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
              Allowed Branches / Departments (leave unselected for all)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {BRANCHES.map((branch) => {
                const selected = (restrictions.allowed_branches || []).includes(branch);
                return (
                  <button
                    key={branch}
                    type="button"
                    onClick={() => toggleBranch(branch)}
                    className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-all active:scale-95 ${
                      selected
                        ? 'border-[#FF7A00] bg-[#FF7A00]/10 text-journey-accent border-dashed font-bold'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101117] text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {branch}
                  </button>
                );
              })}
            </div>
          </div>

          {/* College Restriction */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
            <div className="space-y-0.5">
              <span className="font-bold text-[#1A1A2E] dark:text-white flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-journey-accent" />
                Home College (SRKR) Only
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Restricts respondents strictly to students belonging to SRKR Engineering College.
              </p>
            </div>
            <input
              type="checkbox"
              checked={!!restrictions.home_college_only}
              onChange={(e) => onChange({ ...restrictions, home_college_only: e.target.checked })}
              className="w-4 h-4 accent-[#FF7A00] cursor-pointer"
            />
          </div>

          {/* Role Restrictions */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
              Allowed Roles (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_ROLES.map(({ value, label: roleLabel }) => {
                const selected = (restrictions.allowed_roles || []).includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleRole(value)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5 ${
                      selected
                        ? 'border-[#FF7A00] bg-journey-accent text-journey-on-accent'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101117] text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    {selected && <Check className="w-3 h-3 stroke-[3]" />}
                    {roleLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Whitelist Identifiers */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="whitelist-members" className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-journey-accent" />
                Specific Members Whitelist (Emails, Roll Numbers, or Club IDs)
              </label>
              {(restrictions.allowed_members || []).length > 0 && (
                <span className="text-[10px] font-bold text-journey-accent bg-orange-500/10 px-2 py-0.5 rounded-full">
                  {restrictions.allowed_members!.length} member{restrictions.allowed_members!.length === 1 ? '' : 's'} whitelisted
                </span>
              )}
            </div>
            <textarea
              id="whitelist-members"
              rows={3}
              value={(restrictions.allowed_members || []).join('\n')}
              onChange={(e) => handleWhitelistChange(e.target.value)}
              placeholder="Paste allowed student emails, roll numbers (e.g. 21B91A0501), or Club IDs, separated by commas or newlines..."
              className="w-full px-3 py-2 rounded-xl border text-xs bg-white dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 font-mono resize-none focus:border-[#FF7A00] outline-none"
            />
            <p className="text-[10px] text-slate-400">
              Only students matching any of these emails, roll numbers, or Club IDs will be permitted to fill the form.
            </p>
          </div>

          {/* Custom Restriction Notice */}
          <div className="space-y-1.5">
            <label htmlFor="custom-restriction-msg" className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Custom Restricted Notice to Display
            </label>
            <input
              id="custom-restriction-msg"
              type="text"
              value={restrictions.custom_restriction_message || ''}
              onChange={(e) => onChange({ ...restrictions, custom_restriction_message: e.target.value })}
              placeholder="e.g. This application is open exclusively to 2nd & 3rd Year CSE Club Members."
              className="w-full px-3 py-2 rounded-xl border text-xs bg-white dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:border-[#FF7A00] outline-none"
            />
            <p className="text-[10px] text-slate-400">
              Shown to ineligible students when they view this form explaining why they cannot register.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

