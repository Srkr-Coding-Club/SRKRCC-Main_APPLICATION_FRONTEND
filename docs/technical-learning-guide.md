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
├── profile/                <-- Real Database-Driven Member Profile
├── forms/
│   ├── page.tsx            <-- Live Forms Center Directory
│   └── [slug]/page.tsx     <-- Dynamic Form Submission Engine
└── admin/                  <-- Admin Control Room (Subtab Routed)
    ├── loading.tsx         <-- Admin Transition Loader
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
3. **Reusable card showcases and in-place event details**:
   - Events, Hackathons, IconCoders, and CodeQuest use the shared card showcase for bounce-stack presentation. Their route pages remain Server Components and pass card content into the client-side animation component.
   - Only Events opens an in-place details dialog from its Details button. The dialog uses the shared stack and modal components; the event slug route and hackathon detail routes remain available for direct visits.

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
1. Intercepts `/admin/*`, `/profile/*` and `/hackathons/[slug]/dashboard` (the `matcher` plus a regex check for the dashboard path).
2. Reads the `srkrcc_access_token` and `srkrcc_refresh_token` cookies.
3. If neither exists $\rightarrow$ Redirects to `/login?next=${pathname}`.
4. Role checks are **not** done here: admin pages are wrapped in `AdminGuard` (`src/app/admin/layout.tsx`), which calls `fetchAndSyncCurrentUser()` and only renders for `ADMIN` / `CLUB_LEAD`. The backend enforces every permission regardless.

---

## 3. Dynamic Data Fetching, Caching & Revalidation Under the Hood

* **`export const dynamic = 'force-dynamic'`**:
  - Instructs Next.js that the route relies on live backend data (`http://localhost:8000/api`), preventing build-time static prerendering failures when the database updates dynamically.
* **`fetchApi` Helper (`src/lib/api-client.ts`)**:
  - Sets `credentials: 'include'` so `HttpOnly` cookies are automatically sent with requests.
  - Implements connection timeouts with `AbortController` and graceful offline fallbacks.
  - Supports Next.js ISR options (`next: { revalidate: 60 }`), allowing public read queries (like `/events/`, `/hackathons/`, `/feature-flags/`, and `/announcements/`) to be cached in Next.js's data cache for 60 seconds while defaulting mutating methods (`POST`, `PUT`, `DELETE`) to `no-store`.
* **BFF Proxy Header Forwarding (`src/app/api/proxy/[...path]/route.ts`)**:
  - Forwards upstream `Cache-Control`, `ETag`, and `Last-Modified` headers from Django to the client.
  - Enables browser disk/memory caching and `stale-while-revalidate` for unauthenticated client reads.

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
4. **Profile-Bound Fields (`field.profile_field`)** — explicit, server-authoritative auto-fill:
   - Admins add them from the **Profile Auto-fill** palette group in `FormBuilderTab` (`PROFILE_FIELD_PALETTE`); `useAdminData.handleAddFieldFromPalette(type, label, profileField)` stores the binding.
   - `src/app/forms/[slug]/page.tsx` renders them as a read-only "From your profile" row (value from `resolveProfileFieldValue`) instead of an input, and keeps `formData` in sync with the profile — including in edit mode — so client validation sees the value.
   - If a required one is blank on the profile, the submit button is replaced by an "Update Your Profile" prompt (only while the form is open).
   - The backend discards whatever is sent for these fields and writes the profile value itself, so this UI is a mirror, not the source of truth.

---

## 7. CodeQuest Admin Workspace

`/admin/codequest` follows the standard admin-route pattern: it is a thin route wrapper around
`components/admin/CodeQuestTab.tsx`, which owns interactive scheduling and review controls.
`/codequest/batch-schedule` is a force-dynamic route with a server metadata wrapper and a
client-side batch editor. Admins and Club Leads can schedule up to five complete problems in
one request, each with its own date. The backend keeps future problems out of public list and
detail responses until their scheduled local date; the batch form uses the protected backend
endpoint and reports date conflicts before any rows are created.
The public `/codequest` page owns the daily member experience and receives today's problem plus
previously published challenges, never future scheduled problems. The browser never calculates or
writes a member streak.

The single-problem schedule modal in `CodeQuestTab` (`Schedule a CodeQuest problem`) stretches to
the full overlay width (`w-full`) so its wide fields and two-column grid use the whole form
background. Both this form and the batch editor use the standard transparent field styling for the
Difficulty `<select>` (no custom background tint in either).

### CodeQuest public page: corner calendar + recent problems

The public page stays a Server Component that fetches `/codequest/` once (`Problem[]`, ordered
newest-first and filtered server-side to `scheduled_date <= today`) and passes the problems plus
the server-computed `today` ("today" is formatted in `Asia/Kolkata` via `src/lib/codequest.ts`,
matching the backend's `timezone.localdate()`) into a client component:

- `src/components/CodeQuestDaily.tsx` — owns the only interactive state: it fetches the signed-in
  member's submissions (`GET /codequest/submissions/`) on mount and again on tab refocus (via
  `subscribeToAuthResync`), and reduces them to a `Set` of solved `scheduled_date`s where
`Submission.is_correct === true`. It splits the content: today's challenge (if one exists) is
  rendered as its own prominent "Problem of the Day" panel (date pill + title on aligned rows,
   chips and tags stacked below, and a right-aligned action row whose button stays natural-width
   and truncates long platform names) showing just the calendar date (month, day, year — no
   weekday), and the day's previous problems are listed separately below it (defaulting to the
   latest 5, with a "Show all" toggle to reveal the full archive — each row showing its scheduled
   date without a weekday). The calendar is a smaller corner widget. The heavy `CardShowcase`/card
   view is intentionally not used here.
- `src/components/CodeQuestCalendar.tsx` — a presentational, compact month grid sized as a sidebar
  widget (sticky right column on desktop, centered `max-w-sm` on mobile). Scheduled markers come
  only from the API's `scheduled_date` values. Future dates are never published: the backend hides
  problems after the server's current local date, and in the calendar any date after `today` is
  rendered disabled (muted, struck through, non-interactive). Navigation is clamped so users can
  neither go beyond the current month nor before October 2026 (both month buttons disable at those
  bounds). Today's cell is ringed, the Problem-of-the-Day cell (today with a scheduled problem) is
  filled and starred, and solved dates keep an emerald check — the orange dot under scheduled dates
  remains the progress marker. Hovering or focusing a scheduled date shows a tooltip with the
  problem title, its difficulty chip, and the full date (tooltips wrap and cap their width so they
  never overflow a narrow viewport); clicking opens that problem's `external_url` in a new tab
  (the existing solve flow), or scrolls to the problems list when no link is set. Dates without a
  problem never navigate.

Solved status is never fabricated: it is derived only from an accepted
`Submission.is_correct` verdict (an admin/Club-Lead review, never the browser), it is only fetched
for authenticated users, and anonymous visitors see the page without ticks. A problem can be both
today's POTD and solved — the two indicators are independent.

---

## 8. Server Component (RSC) vs Client Component Rendering Rules

1. **No Event Handlers in Server Components**:
   - Server Components (`src/app/forms/page.tsx`, `src/app/events/page.tsx`, etc.) run during SSR without a browser JS runtime.
   - JSX elements in Server Components MUST NOT pass function props (e.g., `onError`, `onClick`, `onChange`).
2. **Safe Image URL Handling**:
   - Cover images support both external URLs (`https://...`) and Base64-encoded Data URLs (`data:image/...`).
   - Image URLs are sanitized to avoid duplicate protocol prefixes (`https://data:` $\rightarrow$ `data:`).

---

## 9. Hackathon Module (Teams, Rounds, Announcements)

Backend contract: `apps/hackathons` — see the backend repo's `docs/modules/hackathon.md`.

**API layer.** Every call goes through the typed wrappers in `src/lib/api/hackathons.ts` (`hackathonApi.*` for participants, `hackathonApi.admin.*` for organizers), built on `fetchApi`. Business-rule errors arrive as `{detail, code, field?}`; `apiErrorMessage(err)` picks the readable message and forms map `err.body.field` onto the matching input. Types live in `src/lib/types.ts` (`HackathonTeam`, `HackathonTeamInvite`, `ProblemStatement`, `ParticipantRound`, `MyTeamPayload`, `HackathonAnnouncement`, …).

**Participant routes**

| Route | Rendering | Notes |
|---|---|---|
| `/hackathons` | Server component | `HackathonCard`'s **Register Team** button links to `/hackathons/[slug]/dashboard` (middleware sends logged-out visitors to login first) and shows *Registration Opens Soon* / *Closed* from `is_registration_open`. The legacy `registration_form` link is no longer used for registration. |
| `/hackathons/[slug]` | Server component | Fetches the hackathon, active problem statements and public announcements anonymously. The CTA (`components/hackathons/HackathonCTA.tsx`) is a client island: it verifies the session with `fetchAndSyncCurrentUser()` **before** calling `my-team`, because a stale stored login would otherwise 401 and `fetchApi` would redirect a public visitor to `/login`. |
| `/hackathons/[slug]/dashboard` | Client page (needs the user's token) | One `GET /my-team/` payload drives the page: no team → invite cards + "Create a team" (`TeamFormModal`); team → members, leader-only controls (edit, `InviteMemberModal`, remove, make leader, cancel invite), leave, `RoundsTimeline`, `HackathonAnnouncementsFeed`, problem statement. Leader-only controls are hidden for members, but the backend is what enforces them. |
| `/profile` | Existing client page | `MyHackathonsPanel` lists the user's teams (`/my-teams/`) and pending invites (`/my-invites/`); it renders nothing when both are empty. |

`TeamFormModal` (create + edit) lets a leader choose between **Pick a statement** (`FormSelect` of active statements, showing domain and slots left) and **Open innovation** (title, domain with suggestions from existing statement domains, description — all required, validated client-side and again by the server, whose `field` errors are mapped back onto the inputs). The open-innovation option only appears when the hackathon has `allow_open_innovation`; when a hackathon has no statements yet the choice is *Decide later* / *Open innovation*. The dashboard and admin Teams drawer show an open-innovation team's problem with its `OI-<n>` ID.

`InviteMemberModal` debounces an exact-email lookup (`/user-lookup/`) and only enables "Send invite" when the server says `can_invite`. `RoundsTimeline` shows each round's status, the team's result and feedback only once the round is published, and a "Submit details" link to `/forms/{slug}` for the leader of a shortlisted team.

**Admin routes.** `/admin/hackathons` lists hackathons; `/admin/hackathons/[slug]?tab=` hosts six tab components in `src/components/admin/hackathon/` (Overview, Settings, Problem Statements, Teams, Rounds, Announcements). They share input/button class constants and datetime helpers from `shared.ts`. `ProblemStatementsAdminTab` creates statements without an ID field (the server generates and returns it) and uploads CSVs through `hackathonApi.admin.uploadProblemStatements` as `FormData` — `fetchApi` skips the JSON content-type for it and the BFF proxy forwards the multipart body untouched. The page uses `useSearchParams`, so it is wrapped in `<Suspense>`. `AdminNavbar` matches child entries with `pathname.startsWith(href + '/')` so nested routes still highlight "Modules → Hackathon Management", and each hackathon card in `EventsHackathonsTab` links to its manage page.

---

## 10. Shared UI Primitives

| Component | Purpose |
|---|---|
| `src/components/ui/FormSelect.tsx` | Themed listbox replacing native `<select>` (whose OS-drawn popup ignores the dark theme). Props: `value`, `options` (`{value, label, hint?, disabled?}`), `placeholder`, `onChange`, `allowClear`, `disabled`. Used by the responses viewer and the hackathon screens. |
| `src/components/ui/Modal.tsx` | Dialog shell with focus trap (`useFocusTrap`), Escape-to-close, backdrop click and body scroll lock. `busy` blocks closing while a request is in flight. |
| `src/components/ui/StatusPill.tsx` | Coloured status pill plus label/tone maps for team, round and round-entry statuses. |

---

## 11. Home Hero Scroll Intro: the Solar-System Journey

`src/components/hero-intro/` wraps `HeroSection` on `/` (`<HeroIntro><HeroSection /></HeroIntro>` in `src/app/page.tsx`). It is a WebGL scene (Three.js) pinned under the navbar for 1100% of the viewport height. The club is the Sun, with the real logo on its face. Twelve stops orbit it, each a realistic 3D object rather than a planet: four technology eras (the C hexagon, the HTML/CSS/JS shields, the Java cup, a binary tree for DSA), then eight club programs (awareness sessions, C workshops, the DSA crash course, coding events, HACKoverflow, CodeQuest, IconCoders, EdgeCase). Scrolling flies the camera from deep space to the Sun, past every planet in turn, out to the edge of the system, and back to the Sun, where the home page emerges from its light.

| Scene (scroll progress) | What happens |
|---|---|
| Void (0-0.08) | Near-black space and a distant Sun. "Every journey begins with curiosity." then "Every generation builds on what came before." A mouse cue ("Enter the orbit", a swipe hint on touch) invites scrolling. |
| Sun reveal (0.085-0.135) | The camera arrives at the Sun: "SRKR CODING CLUB" and "Coding · Creativity · Community". |
| Encounters (0.17 + 0.06 per planet) | For each planet the camera approaches, passes close and departs. A mission-control panel (index, chapter, title, one line, link) holds the side of the frame opposite the planet, and the planet's orbit line warms on approach and fades out at the encounter so it never cuts across the planet. |
| Outer space (0.885) | The camera pulls far out above the system. |
| Final reveal (0.912-0.962) | Back at the Sun, held high in the frame: "SRKR CODING CLUB", "Where curiosity becomes code. Where code becomes capability. Where builders find their orbit.", *Join the journey* (`/signup`) and *Explore events*. |
| Launch (0.968-1) | The camera dives into the Sun, light fills the frame, and the hero's emblem, headline and actions emerge as it clears. |

**Architecture**

| File | Responsibility |
|---|---|
| `solarSystem.ts` | The single source of truth: `PLANETS` (copy, link, orbit, starting angle, size, the stop's 3D object (`emblem`) and which side of the frame it holds), `JOURNEY` and `LAUNCH` (the scene timings), `encounterAt(i)` and `planetPosition(planet, progress)`. Stops orbit the Sun as the journey progresses (outer ones slower, as orbit^-1.5). The scene, the story layer and the HUD all read from it. |
| `HeroIntro.tsx` | Scroll pin (ScrollTrigger, no scrub), the DOM handoff timeline, cinema mode, skip/Escape/focus handling, the loader ("Initializing CCC system", then loading orbits, calibrating planets, system ready), HUD updates and orbit navigation. Lazily imports the WebGL scene. |
| `IntroStory.tsx` | The words of the journey in the DOM (readable, accessible), above the canvas: opening lines, the Sun title, one panel per planet and the final invitation. `choreographStory()` adds their tweens to the handoff timeline. |
| `IntroHud.tsx` | Mission control: "SRKR // Coding Club" with a status line, the "03 / 12" counter with the Technology to Community chapter, and (xl screens) an orbital nav down the right edge that jumps to any planet. HeroIntro writes the active planet via `data-active` and text content, never via React re-renders. |
| `introMath.ts` | `createTrack` (Catmull-Rom keyframes) and `smoothDamp` (critically damped follow). |
| `introEligibility.ts` | Who gets the intro, and the matching pre-paint script for cinema mode. |
| `webgl/createIntroScene.ts` | Renderer, camera rig and render loop. Owns all high-frequency state. |
| `webgl/journeyPath.ts` | The camera's flight, built from the planets themselves: one pose per scene, joined by splines. Each encounter is framed the way space photography frames a world: the camera stands on the day side, swung `PHASE` off the planet-Sun line and raised `ELEVATION` above the orbital plane, so the Sun is out of frame behind the viewer, the planet shows a lit face with a soft terminator, and the other planets fall away above the frame instead of crowding the planet or the panel. The swing is chosen so sunlight falls from the panel's side. On portrait screens the planet sits above the panel. Also `planetProximity`, `systemPresence` and `sunBrightness`. |
| `webgl/sun.ts` | Procedural photosphere (supergranule cells, fine granulation, small sunspots, faculae, limb darkening), corona, halo and faint turning rays, and the point light. The club logo is real 3D geometry: its outlines are traced from `public/logonobg.webp` into `webgl/clubLogo.ts` (generated; regenerate rather than hand-edit) and extruded with a bevel, a lacquered maroon bulb and brain with metal-orange rays. It stands just off the Sun's face toward the camera and steps aside when the camera dives into the Sun. |
| `webgl/emblems.ts` | Every stop's 3D object, built from geometry (no image assets). Technology eras: the C hexagon in its three blues with a white C, the HTML5 and CSS3 shields and the JavaScript square (numerals and lettering are `TextGeometry` in three's bundled Optimer Bold), the Java cup with two curls of steam, and a binary tree whose nodes light up in level order. Club programs: a glowing filament bulb (awareness), a laptop showing C code (workshops), a running chrome stopwatch (crash course), a gold trophy on a plinth (events), the `</>` mark (HACKoverflow), a brass compass whose needle settles (CodeQuest), a mentor and two builders (IconCoders) and a dark cube with glowing edges (EdgeCase). Bevelled, clear-coated and metal `MeshPhysicalMaterial`, lit by the Sun and soft studio reflections (`RoomEnvironment` set as the scene environment in `createIntroScene.ts`); dials and the screen are canvas textures. |
| `webgl/planet.ts` | `createPlanet` places a stop's object on its orbit and turns it toward the viewer with a slow sway and float. |
| `webgl/space.ts` | The starfield (with a galactic band like the Milky Way) and distant galaxies, orbit lines, and drifting dust. |
| `webgl/noise.ts` | Shared GLSL noise (`fbm`, `ridged`). |
| `webgl/quality.ts` | Device tier (high/medium/low: pixel ratio, star and dust counts, sphere detail) and the frame monitor that downgrades when FPS sags. |
| `webgl/textures.ts` | The generated glow texture and texture loading. |

- **Camera inertia.** Scroll sets a *target* progress; the loop eases the actual progress toward it with `smoothDamp`, samples the camera path from it, and damps the camera again, then banks slightly into turns. Fast scrolling accelerates, slowing settles, and reversing turns round smoothly. The pointer (or phone tilt) only adds a glance of about ±3°.
- **Story in lockstep.** Every DOM beat (opening lines, panels, final scene, wash, hero reveal) lives on one paused GSAP timeline played by the damped progress, so text and camera never drift apart.
- **Orbit navigation.** Nav buttons scroll to `trigger.start + encounterAt(i) * (end - start)`; the camera then flies there past the intervening stops.
- **Handoff.** `HeroSection` exposes `data-hero-emblem`, `data-hero-title` and `data-hero-reveal`. The intro animates the `--intro-rise`, `--intro-scale` and `--intro-filter` variables (see `globals.css`), which drive the independent `translate`/`scale`/`filter` properties and leave Framer Motion's `transform` alone.
- **Cinema mode.** While the intro plays, `<html data-intro-cinema>` hides every `[data-site-chrome]` element (the navbar and announcement banner). The root layout sets it before first paint via `INTRO_CINEMA_SCRIPT`; HeroIntro clears it as the page emerges, on skip, and on unmount. A CSS failsafe restores the chrome after 4 s if the intro never mounts.
- **Ways out.** *Skip intro* (fixed bottom-right, outside the pinned root), `Escape`, and tabbing into the hero all jump to the end.
- **Fallbacks.** `prefers-reduced-motion`, Save-Data, low-power touch devices and anyone who saw the intro in the last 7 days (`srkrcc_intro_seen_at` in localStorage) get the plain hero, with no pinned scroll. If WebGL fails to initialise, the intro removes itself and shows the plain hero.
- **Smooth scrolling.** Scroll only sets a target; the camera and every DOM beat follow the damped progress, so motion glides between wheel steps. The story layer animates only opacity and transform (no animated blur filters, no backdrop blur over the live canvas), which keeps each frame cheap.
- **Bundle.** `three` is only imported by the lazily loaded `webgl/` modules, so it never lands in the shared bundle.
- **Editing the journey.** To change a stop's words, link or object, edit its entry in `PLANETS`. Starting angles were tuned so no stop crosses the camera's path or crowds another stop's encounter; after changing an orbit, angle, size or the number of planets, re-check that (for example by sampling `createJourneyPath` against `planetPosition`) and check `JOURNEY.encounterStep`/`outerSpace` so the last encounter still ends before outer space.

---

## 12. Home Page Journey

The home page (`src/app/page.tsx`) tells one story: **from your first `printf` to your first hackathon**. Order: intro (Chapter 00) → hero → The Path (seven program chapters) → Up next → Built by students → Your turn. Section components live in `src/components/landing/`.

**Data.** `getLandingData()` in `src/lib/landing.ts` runs on the server and fetches `/events/`, `/hackathons/` and `/codequest/` in parallel; any failure yields `null`/empty, never an error page. It matches programs by name (`PROGRAM_PATTERNS`: awareness, C workshop, DSA, EdgeCase, HackOverflow, IconCoders), derives registration state, and formats dates in `Asia/Kolkata` on the server so server and client render identical text. Nothing about a program is shown unless the API provides it. Copy in `journeyContent.ts` only states confirmed facts (the programs, CodeQuest's daily problems, EdgeCase's two-week cadence, HackOverflow's 24-hour format).

| Piece | Notes |
|---|---|
| `JourneyTrace` | The signature line down the left that draws with scroll and ends on the final "Join the club" button. Sets `--trace-x` / `--trace-pad`; `PathNode` uses them to land on the line and lights up when its section arrives. |
| `Chapter` | Narrative + demonstration + outcome + one action. `tone` (`quiet`/`interactive`/`energetic`/`climax`) sets the rhythm. |
| `demos/*` | Terminal (Awareness), `hello.c` compile (C), bubble sort (DSA), streak route (CodeQuest), contest round (EdgeCase, labelled as an illustration), 24-hour dial (HackOverflow, over `DawnBackdrop`). |
| `useScrollSteps` | Maps a demo's scroll position to a step. Starts at the finished step, so server render, no-JS and reduced-motion all show the complete demo; React re-renders only when the step changes. |
| `UpNext` | Agenda list (date, title, status, one action) from the API, with an empty state pointing to `/events`. |
| `BuiltByStudents` | Renders only when `src/content/community.ts` has entries. Add real event photos there (WebP/AVIF in `public/community/`, specific `alt` text); no stock or AI-generated images. |
| `LiveLine`, `ActionLink`, `DemoFrame` | Shared status line, the two action styles (one gold pill per screen, underlined text links otherwise), and the demo surface. |

**Design tokens.** The journey uses the club's brand palette, the same one as the rest of the site. `journey-*` colors in `tailwind.config.ts` read RGB variables from `globals.css` and flip with the theme. Dark: background `#0D0E15`, surface `#151722`, text `#F5F5F5`, muted slate, accent brand orange `#FF7A00`, live states brand gold `#FFA500`. Light: the site's `#FAFAFC` and navy `#1A1A2E`, accent `#C2410C` (orange that keeps 4.5:1 contrast), live states burgundy `#8B2E3B`. The primary action uses the brand gradient (`#8B2E3B` to `#FF7A00` to `#FFA500`), matching `PillButton`. Type: Archivo (`font-display`, semi-expanded via `font-stretch: 112%`) for headings, Inter for body, JetBrains Mono only inside demonstrations.

**Fonts.** All four families load through `next/font/google` in `src/app/layout.tsx` (self-hosted, applied as CSS variables on `<body>`). The previous `@import` of Google Fonts in `globals.css` was being dropped by the bundler, so those fonts never loaded.
