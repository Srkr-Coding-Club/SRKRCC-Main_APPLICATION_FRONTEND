# 13. Final report: UI/UX audit, responsiveness and remediation

Audit of `SRKRCC-Main_APPLICATION_FRONTEND` (branch `dev`), 2026-10-26. Highest priority: the Hackathon module, user and admin. Nothing was committed; all changes are in the working tree.

Reading guide: the numbers below are measurements of the **built production site** against a **stand-in API** (no real backend, no real data), baseline = untouched `HEAD` served from a git worktree. Every limitation is listed in section H.

## A. Application overview
* **Stack:** Next.js 15.5 App Router, React 19, TypeScript, Tailwind 3.4, `lucide-react`; BFF proxy to a Django API; cookie auth with `middleware.ts` guards.
* **Modules and routes (48 pages):** landing, marketing (about, blogs, career, 403), auth (login, signup, setup-password, verify-email), events, forms, CodeQuest, IconCoders, profile, certificates, attendance, **Hackathons** (8 participant/staff routes), **Admin** (20 routes, 16 of them tabs of the control room, plus the 16-tab hackathon manager).
* **Roles:** visitor, `NON_AFFILIATE` / `AFFILIATE` participant, `VOLUNTEER`, `JUDGE`, `CLUB_LEAD`, `ADMIN`; per-hackathon staff (Organizer / Judge / Volunteer) with 12 permissions. Detail in `00-application-discovery.md`.
* **Workflows:** discover -> detail -> sign in -> create team -> invite -> idea -> project -> check-in -> certificate; organizer: create -> configure -> publish/hide -> manage teams, rounds, judging.
* **Technical limitations:** see section H (L1-L6): no backend, no write workflows, Chromium only, no screen reader or real device.

## B. Existing design-system assessment
Documented in `01-existing-design-system.md` before any change.
* **Identity:** orange `#FF7A00`, burgundy `#8B2E3B`, navy `#1A1A2E`, gold `#FFA500`; dark-first glass panels; Inter + Poppins + Archivo + JetBrains Mono; radius capped near 10px; one icon library.
* **What was intentional and was kept:** all brand colours, all four font families and their roles, the theme model (`html.dark` + `journey-*` tokens), the glass surfaces, the radius cap policy, the sticky save bar and unsaved-change guard in admin settings, `Modal` behaviour.
* **Confirmed inconsistencies:** white text on brand orange (2.61:1), brand orange as text on light (2.55:1), light `journey-muted` (4.07:1 worst case), `slate-500` on the dark ground (4.04:1), light-theme `slate-400` (2.5:1), five ad-hoc dark-orange shades, one `h1` weight outlier, three sub-12px sizes, two parallel button-constant sets, two colour vocabularies, 35 radii bypassing the cap.
* **Corrections:** usage fixed through existing tokens; the only new token is `--journey-on-accent` (built from two existing colours); one token nudged by measurement (`--journey-muted` light `#6F6F7F` -> `#686878`). No palette, font or brand colour changed.

## C. Audit statistics
Counts come from `e2e-audit/issues.py` (one entry per underlying cause, not per screen). Full list: `10-master-issue-register.md`.

| | Count |
|---|---:|
| Entries in the register | 61 |
| **Confirmed issues** | **49** |
| Suspected, needs verification | 2 |
| Enhancement recommendations | 10 |
| Critical / High / Medium / Low (confirmed) | 0 / 8 / 18 / 23 |
| Responsive issues | 6 |
| Typography issues | 4 |
| Colour issues | 9 |
| Accessibility issues | 13 |
| Confirmed issues fixed (Fixed + Verified) | 43 |
| of which Verified in the running build | 26 |
| of which Fixed, checked by compiler/tests/code only | 17 |
| Confirmed issues remaining (Open + In Progress) | 6 |
| Enhancements / suspected items still open | 10 |
| Blocked | 0 |

No Critical issue was found: no workflow was blocked, no route failed to load, no credential or personal data was exposed.

### Measured effect (built site, 8 viewports x 43 routes x roles, `HEAD` vs fixed)
Dark theme, all routes:

| Metric | Before | After |
|---|---:|---:|
| pages | 344 | 344 |
| overflow pages | 16 | 0 |
| small targets | 3529 | 311 |
| tiny text nodes | 4409 | 4423 |
| unnamed controls | 16 | 16 |
| console errors | 104 | 80 |
| failed requests | 16 | 0 |
| load errors | 0 | 0 |

| axe rule | pages before | pages after | nodes before | nodes after |
|---|---:|---:|---:|---:|
| color-contrast | 186 | 72 | 567 | 132 |
| page-has-heading-one | 104 | 88 | 104 | 88 |
| heading-order | 80 | 24 | 80 | 24 |
| landmark-no-duplicate-main | 80 | 0 | 80 | 0 |
| landmark-main-is-top-level | 80 | 0 | 96 | 0 |
| landmark-unique | 80 | 0 | 80 | 0 |
| button-name | 11 | 11 | 11 | 11 |
| target-size | 18 | 0 | 28 | 0 |
| empty-heading | 8 | 8 | 8 | 8 |
| select-name | 16 | 0 | 40 | 0 |
| svg-img-alt | 8 | 0 | 8 | 0 |
| scrollable-region-focusable | 3 | 3 | 3 | 3 |


Dark theme, hackathon routes only (public, participant, admin hackathons):

| Metric | Before | After |
|---|---:|---:|
| pages | 104 | 104 |
| overflow pages | 2 | 0 |
| small targets | 1122 | 19 |
| tiny text nodes | 1361 | 1367 |
| unnamed controls | 8 | 8 |
| console errors | 0 | 0 |
| failed requests | 0 | 0 |
| load errors | 0 | 0 |

| axe rule | pages before | pages after | nodes before | nodes after |
|---|---:|---:|---:|---:|
| color-contrast | 93 | 32 | 315 | 92 |
| heading-order | 56 | 0 | 56 | 0 |
| svg-img-alt | 8 | 0 | 8 | 0 |
| page-has-heading-one | 8 | 0 | 8 | 0 |
| target-size | 4 | 0 | 8 | 0 |


Light theme, 375 and 1440, all routes:

| Metric | Before | After |
|---|---:|---:|
| pages | 86 | 86 |
| overflow pages | 0 | 0 |
| small targets | 776 | 81 |
| tiny text nodes | 1107 | 1107 |
| unnamed controls | 4 | 4 |
| console errors | 26 | 20 |
| failed requests | 4 | 0 |
| load errors | 0 | 0 |

| axe rule | pages before | pages after | nodes before | nodes after |
|---|---:|---:|---:|---:|
| color-contrast | 50 | 26 | 367 | 78 |
| page-has-heading-one | 26 | 22 | 26 | 22 |
| heading-order | 20 | 6 | 20 | 6 |
| landmark-no-duplicate-main | 20 | 0 | 20 | 0 |
| landmark-unique | 20 | 0 | 20 | 0 |
| landmark-main-is-top-level | 20 | 0 | 24 | 0 |
| button-name | 3 | 3 | 3 | 3 |
| empty-heading | 2 | 2 | 2 | 2 |
| select-name | 4 | 0 | 10 | 0 |
| scrollable-region-focusable | 1 | 1 | 1 | 1 |
| svg-img-alt | 2 | 0 | 2 | 0 |
| target-size | 2 | 0 | 2 | 0 |


Light theme, hackathon routes only:

| Metric | Before | After |
|---|---:|---:|
| pages | 26 | 26 |
| overflow pages | 0 | 0 |
| small targets | 247 | 5 |
| tiny text nodes | 346 | 348 |
| unnamed controls | 2 | 2 |
| console errors | 0 | 0 |
| failed requests | 0 | 0 |
| load errors | 0 | 0 |

| axe rule | pages before | pages after | nodes before | nodes after |
|---|---:|---:|---:|---:|
| color-contrast | 22 | 8 | 298 | 32 |
| heading-order | 14 | 0 | 14 | 0 |
| svg-img-alt | 2 | 0 | 2 | 0 |
| page-has-heading-one | 2 | 0 | 2 | 0 |


"Tiny text nodes" counts text under 12px; it is flat because 9px and 10px labels became 11px, not 12px. "Console errors" that remain (80 dark, 20 light) are all on the four admin routes whose fixtures return the wrong payload shape (see TEST-002); none are on hackathon routes. "Failed requests" fell from 16 to 0 because a fixture route was fixed, not an application change.

## D. Hackathon findings
**User module** (`03`): the module is well built: complete information hierarchy, status-aware actions, responsive at every size (no overflow at any viewport, including a 118-character title). What was wrong: the primary call to action was unreadable in the default theme (2.61:1), registration errors were silent for assistive technology and one of them (a required checkbox question) was never shown, the problem picker could not be used with a keyboard and Escape destroyed the dialog's input, the section tabs lost the reader's place on phones, the listing heading mislabelled a closed event as upcoming, the certificate broke on phones, and sponsor names were invisible in dark theme. All fixed.

**Admin module** (`04`): 16 tabs measured at 375px and 1024px. Found: 187px sideways overflow on every admin page at 1024px (the navigation needed 1211px), 18 unlabeled fields on the Settings tab, 14px inputs that make iOS zoom, tab strip without keyboard support, headings starting at `h3`, 12-20px tap targets. All fixed on the audited tabs; 37 further admin controls were named in the completion pass. Create/publish/delete/clone and exports could not be run without a backend (reviewed in code: destructive paths use a confirm dialog or type-the-slug dialog).

**Cross-role consistency** (`05`): the same state was worded and coloured differently on the two sides ("Registrations live" vs "Registration open", `emerald-600` vs `emerald-700`); aligned. One suspected defect needs a live check: admin date fields use the browser time zone while the public page prints IST (HACK-CONS-006).

**Registration workflow:** verified with scripted keyboard flows: empty submit, server-side name clash, picker keyboard use, rules acceptance (12 browser checks, 1 pass on baseline, 12 on the fixed build) and 15 new unit tests. A successful submission, duplicate prevention and waitlist were not run (no backend).

**Mobile responsiveness** (`06`): after the fixes no route at any of the 8 viewports scrolls sideways. Added on phones: a sticky register bar, a card position line on the listing. Remaining mobile enhancements: a phone tab switcher for the 16 admin tabs and stacked tables.

**Visual consistency** (`07`): see section B.

## E. Master issue register
Complete list with reproduction steps, impact, effort and dependencies: [`10-master-issue-register.md`](10-master-issue-register.md). Summary:

| Issue ID | Module | Route | Problem | Evidence | Priority | Recommended fix | Status |
|---|---|---|---|---|---|---|---|
| HACK-USER-001 | Hackathon user | `/hackathons` | Heading "Upcoming Hackathons (3)" counts a finished event that carries a Closed badge | a capture from `crawl.mjs` (not kept in the repo); page text | P3 | Title "All Hackathons (N)" | Verified |
| HACK-USER-002 | Hackathon user | `/hackathons` | Listing-card buttons are 10px text on phones | crawl tiny-text list; code HackathonCard | P3 | 12px (`text-xs`) | Fixed |
| HACK-USER-003 | Hackathon user | `dashboard create-team modal` | A required checkbox organizer question left unticked produced an error that was never rendered | code (early return before the error line); Vitest RegistrationDetailsFields | P1 | Render the error with `FieldError`, link by `aria-describedby` | Verified |
| HACK-USER-004 | Hackathon user | `/hackathons/[slug]` | The register button exists only in the header card of a page that is about 8,000px tall on a phone | full-page capture of /hackathons at 375px (regenerate with `crawl.mjs`) (page height) | P3 | Sticky bottom bar after the header CTA leaves the viewport (done; verified in flows.mjs) | Verified |
| HACK-USER-005 | Hackathon user | `/hackathons/[slug]/dashboard` | Member e-mails were truncated without a way to read them; long names wrapped in a very narrow column | a capture from `crawl.mjs` (not kept in the repo) | P3 | Wrap with `overflow-wrap:anywhere` | Fixed |
| HACK-USER-006 | Hackathon user | `/hackathons` | Desktop card fan overlaps neighbours: part of long titles and status chips is hidden until the pointer enters; keyboard focus did not fan the stack out | full-page capture of /hackathons at 1440px (regenerate with `crawl.mjs`); flows.mjs listing check | P3 | Focus now fans the stack out (done). Spreading by default when the container is wide enough is a design decision | Fixed |
| HACK-USER-007 | Hackathon user | `/hackathons` | At 375px one card shows at a time with arrows and no position indicator | full-page capture of /hackathons at 375px (regenerate with `crawl.mjs`) | P3 | "Card 1 of 3" status line under the arrows (done) | Fixed |
| HACK-USER-008 | Hackathon user | `/hackathons` | About 300px (desktop) / 500px (phone) of empty space between the cards and the footer | full-page screenshots | P3 | Section minimum height 100vh -> 70vh (done) | Fixed |
| HACK-USER-009 | Hackathon user | `/hackathons` | No search, filter or sort on the listing | observation (3 events) | P3 | Add status filter (open / closed) and search when more than ~6 events | Open |
| HACK-USER-010 | Hackathon user | `/hackathons/[slug] (Sponsors)` | A sponsor without a logo shows its name in `text-journey-text` on a tile that is always white, so in dark theme the name is near-white on white (1.01:1) and invisible | axe color-contrast 1.01:1 (baseline and crawl); contrast.mjs | P2 | Fixed navy text on the always-light tile | Fixed |
| HACK-ADMIN-001 | Hackathon admin | `/admin/hackathons` | Heading icon floated beside a wrapped title; description did not line up with it | a capture from `crawl.mjs` (not kept in the repo) | P3 | Top-align and `shrink-0` the icon | Fixed |
| HACK-ADMIN-002 | Hackathon admin | `/admin/hackathons/[slug]` | 16 tabs scroll sideways on a phone; the open tab is now centred but there is no edge hint or overview of all tabs | a capture from `crawl.mjs` (not kept in the repo) | P3 | Phone-only select or drawer listing the tabs | Open |
| HACK-ADMIN-003 | Hackathon admin | `rounds, teams, submissions, judging tabs` | 7 tables rely on horizontal scroll inside `overflow-x-auto`; row actions are off-screen until scrolled | code; no page overflow at any viewport | P3 | Stacked cards below `md` for the Teams and Rounds tables | Open |
| HACK-ADMIN-004 | Hackathon admin | `/admin/hackathons` | No search or filter in the hackathon list | observation | P3 | Search + status filter | Open |
| HACK-CONS-001 | Hackathon user/admin | `/hackathons/[slug] vs admin and dashboard` | Public pill said "Registrations live / closed"; dashboard and admin say "Registration open / closed" | text comparison | P3 | Public pill aligned | Verified |
| HACK-CONS-002 | Hackathon user/admin | `/hackathons` | Listing count included a closed event under an "Upcoming" title (admin shows all three correctly) | see HACK-USER-001 | P3 | See HACK-USER-001 | Verified |
| HACK-CONS-003 | Hackathon user/admin | `public pills vs `StatusPill`` | The same state used different shades on the two sides (`emerald-600` vs `emerald-700`, `#C25A00` vs `amber-700`, `sky-600`) | code, contrast.mjs | P3 | Public pills moved to the shared shades; `StatusPill` darkened one step | Verified |
| HACK-CONS-004 | Hackathon user/admin | `primary buttons` | White on orange primary buttons on both sides | axe 2.61:1 | P1 | One token for both sides | Verified |
| HACK-CONS-005 | Hackathon user/admin | `team-size text` | Detail page writes "2 - 4" (spaced hyphen), dashboard and admin "2–4" (en dash) | text | P3 | En dash everywhere (done) | Fixed |
| HACK-CONS-006 | Hackathon user/admin | `admin date fields vs public deadline` | Admin `datetime-local` uses the browser time zone while the public page prints IST | code (`toLocalInput`, `formatDateTime`) | P2 | Show the zone beside the field or store/render in IST | Open |
| RESP-001 | Admin (all) | `16 of 20 /admin/* routes` | Desktop admin navigation (needs about 1211px) appeared at 1024px, so every admin page scrolled sideways by 187px at 1024x768; the right-hand controls (theme toggle, user menu) were off-screen | crawl 1024x768, tabs.mjs; a capture from `crawl.mjs` (not kept in the repo) | P1 | Switch to the hamburger below 1280px (`lg:` -> `xl:`) | Verified |
| RESP-002 | Admin (all) | `/admin` | Admin header title squeezed between logo and "SYSTEM HIGH PRIVILEGE" badge, wrapping to 3 lines at 375px | a capture from `crawl.mjs` (not kept in the repo) | P3 | Badge wraps under the title | Fixed |
| RESP-003 | Hackathon admin | `/admin/hackathons/[slug]` | On a phone the open tab among 16 could be off-screen | shot, tabs.mjs | P2 | Centre the open tab in the strip | Verified |
| RESP-004 | Hackathon user | `/hackathons/[slug]` | Section tab bar did not scroll to the section being read (active tab at x=1371 in a 375px bar) | flows.mjs (baseline fail) | P2 | Scroll the bar to the active tab | Verified |
| RESP-005 | Hackathon admin | `all admin forms using `INPUT`` | Inputs were 14px: iOS Safari zooms the page when they are focused (27 fields on Settings, 19 on Public page) | tabs.mjs zoom count | P2 | 16px below `sm` | Fixed |
| RESP-006 | Hackathon user | `/hackathons/[slug]/certificate` | On phones the certificate footer (date, signatory, code) spilled out of the frame because a landscape aspect ratio was forced on a 335px box | a capture from `crawl.mjs` (not kept in the repo) | P2 | Aspect ratio from `sm` up; content-sized on phones | Verified |
| TYPO-001 | Hackathon user | `/hackathons/[slug]` | Detail `h1` was extrabold; the other five participant pages use semibold | grep | P3 | semibold | Fixed |
| TYPO-002 | Hackathon module | `labels, pills` | Three sub-12px sizes (9, 10, 11px) for the same kind of label | grep | P3 | 9/10 -> 11px in the module; phone buttons 12px | Fixed |
| TYPO-003 | Hackathon user | `/hackathons` | Hero eyebrow truncated to "SRKR CODING CLUB HACK..." at 320px | a capture from `crawl.mjs` (not kept in the repo) | P3 | Wrap instead of truncate | Verified |
| TYPO-004 | Hackathon user/admin | `heading faces` | Poppins (global) vs Archivo (`.journey-type`): the same `HackathonManager` renders Archivo under /hackathons/[slug]/manage and Poppins under /admin | globals.css | P3 | Decide on one face for staff screens | Open |
| TYPO-005 | App | `410x 11px, 204x 10px, 8x 9px outside the hackathon module` | Small text outside the hackathon module | grep | P3 | Same 11px floor, then raise labels to 12px | Open |
| COLOR-001 | App | `99 solid accent buttons and pills, incl. all hackathon CTAs` | White text on brand orange #FF7A00 is 2.61:1 in the default dark theme | axe; contrast.mjs | P1 | New `journey-on-accent` token (existing navy / off-white) | Verified |
| COLOR-002 | App | `282 sites` | Brand orange as text on light surfaces is 2.55:1 (prize amounts, links, icons); a theme-aware token existed | axe light | P1 | `text-journey-accent` | Verified |
| COLOR-003 | App | `all captions` | `--journey-muted` light is 4.07-4.48:1 on tinted surfaces | axe light | P2 | `#686878` | Verified |
| COLOR-004 | App | `336 sites (admin, hackathon admin)` | `text-slate-500` is 4.04:1 on the dark ground | axe, contrast.mjs | P2 | Pair with `dark:text-slate-400` | Verified |
| COLOR-005 | App | ``text-slate-400` on light` | Light theme text/icons at 2.45-2.56:1 | axe light | P2 | Hackathon module + shared ui fixed (89 sites); 267 occurrences remain elsewhere | In Progress |
| COLOR-006 | App | `error, warning, status text and fills` | `rose-500` 3.76:1, `amber-600` 3.19:1, white on `amber-500` 2.15:1 / `emerald-600` 3.77:1 / `sky-600` 4.1:1 | axe | P2 | Darker light shades paired with existing dark shades (185 sites); fills to 700 | Verified |
| COLOR-007 | Hackathon module | `public chips, `StatusPill`` | Five ad-hoc dark-orange shades and sub-4.5 status text for one meaning | grep, axe | P3 | `journey-accent` / `orange-800`; `StatusPill` darker | Verified |
| COLOR-008 | App | `chips on accent tint` | Accent text on its own 10-20% tint is 3.4-4.2:1 in light | axe | P3 | `orange-800` on tints in the hackathon module (done) | Fixed |
| COLOR-009 | Forms | `/forms/[slug], AttendanceScannerTab` | White on orange gradient buttons (4 + 1), about 2.6-3.4:1 | code | P2 | Solid accent fill with `journey-on-accent` (done: 4 form buttons + scanner) | Fixed |
| COLOR-010 | App | `colour vocabularies` | Theme tokens (368 uses) and hard-coded `#FAFAFC`/`#0D0E15`/slate pairs (118+) coexist | grep | P3 | Migrate admin to tokens over time | Open |
| A11Y-001 | Hackathon user | `team form, organizer questions` | Validation messages were plain text: not announced, not associated with the field | flows.mjs (baseline `describedby=null`), Vitest | P1 | `FieldError` (`role=alert`) + `aria-describedby` + `aria-invalid` | Verified |
| A11Y-002 | Shared | ``FormSelect` (27 uses), problem picker` | No keyboard model, no accessible name; Escape closed the whole dialog and discarded input | select-keyboard.mjs, flows.mjs, Vitest | P1 | Escape/arrows/Home/End/Tab, names, stopPropagation | Verified |
| A11Y-003 | Hackathon admin | `Settings, Registration, Teams tabs` | 18 controls without programmatic labels (axe `label` x8, `select-name`) | tabs.mjs | P1 | `htmlFor`/`id` on Settings; `aria-label` from the visible label on 37 more admin controls (codemod-labels.py); names on TagInput, MarkdownEditor, search | Fixed |
| A11Y-004 | Hackathon admin | `/admin/hackathons/[slug]` | Tab strip exposed `tablist` but lacked arrows, one tab stop and `tabpanel` | flows.mjs (baseline fail x3) | P2 | Roving tabindex, key handling, panel wiring | Verified |
| A11Y-005 | Hackathon | `admin tabs, public detail` | Heading levels skipped (h1->h3 on 15 of 16 admin tabs; h2->h4 on public pages) | axe heading-order | P2 | sr-only h2 per tab; h3 for the sub-headings | Verified |
| A11Y-006 | App | `15 pages + layout` | Nested `<main>` landmarks (20 pages) and no skip link | axe landmark rules; flows.mjs | P2 | One `<main id="main-content">`, skip link as first stop | Verified |
| A11Y-007 | Auth | `/login` | No `h1` on phones | axe page-has-heading-one | P2 | `h1` on the card | Verified |
| A11Y-008 | Hackathon user | `dashboard check-in QR` | QR `svg` without role or name | axe svg-img-alt | P3 | `role=img` + label | Verified |
| A11Y-009 | App | `breadcrumb, back links, tag/row buttons, footer, contact links` | Targets under 24px (35x15, 119x20, 12x12, 193x16, 80x20...) | crawl, tabs.mjs | P3 | Minimum 24-44px | Verified |
| A11Y-010 | Hackathon user | `dashboard member actions` | Icon-only buttons named only by `title` | code | P3 | `aria-label` with the member name | Fixed |
| A11Y-011 | Other admin | `11 of 20 admin routes` | Unnamed selects, flag toggles, builder type menu and the users table scroll region are now named/focusable; 11 admin routes still have no `h1`. An injected sr-only `h1` was tried and reverted: it makes the existing heading-order tests fail because the tab bodies start at `h3` | axe (final crawl: page-has-heading-one 88 nodes); Playwright admin-editing accessibility tests | P2 | Add a real `h1` to each admin tab header (and make the body headings `h2`) | In Progress |
| A11Y-012 | App | `hackathon pages, login, signup, admin` | Many pages shared one document title | crawl titles | P3 | Per-route `metadata.title` (9 layouts) | In Progress |
| A11Y-013 | Hackathon | `buttons 32-36px` | Standard buttons are `py-2 text-xs` (32-36px): meets 24px AA but not the 44px guideline | crawl | P3 | min-h-11 below `sm` | Open |
| A11Y-014 | App | `global focus ring, inputs` | Focus ring and input focus colour `#FF7A00` is 2.55:1 on the light ground (needs 3:1) | contrast math, code; computed outline colour light rgb(194,65,12), dark rgb(255,122,0) | P2 | `rgb(var(--journey-accent))` for the ring and shared inputs | Verified |
| TEST-001 | Tests | `e2e/routes-responsive.spec.ts` | The existing responsive sweep covers 320, 390 and 768 only, so the 1024px admin overflow went unseen | file | P2 | Added a 1024px size to the sweep | Fixed |
| TEST-002 | Hackathon | `dashboard, finder, check-in, judging, manage` | Pages throw (`Cannot read properties of undefined`) when an endpoint returns an unexpected shape instead of showing a retry state (seen while building fixtures; the real API returns the expected shape) | first crawl console errors | P3 | Defensive defaults or an error boundary per panel | Open |
| APP-UI-001 | App | `button constants` | Two parallel button constant sets (`BTN_PRIMARY/GHOST/DANGER`, `BTN_ACCENT/QUIET`) with the same shape | code | P3 | One shared module | Open |
| APP-UI-002 | App | `35 arbitrary radii` | `rounded-[20-32px]` bypass the documented 10px radius cap | grep | P3 | Decide: allow hero radius token or conform | Open |
| APP-UI-003 | Marketing | `/blogs` | "Coming Soon" text button 96x16px | crawl | P3 | Make it a disabled badge or 24px+ | Open |
| APP-UI-004 | Admin forms | `/admin/forms` | Directory heading squeezed to 70px beside stacked actions at 375px; status tabs cut off | a capture from `crawl.mjs` (not kept in the repo) | P2 | Title stacked above actions below `sm` (done) | Fixed |


## F. Implementation summary
Details: `12-implementation-log.md`.
* **Files changed:** about 170 modified, 9 new route layouts, 3 new unit-test files, 1 spec extended, `docs/technical-learning-guide.md` extended; new folders `docs/ui-ux-audit/` and `e2e-audit/` (tooling, not run by the normal suites).
* **Components updated:** `FormSelect`, `InputField` (+`FieldError`), `StatusPill`, `TagInput`, `MarkdownEditor`, `PageHero`, `HackathonCard`, `HackathonCTA`, `HackathonDetailClient`, `SectionNav`, `TeamFormModal`, `RegistrationDetailsFields`, `CertificateSheet`, `BounceCards`, `HackathonManager`, `HackathonSettingsTab`, `AdminNavbar`, `AdminHeader`, `Navbar`, `Footer`, `LoginCard` and about 90 files touched mechanically.
* **Tokens preserved:** every brand colour, font, radius policy and the `journey-*` palette. **Justified token changes:** added `--journey-on-accent` (dark `13 14 21`, light `250 250 252`); `--journey-muted` light `111 111 127` -> `104 104 120`; global focus ring and shared input focus now `journey-accent`.
* **Responsive fixes:** admin navbar breakpoint, admin header wrap, certificate sheet, section tab bar, admin tab strip, 16px admin inputs, wrapped eyebrow.
* **Tests added:** `FormSelect.test.tsx` (6), `RegistrationDetailsFields.test.tsx` (5), `TeamFormModal.test.tsx` (4), a 1024px size in `e2e/routes-responsive.spec.ts`, `e2e-audit/flows.mjs` (12 browser checks).
* **Results:** `tsc` pass, `next build` pass, Vitest 595/595 (40 files, baseline 580), Playwright `chromium` 286 passed, device projects 26 passed / 1 skipped (pre-existing), audit flows 12/12 (baseline 1/12), 0 axe violations on all 16 admin hackathon tabs at 375px (baseline: violations on all 16). Details: `09-test-results.md`.

## G. Remaining issues

| Issue ID | Why it remains | Priority | Dependency | Recommended next action |
|---|---|---|---|---|
| HACK-USER-009 | No search, filter or sort on the listing | P3 | Product decision | Add status filter (open / closed) and search when more than ~6 events |
| HACK-ADMIN-002 | 16 tabs scroll sideways on a phone; the open tab is now centred but there is no edge hint or overview of all tabs | P3 | Design sign-off | Phone-only select or drawer listing the tabs |
| HACK-ADMIN-003 | 7 tables rely on horizontal scroll inside `overflow-x-auto`; row actions are off-screen until scrolled | P3 | - | Stacked cards below `md` for the Teams and Rounds tables |
| HACK-ADMIN-004 | No search or filter in the hackathon list | P3 | - | Search + status filter |
| HACK-CONS-006 | Admin `datetime-local` uses the browser time zone while the public page prints IST | P2 | Live backend + non-IST browser to confirm | Show the zone beside the field or store/render in IST |
| TYPO-004 | Poppins (global) vs Archivo (`.journey-type`): the same `HackathonManager` renders Archivo under /hackathons/[slug]/manage and Poppins under | P3 | Design decision | Decide on one face for staff screens |
| TYPO-005 | Small text outside the hackathon module | P3 | - | Same 11px floor, then raise labels to 12px |
| COLOR-005 | Partly done: Light theme text/icons at 2.45-2.56:1 | P2 | - | Hackathon module + shared ui fixed (89 sites); 267 occurrences remain elsewhere |
| COLOR-010 | Theme tokens (368 uses) and hard-coded `#FAFAFC`/`#0D0E15`/slate pairs (118+) coexist | P3 | - | Migrate admin to tokens over time |
| A11Y-011 | Partly done: Unnamed selects, flag toggles, builder type menu and the users table scroll region are now named/focusable; 11 admin routes still have no `h | P2 | - | Add a real `h1` to each admin tab header (and make the body headings `h2`) |
| A11Y-012 | Partly done: Many pages shared one document title | P3 | Other admin tabs open | Per-route `metadata.title` (9 layouts) |
| A11Y-013 | Standard buttons are `py-2 text-xs` (32-36px): meets 24px AA but not the 44px guideline | P3 | - | min-h-11 below `sm` |
| TEST-002 | Pages throw (`Cannot read properties of undefined`) when an endpoint returns an unexpected shape instead of showing a retry state (seen whil | P3 | Check against real failure modes | Defensive defaults or an error boundary per panel |
| APP-UI-001 | Two parallel button constant sets (`BTN_PRIMARY/GHOST/DANGER`, `BTN_ACCENT/QUIET`) with the same shape | P3 | - | One shared module |
| APP-UI-002 | `rounded-[20-32px]` bypass the documented 10px radius cap | P3 | Design decision | Decide: allow hero radius token or conform |
| APP-UI-003 | "Coming Soon" text button 96x16px | P3 | - | Make it a disabled badge or 24px+ |


## H. Final verification

Legend: [x] done and evidenced, [~] partly done, [ ] not done / not possible here.

### Application discovery
- [x] All discoverable modules inventoried (48 pages, 5 API routes) - `00`
- [x] Routes identified; 7 pages not crawled (`/account/*` x3 need emailed tokens, `/attendance/scan`, `/certificates/verify/[code]`, `/codequest/batch-schedule`, `/events/[slug]`, `/forms/[slug]`: covered only by the repository's own e2e specs) - `09`
- [x] User roles documented
- [x] Major user journeys mapped
- [x] Baseline build and test results recorded (tsc pass, Vitest 580/580, build pass)
- [x] Inaccessible routes documented

### Existing theme preservation
- [x] Brand identity documented - `01`
- [x] Existing colours preserved
- [x] No replacement palette
- [x] Font family preserved
- [x] Typography inconsistencies reviewed
- [x] Colour inconsistencies reviewed
- [x] Shared component styles reviewed
- [x] Global token changes assessed (measured before and after; the crawl shows no new contrast failure)

### Hackathon user module
- [x] Listing, cards, details audited
- [~] Registration workflow tested: validation, errors, keyboard and server-error paths tested; a successful submission against a real backend was not
- [x] Validation reviewed
- [~] Success and error states verified: error states yes; success states code-reviewed only
- [x] Participant dashboard reviewed
- [~] Registration status consistency checked across screens (wording aligned; no live data)
- [x] Mobile user journey walked at 375x812 (confirmation step code-reviewed)

### Hackathon admin module
- [x] Dashboard (Overview) audited
- [~] Event creation: modal reviewed in code, not submitted
- [x] Event editing (Settings tab) reviewed and measured
- [~] Form validation: client-side rules read; not exercised
- [~] Listing and filtering: listing reviewed; there is no filter (enhancement)
- [~] Participant management reviewed (tables, search); no live data
- [ ] Administrative actions tested (publish, status change, export): needs a backend
- [x] Destructive actions checked in code (confirm dialog, type-the-slug)
- [x] Mobile admin layouts tested (16 tabs at 375px)

### Responsiveness
- [x] 320x568, 375x812, 430x932, 768x1024, 1024x768, 1366x768, 1440x900, 1920x1080 tested on 43 routes
- [x] Horizontal overflow investigated (one real case found and fixed)
- [x] Dialogs and dropdowns checked (create-team sheet, `FormSelect`)
- [~] Mobile forms checked (16px fields; the on-screen keyboard cannot be simulated)
- [x] Important content remains accessible

### Accessibility
- [x] Keyboard navigation checked (scripted)
- [x] Focus indicators checked (contrast of the ring measured and fixed)
- [x] Form labels checked
- [x] Error associations checked
- [x] Contrast reviewed (axe on every page, probe per failure)
- [x] Accessible icon names checked
- [~] Dialog focus management: `Modal` trap read and used in tests; not separately tested
- [~] Reduced-motion support considered (global rule and card animation read; not run with emulation)
- [ ] Screen-reader testing, text-spacing override, forced colours: not done

### Quality assurance
- [x] Build checked (baseline and fixed)
- [x] Existing tests executed (Vitest 595/595; Playwright: chromium 286 passed, devices 26 passed / 1 skipped)
  - one existing test (`IdeaPanel`, a latent race inside the test) became flaky once 15 tests were added to the suite; made race-free, 4 of 4 full runs pass (`09`, section 6)
- [x] Critical Playwright workflows tested (12 flow checks + 15 unit tests + a new 1024px sweep size)
- [x] Browser console reviewed (no error on any hackathon route; remaining errors are fixture-induced on four admin routes)
- [x] Failed network requests investigated (fixture route fixed)
- [~] Visual regressions reviewed: before/after screenshots compared by eye for the key pages; no pixel-diff tool was introduced
- [x] Existing functionality preserved (no business logic touched; all tests pass)
- [x] Fixed issues verified (see the Verified column)
- [x] Remaining issues documented (G)

### Limitations (what this audit cannot claim)
**L1** the real backend was not run; **L2** no write workflow was executed; **L3** fixtures first had wrong payload shapes (corrected; pages that crash on a wrong shape are TEST-002); **L4** the WebGL intro was not judged; **L5** no real device, keyboard, or screen reader; **L6** Chromium only (existing `devices.spec.ts` covers Firefox/WebKit for forms). The 1.4.12 text-spacing criterion and zoom to 200% on desktop were not tested.
