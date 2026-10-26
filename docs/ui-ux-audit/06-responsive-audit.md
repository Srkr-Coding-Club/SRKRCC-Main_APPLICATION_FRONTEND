# 06. Responsive audit

Viewports tested (Chromium, `hasTouch` below 1024px): 320x568, 375x812, 430x932, 768x1024, 1024x768, 1366x768, 1440x900, 1920x1080.
Coverage per viewport: 43 route/role combinations (15 public, 8 participant, 20 admin) on the untouched `HEAD` and on the fixed build, dark theme; light theme at 375 and 1440 (86 pages each). Total 344 + 344 + 86 + 86 page loads with measurement. Source data: the crawl JSON written by `crawl.mjs`.

Overflow is measured, not assumed: `documentElement.scrollWidth - clientWidth`, with the offending elements listed (excluding `position: fixed` and content inside its own scroller). Nothing was hidden with `overflow-x: hidden` to make a page pass. The 187px case was confirmed by scrolling: on the baseline `window.scrollTo(300, 0)` reaches `scrollX = 187` with the document 1211px wide in a 1024px viewport; after the fix `scrollX = 0` and the document is 1024px (`e2e-audit/scroll-clip.mjs`).

## 1. Result per viewport (dark theme; before = `HEAD`, after = fixed build)
| Viewport | Category | Pages | Pages scrolling sideways (before -> after) | Worst overflow px (b -> a) | Targets <24px (b -> a) | Contrast nodes (b -> a) | All axe nodes (b -> a) |
|---|---|---:|---|---|---|---|---|
| 320x568 | Small mobile | 43 | 0 -> 0 | 0 -> 0 | 129 -> 30 | 66 -> 16 | 132 -> 34 |
| 375x812 | Standard mobile | 43 | 0 -> 0 | 0 -> 0 | 131 -> 31 | 73 -> 16 | 139 -> 34 |
| 430x932 | Large mobile | 43 | 0 -> 0 | 0 -> 0 | 136 -> 32 | 70 -> 17 | 136 -> 35 |
| 768x1024 | Small tablet | 43 | 0 -> 0 | 0 -> 0 | 599 -> 34 | 73 -> 16 | 137 -> 32 |
| 1024x768 | Large tablet | 43 | 16 -> 0 | 187 -> 0 | 599 -> 34 | 70 -> 17 | 154 -> 33 |
| 1366x768 | Laptop | 43 | 0 -> 0 | 0 -> 0 | 645 -> 50 | 70 -> 17 | 134 -> 33 |
| 1440x900 | Desktop | 43 | 0 -> 0 | 0 -> 0 | 645 -> 50 | 73 -> 17 | 137 -> 33 |
| 1920x1080 | Wide desktop | 43 | 0 -> 0 | 0 -> 0 | 645 -> 50 | 72 -> 16 | 136 -> 32 |

Pages still scrolling sideways after the fixes: none


Contrast nodes and axe nodes are counted per page, so the same global element (navbar, footer) counts on every page; compare before with after, not across rows.

## 2. Findings

| ID | Viewport | Page | Issue | Evidence | Fix | Status |
|---|---|---|---|---|---|---|
| RESP-001 | 1024x768 | 16 of 20 `/admin/*` (all that render the navbar) | Page scrolls sideways by **187px**: the desktop navigation bar (`hidden lg:flex`) needs about 1211px; the notification bell, theme toggle and user menu sat beyond the right edge. Offenders: `div.hidden.lg:flex`, `span.px-2.5.py-1.rounded-md right=1211` | crawl baseline; a capture from `crawl.mjs` (not kept in the repo) | Switch navigation at `xl` (1280) | Verified (0 px after; `tabs.mjs` 16/16 tabs at 1024) |
| RESP-002 | 375 | `/admin` | Title wrapped to three lines beside the badge | shot | `flex-wrap` | Fixed |
| RESP-003 | 375 | admin hackathon manager | Open tab not visible among 16 | shot | centre active tab | Verified |
| RESP-004 | 375 | `/hackathons/[slug]` | Active section tab at x=1371 in a 375px bar | `flows.mjs` | scroll bar to active tab | Verified |
| RESP-005 | phones | admin forms | 14px inputs trigger iOS zoom (27 / 19 fields on two tabs) | `tabs.mjs` | 16px below `sm` | Fixed (needs a real iPhone to confirm) |
| RESP-006 | 375 | `/hackathons/[slug]/certificate` | Certificate footer overflows the frame | shot | aspect ratio only from `sm` | Verified (see section 4) |
| APP-UI-004 | 375 | `/admin/forms` | Title squeezed to 70px beside stacked actions, status tabs cut | shot | - | Open |

No other page, at any of the eight sizes, scrolled sideways, before or after. That includes the 118-character hackathon title, the 36-character member name, 16-tab control room and the 7 admin tables (each sits in its own `overflow-x-auto` container; the page itself never moves).

## 3. Layout and breakpoint behaviour observed
* Grid changes: detail page is 1 column below `lg` and `1fr / 320px` above; dashboard `1fr / 360px` at `lg`; admin list 1 -> 2 columns at `md`. All collapse without orphaned gaps.
* The hackathon listing switches from the fanned three-card stack (above 640px container width) to a one-card carousel (at or below 640px) through `BounceCards` measuring its container, not the viewport; this works at 768px (stack of three at 300px each).
* Fixed-height containers: the certificate was the only one that clipped content (RESP-006).
* Dialogs: `Modal` is a bottom sheet below `sm` (rounded top, pinned header and footer), centred above. Verified with the create-team dialog at 375px.
* Sticky elements: the section tab bar sticks at `top-[72px]` under the site navbar; the back-to-top button is fixed bottom-right. No content was found hidden under either (`scroll-padding-top: 5.5rem` and `scroll-padding-bottom: 6rem` exist in `globals.css`).

## 4. Certificate on a phone (before / after)
a capture from `crawl.mjs` (not kept in the repo) (before) and a capture from `crawl.mjs` (not kept in the repo) (after).

## 5. Mobile interaction
* Touch targets: see 08, A11Y-009. After the fixes every control in the hackathon module is at least 24px; the standard `BTN` is 32-36px (A11Y-013, Low).
* Input visibility with the on-screen keyboard: not testable in headless Chromium (no virtual keyboard). `SpotlightInput` and, after RESP-005, admin fields use 16px so iOS does not zoom.
* Dropdown clipping: `FormSelect` lists are `absolute` below the trigger with `max-h-72 overflow-y-auto`; inside the bottom-sheet dialog the list stays within the sheet's scroll area (checked in the team dialog at 375x812).
* Menu opening and closing: the admin hamburger menu was exercised by the existing responsive spec ("the admin menu opens on a phone and every link can be reached").

## 6. Limits
Real device keyboards and safe areas, landscape phones (e.g. 812x375), foldables, browser zoom to 200% on desktop and Firefox/WebKit were not measured in this audit (the repository's `devices.spec.ts` covers iPhone, Pixel and Firefox emulation for the forms flow only).
