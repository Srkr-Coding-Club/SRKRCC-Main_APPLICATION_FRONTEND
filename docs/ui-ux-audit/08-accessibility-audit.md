# 08. Accessibility audit (WCAG 2.2 AA)

Not a certification. Automated checks (axe-core 4.10, rule sets wcag2a, wcag2aa, wcag21aa, wcag22aa, best-practice) find roughly a third of real problems; they were combined with scripted keyboard tests (Playwright key events) and a read of the code. **No screen reader, switch device or real touch device was used** (limitation L5).

## 1. Method
* Crawl: 43 routes x 8 viewports x role, dark theme; 2 viewports in light theme. the crawl JSON written by `crawl.mjs`.
* Per-tab probe of the 16 admin hackathon tabs (`tabs.mjs`).
* Keyboard and structure flows (`flows.mjs`, `select-keyboard.mjs`): 11 checks, baseline vs fixed build.
* Unit tests with axe (`FormSelect`, registration fields).

## 2. Findings by success criterion

| WCAG | ID | Finding | Evidence | Status |
|---|---|---|---|---|
| 1.4.3 Contrast (min) | COLOR-001..008 | See 07. Light theme, all 43 routes at 375/1440: 367 failing nodes -> 78 (hackathon routes 298 -> 32); dark theme, 8 viewports: 567 -> 132 (hackathon routes 315 -> 92, all 92 are one pulsing 'live' date badge measured mid-animation) | axe | Mostly fixed; remainder listed in 07 |
| 1.4.11 Non-text contrast / 2.4.11 Focus appearance | A11Y-014 | The global focus ring was `#FF7A00`: 2.55:1 on the light ground (needs 3:1). Input focus used the same colour | contrast math, code | Fixed: ring uses `journey-accent` (4.97:1 light, ~7.9:1 dark); shared inputs use it too |
| 1.3.1 Info and relationships | A11Y-001 | Registration errors not associated with fields; required-checkbox error missing | `flows.mjs`, Vitest | Fixed |
| 1.3.1 | A11Y-003 | 18 unlabeled controls on the admin Settings tab (axe `label` x8, `select-name`) | `tabs.mjs` | Fixed on the audited tabs; ~53 other `<label className={LABEL}>` remain unbound |
| 1.3.1 / 2.4.6 | A11Y-005 | Heading levels skipped: h1 -> h3 on 15 of 16 admin tabs, h2 -> h4 on public hackathon pages | axe heading-order | Fixed |
| 1.3.1 | A11Y-006 | Nested `<main>` on 15 pages (axe landmark-main-is-top-level, no-duplicate-main, unique) | axe, 20 pages in light crawl | Fixed |
| 2.4.1 Bypass blocks | A11Y-006 | No skip link; the navbar precedes every page | `flows.mjs` | Fixed |
| 2.4.2 Page titled | A11Y-012 | Six participant pages and every admin page shared one title | crawl titles | Fixed for hackathon routes, login, signup |
| 2.1.1 Keyboard | A11Y-002 | `FormSelect` could not be operated with arrows; Escape did not close it | `select-keyboard.mjs` | Fixed |
| 2.1.1 / 4.1.2 | A11Y-004 | Admin tab strip: 16 Tab stops, no arrows, no `tabpanel` | `flows.mjs` | Fixed |
| 2.1.2 No keyboard trap / 3.3.4 | A11Y-002 | Escape inside the select closed the surrounding dialog and discarded input | Vitest | Fixed |
| 2.4.11 Focus not obscured | - | Fanned cards on the listing: focus on a card did not bring it forward | `flows.mjs` | Fixed (focus fans the stack) |
| 2.5.8 Target size (min 24px) | A11Y-009 | Breadcrumb 35x15, back links 119x20, tag remove 12x12, row actions 20x20, contact links 80x20, footer e-mail 193x16, "Forgot?" 36x15 | `crawl`, `tabs.mjs` | Fixed (list above). Remaining below 24px: native 16px checkboxes whose label is the real target, `/admin/csv-ingestion` tabs 101x23, `/blogs` "Coming Soon" 96x16 |
| 4.1.2 Name, role, value | A11Y-010 | Icon-only member actions named only by `title` | code | Fixed |
| 4.1.2 | A11Y-008 | QR codes without role/name | axe svg-img-alt | Fixed |
| 4.1.2 | A11Y-011 | Unnamed `<select>` (`/admin/members` x3, `/admin/attendance/scan` x2) and the flag toggle: named. Still open: unnamed icon button on `/admin/builder`, unfocusable scroll region on `/admin/users` | axe | In progress (outside the hackathon module) |
| 2.4.6 / 1.3.1 | A11Y-007 | `/login` had no `h1` on phones | axe page-has-heading-one | Fixed |
| 2.4.6 | A11Y-011 | 11 of 20 admin routes have no `h1` | axe | **Open** |
| 3.3.1 / 3.3.3 | - | Error text says what is wrong and how to fix it ("Team name is required."); server errors are shown under the field | `flows.mjs` | Pass |
| 3.3.2 Labels or instructions | - | Public forms: `FieldLabel` with visible label and required marker | code | Pass |
| 1.4.4 Resize text / 1.4.10 Reflow | - | No horizontal scroll at 320px (= 400% zoom of 1280) on any public, participant or admin route | crawl, 0 overflow | Pass |
| 1.4.12 Text spacing | - | Not tested | - | Not tested |
| 2.3.3 / motion | - | Global `prefers-reduced-motion: reduce` rule; the fan-out card animation skips its entrance when reduced motion is set | `globals.css`, `BounceCards.tsx` | Pass (code) |
| 1.4.1 Use of colour | - | Registration status pills carry text; closed/full states carry icon + text; error fields carry text under them, not only a red border | code | Pass |
| 2.2.2 Pause, stop, hide | - | The announcement marquee pauses on hover (CSS); pausing on keyboard focus and toast timing were not tested | `globals.css` | Not tested |

## 3. Keyboard walkthrough results (Playwright)
| Check | Baseline | Fixed |
|---|---|---|
| First Tab stop on a page is a skip link that is visible on focus and lands on `<main>` | fail (first stop: logo) | pass |
| Exactly one `<main>` | fail (2) | pass |
| Registration: Enter on empty form puts an announced error on the name field | fail | pass |
| Registration: ArrowDown opens the picker, Escape closes the list only | fail (Escape closed the dialog) | pass |
| Server-side name clash is announced next to the field | fail | pass |
| Section tabs keep the current section in view | fail (x=1371 in a 375px bar) | pass |
| Admin tabs: ArrowRight/End; one tab stop; panel wired | fail x3 | pass x3 |
| Listing: focus fans the cards | fail | pass |

## 4. Not covered
Screen reader announcement quality (the `role="alert"` timing on a freshly mounted node varies by AT), voice control, forced-colours mode, text-spacing override, drag alternatives (none exist in the hackathon module), authentication flows beyond the sign-in card, zoom to 200% on desktop.
