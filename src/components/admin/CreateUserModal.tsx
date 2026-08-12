'use client';

import React from 'react';
import { UserPlus, X } from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  newUser: {
    name: string;
    email: string;
    rollNumber: string;
    branch: string;
    year: string;
    role: 'MEMBER' | 'CONTRIBUTOR' | 'VOLUNTEER' | 'JUDGE' | 'CLUB_LEAD' | 'ADMIN';
    password: string;
  };
  setNewUser: React.Dispatch<React.SetStateAction<{
    name: string;
    email: string;
    rollNumber: string;
    branch: string;
    year: string;
    role: 'MEMBER' | 'CONTRIBUTOR' | 'VOLUNTEER' | 'JUDGE' | 'CLUB_LEAD' | 'ADMIN';
    password: string;
  }>>;
}

export function CreateUserModal({ isOpen, onClose, onSubmit, newUser, setNewUser }: CreateUserModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#151722] rounded-xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-[#FF7A00]" />
            <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white">Create New User Account</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
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
                Roll Number *
              </label>
              <input
                type="text"
                required
                placeholder="22B91A0501"
                value={newUser.rollNumber}
                onChange={(e) => setNewUser({ ...newUser, rollNumber: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
              />
            </div>
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
                <option value="ECE">ECE</option>
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
                <option value="MEMBER">MEMBER</option>
                <option value="CONTRIBUTOR">CONTRIBUTOR</option>
                <option value="VOLUNTEER">VOLUNTEER</option>
                <option value="JUDGE">JUDGE</option>
                <option value="CLUB_LEAD">CLUB_LEAD</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
          </div>

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
              className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-xs font-bold bg-[#FF7A00] hover:bg-[#E06B00] text-white shadow-sm"
            >
              Save User Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
