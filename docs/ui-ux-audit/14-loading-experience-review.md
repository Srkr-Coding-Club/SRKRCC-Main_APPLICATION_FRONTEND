# 14. Loading experience review: how pages and components load, and what to do about it

Review of `SRKRCC-Main_APPLICATION_FRONTEND` (branch `dev`), 2 November 2026. This is a **report with options only; nothing was implemented.** Method: reading the code, counting patterns across `src/`, and one small browser check of the logo loader's CSS (section 3, finding F2). Counts exclude tests.

---

## 1. Summary

**Verdict.** Loading is handled in six different ways, mostly by hand, page by page. The best parts are good (the hackathon dashboard skeleton, the audit-log skeleton rows, the card entrance animation). The weak parts are the **default route loader, which is almost invisible for the first second and fully invisible for people who ask for reduced motion**, plain "Loading…" text in many admin screens, no feedback while moving between pages, images that pop in, and nothing at all to tell a visitor the server is waking up.

**The five things worth doing first**

| # | Finding | Why it matters | Rough effort |
|---|---|---|---|
| F1 | One generic full-screen logo loader serves every public page (events, hackathons, forms, blogs, careers, details) | Page content is replaced by a 70%-viewport block, then jumps to the real page: layout shift and a flash | Medium |
| F2 | The logo loader draws so slowly (4.2 s cycle) that a normal 300 to 600 ms load shows almost nothing, and with *reduced motion on it shows nothing at all* (verified) | A blank area for the people who most need a clear loading state | Small |
| F3 | No feedback between clicking a link and the next page appearing | The app feels frozen on slow phones; people tap twice | Small |
| F4 | Admin and member screens load with plain text ("Loading live events from backend…") or a lone spinner | Looks unfinished; layout jumps when data arrives | Medium |
| F5 | The backend can take 20+ seconds to wake (free hosting plan) and the only loader says "Loading SRKRCC Platform…" for the whole time | First visitors think the site is broken | Small |

**What we recommend** (section 6): a small shared loading kit (one skeleton, one shimmer, one delayed fallback, one top progress line, one button state), then roll it out in three phases. Three alternative packages are described so you can choose a feel (calm, branded or app-like).

---

## 2. How loading works today

### 2.1 Inventory

| Mechanism | Where | Count |
|---|---|---|
| Pages in the app | `src/app/**/page.tsx` | 51 (36 are `force-dynamic`, 37 are client components) |
| Route-level `loading.tsx` | `app/loading.tsx` (everything), `app/admin/loading.tsx` | **2 files for 51 pages** |
| Branded logo loader (`LoadingSpinner`, `PageLoader`) | root and admin `loading.tsx`, `forms/[slug]` | 4 files |
| Shared skeleton (`LoadingSkeleton`, `ChartSkeleton`) | only `admin/csv-ingestion` | **1 file** |
| Hand-made `animate-pulse` placeholders | scattered | 35 uses in 30 files |
| Spinner icon (`Loader2` / `animate-spin`) | buttons, panels, Suspense fallbacks | 99 references, 84 `animate-spin` in 44 files |
| Plain "Loading …" text | admin tabs, small panels | about 47 lines |
| `Suspense` boundaries | login, signup, profile, setup-password, verify-email, a few admin pages | 14 files, nearly all with "spinner + sentence" fallbacks |
| Page transitions | none (`useTransition` / `startTransition`: 0), no top progress bar | none |
| Images | 23 raw `<img>`, 9 files use `next/image`, 5 use `loading="lazy"`, none use `decoding="async"` | no placeholder or fade-in |
| Entrance animation | GSAP `useScrollEntrance` (11 files), framer-motion (73 uses) | cards, panels |
| Data fetching in client pages | `useState(loading)` + `useEffect` + `fetch` | about 25 files; no shared query or cache layer |
| Server pages | `fetchApi` in `page.tsx`, blocking | 8 pages (events, hackathons, forms, details, home sections) |
| Accessibility | `aria-busy` 13, `role="status"` 34 | partial |

### 2.2 The six loading "idioms" a person can meet

1. **Big logo loader** (routes, `forms/[slug]`): the club mark draws itself, 4.2 s per cycle.
2. **Admin card** ("Loading Admin Control Room… Synchronizing live schemas…"): logo plus two lines of text.
3. **Pulse blocks** (`animate-pulse` grey boxes): hackathon dashboard, audit logs, admin hackathons list, certificate page, flags tab. Hand-made each time.
4. **Spinner + sentence** (login, profile, sign-up, set-password, bell, broadcast history).
5. **Bare text** ("Loading live events from backend…", "Loading live blogs…", "Checking access…").
6. **Nothing**: a list pops in after a gap (for example the profile's My Events teams and invites, which I added; `EventsListing` while the server waits for the API).

### 2.3 What already works well (keep and reuse)

- **Hackathon dashboard** (`hackathons/[slug]/dashboard/page.tsx:166`): a three-block skeleton shaped like the page.
- **Audit logs** (`AuditLogsTab.tsx:264`): five skeleton rows shaped like the real rows.
- **Admin hackathons list** and **Flags tab**: skeleton cards and rows.
- **Certificate page**: an aspect-ratio box that matches the certificate, so nothing jumps.
- **Card entrance** (`CardGrid` rise-in plus the per-card GSAP sequence): the one animation that feels designed. The loading states should feel like the same family.
- **Reduced motion is respected** by the entrance hook (`prefersReducedMotion()`), and a global `prefers-reduced-motion` rule exists (but see F2).
- **Fonts** use `next/font` with `display: swap`: no invisible text while fonts load.
- **API client** has a 25 s timeout, and a heartbeat keeps the backend warm while a tab is open.

---

## 3. Findings

Severity: **High** blocks or confuses people, **Medium** looks unfinished or causes jumps, **Low** polish.

### F1. One generic loader for every public route (High)
`app/loading.tsx` returns `<PageLoader label="Loading SRKRCC Platform..." />`, a 70dvh centred block, for **all** routes that have no `loading.tsx` of their own: events, hackathons, forms, blogs, careers, CodeQuest, IconCoders, every detail page.
- The navbar stays (good), but the page area is replaced by an empty centred logo, then replaced again by the real page: a full-height **layout shift** every navigation.
- It tells the person nothing about what is coming. An events list, a form and a blog post all look the same while loading.
- Server pages are blocking: `force-dynamic` plus `await fetchApi(...)` in `page.tsx` means the page cannot show any part of itself until the API answers (list pages even cache for 60 seconds, so a cold request is the slow one).

### F2. The logo loader is too slow to read, and invisible with reduced motion (High, verified)
`globals.css` runs the logo animation in a 4.2 s loop: the group fades in over the first ~3 to 6%, the outline starts at 4% and takes until 45% to draw.
- **Measured in a browser** (the loader's own CSS on a test path): at **300 ms** the outline is 1% drawn and the fill is 0; at **1.2 s** about 90% drawn, fill still 0. A typical page load is 200 to 800 ms, so most people see **a faint speck or nothing** before the page appears.
- **With reduced motion on**, the global rule `animation-duration: 0.01ms; animation-iteration-count: 1` finishes the animation instantly and the paths return to their base style, which is `stroke-dashoffset: 1; fill-opacity: 0` (hidden). Measured: after 1.2 s the stroke is still fully hidden and the fill is 0. **The loader is blank for exactly the people who asked for less motion.**
- The mark is drawn with a stroke, which is pretty on a long wait but a poor fit for a short one.

### F3. No feedback between a click and the next page (High)
No top progress line, no pending state on links or cards, no `useTransition`. On a slow phone connection the app looks unresponsive for the first moment after a tap, so people tap again. `HackathonCard` and `EventCard` navigate with `router.push` and show nothing meanwhile.

### F4. Admin and member screens use text or a lone spinner (Medium)
Examples:
- `admin/EventsHackathonsTab.tsx:171` "Loading live events from backend…"
- `admin/ContentHubTab.tsx:54, 95` "Loading live blogs/job listings from backend…"
- `admin/AnnouncementsTab.tsx:111`, `admin/AttendanceReportTab.tsx:32`
- `app/codequest/batch-schedule/BatchScheduleClient.tsx:139` "Checking access…"
- `NotificationBell.tsx:355` spinner in the middle of an empty panel
- `BroadcastNotificationPanel.tsx:208` spinner and "Loading history…"
- profile, login, sign-up and set-password `Suspense` fallbacks: spinner and a sentence in a full-screen block

Effects: the list area collapses to a line of text, then grows to the real list (layout shift), and the wording ("from backend", "Synchronizing live schemas") is internal language.

### F5. Cold start and slow API give no explanation (High for first visitors)
`render.yaml` uses the free plan, which sleeps; a first request can take 20 to 50 s while the client timeout is 25 s. The only message is "Loading SRKRCC Platform...". There is no staged message ("still waking the server"), no retry, no skeleton. The heartbeat only helps while some tab is open.

### F6. Images pop in (Medium)
23 raw `<img>` (event posters, hackathon banners, avatars, blog images). `BannerImage` and the cards show nothing, then the picture appears with a snap; no aspect-ratio reservation everywhere, no blur-up, no fade. Card covers have a coloured fallback only when there is *no* image, not while one is loading. Only 5 uses of `loading="lazy"` and none of `decoding="async"`.

### F7. Skeletons are hand-made, inconsistent, and not shaped like what they replace (Medium)
35 `animate-pulse` usages in 30 files, each with its own colours (`slate-200`, `journey-text/10`, `white/5`), radius and rhythm. The shared `LoadingSkeleton` is used once. `animate-pulse` fades the whole block in and out (a "breathing" effect); a **shimmer** that sweeps across reads as "progress" and is the common expectation on phones.

### F8. Nothing for "refreshing" content (Medium)
Several screens poll (hackathon dashboard every 15 s, notification count every 40 s, `useLiveSection`) but show no hint when they refresh or fail quietly. Lists that reload on a filter or search either blank out or show a spinner and lose the old rows. Better: keep the old content, dim it slightly and show a thin progress line.

### F9. Buttons: a few good, many inconsistent (Medium)
Only 13 `aria-busy` uses against 99 spinner uses. Some buttons swap their label for "Saving…" and change width (a jump), some keep the label and add a spinner, some only disable. Double submits are prevented by disabling, but there is no shared pattern for "pending", "done" and "failed".

### F10. Entrance animations can flash before they play (Low to Medium)
`useScrollEntrance` hides an element in a layout effect, which runs after hydration, so on a slow device the content may be **visible, then hidden, then animated in**. The loading screenshot of the events page (cards half-faded at the moment of capture) shows how empty the page can look mid-entrance. Under reduced motion nothing is hidden, which is correct.

### F11. Accessibility gaps (Medium)
`role="status"` appears 34 times but `aria-busy` only 13; many spinners are `aria-hidden` with no announced text, many skeletons have no label at all. A screen reader user gets silence, then a changed page. The logo loader has `role="img" aria-label="Loading"` which is a start, but it is announced as an image, not a status.

### F12. A few of my own recent additions load abruptly (Low)
`MyEventsSection` fetches teams and invites after the page loads and shows nothing while it does (the list grows when they arrive). `EventsListing` and `HackathonsListing` are fed by blocking server fetches. `EventDetailClient` "More events" is part of the same blocking fetch. These fit the same fixes as the rest.

---

## 4. Principles to design to (UI/UX Pro Max guidance, applied here)

| Principle | Rule of thumb for this app |
|---|---|
| Respond within ~100 ms | Something must change on tap: pressed state, pending line, button spinner |
| Don't flash a loader | Show a loader only if the wait passes ~200 ms; once shown, keep it at least ~400 ms |
| Skeleton for content, spinner for actions | Skeletons for lists, cards, tables, profile; spinners only inside buttons or tiny refreshes |
| Match the shape | A skeleton must have the same size and rhythm as the real thing so nothing jumps (aim for CLS under 0.1) |
| One motion language | One shimmer speed (about 1.4 s), one fade-in (about 200 ms), one easing (`ease-out`) |
| Keep what you have | While refreshing, keep old content visible and dim it; never blank a list for a refetch |
| Say what is happening on long waits | After 3 s, 8 s, 15 s change the wording; after the timeout, offer Retry |
| Reduced motion is not "invisible" | Replace motion with a static placeholder or a gentle opacity change; never hide the state |
| Announce it | `aria-busy` on the region, a polite `role="status"` line, `aria-hidden` on decoration |
| Dark and light both | Shimmer colours from theme tokens (no hard-coded greys) |

---

## 5. Options

Each area has several options so you can pick a feel. "Effort" is rough: S under a day, M one to three days, L about a week. Mock-ups are sketches.

### 5.1 Page and route loading (fixes F1, F3, F5)

**Option A1: Skeleton per route group (recommended base).**
Add a `loading.tsx` to each area (`events`, `hackathons`, `forms`, `blogs`, `profile`, detail routes) that renders a skeleton in the exact layout of the page (hero, section heading, grid of card skeletons).
```
[navbar stays]
[ hero block  ░░░░░░░░░░░░░░░░ ]
[ ░░░ heading      ]
[ card ░░ ][ card ░░ ][ card ░░ ]   <- same grid, same card height
```
Feel: calm, "the page is arriving". Effort M (about 8 skeleton layouts, reusing a shared card skeleton). Risk: low. Best for list and detail pages.

**Option A2: Keep the branded logo, but fix it.**
Keep the full-screen logo for the first visit only; make it short (0.9 s cycle, draw outline and fill together), add a **200 ms delay** before it shows and a **400 ms minimum**, give it a static visible state under reduced motion, and put a changing caption below it. Use it only for the **first load and the cold start**, not for every navigation.
Feel: branded, but quick. Effort S. Risk: low. Best as the "waking the server" screen.

**Option A3: Top progress line plus keeping the old page.**
A slim accent-coloured line at the top (under the navbar) that starts on click, creeps to about 80%, and finishes when the new page paints; the current page stays until the next is ready (using `startTransition` / View Transitions where available).
```
━━━━━━━━━━━━░░░░░░░░░░░░░░░░░░░   (orange line under the navbar)
```
Feel: app-like and responsive; no blank screen at all. Effort S to M (a small component plus link and router hooks). Risk: low to medium (must work with `router.push` in the cards). Best for fast networks and repeat navigation.

**Option A4: Stream sections with `Suspense` (server pages).**
Render the hero and headings at once and wrap each data section (events grid, "More events", registration panel) in its own `Suspense` with a skeleton, so the shell appears immediately and the parts fill in.
Feel: the fastest perceived load. Effort M to L (restructure `page.tsx` data fetching per section). Risk: medium (caching and SEO need checking). Best for the events, hackathons and forms listings and the detail pages.

**Recommended combination:** A3 (progress line) everywhere + A1 (skeletons) for the main routes + A2 (fixed logo) only for first load and cold start. A4 later for the heaviest pages.

### 5.2 Skeleton style (fixes F7)

| Option | Look | Effort | Notes |
|---|---|---|---|
| **S1 Shimmer sweep** (recommended) | A soft highlight crossing the grey shapes every ~1.4 s | S (one CSS keyframe and a `<Skeleton>`) | Reads as progress; paused or static under reduced motion |
| S2 Pulse (today) | Whole shape breathes | none | Fine for tiny inline spots; looks flat for pages |
| S3 Brand skeleton | Same shapes, tinted with the orange/burgundy gradient at very low opacity | S | Distinctive, matches the cards; slightly busier |
| S4 Progressive reveal | Skeleton cross-fades into content with a stagger that matches the card entrance | M | Smoothest hand-off to the existing GSAP sequence |

Token proposal (all themes): base `journey-text/8%`, highlight `journey-text/14%`, radius follows the real element, shimmer 1.4 s linear, swap to content with a 150 ms fade.

```css
@keyframes skeletonShimmer { from { background-position: -200% 0 } to { background-position: 200% 0 } }
.skeleton {
  background: linear-gradient(90deg, var(--sk-base) 25%, var(--sk-hi) 50%, var(--sk-base) 75%);
  background-size: 200% 100%;
  animation: skeletonShimmer 1.4s linear infinite;
}
@media (prefers-reduced-motion: reduce) { .skeleton { animation: none; background: var(--sk-base); } }
```
(The global reduced-motion rule must not hide it, unlike the logo loader today.)

### 5.3 Cards and lists (events, hackathons, forms, blogs, finder, My Events)

- **L1 Card skeletons matching each card** (recommended): `EventCardSkeleton`, `HackathonCardSkeleton`, `FormCardSkeleton` with the real cover ratio (16:10), title line, three description lines, the little timeline, two buttons. Count equals last known count or 3.
- **L2 Staggered placeholders:** the same, appearing one after another (60 ms apart) so the page never looks static.
- **L3 Inline "reveal" on arrival:** when real cards arrive they take over each skeleton with the existing `coverWipe` / `popIn` sequence, so loading and entering feel like one motion.
Recommended: L1 + L3.

### 5.4 Tables and admin screens (fixes F4, F8)

- **T1 Skeleton rows with the real column widths** (recommended; copy the audit-log approach into a shared `TableSkeleton`).
- **T2 Keep old rows, dim to 60%, thin progress line on top of the table** for refetch, search and paging (stale-while-revalidate feel).
- **T3 Inline spinner in the toolbar** only for background polling, never in place of the list.
Use T1 for first load, T2 for every refetch, T3 for polling.

### 5.5 Buttons and actions (fixes F9)

- **B1 Spinner replaces the icon, width locked** (recommended): the button keeps its size and label, the leading icon becomes a spinner, `aria-busy` set, disabled.
- **B2 Label changes** ("Saving…") with the same width lock; good for forms.
- **B3 Success flash:** after a successful action the spinner becomes a check for about 800 ms.
- **B4 Optimistic UI:** for cheap, reversible actions (mark notification read, toggle a switch) update at once and undo on failure.
One shared `<ActionButton pending>` would make B1 and B3 the same everywhere.

### 5.6 Images (fixes F6)

- **I1 Reserve the box + shimmer + fade-in** (recommended): the poster area is an aspect-ratio box with the skeleton colour; the image fades in over 200 ms on `load`.
- **I2 Blur-up:** a tiny base64 blur placeholder per poster (needs the backend to store one, or `next/image` with a generated `blurDataURL`). Prettiest, most work.
- **I3 `next/image` everywhere:** automatic sizing, lazy loading and modern formats; needs remote host configuration for admin-supplied poster URLs.
Recommended: I1 now (S), I3 for known hosts later.

### 5.7 Long waits and cold start (fixes F5)

- **W1 Staged caption** (recommended): after 3 s "Still loading…", after 8 s "The server is waking up, this can take up to a minute", after 20 s "Taking longer than usual" with a Retry button.
- **W2 Skeleton + banner:** show the page skeleton and a slim banner at the top with the staged message, so the page still looks like the page.
- **W3 Retry with backoff in the client**, then a clear error with "Try again" (the error pages exist; the client timeout is 25 s).
Combine W1 with A2 for the first load.

### 5.8 Motion and accessibility (fixes F2, F10, F11)

- **M1 Reduced-motion rule that keeps states visible** (recommended): do not use `animation-duration: 0.01ms` on loaders; give the logo loader a static, visible mark and a slow opacity pulse, and give skeletons a static fill.
- **M2 Hide-until-ready for entrances:** set the initial "hidden" state in CSS (a class applied by the server markup) so there is no visible-then-hidden flash.
- **M3 `aria-busy` + one polite live region** per loading area, with text like "Loading events", cleared on arrival; skeletons `aria-hidden`.

---

## 6. Where loading is needed but missing, or weak

Priority: **P1** do first, **P2** next, **P3** later.

| # | Place | Today | Suggested (section 5) | P |
|---|---|---|---|---|
| 1 | Every public route change (`/events`, `/hackathons`, `/forms`, `/blogs`, `/career`, `/codequest`, `/iconcoders`) | Full-screen logo (F1) | A3 progress line + A1 route skeletons | P1 |
| 2 | First load / sleeping backend | One caption (F5) | A2 fixed logo + W1 staged caption | P1 |
| 3 | The logo loader itself | Invisible under reduced motion, near-invisible for short waits (F2) | A2 + M1 | P1 |
| 4 | `/events` and `/hackathons` listings | Blocking fetch, then cards pop in | A1 card skeletons (L1+L3); later A4 | P1 |
| 5 | Event page `/events/[slug]` and hackathon page | Whole page waits; "More events" blocks it | A1 detail skeleton; A4 for "More events" | P1 |
| 6 | Card clicks (`router.push`) | No pending state | A3 + pressed state on the card | P1 |
| 7 | Profile page (Suspense fallback is spinner + text; teams and invites in My Events appear late) | Spinner, then jumps | A1 profile skeleton; L1 for My Events | P1 |
| 8 | Poster / banner images (events, hackathons, blogs, avatars) | Pop in | I1 (later I3) | P2 |
| 9 | Admin: Events tab, Content hub (blogs and jobs), Announcements, Attendance report | Bare text ("Loading … from backend") | T1 skeleton rows or cards | P2 |
| 10 | Admin tables on search, filter, paging (users, members, responses, audit logs refetch) | Spinner or blank rows | T2 dim old rows + line | P2 |
| 11 | Notification bell panel | Spinner in an empty panel | 3 skeleton rows; B4 for mark-read | P2 |
| 12 | Login, sign-up, set-password, verify-email Suspense fallbacks | Spinner + sentence over a full screen | Form-shaped skeleton (card with two fields) | P2 |
| 13 | Forms: list (`/forms`) and the form page (`forms/[slug]`, uses the logo loader) | Logo loader | List card skeletons; form skeleton with field rows | P2 |
| 14 | Hackathon dashboard polling | Silent refresh | T3 tiny "refreshing" dot; keep content | P2 |
| 15 | Saving buttons across admin and member forms | Mixed labels and widths | B1 + B3 via one shared button | P2 |
| 16 | Certificate pages, verify page | Certificate has a box skeleton; verify page is blocking | Keep the box; skeleton for verify card | P3 |
| 17 | Feedback and certificate admin panels (Modal bodies) | "Loading…" line | Modal body skeleton (stat tiles and bars) | P3 |
| 18 | Judging, finder, manage, check-in, attendance scanner | Mixed text and spinners | T1/L1 per layout | P3 |
| 19 | Charts and analytics (`ChartSkeleton` exists, used once) | Mostly spinners | Use `ChartSkeleton` everywhere charts load | P3 |
| 20 | File uploads and exports | Spinner or toast | Determinate progress where the size is known; B1 | P3 |
| 21 | Search boxes (college search, user lookup, command palette) | Spinner at the side | Inline "searching" shimmer row in the results list | P3 |
| 22 | Theme switch | Instant (view transition) | Already good | n/a |

---

## 7. Three ready-made packages

| | **Package 1: Calm** | **Package 2: Branded** | **Package 3: App-like** |
|---|---|---|---|
| Routes | A1 skeletons | A2 fixed logo on first load + A1 | A3 progress line + A4 streaming |
| Skeleton | S1 shimmer, plain greys | S3 brand-tinted shimmer | S4 progressive reveal into the card entrance |
| Images | I1 | I1 + I2 blur-up | I3 `next/image` + I2 |
| Buttons | B1 | B1 + B3 | B1 + B3 + B4 optimistic |
| Long waits | W1 | W1 + W2 | W2 + W3 |
| Feel | Quiet, fast, low risk | Recognisably "SRKR", a little more motion | Closest to a native app; most work |
| Effort | M | M to L | L |

**Recommendation:** Package 1 as the foundation in Phase 1, then add the best parts of Package 2 (fixed logo and cold-start caption) and A3 from Package 3. Phase 3 can move toward Package 3 for the heaviest pages.

---

## 8. Rollout plan

| Phase | Work | Fixes | Effort |
|---|---|---|---|
| **1: Foundation (about 2 to 3 days)** | Loading kit: `Skeleton`, shimmer tokens, `TableSkeleton`, `CardSkeleton` variants, `DelayedFallback` (200 ms delay, 400 ms minimum), `ActionButton`. Fix the logo loader (visible under reduced motion, shorter cycle, caption stages). Top progress line. Route skeletons for events, hackathons, forms. | F1, F2, F3, F5, F7 | M |
| **2: Screens (about 3 to 4 days)** | Replace the text and spinner loaders in admin tabs, profile, auth pages, bell and My Events. Image fade-in. Shared buttons. | F4, F6, F9, F11, F12 | M |
| **3: Polish (about 2 to 3 days)** | `Suspense` streaming on detail pages, refetch dimming, polling hints, CSS-based hidden-until-ready for entrances. | F8, F10 | M to L |

**Acceptance checks** (so it can be tested, not just looked at):
- On a throttled connection (Playwright `route` with a 1.5 s delay), no list or page area is ever blank: a skeleton of the same height is present within one frame, and the content swap changes the page height by less than 8 px (CLS under 0.1).
- A loader appears only after 200 ms, and stays at least 400 ms once shown (no flicker on fast loads).
- With `prefers-reduced-motion: reduce`, every loading state is still visible (static) and nothing shimmers.
- Every loading region has `aria-busy="true"` while loading and a polite status message; skeleton shapes are `aria-hidden`.
- A first request that takes 12 s shows the staged captions at 3, 8 and 20 s, and a Retry after the timeout.
- Both themes pass a contrast check on skeleton base against the page background (visible but quiet).

---

## 9. Risks and notes

- **Caching:** the listing pages use `revalidate: 60`; streaming with `Suspense` (Option A4) changes how that cache and the 404 behaviour interact, so test both.
- **GSAP entrances:** card skeletons should hand over to the existing `useScrollEntrance` sequence rather than add a second animation; otherwise the swap will look doubled.
- **Remote images:** `next/image` needs the poster hosts allowed in `next.config`; admin-entered poster links can be anything, so Option I1 is the safe default.
- **Do not hide state:** the global reduced-motion rule is a blunt tool; it should be narrowed so it does not flatten loaders and skeletons (finding F2).
- **Scope:** this report changes no code. The one measurement in it (the logo loader under reduced motion) was done with the loader's real CSS in a browser; everything else is from reading the code.

## 10. Appendix: how the numbers were found

Counted with ripgrep-style searches over `src/` excluding tests: `loading.tsx` files, `Suspense`, `LoadingSkeleton` / `LoadingSpinner` usage, `animate-spin`, `animate-pulse`, `Loader2`, `aria-busy`, `role="status"`, `<img`, `next/image`, `loading="lazy"`, `useTransition`. The logo loader check ran the loader's keyframes and the global reduced-motion rule from `globals.css` in headless Chromium with and without `prefers-reduced-motion`, reading `stroke-dashoffset` and `fill-opacity` after 300 ms and 1.2 s.
