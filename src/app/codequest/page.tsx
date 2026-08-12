import React from 'react';
import { fetchApi } from '@/lib/api-client';
import { Problem } from '@/lib/types';
import {
  Terminal,
  Flame,
  Award,
  CheckCircle2,
  Code2,
  Zap,
  ArrowRight,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getProblems(): Promise<Problem[]> {
  try {
    const fetched = await fetchApi<Problem[]>('/codequest/');
    if (fetched && fetched.length > 0) return fetched;
  } catch (error) {
    // Fallback to Codequest problem bank
  }

  return [
    {
      id: 101,
      title: 'Problem #142: Subarray Maximum Bitwise OR Value',
      slug: 'subarray-max-bitwise-or-value',
      difficulty: 'MEDIUM',
      statement: 'Given an integer array nums, find the maximum possible bitwise OR value of any non-empty contiguous subarray and return the number of distinct subarrays achieving this maximum.',
      scheduled_date: '2025-05-24',
      points: 100,
      solved_count: 142,
      tags: ['Bit Manipulation', 'Arrays', 'Two Pointers'],
      constraints: '1 <= nums.length <= 10^5, 0 <= nums[i] <= 10^9',
    },
    {
      id: 102,
      title: 'Problem #141: Minimum Cost Path in Weighted Grid with Obstacles',
      slug: 'min-cost-path-weighted-grid',
      difficulty: 'HARD',
      statement: 'Find the minimum path sum from top-left (0,0) to bottom-right (M-1, N-1) in a grid where cell values represent cell traversal costs, and at most K obstacles can be destroyed.',
      scheduled_date: '2025-05-23',
      points: 250,
      solved_count: 88,
      tags: ['Dynamic Programming', 'Dijkstra', 'Graph BFS'],
      constraints: '1 <= M, N <= 100, 0 <= K <= 20',
    },
    {
      id: 103,
      title: 'Problem #140: Valid Palindrome Substring Replacement',
      slug: 'valid-palindrome-substring-replacement',
      difficulty: 'EASY',
      statement: 'Given a string s containing lowercase English letters and an integer k, return true if you can transform s into a palindrome by changing at most k characters.',
      scheduled_date: '2025-05-22',
      points: 50,
      solved_count: 310,
      tags: ['Strings', 'Two Pointers'],
      constraints: '1 <= s.length <= 1000',
    },
  ];
}

export default async function CodequestPage() {
  const problems = await getProblems();

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header Hero Banner */}
        <div className="relative rounded-xl bg-gradient-to-r from-[#1A1A2E] via-[#8B2E3B] to-[#FF7A00] p-8 sm:p-12 text-white shadow-lg overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md text-xs font-bold bg-white/10 text-white border border-white/20">
              <Terminal className="w-4 h-4 text-[#FF7A00]" />
              <span>SRKR CODING CLUB CODEQUEST DAILY</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Daily Coding Streak & Leaderboard
            </h1>

            <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
              Solve daily algorithmic problem challenges published at midnight, build your continuous coding streak, and earn leaderboard XP points!
            </p>
          </div>
        </div>

        {/* Streak Stats Card */}
        <div className="bg-white dark:bg-[#151722] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00]">
              <Flame className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-400">Current Club Daily Streak</p>
              <h3 className="text-2xl font-extrabold text-[#1A1A2E] dark:text-white">Day 142 Active Streak 🔥</h3>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs font-bold text-slate-500">
            <span className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              Midnight Reset: 02h 45m 12s
            </span>
          </div>
        </div>

        {/* Problems List */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-[#1A1A2E] dark:text-white flex items-center space-x-2">
            <Code2 className="w-5 h-5 text-[#FF7A00]" />
            <span>Problem Statements Bank ({problems.length})</span>
          </h2>

          <div className="space-y-6">
            {problems.map((p) => (
              <div
                key={p.id}
                className="bg-white dark:bg-[#151722] rounded-xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`text-xs font-extrabold px-3 py-1 rounded-md border ${
                        p.difficulty === 'EASY'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          : p.difficulty === 'MEDIUM'
                          ? 'bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00] border-orange-200 dark:border-orange-800'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {p.difficulty} ({p.points || 100} XP)
                    </span>

                    <span className="text-xs text-slate-400 font-mono">Date: {p.scheduled_date}</span>
                  </div>

                  <span className="text-xs font-mono font-bold text-slate-500">
                    Solved by {p.solved_count || 0} students
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-[#1A1A2E] dark:text-white hover:text-[#FF7A00] transition">
                    {p.title}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mt-2">
                    {p.statement}
                  </p>
                </div>

                {p.constraints && (
                  <div className="p-3 rounded-lg bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-600 dark:text-slate-300">
                    <strong className="text-[#FF7A00]">Constraints:</strong> {p.constraints}
                  </div>
                )}

                {/* Footer Controls */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex flex-wrap gap-1.5">
                    {p.tags?.map((t) => (
                      <span key={t} className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                        #{t}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => alert(`Opening Codequest IDE solver for: "${p.title}"`)}
                    className="inline-flex items-center justify-center space-x-2 px-5 py-2 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-xs shadow-sm transition"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Solve in IDE</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
