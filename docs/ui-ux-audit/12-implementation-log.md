# 12. Implementation log

Nothing was committed (`git commit` needs explicit per-commit approval). All changes are in the working tree of branch `dev`. About 170 files changed; most are mechanical token swaps (see "Codemods"). Business logic, API contracts, routing, auth and validation rules were not touched.

## Method per stage
Change -> `tsc --noEmit` -> Vitest -> production build -> targeted probe (`e2e-audit/*.mjs`) -> full crawl of the built site -> compare with the untouched-`HEAD` baseline served from a git worktree.

## Stage 1 - Critical / cross-cutting

| # | Change | Files | Why (issue) | Verified by |
|---|---|---|---|---|
| 1 | Admin navbar switches to the hamburger at `xl` (1280) instead of `lg` (1024). The desktop bar needs about 1211px, so 16 of the 20 admin routes scrolled sideways by 187px at 1024x768 (the other four rendered the error boundary in the fixtures) | `components/admin/AdminNavbar.tsx` | RESP-001 | crawl at 1024x768, admin routes |
| 2 | One `<main>` per page: removed nested `<main>` / `motion.main` from 15 files; added a skip link as the first tab stop and `id="main-content"` on the layout's `<main>` | `app/layout.tsx`, `app/{403,error,forbidden,not-found,login,signup,profile,codequest,certificates,forms/[slug]}`, `LoginCard`, `SignupCard`, `ModuleUnavailable`, `ScannerGuard` | A11Y-006 | `flows.mjs` (skip link, one `<main>`), axe `landmark-*` |
| 3 | `/login` now has an `h1` on phones (the card heading was `h2`; the page `h1` is hidden below `lg`) | `LoginCard.tsx` | A11Y-007 | axe `page-has-heading-one` |

## Stage 2 - Hackathon user module

| # | Change | Files | Issue |
|---|---|---|---|
| 4 | Registration form: new `FieldError` + `fieldErrorId` in `InputField.tsx`; errors are `role="alert"`, linked by `aria-describedby`, rose-600/400 for 4.5:1. The error of a **required checkbox question was never rendered** (the component returned before reaching it); it now is | `ui/InputField.tsx`, `hackathons/TeamFormModal.tsx`, `hackathons/RegistrationDetailsFields.tsx` | A11Y-001, HACK-USER-003 |
| 5 | `FormSelect`: Escape closes the list and returns focus (and does not close a surrounding dialog), Arrow/Home/End navigate, Tab closes, accessible name (`aria-label` keeps the chosen value in the name, or `aria-labelledby`) | `ui/FormSelect.tsx` and callers | A11Y-002 |
| 6 | Listing heading "Upcoming Hackathons (N)" -> "All Hackathons (N)" (it counted closed events) | `app/hackathons/page.tsx` | HACK-USER-001 |
| 7 | `PageHero` eyebrow wraps instead of truncating ("SRKR CODING CLUB HACK...") at 320px | `PageHero.tsx` | TYPO-003 |
| 8 | Listing card: 10px phone buttons -> 12px | `HackathonCard.tsx` | HACK-USER-002 |
| 9 | Section tab bar keeps the section being read in view (it was at x=1371 in a 375px bar) | `hackathons/page/SectionNav.tsx` | RESP-004 |
| 10 | Detail `h1` weight aligned with the rest of the participant module; status pill wording aligned with admin | `HackathonDetailClient.tsx` | TYPO-001, HACK-CONS-001 |
| 11 | Heading levels (h4 after h2) | `HackathonFAQSection`, `RoundsTimeline`, `ProblemStatementsExplorer` | A11Y-005 |
| 12 | Team member rows: long names/e-mails wrap instead of truncating; icon-only leader/remove buttons get names | `app/hackathons/[slug]/dashboard/page.tsx` | HACK-USER-005, A11Y-010 |
| 13 | Touch targets: back links, contact links, "Browse people", "View Full Details" (min 24-44px) | `HackathonDetailClient`, `check-in`, `finder`, `judging`, `certificate`, `dashboard`, `PeopleSections`, `ParticipantCards`, `ProblemStatementsExplorer`, `Footer` | A11Y-009 |
| 14 | QR codes get `role="img"` and a name | `ParticipantCards.tsx`, `AttendanceBadgeCard.tsx` | A11Y-008 |

## Stage 3 - Hackathon admin module

| # | Change | Files | Issue |
|---|---|---|---|
| 15 | Settings tab: 17 label/control pairs bound with `htmlFor`/`id` (`useId`); linked-form select named | `HackathonSettingsTab.tsx` | A11Y-003 |
| 16 | `TagInput`, `MarkdownEditor`, team search get accessible names; tag remove buttons 24px | `TagInput.tsx`, `MarkdownEditor.tsx`, `RegistrationControlsTab.tsx`, `TeamsAdminTab.tsx` | A11Y-003, A11Y-009 |
| 17 | Admin inputs 16px on phones (iOS zoomed the page on focus; 27 inputs on the Settings tab) | `admin/hackathon/shared.ts`, `TagInput`, `MarkdownEditor` | RESP-005 |
| 18 | Control-room tabs: roving tabindex, arrows/Home/End, `tabpanel` wiring, active tab scrolled into view, 44px on phones, sr-only `h2` so headings no longer jump h1 -> h3 | `admin/hackathon/HackathonManager.tsx` | A11Y-004, A11Y-005, RESP-003 |
| 19 | Breadcrumb links 24px, 11px, decorative separators hidden | `admin/AdminNavbar.tsx` | A11Y-009 |
| 20 | Admin list heading icon no longer floats away from a wrapped title; `AdminHeader` title no longer squeezed by its badge at 375px | `app/admin/hackathons/page.tsx`, `admin/AdminHeader.tsx` | HACK-ADMIN-001, RESP-002 |

## Stage 4 - Design-system corrections (tokens kept, usage fixed)

| # | Change | Scope | Issue |
|---|---|---|---|
| 21 | New token `--journey-on-accent` / `journey-on-accent`: text on solid accent fills. Dark `13 14 21` (the existing dark ground), light `250 250 252` (the existing light ground). 99 buttons/pills switched from `text-white` | whole app | COLOR-001 |
| 22 | `text-[#FF7A00]` -> `text-journey-accent` (282 sites, theme-aware token that already existed; identical in dark) | whole app except `hero-intro` | COLOR-002 |
| 23 | `--journey-muted` light `111 111 127` -> `104 104 120` (4.08 -> 4.52:1 on the worst measured tint) | `globals.css` | COLOR-003 |
| 24 | `text-slate-500` paired with `dark:text-slate-400` (336 sites; 4.04:1 on the dark ground -> 7.7:1) | whole app | COLOR-004 |
| 25 | `text-slate-400` -> `text-slate-500 dark:text-slate-400` (89 sites; 2.5:1 on light) | hackathon module + `components/ui` | COLOR-005 |
| 26 | `text-rose-500`, `text-amber-600` paired with rose-600 / amber-700 (light) and the existing dark shade (185 sites) | whole app | COLOR-006 |
| 27 | Hackathon status/accent chips: emerald-800, sky-700, orange-800, `journey-accent` instead of five ad-hoc shades; `StatusPill` tones one step darker, label 11px | hackathon module, `StatusPill.tsx` | COLOR-007 |
| 28 | Sub-12px type: 9px and 10px -> 11px in the hackathon module and shared pills | 16 files | TYPO-002 |
| 29 | Solid-accent button pairs: emerald-600/amber-500/sky-600 with white -> 700 shades | hackathon module | COLOR-006 |

## Codemods (kept in the repo so the sweeps can be audited and re-run)
`e2e-audit/codemod-slate.py` (items 24, 25), `e2e-audit/codemod-status-text.py` (item 26). The accent-fill and `#FF7A00` text sweeps were one-off regex passes reviewed by diff and verified by `tsc`, tests, build and crawl.

## Additions made after the first verification round

| # | Change | Files | Issue |
|---|---|---|---|
| 30 | Certificate: landscape aspect ratio only from `sm`; footer no longer spills over the frame on phones. The always-light sheet keeps its fixed colours (a global dark-text sweep had touched it and was reverted there) | `hackathons/CertificateSheet.tsx` | RESP-006 |
| 31 | Per-route titles: `layout.tsx` with `metadata.title` for dashboard, finder, check-in, judging, certificate, manage, login, signup, `/admin/hackathons`; certificate page gets an `sr-only` `h1` | 9 new layouts, `certificate/page.tsx` | A11Y-012, A11Y-005 |
| 32 | Focus ring and shared input focus colour use `journey-accent` (2.55:1 -> 4.97:1 on light) | `globals.css`, `InputField.tsx`, `admin/hackathon/shared.ts` | A11Y-014 |
| 33 | Listing fan-out: keyboard focus now spreads the cards, blur folds them | `ui/BounceCards.tsx` | HACK-USER-006 |
| 34 | Stage timeline tones: sky/emerald solid fills 700, soft text emerald-800 | `hackathons/page/stageVisuals.ts` | COLOR-006 |
| 35 | Sponsor name on its always-white tile uses fixed navy (it was near-white in dark theme, 1.01:1) | `hackathons/page/PeopleSections.tsx` | HACK-USER-010 |
| 36 | Names for unnamed admin controls found by axe: member filters (3), attendance selects (2), flag toggles (`role=switch`) | `MembersTab`, `AttendanceScannerTab`, `FlagsTab` | A11Y-011 (part) |
| 37 | Targets: footer links, navbar "Login", admin "Main Site" / user name links | `Footer.tsx`, `Navbar.tsx`, `AdminNavbar.tsx` | A11Y-009 |
| 38 | Empty-state captions on `/events`, `/career`, `/iconcoders`: `dark:text-slate-600` (2.6:1) -> `dark:text-slate-400` | 3 pages | COLOR-005 |
| 39 | `e2e/routes-responsive.spec.ts` gains a 1024x768 size, the one that exposed RESP-001 | spec | TEST-001 |
| 40 | Documentation: `docs/technical-learning-guide.md` section on contrast, landmarks, titles and form conventions; `e2e-audit/README.md` | docs | AGENTS.md rule 12 |

## Completion pass (review of everything above)
| # | Change | Files | Issue |
|---|---|---|---|
| 41 | Mobile register bar on the long detail page: appears once the header button scrolls out (scroll position read directly, because anchor jumps skip IntersectionObserver transitions), leaves room for the back-to-top button | `HackathonDetailClient.tsx` | HACK-USER-004 |
| 42 | Listing: "Card 1 of 3" status line under the arrows; section min-height 100vh -> 70vh (the empty band above the footer) | `ui/BounceCards.tsx`, `app/hackathons/page.tsx` | HACK-USER-007/008 |
| 43 | Team size written with an en dash on the detail page like everywhere else | `HackathonDetailClient.tsx` | HACK-CONS-005 |
| 44 | 37 more admin controls named from their visible label (`aria-label`, safe inside lists) with a re-runnable codemod | 8 admin files, `e2e-audit/codemod-labels.py` | A11Y-003 |
| 45 | Builder field-type menu, users table scroll region (focusable, named), flag switch fallback name | `FormBuilderTab`, `UsersTab`, `FlagsTab` | A11Y-011 |
| 46 | Public form buttons and the scanner button: gradient + white text (2.6-3.4:1) replaced by the solid accent fill with `journey-on-accent` | `forms/[slug]/page.tsx`, `AttendanceScannerTab.tsx` | COLOR-009 |
| 47 | Last two accent-on-tint chips in the hackathon module (`Next`, `OI-xxx`) | `DatesAndPrizes.tsx`, `ProblemStatementsExplorer.tsx` | COLOR-008 |
| 48 | `/admin/forms` header stacks title above actions below `sm` | `FormsRegistryTab.tsx` | APP-UI-004 |
| 49 | Audit stand-in API moved to port 8100 (`FAKE_PORT`); the real Django dev server was found running on 8000 mid-session and was not touched | `e2e-audit/fake-backend.mjs`, README | tooling |
| - | **Tried and reverted:** an automatic sr-only `h1` for admin pages. It cleared `page-has-heading-one` but broke two existing accessibility specs (`heading-order`, because tab bodies start at `h3`). The proper fix is a real `h1` per admin tab header | `AdminNavbar.tsx` | A11Y-011 (open) |

## Lessons worth keeping
* A codemod that swaps a colour for its dark pair is only safe when the surface follows the theme. Three surfaces do not: the certificate sheet, the sponsor tiles and the email preview. The certificate was caught by reading the diff of changed files against a list of fixed-light containers; keep that check when running such sweeps.
* The stand-in API needs the same payload shapes as the real one. Early crashes (`reading 'length'` on `/my-team/`) were fixture mistakes, and they hid real findings for an hour.

## Tests added and one modified
* `src/components/hackathons/__tests__/IdeaPanel.test.tsx`: one line made race-free (`findByRole` instead of `getByRole`), see 09.
* `src/components/ui/__tests__/FormSelect.test.tsx` (6)
* `src/components/hackathons/__tests__/RegistrationDetailsFields.test.tsx` (5)
* `src/components/hackathons/__tests__/TeamFormModal.test.tsx` (4)
* `e2e-audit/flows.mjs` (12 browser checks; 1 pass / 11 fail on baseline, 12 / 0 after)

## Not done on purpose
See file 11, "Deferred". Highlights: no sticky register bar on the detail page, no phone-specific admin tab switcher, forms-page gradient buttons, remaining unlabeled admin fields outside the hackathon module, the radius-cap bypasses, light-mode accent-on-tint chips outside the hackathon module.
