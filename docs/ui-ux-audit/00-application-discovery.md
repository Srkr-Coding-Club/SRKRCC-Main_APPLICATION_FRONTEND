# 00. Application discovery and baseline

Audit date: 2026-10-26. Branch `dev`. Repository: `SRKRCC-Main_APPLICATION_FRONTEND`.
Governing rules: `AGENTS.md` (Next.js 15 App Router, Tailwind, dark-mode-first, minimal focused changes).

## 1. Application overview

| Item | Finding |
|---|---|
| Framework | Next.js 15.5 (App Router, Turbopack in dev), React 19, TypeScript 5.7 |
| Styling | Tailwind CSS 3.4 + CSS variables in `src/app/globals.css`; no component library (hand-rolled primitives in `src/components/ui`) |
| Icons | `lucide-react` (single library) |
| Fonts | Inter (body), Poppins (headings, non-journey pages), Archivo "display" (journey/landing + hackathon pages), JetBrains Mono (labels) |
| Motion / 3D | framer-motion, gsap, three (landing page only) |
| Data | Django REST backend. Server components call it directly; client components go through the BFF route `src/app/api/proxy/[...path]` (HttpOnly cookies) |
| Auth | Cookie session (`srkrcc_access_token`, `srkrcc_refresh_token`, `srkrcc_user_role`), client mirror in `localStorage.srkrcc_user`. `middleware.ts` guards `/admin`, `/profile`, `/hackathons/:slug/dashboard` |
| Roles | `AFFILIATE`, `NON_AFFILIATE`, `VOLUNTEER`, `JUDGE`, `CLUB_LEAD`, `ADMIN`; per-hackathon staff roles `ORGANIZER`, `JUDGE`, `VOLUNTEER` with 12 permission keys |
| Theme | Light and dark (`html.dark`, default dark, persisted in `localStorage.theme`) |
| Existing tests | Vitest: 37 files, 580 tests. Playwright: 20 specs in `e2e/` (API mocked via `/api/proxy`), incl. existing 320/390/768 overflow sweep |

## 2. Route inventory (48 pages, 5 API routes)

| Module | Routes | Role | Purpose |
|---|---|---|---|
| Landing | `/` | public | Scrollytelling home with 3D intro |
| Marketing | `/about`, `/blogs`, `/career`, `/403` | public | Static / content pages |
| Auth | `/login`, `/signup`, `/account/setup-password`, `/account/verify-email`, `/account/verify-email/not-me` | public | Sign in, sign up, password setup, e-mail verification |
| Events | `/events`, `/events/[slug]` | public | Event listing and detail with quick RSVP |
| Forms | `/forms`, `/forms/[slug]` | public / signed in | Dynamic form listing and fill-in |
| **Hackathons (user)** | `/hackathons`, `/hackathons/[slug]`, `.../dashboard`, `.../finder`, `.../check-in`, `.../judging`, `.../manage`, `.../certificate` | public, participant, staff | Discovery, registration, team dashboard, team finder, check-in, judge scoring, organizer console, certificate |
| CodeQuest | `/codequest`, `/codequest/batch-schedule` | public / lead | Daily problems, scheduling |
| IconCoders | `/iconcoders` | public | Individual DSA competition showcase |
| Profile | `/profile` | signed in | Profile, attendance badge, my hackathons |
| Certificates | `/certificates/verify/[code]` | public | Certificate verification |
| Attendance | `/attendance/scan` | volunteer | QR attendance scanner |
| **Admin: Hackathons** | `/admin/hackathons`, `/admin/hackathons/[slug]` | ADMIN, CLUB_LEAD | Create, list, hide, delete; 16-tab control room (overview, settings, registration controls, roles, problem statements, teams, e-mails, timeline, rounds, ideas, projects, judging, check-in, results, public page, announcements) |
| Admin: other | `/admin`, `/admin/events`, `/admin/forms`, `/admin/builder`, `/admin/responses`, `/admin/members`, `/admin/users`, `/admin/announcements`, `/admin/audit-logs`, `/admin/codequest`, `/admin/content`, `/admin/csv-ingestion`, `/admin/data-health`, `/admin/data-management`, `/admin/flags`, `/admin/jobs`, `/admin/maintenance`, `/admin/attendance/scan` | ADMIN, CLUB_LEAD | Control room tabs |

Not in any menu but reachable: `/hackathons/[slug]/manage` (staff with per-hackathon permissions), `/hackathons/[slug]/judging`, `/hackathons/[slug]/check-in`, `/certificates/verify/[code]`.

## 3. User journeys documented

1. Visitor: `/hackathons` -> card -> `/hackathons/[slug]` -> "Sign in to register a team" -> `/login?next=.../dashboard`.
2. Participant: dashboard -> create team (modal: name, problem statement or open innovation, rules acceptance, organizer questions) -> invite members by e-mail -> idea phase -> project submission -> check-in QR -> certificate.
3. Participant without team: team finder (`/finder`) -> request to join / invite seekers.
4. Organizer: `/admin/hackathons` -> create (modal) -> manage (16 tabs) -> publish, hide, clone, delete.
5. Judge: `/hackathons/[slug]/judging` (per-hackathon permission `judge`).

## 4. Method and environment

* The real Django backend needs PostgreSQL and real data, so it was **not** used. A stand-in API (`e2e-audit/fake-backend.mjs`) serves realistic fixtures (3 hackathons incl. an over-long title, closed and full states, a team with a long member name, problem statements, stages, analytics, finder data). It serves both the server-rendered fetches and the `/api/proxy` calls. No production data was touched.
* Roles are simulated by cookie (`admin` bearer = ADMIN, otherwise participant).
* Crawler (`e2e-audit/crawl.mjs`): route x 8 viewports x role; measures overflow with offending elements, targets under 24px, text under 12px, axe-core (WCAG 2.0/2.1/2.2 A/AA + best-practice), console errors, HTTP >= 400, screenshot.
* `e2e-audit/contrast.mjs`: every axe colour-contrast failure with ratio and colours.
* Baseline = untouched `HEAD` (git worktree, production build). "After" = working tree, production build.

## 5. Baseline results (before any change)

| Check | Result |
|---|---|
| `tsc --noEmit` | pass |
| `vitest run` | 37 files / 580 tests pass |
| Production build | pass |
| Console errors on audited routes | none on any hackathon route; 5 other routes throw on payload shapes the stand-in API does not serve (L3) |
| Horizontal page overflow | none at 7 of 8 viewports; **187px on 16 admin routes at 1024x768** (`06`) |

## 6. Limitations

* **L1** Backend not run; data is fixture data. Empty/error states beyond those the fixtures produce were checked in code and by the existing e2e suite, not against live responses.
* **L2** No authenticated flows that write (registration submit, publish, delete) were executed against a real backend; behaviour of those was reviewed in code and by existing tests.
* **L3** Early runs surfaced runtime exceptions (`Cannot read properties of undefined`) on dashboard, finder, check-in, judging and manage pages. These were caused by fixtures with the wrong shape, not app defects, and were fixed in the fixtures. They do indicate the pages assume well-formed payloads (no defensive defaults); recorded as an enhancement (TEST-002).
* **L4** Intro WebGL on `/` was only rendered in headless Chromium without GPU; its visuals were not judged.
* **L5** Real device keyboards, screen readers and touch were not used; keyboard behaviour was tested with Playwright key events.
* **L6** Firefox / WebKit were not part of this audit (existing `devices.spec.ts` covers them).

## 7. Where things are
* Screenshots are not committed; `e2e-audit/crawl.mjs` regenerates the full set for any build.
* Raw measurements are not committed (regenerate with `e2e-audit/crawl.mjs` and `tabs.mjs`). Tooling and how to re-run it: `e2e-audit/README.md`.
