'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Award,
  CalendarRange,
  Flame,
  LayoutDashboard,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { useToast } from '@/context/ToastContext';
import { ChartSkeleton, LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import SectionHeading from '@/components/SectionHeading';
import type {
  CodeQuestAnalytics,
  CodeQuestBadgesSummary,
  CodeQuestHeatmap,
  CodeQuestLeaderboard,
  CodeQuestOverview,
  CodeQuestPotdSummary,
  CodeQuestStreakSummary,
  CodeQuestWeeklyReport,
  CodeQuestXpSummary,
} from '@/lib/types';
import PanelState from './PanelState';
import ActivityHeatmap from './ActivityHeatmap';
import BadgesGrid from './BadgesGrid';
import LeaderboardPanel from './LeaderboardPanel';
import StatsCharts from './StatsCharts';
import StreaksPanel from './StreaksPanel';
import WeeklyReportPanel from './WeeklyReportPanel';
import XpPanel from './XpPanel';

const RANGE_OPTIONS = [
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
  { label: '180 days', value: 180 },
];

const SEEN_BADGES_KEY = 'codequest_seen_badges';
const LAST_LEVEL_KEY = 'codequest_last_level';
const SEEN_STREAK_MILESTONES_KEY = 'codequest_seen_streak_milestones';

function toIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function todayIso(): string {
  return toIso(new Date());
}

export default function StatsDashboard() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [year, setYear] = useState(new Date().getFullYear());
  const [rangeDays, setRangeDays] = useState(90);

  const [overview, setOverview] = useState<CodeQuestOverview | null>(null);
  const [streak, setStreak] = useState<CodeQuestStreakSummary | null>(null);
  const [potd, setPotd] = useState<CodeQuestPotdSummary | null>(null);
  const [xp, setXp] = useState<CodeQuestXpSummary | null>(null);
  const [badges, setBadges] = useState<CodeQuestBadgesSummary | null>(null);
  const [heatmap, setHeatmap] = useState<CodeQuestHeatmap | null>(null);
  const [analytics, setAnalytics] = useState<CodeQuestAnalytics | null>(null);
  const [report, setReport] = useState<CodeQuestWeeklyReport | null>(null);
  const [leaderboard, setLeaderboard] = useState<CodeQuestLeaderboard | null>(null);

  const [coreLoading, setCoreLoading] = useState(true);
  const [coreError, setCoreError] = useState(false);
  const [heatLoading, setHeatLoading] = useState(true);
  const [heatError, setHeatError] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsError, setInsightsError] = useState(false);

  const notifiedRef = useRef(false);

  const loadCore = useCallback(async () => {
    setCoreLoading(true);
    setCoreError(false);
    try {
      const [ov, st, po, xpData, badgeData] = await Promise.all([
        fetchApi<CodeQuestOverview>('/codequest/stats/overview/'),
        fetchApi<CodeQuestStreakSummary>('/codequest/stats/streak/'),
        fetchApi<CodeQuestPotdSummary>('/codequest/stats/potd-streak/'),
        fetchApi<CodeQuestXpSummary>('/codequest/stats/xp/'),
        fetchApi<CodeQuestBadgesSummary>('/codequest/stats/badges/'),
      ]);
      setOverview(ov);
      setStreak(st);
      setPotd(po);
      setXp(xpData);
      setBadges(badgeData);
    } catch {
      setCoreError(true);
    } finally {
      setCoreLoading(false);
    }
  }, []);

  const loadHeatmap = useCallback(async (targetYear: number) => {
    setHeatLoading(true);
    setHeatError(false);
    try {
      setHeatmap(await fetchApi<CodeQuestHeatmap>(`/codequest/stats/heatmap/?year=${targetYear}`));
    } catch {
      setHeatError(true);
    } finally {
      setHeatLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(async (days: number) => {
    setAnalyticsLoading(true);
    setAnalyticsError(false);
    const end = todayIso();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    const start = toIso(startDate);
    try {
      setAnalytics(await fetchApi<CodeQuestAnalytics>(`/codequest/stats/analytics/?start=${start}&end=${end}`));
    } catch {
      setAnalyticsError(true);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const loadInsights = useCallback(async () => {
    setInsightsLoading(true);
    setInsightsError(false);
    try {
      const [reportData, boardData] = await Promise.all([
        fetchApi<CodeQuestWeeklyReport>('/codequest/stats/report/'),
        fetchApi<CodeQuestLeaderboard>('/codequest/stats/leaderboard/'),
      ]);
      setReport(reportData);
      setLeaderboard(boardData);
    } catch {
      setInsightsError(true);
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCore();
  }, [loadCore]);

  useEffect(() => {
    void loadHeatmap(year);
  }, [year, loadHeatmap]);

  useEffect(() => {
    void loadAnalytics(rangeDays);
  }, [rangeDays, loadAnalytics]);

  useEffect(() => {
    void loadInsights();
  }, [loadInsights]);

  // Unlock notifications are driven by server data (overview.recent_unlocks and
  // the XP level), never by frontend milestones. Deduped via localStorage so a
  // refresh doesn't re-toast the same unlock.
  useEffect(() => {
    if (!overview || notifiedRef.current) return;
    notifiedRef.current = true;

    try {
      const storedLevel = window.localStorage.getItem(LAST_LEVEL_KEY);
      if (storedLevel && Number(storedLevel) < overview.xp.level.level) {
        toast.success(`Level up!`, `You reached level ${overview.xp.level.level}.`);
      }
      window.localStorage.setItem(LAST_LEVEL_KEY, String(overview.xp.level.level));

      const seen: string[] = JSON.parse(window.localStorage.getItem(SEEN_BADGES_KEY) ?? '[]');
      const seenSet = new Set(seen);
      for (const unlock of overview.recent_unlocks) {
        if (!seenSet.has(unlock.code)) {
          toast.success(`Badge unlocked: ${unlock.name}`, unlock.description);
          seenSet.add(unlock.code);
        }
      }
      window.localStorage.setItem(SEEN_BADGES_KEY, JSON.stringify(Array.from(seenSet)));
    } catch {
      // localStorage can be unavailable in privacy mode; notifications are non-critical.
    }
  }, [overview, toast]);

  // Celebrate newly achieved streak milestones (server-provided, so the
  // frontend never has to know the milestone thresholds). Deduped locally.
  useEffect(() => {
    if (!streak) return;
    try {
      const seen: number[] = JSON.parse(
        window.localStorage.getItem(SEEN_STREAK_MILESTONES_KEY) ?? '[]'
      );
      const seenSet = new Set(seen);
      for (const milestone of streak.milestones) {
        if (milestone.achieved && !seenSet.has(milestone.target)) {
          toast.success('Streak milestone!', `You reached a ${milestone.target}-day coding streak.`);
          seenSet.add(milestone.target);
        }
      }
      window.localStorage.setItem(SEEN_STREAK_MILESTONES_KEY, JSON.stringify(Array.from(seenSet)));
    } catch {
      // Non-critical; ignore storage failures.
    }
  }, [streak, toast]);

  const quickStats = useMemo(() => {
    if (!overview) return null;
    return [
      {
        icon: Flame,
        label: 'Coding streak',
        value: `${overview.streak.current}d`,
        sub: `Longest ${overview.streak.longest}d`,
        accent: 'text-[#FF7A00]',
      },
      {
        icon: Target,
        label: 'POTD streak',
        value: `${overview.potd_streak.current}d`,
        sub: `${overview.potd_streak.total_completed} completed`,
        accent: 'text-[#8B2E3B] dark:text-[#FFA500]',
      },
      {
        icon: Zap,
        label: 'Lifetime XP',
        value: overview.xp.lifetime,
        sub: `Level ${overview.xp.level.level}`,
        accent: 'text-[#FFA500]',
      },
      {
        icon: Award,
        label: 'Badges',
        value: `${overview.badges.earned}/${overview.badges.total}`,
        sub: 'Earned',
        accent: 'text-emerald-500',
      },
    ];
  }, [overview]);

  return (
    <div className="space-y-8">
      {/* Section B — Key performance summary */}
      {coreLoading ? (
        <LoadingSkeleton rows={1} />
      ) : coreError ? (
        <PanelState
          icon={LayoutDashboard}
          title="Could not load your stats"
          description="Something went wrong while fetching your CodeQuest statistics."
          tone="error"
          onRetry={loadCore}
        />
      ) : (
        quickStats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {quickStats.map((stat) => (
              <div key={stat.label} className="glass-panel rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{stat.label}</span>
                  <stat.icon className={`h-4 w-4 ${stat.accent}`} />
                </div>
                <div className="mt-2 text-2xl font-extrabold text-[#1A1A2E] dark:text-white">{stat.value}</div>
                <div className="mt-0.5 text-[11px] font-semibold text-slate-400">{stat.sub}</div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Section C — Coding activity */}
      <section className="space-y-4">
        <SectionHeading
          icon={Activity}
          title="Coding activity"
          description="Your accepted submissions across the year. Select a year to explore your history."
        />
        {heatLoading ? (
          <ChartSkeleton />
        ) : heatError || !heatmap ? (
          <PanelState
            icon={Activity}
            title="Heatmap unavailable"
            description="We could not load your activity heatmap."
            tone="error"
            onRetry={() => loadHeatmap(year)}
          />
        ) : (
          <ActivityHeatmap
            data={heatmap}
            year={year}
            onYearChange={setYear}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        )}
      </section>

      {/* Section E — Progress & performance */}
      <section className="space-y-4">
        <SectionHeading
          icon={TrendingUp}
          title="Progress & performance"
          description="Streaks, XP progression and solving trends."
        />

        {coreLoading ? (
          <LoadingSkeleton rows={3} />
        ) : coreError || !streak || !potd ? (
          <PanelState icon={Flame} title="Streak data unavailable" description="We could not load your streak history." tone="error" onRetry={loadCore} />
        ) : (
          <StreaksPanel streak={streak} potd={potd} />
        )}

        {coreLoading ? (
          <LoadingSkeleton rows={3} />
        ) : coreError || !xp ? (
          <PanelState icon={Zap} title="XP data unavailable" description="We could not load your XP ledger." tone="error" onRetry={loadCore} />
        ) : (
          <XpPanel xp={xp} />
        )}

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold text-[#1A1A2E] dark:text-white">Analytics</h3>
            <div className="flex items-center gap-1.5">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRangeDays(option.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    rangeDays === option.value
                      ? 'bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-[#FFA500] text-white'
                      : 'border border-slate-200 text-slate-500 hover:border-[#FF7A00] hover:text-[#FF7A00] dark:border-slate-700 dark:text-slate-400'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          {analyticsLoading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
          ) : analyticsError || !analytics ? (
            <PanelState icon={Activity} title="Analytics unavailable" description="We could not load your analytics for this range." tone="error" onRetry={() => loadAnalytics(rangeDays)} />
          ) : (
            <StatsCharts analytics={analytics} />
          )}
        </div>
      </section>

      {/* Section F — Weekly report & missions */}
      <section className="space-y-4">
        <SectionHeading
          icon={CalendarRange}
          title="Weekly report & missions"
          description="This week compared with last week, plus your active missions."
        />
        {insightsLoading ? (
          <LoadingSkeleton rows={4} />
        ) : insightsError || !report ? (
          <PanelState
            icon={Target}
            title="Weekly report unavailable"
            description="We could not load your weekly progress."
            tone="error"
            onRetry={loadInsights}
          />
        ) : (
          <WeeklyReportPanel report={report} />
        )}
      </section>

      {/* Section G — Achievements & leaderboard */}
      <section className="space-y-4">
        <SectionHeading
          icon={Trophy}
          title="Achievements & leaderboard"
          description="Badges you have unlocked and how you rank across the club."
        />
        <div className="space-y-4">
          {coreLoading ? (
            <LoadingSkeleton rows={4} />
          ) : coreError || !badges ? (
            <PanelState icon={Award} title="Badges unavailable" description="We could not load your achievements." tone="error" onRetry={loadCore} />
          ) : (
            <BadgesGrid data={badges} />
          )}

          {insightsLoading ? (
            <LoadingSkeleton rows={4} />
          ) : insightsError || !leaderboard ? (
            <PanelState icon={Trophy} title="Leaderboard unavailable" description="We could not load the club leaderboard." tone="error" onRetry={loadInsights} />
          ) : (
            <LeaderboardPanel data={leaderboard} />
          )}
        </div>
      </section>
    </div>
  );
}
