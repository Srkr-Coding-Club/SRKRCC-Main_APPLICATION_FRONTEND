# 11. Remediation roadmap

Status as of the end of this audit. "Done" means implemented in the working tree and verified as stated in file 09. Issue IDs are in file 10.

## Stage 1 - Critical problems
No Critical-severity issue was found: no core workflow was blocked, no route failed to load, no secret or personal data was exposed in the UI.

| Item | Issues | Files | Acceptance criterion | Status |
|---|---|---|---|---|
| Admin pages scroll sideways at 1024px | RESP-001 | `AdminNavbar.tsx` | `scrollWidth - clientWidth <= 1` on every admin route that renders the navbar (16 of 20) at 1024x768 | Done |
| Nested `<main>`, no skip link | A11Y-006 | 15 files + `layout.tsx` | One `<main>` per page; skip link is the first Tab stop | Done |

## Stage 2 - Hackathon user module

| Item | Issues | Acceptance | Status |
|---|---|---|---|
| Registration errors announced and tied to fields; required checkbox error visible | A11Y-001, HACK-USER-003 | Vitest + `flows.mjs`: `aria-describedby` resolves to a `role=alert` node | Done |
| Problem-statement picker usable by keyboard, does not close the dialog on Escape | A11Y-002 | Vitest + `flows.mjs` | Done |
| White-on-orange CTA contrast in dark theme | COLOR-001 | axe `color-contrast` has no `#ffffff on #ff7a00` node | Done |
| Listing heading counts closed events | HACK-USER-001 | Text reads "All Hackathons (N)" | Done |
| Section tabs keep the current section in view | RESP-004 | `flows.mjs` | Done |
| Phone buttons at 10px | HACK-USER-002 | 12px | Done |
| Sticky "Register" bar on the long detail page (8,000px on a phone) | HACK-USER-004 | Bar appears after the header CTA scrolls out; leaves room for the back-to-top button | Done (`flows.mjs`, screenshot `after__sticky-register-375.png`) |
| Dashboard on phones: member row actions below the name | - | - | Deferred (Low) |

## Stage 3 - Hackathon admin module

| Item | Issues | Status |
|---|---|---|
| Labels bound to controls on Settings, Registration, Teams | A11Y-003 | Done: Settings by `htmlFor`, 37 further controls by `aria-label` from the visible label (`codemod-labels.py`) |
| iOS focus zoom (14px inputs) | RESP-005 | Done (shared `INPUT`) |
| Tabs keyboard + panel + heading | A11Y-004/005 | Done |
| 16 tabs on a phone: replace the scroll strip with a select / drawer | HACK-ADMIN-002 | Deferred (enhancement). The strip now centres the active tab, which removes the "where am I" failure |
| Tables on phones | HACK-ADMIN-003 | Tables sit in `overflow-x-auto` wrappers and no page overflowed at any viewport. Stacked-card variants are an enhancement; Deferred |
| Create-hackathon modal and rounds/ideas/submissions forms | - | Not exercised with write operations (no backend). Reviewed in code only |

## Stage 4 - Design-system corrections
Done: COLOR-001..007, TYPO-001..003 (file 12, items 21-29). Deferred: Done since: COLOR-008 (hackathon chips), COLOR-009 (form and scanner buttons). Deferred: accent text on tints outside the hackathon module, **TYPO-005** (410 uses of 11px and 204 of 10px outside the hackathon module), **APP-UI-002** (35 arbitrary radii bypass the 10px cap).

## Stage 5 - Remaining modules
Only token-level fixes reached them (items 21-26) plus the cross-cutting ones. Per-module findings are in file 02. Done: unnamed selects, builder/flags buttons, users scroll region. Deferred: 11 admin routes without an `h1` (a real `h1` per tab header; an automatic one was tried and broke the heading-order specs), empty `h3` on `/iconcoders`.

## Stage 6 - Responsive verification
8 viewports x 43 routes x 3 roles on the baseline and the fixed build (file 06). Done.

## Stage 7 - Regression testing
`tsc`, Vitest (595), production build, existing Playwright suite, new browser flows (file 09). Done; see that file for anything that did not run.

## Deferred - ordered
1. A11Y-011: a real `h1` in each of the 11 admin tab headers, then lift the tab body headings one level (M).
2. HACK-ADMIN-002: phone tab switcher for the 16 admin tabs (M, design sign-off).
3. HACK-ADMIN-003: stacked rows for the Teams and Rounds tables on phones (L).
4. COLOR-005 / TYPO-005 / APP-UI-002: token-level decisions for the design owner: 267 slate-400 uses, 600+ sub-12px labels, 35 radii (M each).
5. HACK-CONS-006: verify the organizer time-zone behaviour with a non-IST browser against a real backend (S, needs live data).
6. TEST-002: defensive defaults or per-panel error boundaries when an endpoint returns an unexpected shape (M).
