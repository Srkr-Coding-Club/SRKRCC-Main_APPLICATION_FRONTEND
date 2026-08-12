'use client';

import React from 'react';
import Link from 'next/link';
import {
  BarChart3,
  PieChart,
  Users,
  UserCheck,
  Trophy,
  FileText,
} from 'lucide-react';
import { Form } from '@/lib/types';

interface DashboardTabProps {
  userCount: number;
  publishedForms: Form[];
  formSubmissions: Array<{ id: number; submitterName: string; formTitle: string; submittedAt: string }>;
}

export function DashboardTab({ userCount, publishedForms, formSubmissions }: DashboardTabProps) {
  return (
    <div className="space-y-8">
      {/* Real-time Metric Snapshot Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-[#151722] p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Users</p>
            <p className="text-3xl font-extrabold text-[#1A1A2E] dark:text-white mt-1">{userCount}</p>
          </div>
          <div className="p-3 rounded-md bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00]">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#151722] p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Engaged Members</p>
            <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">428</p>
          </div>
          <div className="p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#151722] p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Events & Hackathons</p>
            <p className="text-3xl font-extrabold text-[#8B2E3B] dark:text-rose-400 mt-1">50+</p>
          </div>
          <div className="p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 text-[#8B2E3B] dark:text-rose-400">
            <Trophy className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#151722] p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Sign-ups & Submissions</p>
            <p className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">1,240</p>
          </div>
          <div className="p-3 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
            <FileText className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Registrations Overview & Branch Breakdown Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white dark:bg-[#151722] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#1A1A2E] dark:text-white flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-[#FF7A00]" />
              <span>Registrations Overview Trend (Monthly)</span>
            </h3>
            <span className="text-xs font-mono text-emerald-500 font-bold">+38% Growth</span>
          </div>

          <div className="h-48 pt-6 flex items-end justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-2">
            {[
              { month: 'Jan', val: 40 },
              { month: 'Feb', val: 65 },
              { month: 'Mar', val: 90 },
              { month: 'Apr', val: 75 },
              { month: 'May', val: 120 },
              { month: 'Jun', val: 160 },
            ].map((bar) => (
              <div key={bar.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div
                  style={{ height: `${bar.val}%` }}
                  className="w-full max-w-[40px] rounded-t bg-gradient-to-t from-[#8B2E3B] to-[#FF7A00] opacity-90 hover:opacity-100 transition"
                ></div>
                <span className="text-xs font-bold text-slate-500">{bar.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 bg-white dark:bg-[#151722] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-[#1A1A2E] dark:text-white flex items-center space-x-2">
            <PieChart className="w-5 h-5 text-[#8B2E3B] dark:text-rose-400" />
            <span>Participant Branch Breakdown</span>
          </h3>

          <div className="space-y-3 pt-2">
            {[
              { branch: 'CSE', pct: '45%', color: 'bg-[#FF7A00]' },
              { branch: 'IT', pct: '25%', color: 'bg-[#8B2E3B]' },
              { branch: 'AI/ML & AIDS', pct: '18%', color: 'bg-purple-600' },
              { branch: 'ECE & EEE', pct: '12%', color: 'bg-amber-500' },
            ].map((item) => (
              <div key={item.branch} className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#1A1A2E] dark:text-white">{item.branch}</span>
                  <span className="text-slate-500 font-mono">{item.pct}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color}`} style={{ width: item.pct }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Streams: Recent Forms & Latest Registrations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-[#151722] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-[#1A1A2E] dark:text-white">Recent Dynamic Forms</h3>
          <div className="space-y-3">
            {publishedForms.map((pf) => (
              <div key={pf.id} className="p-3.5 rounded-lg bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#1A1A2E] dark:text-white">{pf.title}</p>
                  <p className="text-[11px] text-slate-500">Status: {pf.status} • Category: {pf.category}</p>
                </div>
                <Link href={`/forms/${pf.slug}`} className="text-xs font-bold text-[#FF7A00] hover:underline">
                  View Live →
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#151722] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-[#1A1A2E] dark:text-white">Latest Live Registrations</h3>
          <div className="space-y-3">
            {formSubmissions.map((sub) => (
              <div key={sub.id} className="p-3.5 rounded-lg bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#1A1A2E] dark:text-white">{sub.submitterName}</p>
                  <p className="text-[11px] text-slate-500">{sub.formTitle} • {sub.submittedAt}</p>
                </div>
                <span className="text-xs font-mono font-bold text-[#FF7A00]">Submitted</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
