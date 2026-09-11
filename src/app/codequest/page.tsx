import React from 'react';
import type { Metadata } from 'next';
import { fetchApi } from '@/lib/api-client';
import { Problem } from '@/lib/types';
import { Terminal, Flame, Code2, Info } from 'lucide-react';
import { isModuleEnabled } from '@/lib/moduleFlags';
import PageHero from '@/components/PageHero';
import SectionHeading from '@/components/SectionHeading';
import Card from '@/components/Card';
import ProblemCard from '@/components/ProblemCard';
import ModuleUnavailable from '@/components/ModuleUnavailable';
import ScrollReveal from '@/components/ScrollReveal';
import MidnightCountdown from '@/components/MidnightCountdown';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'CodeQuest Daily Problem & Streak Leaderboard',
  description:
    'Solve daily competitive programming problems, build coding streaks, and level up your data structures & algorithms problem-solving skills.',
};

async function getProblems(): Promise<{ problems: Problem[]; usingFallback: boolean }> {
  try {
    const fetched = await fetchApi<Problem[]>('/codequest/');
    if (fetched && fetched.length > 0) return { problems: fetched, usingFallback: false };
  } catch (error) {
    // Fallback to Codequest problem bank
  }

  const fallbackProblems: Problem[] = [
    {
      id: 101,
      title: 'Problem #142: Subarray Maximum Bitwise OR Value',
      slug: 'subarray-max-bitwise-or-value',
      difficulty: 'MEDIUM',
      statement:
        'Given an integer array nums, find the maximum possible bitwise OR value of any non-empty contiguous subarray and return the number of distinct subarrays achieving this maximum.',
      scheduled_date: '2025-05-24',
      points: 100,
      solved_count: 142,
      tags: ['Bit Manipulation', 'Arrays', 'Two Pointers'],
      constraints: '1 <= nums.length <= 10^5, 0 <= nums[i] <= 10^9',
      external_url: 'https://leetcode.com/problems/subarray-max-bitwise-or-value/',
      external_platform: 'LeetCode',
    },
    {
      id: 102,
      title: 'Problem #141: Minimum Cost Path in Weighted Grid with Obstacles',
      slug: 'min-cost-path-weighted-grid',
      difficulty: 'HARD',
      statement:
        'Find the minimum path sum from top-left (0,0) to bottom-right (M-1, N-1) in a grid where cell values represent cell traversal costs, and at most K obstacles can be destroyed.',
      scheduled_date: '2025-05-23',
      points: 250,
      solved_count: 88,
      tags: ['Dynamic Programming', 'Dijkstra', 'Graph BFS'],
      constraints: '1 <= M, N <= 100, 0 <= K <= 20',
      external_url: 'https://www.geeksforgeeks.org/problems/min-cost-path-weighted-grid/1',
      external_platform: 'GeeksforGeeks',
    },
    {
      id: 103,
      title: 'Problem #140: Valid Palindrome Substring Replacement',
      slug: 'valid-palindrome-substring-replacement',
      difficulty: 'EASY',
      statement:
        'Given a string s containing lowercase English letters and an integer k, return true if you can transform s into a palindrome by changing at most k characters.',
      scheduled_date: '2025-05-22',
      points: 50,
      solved_count: 310,
      tags: ['Strings', 'Two Pointers'],
      constraints: '1 <= s.length <= 1000',
      external_url: 'https://leetcode.com/problems/valid-palindrome-iii/',
      external_platform: 'LeetCode',
    },
  ];

  return { problems: fallbackProblems, usingFallback: true };
}

export default async function CodequestPage() {
  const enabled = await isModuleEnabled('codequest');
  if (!enabled) {
    return (
      <ModuleUnavailable
        moduleName="CodeQuest"
        icon={Terminal}
        description="Daily problems are paused right now. Check back once the next CodeQuest season opens."
      />
    );
  }

  const { problems, usingFallback } = await getProblems();

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <PageHero
          icon={<Terminal className="h-4 w-4 text-[#FF7A00]" />}
          eyebrow="SRKR CODING CLUB CODEQUEST DAILY"
          title="Daily Coding Streak & Leaderboard"
          description="Solve daily algorithmic problem challenges published at midnight, build your continuous coding streak, and earn leaderboard XP points!"
        />

        {usingFallback && (
          <div className="flex items-center gap-2.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            <Info className="h-4 w-4 shrink-0" />
            <span>Showing sample data — live data is temporarily unavailable.</span>
          </div>
        )}

        <ScrollReveal className="space-y-6">
          <div data-reveal>
            <Card>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00]">
                    <Flame className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">Current Club Daily Streak</p>
                    <h3 className="text-2xl font-extrabold text-[#1A1A2E] dark:text-white">
                      Day 142 Active Streak 🔥
                    </h3>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs font-bold text-slate-500">
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <MidnightCountdown />
                  </span>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <div data-reveal>
              <SectionHeading icon={Code2} title={`Problem Statements Bank (${problems.length})`} />
            </div>

            <div className="space-y-6">
              {problems.map((p) => (
                <div data-reveal key={p.id}>
                  <ProblemCard problem={p} />
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}