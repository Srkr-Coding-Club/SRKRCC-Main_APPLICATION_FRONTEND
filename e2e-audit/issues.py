"""Single source for docs/ui-ux-audit/10-master-issue-register.md and the statistics in the final report.
Run from the repo root: python e2e-audit/issues.py   (rewrites the register, prints the statistics)
Type: C = confirmed, S = suspected (needs verification), E = enhancement recommendation.
Status: Verified = observed fixed in the running build; Fixed = changed, checked by tsc/tests/code only; Open; Blocked.
"""
import collections
import json

I = []


def add(id, typ, module, route, role, cat, desc, evidence, repro, impact, sev, pri, fix, effort, deps, status):
    I.append(dict(id=id, typ=typ, module=module, route=route, role=role, cat=cat, desc=desc, evidence=evidence, repro=repro,
                  impact=impact, sev=sev, pri=pri, fix=fix, effort=effort, deps=deps, status=status))


# ---------------------------------------------------------------- Hackathon user
add('HACK-USER-001', 'C', 'Hackathon user', '/hackathons', 'visitor', 'UX', 'Heading "Upcoming Hackathons (3)" counts a finished event that carries a Closed badge', 'a capture from `crawl.mjs` (not kept in the repo); page text', 'Open /hackathons with one closed event', 'Visitors are told a past event is upcoming', 'Low', 'P3', 'Title "All Hackathons (N)"', 'S', '-', 'Verified')
add('HACK-USER-002', 'C', 'Hackathon user', '/hackathons', 'visitor', 'UI', 'Listing-card buttons are 10px text on phones', 'crawl tiny-text list; code HackathonCard', 'Open /hackathons at 375px', 'Primary call to action is hard to read', 'Low', 'P3', '12px (`text-xs`)', 'S', '-', 'Fixed')
add('HACK-USER-003', 'C', 'Hackathon user', 'dashboard create-team modal', 'participant', 'Functional/UX', 'A required checkbox organizer question left unticked produced an error that was never rendered', 'code (early return before the error line); Vitest RegistrationDetailsFields', 'Hackathon with a required checkbox question; submit unticked', 'Participant cannot tell why the form will not submit', 'High', 'P1', 'Render the error with `FieldError`, link by `aria-describedby`', 'S', '-', 'Verified')
add('HACK-USER-004', 'E', 'Hackathon user', '/hackathons/[slug]', 'visitor, participant', 'UX', 'The register button exists only in the header card of a page that is about 8,000px tall on a phone', 'full-page capture of /hackathons at 375px (regenerate with `crawl.mjs`) (page height)', 'Scroll the detail page on a phone', 'Extra scrolling to act after reading', 'Low', 'P3', 'Sticky bottom bar after the header CTA leaves the viewport (done; verified in flows.mjs)', 'M', '-', 'Verified')
add('HACK-USER-010', 'C', 'Hackathon user', '/hackathons/[slug] (Sponsors)', 'visitor', 'Color', 'A sponsor without a logo shows its name in `text-journey-text` on a tile that is always white, so in dark theme the name is near-white on white (1.01:1) and invisible', 'axe color-contrast 1.01:1 (baseline and crawl); contrast.mjs', 'Dark theme, sponsor with no `logo_url`', 'Sponsor is not recognised on the page', 'Medium', 'P2', 'Fixed navy text on the always-light tile', 'S', '-', 'Fixed')
add('HACK-USER-005', 'C', 'Hackathon user', '/hackathons/[slug]/dashboard', 'participant', 'UI', 'Member e-mails were truncated without a way to read them; long names wrapped in a very narrow column', 'a capture from `crawl.mjs` (not kept in the repo)', 'Team with a 36-character name at 375px', 'Cannot read the full e-mail', 'Low', 'P3', 'Wrap with `overflow-wrap:anywhere`', 'S', '-', 'Fixed')
add('HACK-USER-006', 'C', 'Hackathon user', '/hackathons', 'visitor', 'UI', 'Desktop card fan overlaps neighbours: part of long titles and status chips is hidden until the pointer enters; keyboard focus did not fan the stack out', 'full-page capture of /hackathons at 1440px (regenerate with `crawl.mjs`); flows.mjs listing check', 'Open /hackathons at 1440px, Tab to a card control', 'Content hidden at rest; focused control can sit under a card', 'Low', 'P3', 'Focus now fans the stack out (done). Spreading by default when the container is wide enough is a design decision', 'S', 'Design decision', 'Fixed')
add('HACK-USER-007', 'E', 'Hackathon user', '/hackathons', 'visitor', 'UX', 'At 375px one card shows at a time with arrows and no position indicator', 'full-page capture of /hackathons at 375px (regenerate with `crawl.mjs`)', 'Open /hackathons at 375px with 3 events', 'Other events are easy to miss', 'Low', 'P3', '"Card 1 of 3" status line under the arrows (done)', 'S', '-', 'Fixed')
add('HACK-USER-008', 'C', 'Hackathon user', '/hackathons', 'visitor', 'UI', 'About 300px (desktop) / 500px (phone) of empty space between the cards and the footer', 'full-page screenshots', 'Scroll to the bottom of /hackathons', 'Looks unfinished', 'Low', 'P3', 'Section minimum height 100vh -> 70vh (done)', 'S', '-', 'Fixed')
add('HACK-USER-009', 'E', 'Hackathon user', '/hackathons', 'visitor', 'UX', 'No search, filter or sort on the listing', 'observation (3 events)', 'n/a', 'Only matters when many events exist', 'Low', 'P3', 'Add status filter (open / closed) and search when more than ~6 events', 'M', 'Product decision', 'Open')

# ---------------------------------------------------------------- Hackathon admin
add('HACK-ADMIN-001', 'C', 'Hackathon admin', '/admin/hackathons', 'admin', 'UI', 'Heading icon floated beside a wrapped title; description did not line up with it', 'a capture from `crawl.mjs` (not kept in the repo)', 'Open the list at 375px', 'Looks misaligned', 'Low', 'P3', 'Top-align and `shrink-0` the icon', 'S', '-', 'Fixed')
add('HACK-ADMIN-002', 'E', 'Hackathon admin', '/admin/hackathons/[slug]', 'admin', 'UX', '16 tabs scroll sideways on a phone; the open tab is now centred but there is no edge hint or overview of all tabs', 'a capture from `crawl.mjs` (not kept in the repo)', 'Open the control room at 375px', 'Hard to discover tabs', 'Low', 'P3', 'Phone-only select or drawer listing the tabs', 'M', 'Design sign-off', 'Open')
add('HACK-ADMIN-003', 'E', 'Hackathon admin', 'rounds, teams, submissions, judging tabs', 'admin', 'Responsive', '7 tables rely on horizontal scroll inside `overflow-x-auto`; row actions are off-screen until scrolled', 'code; no page overflow at any viewport', 'Open Teams tab at 375px with data', 'Extra effort on phones', 'Low', 'P3', 'Stacked cards below `md` for the Teams and Rounds tables', 'L', '-', 'Open')
add('HACK-ADMIN-004', 'E', 'Hackathon admin', '/admin/hackathons', 'admin', 'UX', 'No search or filter in the hackathon list', 'observation', 'n/a', 'Only matters with many events', 'Low', 'P3', 'Search + status filter', 'S', '-', 'Open')

# ---------------------------------------------------------------- Consistency
add('HACK-CONS-001', 'C', 'Hackathon user/admin', '/hackathons/[slug] vs admin and dashboard', 'all', 'UX', 'Public pill said "Registrations live / closed"; dashboard and admin say "Registration open / closed"', 'text comparison', 'Compare the three screens', 'Same state, two phrases', 'Low', 'P3', 'Public pill aligned', 'S', '-', 'Verified')
add('HACK-CONS-002', 'C', 'Hackathon user/admin', '/hackathons', 'visitor', 'UX', 'Listing count included a closed event under an "Upcoming" title (admin shows all three correctly)', 'see HACK-USER-001', '-', 'Mismatch of meaning', 'Low', 'P3', 'See HACK-USER-001', 'S', '-', 'Verified')
add('HACK-CONS-003', 'C', 'Hackathon user/admin', 'public pills vs `StatusPill`', 'all', 'Color', 'The same state used different shades on the two sides (`emerald-600` vs `emerald-700`, `#C25A00` vs `amber-700`, `sky-600`)', 'code, contrast.mjs', '-', 'Inconsistent and under 4.5:1', 'Low', 'P3', 'Public pills moved to the shared shades; `StatusPill` darkened one step', 'S', '-', 'Verified')
add('HACK-CONS-004', 'C', 'Hackathon user/admin', 'primary buttons', 'all', 'Color', 'White on orange primary buttons on both sides', 'axe 2.61:1', '-', 'See COLOR-001', 'High', 'P1', 'One token for both sides', 'S', '-', 'Verified')
add('HACK-CONS-005', 'C', 'Hackathon user/admin', 'team-size text', 'all', 'UI', 'Detail page writes "2 - 4" (spaced hyphen), dashboard and admin "2–4" (en dash)', 'text', '-', 'Cosmetic', 'Low', 'P3', 'En dash everywhere (done)', 'S', '-', 'Fixed')
add('HACK-CONS-006', 'S', 'Hackathon user/admin', 'admin date fields vs public deadline', 'admin', 'Functional', 'Admin `datetime-local` uses the browser time zone while the public page prints IST', 'code (`toLocalInput`, `formatDateTime`)', 'Edit a deadline from a non-IST browser and compare', 'Possible shifted deadlines', 'Medium', 'P2', 'Show the zone beside the field or store/render in IST', 'S', 'Live backend + non-IST browser to confirm', 'Open')

# ---------------------------------------------------------------- Responsive
add('RESP-001', 'C', 'Admin (all)', '16 of 20 /admin/* routes', 'admin', 'Responsive', 'Desktop admin navigation (needs about 1211px) appeared at 1024px, so every admin page scrolled sideways by 187px at 1024x768; the right-hand controls (theme toggle, user menu) were off-screen', 'crawl 1024x768, tabs.mjs; a capture from `crawl.mjs` (not kept in the repo)', 'Open any admin page at 1024x768', 'Admin unusable on tablets in landscape without sideways scrolling', 'High', 'P1', 'Switch to the hamburger below 1280px (`lg:` -> `xl:`)', 'S', '-', 'Verified')
add('RESP-002', 'C', 'Admin (all)', '/admin', 'admin', 'Responsive', 'Admin header title squeezed between logo and "SYSTEM HIGH PRIVILEGE" badge, wrapping to 3 lines at 375px', 'a capture from `crawl.mjs` (not kept in the repo)', 'Open /admin at 375px', 'Awkward header', 'Low', 'P3', 'Badge wraps under the title', 'S', '-', 'Fixed')
add('RESP-003', 'C', 'Hackathon admin', '/admin/hackathons/[slug]', 'admin', 'Responsive', 'On a phone the open tab among 16 could be off-screen', 'shot, tabs.mjs', 'Open ?tab=announcements at 375px (baseline)', 'Lost sense of place', 'Medium', 'P2', 'Centre the open tab in the strip', 'S', '-', 'Verified')
add('RESP-004', 'C', 'Hackathon user', '/hackathons/[slug]', 'visitor', 'Responsive', 'Section tab bar did not scroll to the section being read (active tab at x=1371 in a 375px bar)', 'flows.mjs (baseline fail)', 'Scroll to FAQ at 375px', 'Lost sense of place', 'Medium', 'P2', 'Scroll the bar to the active tab', 'S', '-', 'Verified')
add('RESP-005', 'C', 'Hackathon admin', 'all admin forms using `INPUT`', 'admin', 'Responsive', 'Inputs were 14px: iOS Safari zooms the page when they are focused (27 fields on Settings, 19 on Public page)', 'tabs.mjs zoom count', 'Focus any field on iOS Safari', 'Page jumps and must be zoomed back out', 'Medium', 'P2', '16px below `sm`', 'S', 'Confirm on a real iPhone', 'Fixed')
add('RESP-006', 'C', 'Hackathon user', '/hackathons/[slug]/certificate', 'participant', 'Responsive', 'On phones the certificate footer (date, signatory, code) spilled out of the frame because a landscape aspect ratio was forced on a 335px box', 'a capture from `crawl.mjs` (not kept in the repo)', 'Open the certificate at 375px', 'Certificate looks broken before printing', 'Medium', 'P2', 'Aspect ratio from `sm` up; content-sized on phones', 'S', '-', 'Verified')

# ---------------------------------------------------------------- Typography
add('TYPO-001', 'C', 'Hackathon user', '/hackathons/[slug]', 'visitor', 'Typography', 'Detail `h1` was extrabold; the other five participant pages use semibold', 'grep', '-', 'Inconsistent hierarchy', 'Low', 'P3', 'semibold', 'S', '-', 'Fixed')
add('TYPO-002', 'C', 'Hackathon module', 'labels, pills', 'all', 'Typography', 'Three sub-12px sizes (9, 10, 11px) for the same kind of label', 'grep', '-', 'Hard to read, three sizes for one role', 'Low', 'P3', '9/10 -> 11px in the module; phone buttons 12px', 'S', '-', 'Fixed')
add('TYPO-003', 'C', 'Hackathon user', '/hackathons', 'visitor', 'Typography', 'Hero eyebrow truncated to "SRKR CODING CLUB HACK..." at 320px', 'a capture from `crawl.mjs` (not kept in the repo)', 'Open /hackathons at 320px', 'Clipped text', 'Low', 'P3', 'Wrap instead of truncate', 'S', '-', 'Verified')
add('TYPO-004', 'E', 'Hackathon user/admin', 'heading faces', 'all', 'Typography', 'Poppins (global) vs Archivo (`.journey-type`): the same `HackathonManager` renders Archivo under /hackathons/[slug]/manage and Poppins under /admin', 'globals.css', '-', 'Minor visual difference', 'Low', 'P3', 'Decide on one face for staff screens', 'S', 'Design decision', 'Open')
add('TYPO-005', 'C', 'App', '410x 11px, 204x 10px, 8x 9px outside the hackathon module', 'all', 'Typography', 'Small text outside the hackathon module', 'grep', '-', 'Readability', 'Low', 'P3', 'Same 11px floor, then raise labels to 12px', 'L', '-', 'Open')

# ---------------------------------------------------------------- Colour
add('COLOR-001', 'C', 'App', '99 solid accent buttons and pills, incl. all hackathon CTAs', 'all', 'Color', 'White text on brand orange #FF7A00 is 2.61:1 in the default dark theme', 'axe; contrast.mjs', 'Open /hackathons/[slug] dark: "Sign in to register a team"', 'Primary action unreadable for low vision', 'High', 'P1', 'New `journey-on-accent` token (existing navy / off-white)', 'M', '-', 'Verified')
add('COLOR-002', 'C', 'App', '282 sites', 'all', 'Color', 'Brand orange as text on light surfaces is 2.55:1 (prize amounts, links, icons); a theme-aware token existed', 'axe light', 'Open /hackathons/[slug] light: prize amounts', 'Low contrast numbers that matter', 'High', 'P1', '`text-journey-accent`', 'M', '-', 'Verified')
add('COLOR-003', 'C', 'App', 'all captions', 'all', 'Color', '`--journey-muted` light is 4.07-4.48:1 on tinted surfaces', 'axe light', '-', 'Captions fail AA', 'Medium', 'P2', '`#686878`', 'S', '-', 'Verified')
add('COLOR-004', 'C', 'App', '336 sites (admin, hackathon admin)', 'all', 'Color', '`text-slate-500` is 4.04:1 on the dark ground', 'axe, contrast.mjs', 'Open admin Settings in dark', 'Helper text fails AA in the default theme', 'Medium', 'P2', 'Pair with `dark:text-slate-400`', 'M', '-', 'Verified')
add('COLOR-005', 'C', 'App', '`text-slate-400` on light', 'all', 'Color', 'Light theme text/icons at 2.45-2.56:1', 'axe light', '-', 'Helper text and counters unreadable', 'Medium', 'P2', 'Hackathon module + shared ui fixed (89 sites); 267 occurrences remain elsewhere', 'L', '-', 'In Progress')
add('COLOR-006', 'C', 'App', 'error, warning, status text and fills', 'all', 'Color', '`rose-500` 3.76:1, `amber-600` 3.19:1, white on `amber-500` 2.15:1 / `emerald-600` 3.77:1 / `sky-600` 4.1:1', 'axe', '-', 'Error messages hard to read', 'Medium', 'P2', 'Darker light shades paired with existing dark shades (185 sites); fills to 700', 'M', '-', 'Verified')
add('COLOR-007', 'C', 'Hackathon module', 'public chips, `StatusPill`', 'all', 'Color', 'Five ad-hoc dark-orange shades and sub-4.5 status text for one meaning', 'grep, axe', '-', 'Inconsistent', 'Low', 'P3', '`journey-accent` / `orange-800`; `StatusPill` darker', 'M', '-', 'Verified')
add('COLOR-008', 'C', 'App', 'chips on accent tint', 'all', 'Color', 'Accent text on its own 10-20% tint is 3.4-4.2:1 in light', 'axe', '-', 'Marginal', 'Low', 'P3', '`orange-800` on tints in the hackathon module (done)', 'M', '-', 'Fixed')
add('COLOR-009', 'C', 'Forms', '/forms/[slug], AttendanceScannerTab', 'visitor, admin', 'Color', 'White on orange gradient buttons (4 + 1), about 2.6-3.4:1', 'code', 'Open any public form', 'Submit / next buttons low contrast', 'Medium', 'P2', 'Solid accent fill with `journey-on-accent` (done: 4 form buttons + scanner)', 'S', 'Ship with the form e2e suite', 'Fixed')
add('COLOR-010', 'E', 'App', 'colour vocabularies', 'all', 'Color', 'Theme tokens (368 uses) and hard-coded `#FAFAFC`/`#0D0E15`/slate pairs (118+) coexist', 'grep', '-', 'Maintenance', 'Low', 'P3', 'Migrate admin to tokens over time', 'XL', '-', 'Open')

# ---------------------------------------------------------------- Accessibility
add('A11Y-001', 'C', 'Hackathon user', 'team form, organizer questions', 'participant', 'Accessibility', 'Validation messages were plain text: not announced, not associated with the field', 'flows.mjs (baseline `describedby=null`), Vitest', 'Submit the create-team form empty', 'Screen-reader users do not learn what is wrong', 'High', 'P1', '`FieldError` (`role=alert`) + `aria-describedby` + `aria-invalid`', 'S', '-', 'Verified')
add('A11Y-002', 'C', 'Shared', '`FormSelect` (27 uses), problem picker', 'all', 'Accessibility', 'No keyboard model, no accessible name; Escape closed the whole dialog and discarded input', 'select-keyboard.mjs, flows.mjs, Vitest', 'Focus the picker, press ArrowDown / Escape', 'Keyboard users cannot choose a problem; data loss risk', 'High', 'P1', 'Escape/arrows/Home/End/Tab, names, stopPropagation', 'M', '-', 'Verified')
add('A11Y-003', 'C', 'Hackathon admin', 'Settings, Registration, Teams tabs', 'admin', 'Accessibility', '18 controls without programmatic labels (axe `label` x8, `select-name`)', 'tabs.mjs', 'Open Settings tab; axe', 'Fields announced as "edit text"', 'High', 'P1', '`htmlFor`/`id` on Settings; `aria-label` from the visible label on 37 more admin controls (codemod-labels.py); names on TagInput, MarkdownEditor, search', 'M', '-', 'Fixed')
add('A11Y-004', 'C', 'Hackathon admin', '/admin/hackathons/[slug]', 'admin', 'Accessibility', 'Tab strip exposed `tablist` but lacked arrows, one tab stop and `tabpanel`', 'flows.mjs (baseline fail x3)', 'Press ArrowRight on a tab', 'Keyboard users tab through 16 stops', 'Medium', 'P2', 'Roving tabindex, key handling, panel wiring', 'S', '-', 'Verified')
add('A11Y-005', 'C', 'Hackathon', 'admin tabs, public detail', 'all', 'Accessibility', 'Heading levels skipped (h1->h3 on 15 of 16 admin tabs; h2->h4 on public pages)', 'axe heading-order', '-', 'Outline navigation confusing', 'Medium', 'P2', 'sr-only h2 per tab; h3 for the sub-headings', 'S', '-', 'Verified')
add('A11Y-006', 'C', 'App', '15 pages + layout', 'all', 'Accessibility', 'Nested `<main>` landmarks (20 pages) and no skip link', 'axe landmark rules; flows.mjs', 'Run axe on /login, /403, /profile', 'Landmark navigation broken; every page starts with the full navbar', 'Medium', 'P2', 'One `<main id="main-content">`, skip link as first stop', 'S', '-', 'Verified')
add('A11Y-007', 'C', 'Auth', '/login', 'visitor', 'Accessibility', 'No `h1` on phones', 'axe page-has-heading-one', 'Open /login at 375px', 'Page has no top heading', 'Medium', 'P2', '`h1` on the card', 'S', '-', 'Verified')
add('A11Y-008', 'C', 'Hackathon user', 'dashboard check-in QR', 'participant', 'Accessibility', 'QR `svg` without role or name', 'axe svg-img-alt', '-', 'Unnamed image', 'Low', 'P3', '`role=img` + label', 'S', '-', 'Verified')
add('A11Y-009', 'C', 'App', 'breadcrumb, back links, tag/row buttons, footer, contact links', 'all', 'Accessibility', 'Targets under 24px (35x15, 119x20, 12x12, 193x16, 80x20...)', 'crawl, tabs.mjs', '-', 'Hard to tap', 'Low', 'P3', 'Minimum 24-44px', 'S', '-', 'Verified')
add('A11Y-010', 'C', 'Hackathon user', 'dashboard member actions', 'participant', 'Accessibility', 'Icon-only buttons named only by `title`', 'code', '-', 'No name on touch / some AT', 'Low', 'P3', '`aria-label` with the member name', 'S', '-', 'Fixed')
add('A11Y-011', 'C', 'Other admin', '11 of 20 admin routes', 'admin', 'Accessibility', 'Unnamed selects, flag toggles, builder type menu and the users table scroll region are now named/focusable; 11 admin routes still have no `h1`. An injected sr-only `h1` was tried and reverted: it makes the existing heading-order tests fail because the tab bodies start at `h3`', 'axe (final crawl: page-has-heading-one 88 nodes); Playwright admin-editing accessibility tests', 'Run axe on /admin/events', 'No page heading for screen-reader navigation', 'Medium', 'P2', 'Add a real `h1` to each admin tab header (and make the body headings `h2`)', 'M', '-', 'In Progress')
add('A11Y-012', 'C', 'App', 'hackathon pages, login, signup, admin', 'all', 'Accessibility', 'Many pages shared one document title', 'crawl titles', 'Open two pages in two tabs', 'Cannot tell tabs apart or hear the page change', 'Low', 'P3', 'Per-route `metadata.title` (9 layouts)', 'S', 'Other admin tabs open', 'In Progress')
add('A11Y-013', 'E', 'Hackathon', 'buttons 32-36px', 'all', 'Accessibility', 'Standard buttons are `py-2 text-xs` (32-36px): meets 24px AA but not the 44px guideline', 'crawl', '-', 'Fat-finger errors on phones', 'Low', 'P3', 'min-h-11 below `sm`', 'M', '-', 'Open')
add('A11Y-014', 'C', 'App', 'global focus ring, inputs', 'all', 'Accessibility', 'Focus ring and input focus colour `#FF7A00` is 2.55:1 on the light ground (needs 3:1)', 'contrast math, code; computed outline colour light rgb(194,65,12), dark rgb(255,122,0)', 'Tab through a page in light mode', 'Focus is hard to see', 'Medium', 'P2', '`rgb(var(--journey-accent))` for the ring and shared inputs', 'S', '-', 'Verified')

# ---------------------------------------------------------------- Tests / app
add('TEST-001', 'C', 'Tests', 'e2e/routes-responsive.spec.ts', 'dev', 'Testing', 'The existing responsive sweep covers 320, 390 and 768 only, so the 1024px admin overflow went unseen', 'file', '-', 'Regression risk', 'Medium', 'P2', 'Added a 1024px size to the sweep', 'S', '-', 'Fixed')
add('TEST-002', 'S', 'Hackathon', 'dashboard, finder, check-in, judging, manage', 'participant, staff', 'Functional', 'Pages throw (`Cannot read properties of undefined`) when an endpoint returns an unexpected shape instead of showing a retry state (seen while building fixtures; the real API returns the expected shape)', 'first crawl console errors', 'Return `[]` for `/my-team/`', 'White-screen on a partial backend outage', 'Low', 'P3', 'Defensive defaults or an error boundary per panel', 'M', 'Check against real failure modes', 'Open')
add('APP-UI-001', 'E', 'App', 'button constants', 'dev', 'UI', 'Two parallel button constant sets (`BTN_PRIMARY/GHOST/DANGER`, `BTN_ACCENT/QUIET`) with the same shape', 'code', '-', 'Maintenance', 'Low', 'P3', 'One shared module', 'M', '-', 'Open')
add('APP-UI-002', 'C', 'App', '35 arbitrary radii', 'all', 'UI', '`rounded-[20-32px]` bypass the documented 10px radius cap', 'grep', '-', 'Inconsistent', 'Low', 'P3', 'Decide: allow hero radius token or conform', 'M', 'Design decision', 'Open')
add('APP-UI-003', 'C', 'Marketing', '/blogs', 'visitor', 'Accessibility', '"Coming Soon" text button 96x16px', 'crawl', '-', 'Tiny target', 'Low', 'P3', 'Make it a disabled badge or 24px+', 'S', '-', 'Open')
add('APP-UI-004', 'C', 'Admin forms', '/admin/forms', 'admin', 'Responsive', 'Directory heading squeezed to 70px beside stacked actions at 375px; status tabs cut off', 'a capture from `crawl.mjs` (not kept in the repo)', 'Open at 375px', 'Awkward header', 'Medium', 'P2', 'Title stacked above actions below `sm` (done)', 'S', '-', 'Fixed')


_order = list(dict.fromkeys(x['id'].rsplit('-', 1)[0] for x in I))
I.sort(key=lambda x: (_order.index(x['id'].rsplit('-', 1)[0]), int(x['id'].rsplit('-', 1)[1])))


def table():
    out = ['| ID | Type | Module | Route | Role | Category | Description | Evidence | Reproduction | Impact | Severity | Priority | Recommended fix | Effort | Dependencies | Status |', '|' + '---|' * 16]
    for x in I:
        t = {'C': 'Confirmed', 'S': 'Suspected', 'E': 'Enhancement'}[x['typ']]
        out.append(f"| {x['id']} | {t} | {x['module']} | `{x['route']}` | {x['role']} | {x['cat']} | {x['desc']} | {x['evidence']} | {x['repro']} | {x['impact']} | {x['sev']} | {x['pri']} | {x['fix']} | {x['effort']} | {x['deps']} | {x['status']} |")
    return '\n'.join(out)


def compact():
    out = ['| Issue ID | Module | Route | Problem | Evidence | Priority | Recommended fix | Status |', '|---|---|---|---|---|---|---|---|']
    for x in I:
        out.append(f"| {x['id']} | {x['module']} | `{x['route']}` | {x['desc']} | {x['evidence']} | {x['pri']} | {x['fix']} | {x['status']} |")
    return chr(10).join(out)


def remaining():
    out = ['| Issue ID | Why it remains | Priority | Dependency | Recommended next action |', '|---|---|---|---|---|']
    for x in I:
        if x['status'] in ('Open', 'In Progress', 'Blocked'):
            out.append(f"| {x['id']} | {'Partly done: ' if x['status'] == 'In Progress' else ''}{x['desc'][:140]} | {x['pri']} | {x['deps']} | {x['fix']} |")
    return chr(10).join(out)


def stats():
    conf = [x for x in I if x['typ'] == 'C']
    s = {
        'total': len(I), 'confirmed': len(conf), 'suspected': sum(x['typ'] == 'S' for x in I), 'enhancements': sum(x['typ'] == 'E' for x in I),
        'by_sev': collections.Counter(x['sev'] for x in conf),
        'by_pri': collections.Counter(x['pri'] for x in conf),
        'by_status': collections.Counter(x['status'] for x in I),
        'by_prefix': collections.Counter(x['id'].rsplit('-', 1)[0] for x in conf),
    }
    return s


if __name__ == '__main__':
    path = 'docs/ui-ux-audit/10-master-issue-register.md'
    s = stats()
    head = f"""# 10. Master issue register

{s['total']} entries: {s['confirmed']} confirmed issues, {s['suspected']} suspected, {s['enhancements']} enhancement recommendations. Generated from `e2e-audit/issues.py` so the counts in the final report always match this table.

Evidence refers to measurements and captures that the scripts in `e2e-audit/` regenerate (raw JSON and screenshots are not committed).
**Status**: *Verified* = seen fixed in the running production build (crawl, flow script or unit test); *Fixed* = changed and type-checked, not independently observed; *In Progress* = partly done, remainder listed in the description; *Open*; *Blocked* (none).
**Severity** (confirmed issues): Critical none. **Priority**: P1 for high-impact hackathon/accessibility/contrast issues, P2 for medium, P3 for minor.

## Statistics (confirmed issues only)
| | |
|---|---|
| Critical / High / Medium / Low | {s['by_sev'].get('Critical', 0)} / {s['by_sev'].get('High', 0)} / {s['by_sev'].get('Medium', 0)} / {s['by_sev'].get('Low', 0)} |
| P0 / P1 / P2 / P3 | 0 / {s['by_pri'].get('P1', 0)} / {s['by_pri'].get('P2', 0)} / {s['by_pri'].get('P3', 0)} |
| By area | {', '.join(f'{k} {v}' for k, v in sorted(s['by_prefix'].items()))} |
| Status (all entries) | {', '.join(f'{k} {v}' for k, v in sorted(s['by_status'].items()))} |

One underlying cause is one entry even when it appears on many screens (for example COLOR-001 covers 99 buttons).

## Register
"""
    open(path, 'w', encoding='utf-8').write(head + table() + '\n')
    print(json.dumps({k: (dict(v) if hasattr(v, 'items') else v) for k, v in s.items()}, indent=1))