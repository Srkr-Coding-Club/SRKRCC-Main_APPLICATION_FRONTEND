# 02. Module-by-module audit

How to read this: every module was loaded at 8 viewports (320 to 1920) as a visitor, a participant and an admin where the route allows it, with axe-core, tap-target, overflow and console measurements (`e2e-audit/crawl.mjs`). The Hackathon module has its own files (03, 04, 05). Modules other than Hackathons were **not** exercised through their write workflows (no backend); statements about them come from rendered pages, the measurements below and a read of the code. Evidence column: `crawl` = the crawl JSON written by `crawl.mjs`, `shot` = a file in `docs/ui-ux-audit/screenshots/baseline/`.

Per-page baseline measurements at 375x812 (dark theme, untouched `HEAD`):

| Role | Route | h1 | Overflow px | Targets under 24px | axe (rule:nodes) | Console errors |
|---|---|---:|---:|---:|---|---:|
| anon | `/` | 1 | 0 | 1 | landmark-main-is-top-level, no-duplicate-main, landmark-unique | 2 (see note) |
| anon | `/about` | 1 | 0 | 4 | none | 0 |
| anon | `/events` | 1 | 0 | 1 | color-contrast:1 | 0 |
| anon | `/forms` | 1 | 0 | 1 | none | 0 |
| anon | `/blogs` | 1 | 0 | 5 | color-contrast:1, heading-order:1 | 0 |
| anon | `/career` | 1 | 0 | 1 | color-contrast:1 | 0 |
| anon | `/codequest` | 1 | 0 | 1 | landmark x3 | 0 |
| anon | `/iconcoders` | 1 | 0 | 1 | color-contrast:1, empty-heading:1 | 0 |
| anon | `/login` | 0 | 0 | 1 | color-contrast:1, landmark x4, page-has-heading-one:1, target-size:1 | 0 |
| anon | `/signup` | 1 | 0 | 3 | color-contrast:1, landmark x4 | 0 |
| anon | `/403` | 1 | 0 | 1 | landmark x3 | 0 |
| anon | `/hackathons` | 1 | 0 | 1 | color-contrast:1 | 0 |
| anon | `/hackathons/[slug]` (3 events) | 1 | 0 | 4-6 | color-contrast:3-6, heading-order:1 | 0 |
| user | `/profile` | 1 | 0 | 2 | color-contrast:3, landmark x3 | 3 (404 on fixture routes) |
| admin | `/admin` | 1 | 0 | 2 | heading-order:1 | 0 |
| admin | `/admin/*` (20 routes) | 0 on 11 of 20 | 0 | 1-16 | page-has-heading-one on 11 routes, select-name (members, attendance), button-name (builder, flags), color-contrast on 7 | 4 routes crash on empty fixtures (note) |

Note on console errors: the four crashing admin routes (`audit-logs`, `codequest`, `data-health`, `jobs`) read properties of a payload shape my fixture did not provide; the real API returns those shapes. They are not counted as defects (see 00, L3 and TEST-002).

Overflow at every other viewport was 0 for every public and participant route. The only overflow found anywhere was **187px on 16 of the 20 admin routes at 1024x768** (RESP-001, fixed; the other four rendered the error boundary, which has no navbar, because of fixture payloads, so they could not show it).

## Landing `/`
* Loads, no overflow at any viewport, one `h1`. The WebGL intro was not judged (headless, L4).
* Issues: nested `<main>` landmark (A11Y-006, fixed by the layout change).

## Marketing: `/about`, `/blogs`, `/career`, `/403`
* `/blogs` has a heading-order jump (axe `heading-order`, first node in the card grid) and a "Coming Soon" text button 16px tall (`crawl`: 96x16). **Open** (APP-UI-003, Low).
* `/career`, `/events` each have one low-contrast caption (`slate-400` text on light, `journey-muted` on dark tints). Token fixes (COLOR-003/005) address these.
* `/403` and the error pages: nested `<main>` (fixed).

## Auth: `/login`, `/signup`, `/account/*`
* `/login` had **no `h1` on phones**: the page `h1` lives in the brand panel that is hidden below `lg`, and the card used `h2`. Fixed (A11Y-007). The layout is clean at 320-430px; password field has a show/hide control, the button is full width and 44px.
* "Forgot?" link was 10px text, 36x15px target. Raised to 12px with a 32px-tall target.
* `/signup`: one required-field helper in `slate-400` at 2.45:1 on light (`crawl`, light theme). Covered by COLOR-005 for the hackathon scope only; the `signup` component itself was not in scope. **Open** (low).
* The password-setup route follows the AGENTS.md rule (token only in the URL); not changed.

## Events `/events`, `/events/[slug]`
Same card shell (`PublicListingCard`, `BounceCards`) as the hackathon listing, same fan-out behaviour (see 03, HACK-USER-006). The empty state ("No upcoming events right now") is clear. No separate defects found beyond shared tokens.

## Forms `/forms`, `/forms/[slug]`
* Listing: clean, no findings.
* Fill-in page: the largest single file in the app (2,789 lines) with its own palette (`#A84600`, gradient `#FF7A00 -> #E06B00` buttons with white text). The four gradient submit/next buttons are white on orange at about 2.6-3.4:1. **Open** (COLOR-009). Not changed because it is the busiest public flow and has its own e2e suite; change it together with those tests.
* The nested `<main>` on the "form closed" state was fixed.

## CodeQuest, IconCoders, Profile, Certificates, Attendance
Rendered and measured; no overflow, no blocking issue. `/iconcoders` has an empty `h3` (a card with no title in the fixture; **open**, Low, may be fixture-induced). `/profile` shows my-hackathons from `/hackathons/my-teams`, which my first fixture 404'd (fixture, fixed). Certificate page problems are in 03.

## Admin control room (non-hackathon tabs)
* All 16 routes that render the navbar shared one structural defect: the desktop navigation needed ~1211px but switched on at 1024px (RESP-001). Fixed.
* 11 of 20 admin routes have no `h1` (the page title lives in the navbar breadcrumb): `page-has-heading-one`. **Open** (A11Y-011). One visually-hidden `h1` in `AdminHeader`/the tab host would fix all.
* `/admin/forms` at 375px: the "Forms Directory (0)" heading is squeezed into a 70px column next to three stacked action buttons and wraps to three lines; the status filter tabs are cut off ("SCHEDUL..."). **Open** (APP-UI-004, Medium) - shot `_admin_forms__admin__375x812.png`.
* Unnamed controls: `<select>` on `/admin/members` (3) and `/admin/attendance/scan` (2); an icon button on `/admin/builder` and `/admin/flags`; a scrollable table region on `/admin/users` that cannot be focused. **Open** (A11Y-011).
* `/admin/csv-ingestion` has the most contrast failures (13 nodes at 375px) from `slate-500` on the dark ground and `text-[#FF7A00]` on light; both are token-level fixes (COLOR-002, COLOR-004).

## Cross-cutting, found in every module
| ID | Finding | Status |
|---|---|---|
| COLOR-001..006 | Contrast failures traced to five token-level causes | Fixed |
| A11Y-006 | Nested `<main>`, no skip link | Fixed |
| A11Y-012 | Six participant hackathon pages, login, signup and every admin page shared one generic `<title>` ("SRKR Coding Club | Innovate, Code, Excel" or "Admin Control Room"), so tabs, history and screen-reader page announcements could not tell them apart (`crawl`: identical titles) | Hackathon pages, login, signup, hackathon admin: fixed with 9 `layout.tsx` metadata files; other admin tabs open |
| A11Y-009 | Tap targets: footer e-mail (193x16), breadcrumb links (35x15), CSV tabs (101x23) | Footer, breadcrumb fixed; CSV tabs open |
| APP-UI-002 | 35 arbitrary radii (`rounded-[28px]` x22 ...) exceed the documented 10px cap | Open |
| TYPO-005 | 410 uses of `text-[11px]`, 204 of `text-[10px]` outside the hackathon module | Open |

## Limits of this review
No write workflow, no real data volumes, no keyboard-only pass through each module, one theme per full crawl (light was crawled at two viewports only), Chromium only.
