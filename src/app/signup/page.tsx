'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { User, Mail, Hash, BookOpen, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import BrainLogo from '@/components/BrainLogo';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    rollNumber: '',
    branch: 'CSE',
    year: '2nd Year',
    role: 'MEMBER',
    password: '',
    confirmPassword: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setIsLoading(true);

    // Simulate registration API response
    setTimeout(() => {
      setIsLoading(false);
      window.location.href = '/profile';
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-16 flex items-center justify-center transition-colors duration-300">
      <div className="max-w-xl w-full mx-auto px-4">
        
        {/* Signup Card */}
        <div className="bg-white dark:bg-[#151722] rounded-xl p-8 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-md space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center p-3 rounded-lg bg-[#FFE5CC] dark:bg-[#8B2E3B]/30 mb-1">
              <BrainLogo size={44} showRays={true} animated={false} />
            </div>

            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-bold bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00] border border-orange-200 dark:border-orange-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>STUDENT REGISTRATION</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A2E] dark:text-white">
              Join SRKR Coding Club
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Create your developer profile to register for flagship hackathons, workshops, and daily problem streaks.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-600 dark:text-rose-400">
                {error}
              </div>
            )}

            {/* Grid Row 1: Full Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A2E] dark:text-white">
                  Full Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A2E] dark:text-white">
                  College Email *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="student@srkr.ac.in"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]"
                  />
                </div>
              </div>
            </div>

            {/* Grid Row 2: Roll Number, Branch & Year */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A2E] dark:text-white">
                  Roll Number *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Hash className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="21B91A0501"
                    value={formData.rollNumber}
                    onChange={(e) => handleChange('rollNumber', e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A2E] dark:text-white">
                  Branch *
                </label>
                <select
                  value={formData.branch}
                  onChange={(e) => handleChange('branch', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]"
                >
                  <option value="CSE">CSE</option>
                  <option value="IT">IT</option>
                  <option value="AIML">AI & ML</option>
                  <option value="AIDS">AI & DS</option>
                  <option value="ECE">ECE</option>
                  <option value="EEE">EEE</option>
                  <option value="MECH">MECH</option>
                  <option value="CIVIL">CIVIL</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A2E] dark:text-white">
                  Year of Study *
                </label>
                <select
                  value={formData.year}
                  onChange={(e) => handleChange('year', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]"
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>
            </div>

            {/* Role Preference */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A2E] dark:text-white">
                Register As *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`p-3 rounded-lg border flex items-center justify-center space-x-2 text-xs font-bold cursor-pointer transition ${
                  formData.role === 'MEMBER'
                    ? 'bg-orange-50 dark:bg-orange-950/40 border-[#FF7A00] text-[#FF7A00]'
                    : 'bg-[#FAFAFC] dark:bg-[#0D0E15] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  <input
                    type="radio"
                    name="role"
                    value="MEMBER"
                    checked={formData.role === 'MEMBER'}
                    onChange={(e) => handleChange('role', e.target.value)}
                    className="sr-only"
                  />
                  <span>MEMBER (General)</span>
                </label>

                <label className={`p-3 rounded-lg border flex items-center justify-center space-x-2 text-xs font-bold cursor-pointer transition ${
                  formData.role === 'VOLUNTEER'
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-[#8B2E3B] text-[#8B2E3B] dark:text-rose-400'
                    : 'bg-[#FAFAFC] dark:bg-[#0D0E15] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  <input
                    type="radio"
                    name="role"
                    value="VOLUNTEER"
                    checked={formData.role === 'VOLUNTEER'}
                    onChange={(e) => handleChange('role', e.target.value)}
                    className="sr-only"
                  />
                  <span>VOLUNTEER (Events)</span>
                </label>
              </div>
            </div>

            {/* Password Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A2E] dark:text-white">
                  Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A2E] dark:text-white">
                  Confirm Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]"
                  />
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center space-x-2 py-3.5 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-sm shadow-sm transition disabled:opacity-50"
              >
                <span>{isLoading ? 'Creating Account...' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Footer Link to Login */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center text-xs text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-[#FF7A00] hover:text-[#E06B00]">
              Sign In Here
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
