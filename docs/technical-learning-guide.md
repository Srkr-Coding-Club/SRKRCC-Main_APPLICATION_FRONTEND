# Under the Hood: Frontend Technical Learning Guide

This guide explains **how Next.js 15 App Router, React Server Components (RSC), Client Components, HttpOnly Cookie Security, Edge Middleware, and Tailwind CSS glassmorphism work under the hood** in the SRKR Coding Club Frontend.

---

## 1. How Next.js 15 App Router Works Under the Hood

The App Router (`src/app`) uses a file-system based routing mechanism powered by React Server Components:

```
src/app/
├── layout.tsx              <-- Persistent Root Shell (Navbar + Footer + Global Theme)
├── loading.tsx             <-- Root Suspense & Route Transition Loader
├── not-found.tsx           <-- Custom 404 Not Found Page
├── forbidden.tsx / 403/    <-- Custom 403 Access Restriction Gate
├── error.tsx               <-- Global Error Boundary
├── page.tsx                <-- Home Page Dashboard (Server Component)
├── events/                 <-- Workshops & Hackathons Event Hub
├── hackathons/             <-- 48-Hour Build Sprint Hub
├── iconcoders/             <-- Premier Championship Arena
├── codequest/              <-- Daily Algorithmic Problem Solving Streak
│   ├── page.tsx            <-- Today's POTD + monthly challenge calendar
│   ├── stats/              <-- Member stats & gamification dashboard
│   └── batch-schedule/     <-- Admin/Club Lead batch problem scheduling
├── profile/                <-- Real Database-Driven Member Profile
├── forms/
│   ├── page.tsx            <-- Live Forms Center Directory
│   └── [slug]/page.tsx     <-- Dynamic Form Submission Engine
└── admin/                  <-- Admin Control Room (Subtab Routed)
    ├── loading.tsx         <-- Admin Transition Loader
    ├── codequest/          <-- Problems + Review + scheduling mini-calendar
    │   ├── stats/          <-- Club Overview / Members / Insights / Audit
    │   └── analytics/      <-- Club-wide analytics
    ├── forms/page.tsx      <-- Forms Registry & Lifecycle Management
    ├── builder/page.tsx    <-- Dynamic Form Builder Canvas
    ├── users/page.tsx      <-- User Accounts & RBAC Management
    ├── flags/page.tsx      <-- Feature Flag Controls
    ├── audit-logs/page.tsx <-- Security & Mutation Trail Logs
    ├── data-health/page.tsx<-- Platform Data Integrity & Warnings
    └── csv-ingestion/page.tsx <-- Bulk Responses CSV Importer
```

### Server Components vs. Client Components Execution Flow

1. **React Server Components (RSC)**:
   - Pages without `'use client'` run **exclusively on the server**.
   - They query the backend (`http://localhost:8000/api`) during server-side rendering.
   - Zero JavaScript bundle weight for fetching logic is sent to the browser, maximizing initial page load speed and SEO performance.
2. **Client Components (`'use client'`)**:
   - Components requiring interactive state (`useState`, `useEffect`, event listeners) are marked with `'use client'`.
   - Next.js pre-renders HTML on the server and hydrates interactive event listeners in the browser.

---

## 2. HttpOnly Cookie Authentication & Edge Middleware Under the Hood

### Backend-For-Frontend (BFF) Route Handlers
Raw JWT tokens are never stored in browser `localStorage`. Instead, Next.js API route handlers act as a security proxy:
- **`POST /api/auth/login`**: Receives user credentials, calls Django's `/api/auth/token/`, and sets `HttpOnly` session cookies (`srkrcc_access_token` and `srkrcc_refresh_token`).
- **`POST /api/auth/refresh`**: Reads the `HttpOnly` refresh cookie server-side, requests renewed tokens from Django, and updates the access cookie.
- **`POST /api/auth/logout`**: Expire and clear session cookies.
- **`GET /api/auth/me`**: Reads the access cookie server-side and forwards it in the `Authorization: Bearer` header to Django.

### Next.js Edge Middleware ([src/middleware.ts](file:///c:/Users/chall/OneDrive/Desktop/SRKRCC-Main_APPLICATION_FRONTEND/src/middleware.ts))
Runs at the network edge before requests reach the App Router:
1. Intercepts all `/admin/*` paths.
2. Reads `request.cookies.get('srkrcc_access_token')`.
3. If unauthenticated $\rightarrow$ Redirects to `/login?next=${pathname}`.
4. If role is not `ADMIN` or `CLUB_LEAD` $\rightarrow$ Redirects to `/profile?error=admin_access_required`.

---

## 3. Dynamic Data Fetching & Revalidation Under the Hood

* **`export const dynamic = 'force-dynamic'`**:
  - Instructs Next.js that the route relies on live backend data (`http://localhost:8000/api`), preventing build-time static prerendering failures when the database updates dynamically.
* **`fetchApi` Helper (`src/lib/api-client.ts`)**:
  - Sets `credentials: 'include'` so `HttpOnly` cookies are automatically sent with requests.
  - Implements connection timeouts with `AbortController` and graceful offline fallbacks.

---

## 4. HTTP Security Headers Under the Hood

Configured in [next.config.ts](file:///c:/Users/chall/OneDrive/Desktop/SRKRCC-Main_APPLICATION_FRONTEND/next.config.ts):
- **`X-Frame-Options: SAMEORIGIN`**: Prevents clickjacking by blocking iframe embedding on untrusted domains.
- **`X-Content-Type-Options: nosniff`**: Prevents browser MIME-type sniffing.
- **`Referrer-Policy: strict-origin-when-cross-origin`**: Controls referrer leakage across origins.
- **`Permissions-Policy: camera=(self), microphone=(), geolocation=()`**: Allows camera access on the same origin (for QR scanning features) while restricting unnecessary device APIs.

---

## 5. UI Design System & Tailwind CSS Glassmorphism

The application adheres to a dark-mode glassmorphism theme using CSS variables and Tailwind utilities:
- **`glass-panel`**: `bg-[#151722]/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800`
- **`gradient-text`**: `bg-gradient-to-r from-[#FF7A00] via-[#FF9E00] to-[#8B2E3B] bg-clip-text text-transparent`
- **Accent Primary**: `#FF7A00` (SRKRCC Vibrant Orange)
- **Accent Maroon**: `#8B2E3B` (SRKR Institutional Maroon)
- **Background Dark**: `#0D0E15` (Deep Slate)

---

## 6. Student Profile Auto-Matching & Prefill Engine

When students open registration forms, the application automatically matches and pre-fills their verified credentials:

1. **Activation Heuristic**:
   - Auto-filling activates only when `form.enable_prefill !== false && !form.allow_multiple_responses` (single submission limit).
2. **Field Matching Engine (`matchUserDetailToField`)**:
   - Inspects `field.label`, `field.placeholder`, and `field.type` to map student details:
     - **Full Name**: `user.first_name` + `user.last_name` / `user.username`.
     - **Email Address**: `user.email`.
     - **Phone Number**: `user.phone_number` / `user.phone`.
     - **Roll / Registration Number**: `user.roll_number`.
     - **Branch & Department**: Matches option tokens (e.g. `CSE`, `ECE`, `IT`, `CSD`, `AIDS`) with `user.branch`.
     - **Year of Study**: Matches ordinal and numeric tokens (`1st / 1`, `2nd / 2`, `3rd / 3`, `4th / 4`) with `user.year`.
     - **Portfolio Links**: Maps GitHub and LinkedIn profile URLs.
3. **Session Freshness**:
   - The form page calls `/api/auth/me` on mount to fetch the latest student profile from PostgreSQL, merging it into `localStorage` and form state.

---

## 7. CodeQuest Admin Workspace

`/admin/codequest` follows the standard admin-route pattern: it is a thin route wrapper around
`components/admin/CodeQuestTab.tsx`, which now owns only the **Problems** and **Review** sections.
A persistent `components/admin/CodeQuestMiniCalendar.tsx` is pinned to the right of the page (sticky
on desktop, stacked on top on mobile) and is the primary scheduler: days that already hold a POTD are
highlighted and open that problem for editing (hovering shows only the problem title, never the
difficulty), empty future days start a new problem, and past days are locked — so a challenge can
never be scheduled in the past or double-booked onto a taken date. The header's actions are a gradient **Schedule problem**
primary button, an outlined **Batch Schedule** secondary action and a **Stats** link, and the
schedule editor marks its compulsory fields (title, schedule date, problem statement) with an
asterisk. The **Problems** section adds an upcoming/archived/all lifecycle filter plus per-problem
submission and solved counts (`submissions_count`/`solved_count`, annotated by the backend). The
submission **Review** queue has a pending/all filter with counts, confirms each verdict before
sending, and shows reviewer identity plus the review timestamp per submission; a null `reviewed_at`
(surfaced as `is_reviewed`) is what distinguishes "pending" from a recorded rejection.

The club-wide surfaces moved to a separate `force-dynamic` route, `/admin/codequest/stats`
(`src/app/admin/codequest/stats/page.tsx` → `components/admin/CodeQuestStats.tsx`), tabbed into
**Overview**, **Members**, **Insights** and **Audit** behind the shared admin layout guard.
**Overview** renders `CodeQuestOverview` (`components/admin/CodeQuestOverview.tsx`) from
`GET /api/codequest/stats/admin-overview/?days=30` — real aggregates across all members
(participants, pending/accepted submissions, acceptance rate, XP awarded, POTD completions, active
streaks), per-day submission/active-member trends, difficulty and level distributions, and
recent-submission/pending feeds rendered with `recharts`. **Members** (`CodeQuestMembers`) reads
`GET /api/codequest/stats/admin-members/` with search + sort and opens each member's detail via
`GET /api/codequest/stats/<id>/member/?days=90` (their `overview` + 90-day `analytics`). **Insights**
links out to the dedicated `/admin/codequest/analytics` page and stacks `CodeQuestMonitoring` and
`CodeQuestGamification` from the `admin-streaks` and `admin-gamification` endpoints — streak/POTD
monitoring and the read-only badge catalogue plus scoring config. **Audit** (`CodeQuestAudit`)
exposes CSV reports and the CodeQuest audit trail: the report strip downloads server-built CSVs from
`GET /api/codequest/stats/admin-export/?dataset=` (members/submissions/problems/analytics) as blob
attachments via `lib/codequest-export.ts` (filename read from `Content-Disposition`), and the trail
below lists recent events from `GET /api/audit/?action_prefix=codequest.&limit=100` with an action
filter. All of these endpoints are admin-gated (`IsAdminOrClubLead`) and every panel renders
server-computed values verbatim — the frontend never computes XP, streaks, badges or ranks. Club
analytics itself lives on its own route, `/admin/codequest/analytics`, which renders
`CodeQuestAnalytics`.
`/codequest/batch-schedule` is a force-dynamic route with a server metadata wrapper and a
client-side batch editor. Admins and Club Leads can schedule up to five complete problems in
one request, each with its own date. The backend keeps future problems out of public list and
detail responses until their scheduled local date; the batch form uses the protected backend
endpoint and reports date conflicts before any rows are created.
The public `/codequest` page owns the daily member experience and receives today's problem plus
previously published challenges, never future scheduled problems. It renders through
`components/codequest/CodeQuestChallengeBoard.tsx`, which highlights today's POTD (`ProblemCard`
with the `highlight` prop — external judge link, countdown timer, and topic tags) beside
`PotdCalendar.tsx` (today ring, a gold star on solved days, future days locked, month navigation
capped at the current month, and a monthly solved-progress ring). Solved days are fetched per-user
from the stats heatmap endpoint and degrade to no stars for anonymous callers. Previous challenges
render as compact `ProblemCard`s (title, date, external link) in a responsive grid below.
`ProblemCard` links out to the external judge and only shows a "Solved by" count when it is greater
than zero. The browser never calculates or writes a member streak.

---

## 8. Server Component (RSC) vs Client Component Rendering Rules

1. **No Event Handlers in Server Components**:
   - Server Components (`src/app/forms/page.tsx`, `src/app/events/page.tsx`, etc.) run during SSR without a browser JS runtime.
   - JSX elements in Server Components MUST NOT pass function props (e.g., `onError`, `onClick`, `onChange`).
2. **Safe Image URL Handling**:
   - Cover images support both external URLs (`https://...`) and Base64-encoded Data URLs (`data:image/...`).
   - Image URLs are sanitized to avoid duplicate protocol prefixes (`https://data:` $\rightarrow$ `data:`).

---

## 9. CodeQuest Stats & Gamification Dashboard

`/codequest/stats` is the member-facing analytics surface for CodeQuest. The
route itself (`src/app/codequest/stats/page.tsx`) is a `force-dynamic` Server
Component that only gates the module flag and renders chrome; all interactive
work lives in the client component tree under `src/components/codequest/`.

### Component hierarchy & state ownership

```
src/app/codequest/stats/page.tsx            (Server: metadata, module flag gate, compact header)
└── components/codequest/StatsDashboard.tsx  (Client: owns selectedDate/year/range, fetches, toasts)
    ├── (key summary bar)                    (Coding streak, POTD streak, lifetime XP + level, badges)
    ├── ActivityHeatmap.tsx                  (Full-width GitHub-style year grid; tooltip; click → date)
    ├── StreaksPanel.tsx                     (Coding streak + POTD streak + milestones)
    ├── XpPanel.tsx                          (XP totals, level bar, breakdown, recent ledger)
    ├── StatsCharts.tsx                      (recharts: daily/weekly trends, difficulty bar, XP growth, POTD trend, acceptance)
    ├── WeeklyReportPanel.tsx                (This vs. last week, per-day bars, weekly missions)
    ├── BadgesGrid.tsx                       (Categories, progress, locked/unlocked)
    ├── LeaderboardPanel.tsx                 (Club top-by-XP, safe fields, caller's own rank)
    ├── heatmapColors.ts                     (shared intensity colour scale)
    └── PanelState.tsx                       (shared empty/error + retry treatment)
```

`ActivityCalendar.tsx`, `DailyOverviewCards.tsx`, `DailySubmissionsTable.tsx`,
and `GoalsPanel.tsx` remain on disk but are no longer mounted.

`StatsDashboard` is the single owner of `selectedDate`, `year`, and `rangeDays`.
The heatmap's `onSelectDate` only updates the local selection highlight (the
per-day drill-down section was removed), so no section duplicates API calls or
calculation logic. The dashboard renders in labelled sections: key summary →
coding activity (full-width heatmap) → progress & performance (streaks, XP,
analytics with a 30/90/180-day range filter) → weekly report & missions →
achievements & leaderboard.

### Data flow

Every panel reads real data from the backend stats endpoints through the shared
`fetchApi` helper (BFF proxy + HttpOnly cookie auth) and has independent
loading, empty, and error-with-retry states. The frontend performs **no**
streak, XP, level, or badge calculation — it renders server-provided numbers.
Heatmap intensity is defined server-side on accepted unique problems per day,
while the hover tooltip shows the full submission/solved/XP breakdown.

Unlock notifications (level-up, new badges, and newly achieved streak
milestones) are driven by server data (`overview.recent_unlocks`, the current
level, and `streak.milestones`), deduped in `localStorage`, so a page refresh
never re-toasts the same unlock.

### Weekly report, leaderboard & goals

`StatsDashboard` loads `stats/report/` and `stats/leaderboard/` together in one
`Promise.all` (independent loading/error/retry from the core panels). Weekly
missions and the leaderboard are derived server-side — the frontend never
computes targets, ranks, or missions. The goals card was removed from the
dashboard, so the surface is entirely read-only; the `stats/goals/` endpoint and
`CodingGoal` model remain server-side for future use.

### Profile page

The member `/profile` page renders the read-only CodeQuest submission heatmap
(`ActivityHeatmap`, deep-linking to `/codequest/stats`) so members can see their
coding activity at a glance; the streak/events/projects/XP metric cards remain
removed. The heatmap is gated by authorization — it is only fetched and rendered
for non-privileged roles, so `ADMIN` / `CLUB_LEAD` profiles never show it (they
use the dedicated admin CodeQuest analytics surfaces). The full CodeQuest stats
surface lives under `/codequest/stats`.

### Charts under the hood

`StatsCharts` uses the already-present `recharts` dependency and the shared
`useIsDarkMode` hook (a `MutationObserver` on the `<html>` `dark` class) to
theme axes, grids, and tooltips. Charts cover daily/weekly solving trends,
problems solved by difficulty (horizontal bars), XP growth, the POTD completion
trend, and the acceptance rate; each degrades to an empty-state message when the
selected range has no activity.

