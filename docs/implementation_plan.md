# Implementation Plan — CodeQuest Daily Stats & Gamification System

Planning artifact required by RULE_01. Covers the paired backend
(`SRKRCC-Main_APPLICATION_BACKEND`, Django/DRF) and frontend
(`SRKRCC-Main_APPLICATION_FRONTEND`, Next.js 15) work.

## 1. Audit Summary (what exists today)

Backend (`apps/codequest`):
- `Problem` (unique `scheduled_date` = the POTD schedule), `Submission`
  (binary `is_correct`, admin-review-only verdicts), `UserStreak`
  (derived from accepted distinct `problem.scheduled_date` values via
  `rebuild_user_streak`, called inside `SubmissionViewSet.review`).
- Endpoints: `/api/codequest/`, `/submissions/`, `/submissions/{id}/review/`,
  `/streaks/`, `/batch-schedule/`. Auth: SimpleJWT + session; RBAC via
  `apps/core/permissions.py`.
- No XP/level/badge/daily-stat/heatmap models or endpoints. Profile
  "points" are computed ad-hoc in `UserProfileDetailSerializer.get_points`.

Frontend:
- `/codequest` (public POTD page), `/codequest/batch-schedule`, `/admin/codequest`,
  `/admin/codequest/stats`, `/admin/codequest/analytics`.
- `fetchApi` in `src/lib/api-client.ts` (BFF proxy + cookie auth), shared
  types in `src/lib/types.ts`, recharts 3.10 available, glassmorphism
  design system (`.glass-panel`, `#FF7A00` accent, 10px radius cap),
  `useToast()` for notifications. No calendar/heatmap components exist.

## 2. Metric Rules (source of truth)

All computed backend-side in `Asia/Kolkata` (settings.TIME_ZONE).

- **Active coding day**: ≥1 submission (any verdict) whose `created_at`
  local date == that day. Backs the general `CodingStreak`.
- **POTD completion**: ≥1 accepted (`is_correct=True`) submission for the
  problem scheduled on that date. Completion is keyed to
  `problem.scheduled_date`, never the submission date. At most once per day.
- **POTD streak**: consecutive days (≤ today) with POTD completion;
  backed by the existing derived `UserStreak`. Future/unscheduled days are
  neither completed nor missed.
- **Unique solved**: distinct problems with ≥1 accepted submission.
- **XP**: server-awarded only, recorded in an immutable `XPReward` ledger:
  solve XP once per (user, problem) at first acceptance (difficulty-based),
  plus a one-time POTD bonus per scheduled date. Difficulty changes after a
  solve do not retroactively adjust the ledger. `get_or_create` + DB unique
  constraints make awards idempotent under concurrency.
- **Level**: cumulative-XP formula in `apps/codequest/gamification.py`
  (`level_base_xp * n` XP to advance from level n→n+1); single reusable
  function used by API; frontend renders server-provided numbers only.
- **Badges**: `BadgeDefinition` rows (seeded, configurable thresholds) vs
  `UserBadge` rows (earned, unique per user+badge). Awarded only by the
  server-side `evaluate_achievements` service; progress computed from
  real user aggregates.

## 3. Component Hierarchy (frontend)

```
src/app/codequest/stats/page.tsx            (server: metadata, flag gate, compact header)
└── components/codequest/StatsDashboard.tsx  (client: date/range state, data fetch, toasts)
    ├── (key summary bar)                    (streak, POTD streak, XP + level, badges)
    ├── ActivityHeatmap.tsx                  (full-width year grid, tooltips, click→date)
    ├── StreaksPanel.tsx                     (coding + POTD streaks + milestones)
    ├── XpPanel.tsx                          (XP, level bar, history)
    ├── StatsCharts.tsx                      (recharts, dark-mode aware)
    ├── WeeklyReportPanel.tsx                (this vs. last week + weekly missions)
    ├── BadgesGrid.tsx                       (categories, progress, locked/unlocked)
    └── LeaderboardPanel.tsx                 (club top-by-XP, caller's rank)
```

`ActivityCalendar.tsx`, `DailyOverviewCards.tsx`, `DailySubmissionsTable.tsx`,
and `GoalsPanel.tsx` remain on disk but are no longer mounted.

State ownership: `StatsDashboard` owns `selectedDate`/`year`/`rangeDays`;
heatmap clicks update the selection highlight only (the per-day drill-down
section was removed). All data via `fetchApi`; loading/empty/error+retry in
each section. New shared hook `src/lib/hooks/useIsDarkMode.ts`.

## 4. API Contracts (all `IsAuthenticated`, scoped to `request.user`)

Base: `/api/codequest/stats/`

- `overview/` → streak, potd streak, xp+level, badge counts, today snapshot,
  recent unlocks (for level-up/badge toasts).
- `daily/?date=YYYY-MM-DD` → totals, accepted/rejected, unique attempted/
  solved, difficulty solved, potd status, xp earned, streak-maintained flag,
  submissions list (id, problem title/slug, time, language, verdict,
  difficulty, external_url).
- `heatmap/?year=YYYY` → days[{date, submissions, accepted, solved, xp,
  active, potd_completed}], totals, intensity levels 0–4 (by accepted count).
- `streak/`, `potd-streak/` → current/longest, active or completed totals,
  milestones, recent history.
- `xp/` → lifetime/today/week/month, breakdown by reward type, ledger page,
  level + progress.
- `badges/` → definitions grouped by category with earned/progress.
- `goals/` (GET/POST) → effective daily/weekly targets + progress. **Not surfaced
  in the dashboard** (the goals card was removed); the endpoint/model remain
  server-side for future use.
- `report/` → weekly report (current vs. previous week + missions).
- `leaderboard/` → club ranking by lifetime XP (public-safe fields + own rank).
- `analytics/?days=N|?start=&end=` → difficulty breakdown, trends
  (daily/weekly/monthly), acceptance rate, xp growth, streak/potd series,
  topic-wise, records.

Types for every payload added to `src/lib/types.ts` (contract file).

## 5. Error / Loading / Empty States

Every section: skeleton while loading, empty-state card (no data for the
date/range), error card with retry. Heatmap/calendar degrade to a legend +
message when the request fails.

## 6. Verification

- Backend: `python manage.py check`, `makemigrations --check`, targeted
  `manage.py test apps.codequest` (gamification + existing suites).
- Frontend: `pnpm exec tsc --noEmit`, `pnpm run build` (RULE_04).
- Manual contract diff between serializer payloads and `lib/types.ts`.

## 7. As-Built Status (shipped)

See the paired module docs for the authoritative feature list:
`SRKRCC-Main_APPLICATION_BACKEND/docs/modules/codequest.md` and
`docs/technical-learning-guide.md` §7/§9. Summary of what is implemented:

- **Backend**: `CodingStreak`, `XPReward`, `BadgeDefinition`, `UserBadge`,
  `CodingGoal` models; `gamification.py` (XP/level/milestones/badges/missions);
  the full read-only `/api/codequest/stats/` surface
  (`overview`, `daily`, `heatmap`, `streak`, `potd-streak`, `xp`, `badges`,
  `goals`, `report`, `leaderboard`, `analytics`); migration `0006_codinggoal`.
  Added in the admin phase: `Submission.reviewed_by`/`reviewed_at` (migration
  `0007`), audit events on problem/batch/review mutations, and the admin-gated
  `stats/admin-overview/` club-wide aggregate (`admin_stats_services.py`).
  Extended admin surface: `stats/admin-members/`, `stats/<id>/member/`,
  `stats/admin-analytics/`, `stats/admin-streaks/`, `stats/admin-gamification/`,
  per-problem `submissions_count`/`solved_count` annotations, and a CSV report
  stream `stats/admin-export/?dataset=` (`apps/codequest/exports.py`). The
  admin-only audit trail (`/api/audit/`) gained optional `action`/`action_prefix`/
  `target_model`/`target_id`/`actor`/`q`/`limit` filters so a module can scope its
  own events; CodeQuest exports are themselves audited
  (`codequest.report_exported`).
- **Frontend**: `/codequest` challenge board + monthly challenge calendar (today
  ring, star-on-solved, monthly solved-progress ring); `/codequest/stats` dashboard
  (key summary, full-width coding-activity heatmap, progress & performance with a
  30/90/180-day analytics range, weekly report & missions, achievements &
  leaderboard); `/admin/codequest` keeps only Problems (upcoming/archived filter +
  counts) and Review (pending/all queue with per-verdict confirmation and reviewer
  provenance), with a persistent right-side mini calendar as the scheduler (POTD
  dates highlighted, past/taken dates locked, hover shows the problem title). `/admin/codequest/stats` is a separate route tabbed into Overview,
  Members, Insights and Audit; `/admin/codequest/analytics` renders the club
  analytics. Unlock and streak-milestone toasts are deduped in `localStorage`.
- **Notes**: the dashboard's per-day drill-down ("Today's activity"), activity
  calendar, topic-performance and personal-records charts, and the goals card were
  removed from the UI (their endpoints remain). The frontend never recomputes
  streaks, XP, levels, badges, goals, or ranks. The member `/profile` page renders
  the read-only submission heatmap for non-privileged roles only — it is gated by
  authorization, so `ADMIN`/`CLUB_LEAD` profiles never fetch or display it, and
  the earlier profile metric cards (streak/events/projects/XP) remain removed.
