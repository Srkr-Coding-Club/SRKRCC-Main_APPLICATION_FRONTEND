# 03. Hackathon user module

Routes: `/hackathons`, `/hackathons/[slug]`, `.../dashboard`, `.../finder`, `.../check-in`, `.../judging`, `.../certificate`, `.../manage`.
Evidence base: baseline (`HEAD`) and fixed builds crawled at 8 viewports in dark theme and 2 in light theme, three fixture hackathons (open with banner-less header, closed-and-full with a 118-character title, past), a participant with a team whose second member has a 36-character name, and a participant without a team. No backend: nothing was submitted to a real server.

## 1. Discovery and listing `/hackathons`

| ID | Observation | Evidence | Verdict | Status |
|---|---|---|---|---|
| HACK-USER-001 | Heading said "Upcoming Hackathons (3)" while one of the three cards is a finished event with a "Closed" badge | a capture from `crawl.mjs` (not kept in the repo) | Confirmed (content is misleading) | Fixed: "All Hackathons (N)" |
| HACK-USER-006 | Desktop "bounce stack": cards are rotated and overlap by ~48px plus rotation; at rest the middle card's long title is cut by the right card ("The National Inter-Collegiat...") and the status chip is clipped until the pointer enters. Keyboard focus did not fan the stack out | the screenshots above; `e2e-audit/flows.mjs` ("listing: focusing a card control spreads the cards": baseline rotation stays 7, fixed 0) | Confirmed visually; keyboard part confirmed by test | Keyboard fixed (focus now fans the stack). Overlap at rest left as designed |
| HACK-USER-007 | At 375px only one card is visible, with arrows and no "1 of 3" indicator; a visitor can miss the other events | full-page capture of /hackathons at 375px (regenerate with `crawl.mjs`)  (full page) | Enhancement | Open |
| HACK-USER-008 | About 300px (desktop) / 500px (phone) of empty dark space between the cards and the footer | full-page shots | Confirmed, Low | Open |
| HACK-USER-002 | Phone card buttons were 10px text ("Register Team") | `crawl` tiny-text list | Confirmed | Fixed: 12px |
| TYPO-003 | Hero eyebrow truncated to "SRKR CODING CLUB HACK..." at 320px | a capture from `crawl.mjs` (not kept in the repo) | Confirmed | Fixed: wraps |

Card content is complete and consistent: category chip, date range in IST, title, markdown-stripped description, theme, prize pool, registered teams, and a status-aware primary action ("Register Team" / "Registration opens soon" / "Registration Closed"). Statuses come from the record (`is_registration_open`, `status`, `registration_opens_at`); nothing is invented. Search, filters and pagination do not exist on this page (three events); recorded as an enhancement for a season with many events (HACK-USER-009).

## 2. Detail page `/hackathons/[slug]`

Structure (checked at all viewports): banner, header card (mode, status, calendar, share, title, organizer, theme, key facts, tags), sticky section tabs, then Stages, Details, Dates, Prizes, Problem statements, Announcements, Results, Rules, Mentors, Judges, Sponsors, Contact, FAQ. Optional sections only render when the record has them. The registration card is sticky on desktop; on phones the same call to action sits at the bottom of the header card.

| ID | Observation | Evidence | Status |
|---|---|---|---|
| COLOR-001 | "Sign in to register a team" / "Register Team": white on `#FF7A00` = 2.61:1 in dark theme (the default) | axe, `contrast.mjs` | Fixed (`journey-on-accent`, 7:1) |
| COLOR-002 | Prize amounts `text-[#FF7A00]` 2.55:1 on the light card | `contrast.mjs` | Fixed |
| COLOR-006/007 | Status chips ("Registrations live", "Live now", "Done", "Upcoming", "Next") 3.0-3.6:1 in light theme | `contrast.mjs` | Fixed (hackathon module: 298 failing nodes -> 32 on light; remaining are date-badge animation frames and accent-on-tint chips, see 07) |
| RESP-004 | The sticky tab bar scrolls sideways on phones; when reading "Contact" the highlighted tab sat at x=1371 inside a 375px bar, so the reader could not see where they were | `flows.mjs` check 5 (baseline fail, after pass) | Fixed |
| A11Y-005 | `h4` ("Still have questions?", open-innovation card, rounds) directly under `h2` | axe heading-order | Fixed |
| TYPO-001 | `h1` was `font-extrabold`; every other participant `h1` is `font-semibold` | grep, 6 files | Fixed |
| HACK-CONS-001 | Pill read "Registrations live" while the dashboard and admin say "Registration open" | text | Fixed |
| HACK-USER-004 | The page is ~8,000px tall on a phone and the register button exists only in the header card | full-page shot | Enhancement, open (sticky bar needs design sign-off) |
| A11Y-009 | "All Hackathons" back link 119x20; contact e-mail/phone links 122x20 / 80x20; "View Full Details" 114x16 | `crawl` | Fixed (min 24-44px) |

Long title: the 118-character title wraps to five lines at 320px without overflow (`min-w-0` on the header, verified by the overflow measurement = 0 at every viewport). Closed and full states: the call to action becomes a disabled-looking pill with a lock icon and plain wording; it does not rely on colour alone.

## 3. Registration workflow
Path: detail page -> "Sign in to register a team" (`/login?next=/hackathons/[slug]/dashboard`) -> dashboard -> "Create a team" modal (bottom sheet on phones) -> invite members by e-mail -> accept invites -> idea / project / check-in.

| ID | Observation | Evidence | Status |
|---|---|---|---|
| A11Y-001 | Validation messages were plain `<p>`: not announced, not linked to the field | `flows.mjs` 1-2 (baseline: `describedby=null`) | Fixed (`FieldError`, `role=alert`, `aria-describedby`) |
| HACK-USER-003 | A **required checkbox** organizer question that is left unticked produced an error that was never rendered (the checkbox branch returned before the error line) | code; Vitest `RegistrationDetailsFields.test.tsx` | Fixed, tested |
| A11Y-002 | Problem-statement picker (`FormSelect`): no accessible name, arrows did nothing, Escape closed the **whole dialog** and lost typed input | `select-keyboard.mjs`, `flows.mjs` 3 | Fixed, tested |
| COLOR-006 | Error text `rose-500` 3.76:1 on light | axe | Fixed: rose-600 / rose-400 |
| - | Duplicate-name error from the server (`field: "name"`) lands under the name field, not in a toast | `flows.mjs` 4 | Already worked; now announced |
| - | Required-field markers: `*` is `aria-hidden` and "(required)" is screen-reader text | `FieldLabel` | Already good |
| - | Submit shows "Saving..." and disables; Cancel disabled while busy; Escape blocked while busy | `Modal`, `TeamFormModal` | Already good |

Not testable here: a successful submission against a real server, duplicate-registration prevention, waitlist, and what happens when the API is slow or offline. The code path for each exists (`busy`, `errors.form`, `is_waitlisted`).

## 4. Participant dashboard
Header (team name, statuses), staff shortcuts, profile-completeness alert, team members with leader tools, invites, idea phase, project phase, check-in QR, certificate, team finder, rounds. Desktop two-column, phone single column.

| ID | Observation | Evidence | Status |
|---|---|---|---|
| HACK-USER-005 | Member e-mail was `truncate`d (ellipsis, no title) and long names wrapped under a 40px action column | `shot` dashboard 375 | Fixed: both wrap |
| A11Y-010 | "Make leader" / "Remove" icon buttons only had `title` | code | Fixed: names include the member |
| A11Y-008 | Check-in QR `svg` had no role/name | axe `svg-img-alt` | Fixed |
| COLOR-006 | "Complete profile" (white on amber-500, 2.1:1) and "Accept" (white on emerald-600, 3.8:1) | contrast | Fixed: amber-700 / emerald-700 |
| A11Y-012 | Browser tab said "SRKR Coding Club | Innovate, Code, Excel" for six different pages | `crawl` titles | Fixed: per-page titles |

## 5. Other participant pages
* Finder: clean at all widths; mobile numbers are shown only to leaders (privacy rule respected in the fixture). No findings besides tokens.
* Check-in (volunteer console): table-free list; checkbox 16px (label wraps the row). Low.
* Judging: empty-state only with fixtures (no submissions). Not exercised further.
* Certificate: **RESP-006 (Medium, confirmed)**. At 375px the footer row (date, signatory, verification code) spilled out of the certificate frame over the orange border because the sheet forces a landscape aspect ratio on a 335px-wide box. Fixed: the ratio applies from `sm` up; on phones the sheet grows with its content. Print is unchanged (A4 landscape is far wider than `sm`). In dark theme the sheet stays white by design, so the dark-theme text swap that the codemods applied to it was reverted (it would have been a regression).

## 6. Mobile journey (375x812)
1. `/hackathons`: hero, one card, arrows. OK; no overflow.
2. Card -> detail: header, key facts, tabs, CTA visible without scrolling past the first screen. OK.
3. Eligibility / deadline: "Registration deadline" is the second fact; eligibility lives under Details/FAQ. OK.
4. Register: sign-in redirect keeps `next`. Dashboard "Create a team" opens as a bottom sheet with a sticky header and visible Cancel / Create; keyboard-safe because `FieldLabel`/inputs are 16px (no iOS zoom).
5. Confirmation: toast "Team created / Now invite your teammates by email" (code path; not run).
6. Status: dashboard header pills.
Touch targets after fixes: back links 44px, buttons 32-36px (`BTN` is `py-2 text-xs`), contact links 24px. The 32-36px buttons meet WCAG 2.2 AA (24px) but not the 44px guideline; recorded as A11Y-013 (Low).
