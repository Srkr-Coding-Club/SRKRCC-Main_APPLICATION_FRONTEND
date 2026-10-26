# 04. Hackathon admin module

Routes: `/admin/hackathons` (list, create modal, hide, delete) and `/admin/hackathons/[slug]` (also served at `/hackathons/[slug]/manage` for per-hackathon staff). The control room has 16 tabs: Overview, Settings & Details, Registration controls, Team & roles, Problem statements, Teams, Team e-mails, Public timeline, Rounds & shortlisting, Ideas, Projects, Judging, Check-in, Results & certificates, Public page, Announcements.

Method: an administrator session against the stand-in API, every tab visited at 375x812 (and Overview, Settings, Registration at 1024x768), each tab measured for overflow, tap targets, input font size, unlabeled controls and axe violations (`e2e-audit/tabs.mjs`). **No write action (create, publish, delete, status change, export) was performed**, so "feedback reflects actual backend results" and "editing does not reset unrelated fields" are code-reviewed only.

## 1. Dashboard / Overview tab
Tiles (registered teams, participants, pending invites, open-innovation teams), problem-statement fill bars, rounds funnel, forming-team reminder, analytics panel. All values come from `/stats/` and `/analytics/`; none are hard-coded. Loading shows a skeleton; load failure shows `LoadError` with retry (code). Findings: tile labels use 11px `slate-400`, which is 2.5:1 on the light theme (measured on the Settings and Overview tabs) -> fixed by the scoped slate sweep (`slate-500` on light, `slate-400` kept for dark). The reminder action asks for confirmation before notifying leaders (good).

## 2. List `/admin/hackathons`
Cards with status pills ("Draft", "Registration open", "Registration not open", "Closed", hidden), dates, active teams, team size, Manage link, Hide/Show and (ADMIN only) Delete. Delete is routed through `useHackathonLifecycle` -> `DeleteHackathonDialog` (type the slug to confirm, shows delete impact) - an appropriate safeguard for a destructive action. Hide is blocked with an explanatory `title` when visibility comes from the date window.

| ID | Observation | Evidence | Status |
|---|---|---|---|
| HACK-ADMIN-001 | The `h1` icon sat beside a wrapped title and the description started under the icon (left edges did not line up) | a capture from `crawl.mjs` (not kept in the repo) | Fixed (icon top-aligned, does not shrink) |
| COLOR-001 | "Create hackathon" / "Manage" accents: white on orange 2.6:1 (dark), text orange 2.5:1 (light) | axe | Fixed |
| A11Y-012 | Tab title "Admin Control Room" on every admin page | titles | Fixed for the hackathon admin routes |
| - | There is no search, filter or sort on the list | observation | Enhancement HACK-ADMIN-004 (fine for a handful of events) |

## 3. Create / edit
Create is a modal (`HackathonFormPanel`); editing is the Settings tab with six sections (General, Schedule and visibility, Description, Format and public details, Registration, Status) and a **sticky save bar that appears only when something changed**, with a `beforeunload` guard. That is already a strong pattern and was left alone.

| ID | Observation | Evidence | Status |
|---|---|---|---|
| A11Y-003 | 17 labels on the Settings tab were `<label>` elements with no `for`; 8 `label` + 1 `select-name` axe violations, so each field was announced as "edit text" | `tabs.mjs`: unlabeled 18 | Fixed (`useId` bindings); 1 field left (the description textarea gets its name from `MarkdownEditor`'s new `aria-label`) |
| RESP-005 | Every admin input was 14px. iOS Safari zooms the page when such a field is focused: 27 fields on Settings, 19 on Public page | `tabs.mjs`: zoom 27 / 19 | Fixed (`text-base sm:text-sm`, same rule `SpotlightInput` already followed) |
| A11Y-002 | "Linked form" is a `FormSelect`: no name, Escape did nothing | `select-keyboard.mjs` | Fixed |
| A11Y-009 | Tag remove buttons 12x12, domain remove 16x16, round reorder / row actions 20x20 | `tabs.mjs` small list | Fixed (24-32px) |
| A11Y-003 (rest) | About 53 other `<label className={LABEL}>` in `components/admin` have no `htmlFor` (rounds, ideas, timeline, announcements, create-user...) | grep: 110 labels, 57 bound | Open (mechanical) |
| HACK-ADMIN-005 | Date fields are native `datetime-local`; time zone is the browser's, the public page prints IST | code | Suspected (HACK-CONS-006) |

## 4. Control-room navigation (16 tabs)
| ID | Observation | Evidence | Status |
|---|---|---|---|
| A11Y-004 | `role="tablist"` / `role="tab"` without the rest of the pattern: all 16 tabs were Tab stops, arrow keys did nothing, no `tabpanel`, no `aria-controls` | `flows.mjs` 7-9 | Fixed |
| RESP-003 | On a phone the strip scrolls sideways; the open tab could be off-screen | a capture from `crawl.mjs` (not kept in the repo) | Fixed (centred); a drawer/select is an enhancement (HACK-ADMIN-002) |
| A11Y-005 | Panels start with `h3`, so the outline went `h1 -> h3` on every tab | axe heading-order on 15 of 16 tabs | Fixed (one `sr-only` `h2` carrying the tab name) |
| - | Tab height was ~32px | | 44px on phones, 36px from `sm` |

## 5. Tables, participants and teams
Seven tables (judging, problem statements x2, rounds, submissions, teams, results). All sit in `overflow-x-auto` wrappers, several with an explicit `min-w` (`520/640/420px`), so the page itself never overflowed at 320px. The strategy is "scroll the table", not "stack the rows"; adequate for admins, but row actions inside a scrolled table are off-screen on a phone (HACK-ADMIN-003, enhancement). The Teams tab has search (now named), status filters, per-team status changes, add-member, delete; destructive paths use `useConfirmDialog` (code).
Privacy: the participant table shows e-mails and phone numbers by design to organizers; no screenshots in this report contain real data (all fixture).

## 6. Per-tab measurements (375x812, dark)
| Tab | Targets <24px | Inputs <16px | Unlabeled controls | axe rules before | axe rules after |
|---|---|---|---|---|---|
| overview | 6 -> 1 | 0 -> 0 | 0 -> 0 | color-contrast:5, heading-order:1 | none |
| settings | 9 -> 4 | 27 -> 0 | 18 -> 0 | color-contrast:4, heading-order:1, label:8, select-name:1 | none |
| registration | 16 -> 1 | 7 -> 0 | 4 -> 0 | color-contrast:5, heading-order:1 | none |
| team | 6 -> 1 | 2 -> 0 | 0 -> 0 | color-contrast:4, heading-order:1 | none |
| problems | 13 -> 1 | 1 -> 0 | 0 -> 0 | color-contrast:5, heading-order:1 | none |
| teams | 6 -> 1 | 1 -> 0 | 1 -> 0 | color-contrast:5, heading-order:1 | none |
| emails | 6 -> 1 | 0 -> 0 | 0 -> 0 | color-contrast:4 | none |
| timeline | 6 -> 1 | 0 -> 0 | 0 -> 0 | color-contrast:5, heading-order:1 | none |
| rounds | 6 -> 1 | 0 -> 0 | 0 -> 0 | color-contrast:5, heading-order:1 | none |
| ideas | 7 -> 2 | 5 -> 0 | 1 -> 1 | color-contrast:10, heading-order:1 | none |
| submissions | 6 -> 1 | 2 -> 0 | 0 -> 0 | color-contrast:9, heading-order:1 | none |
| judging | 6 -> 1 | 1 -> 0 | 0 -> 0 | color-contrast:6, heading-order:1 | none |
| checkin | 7 -> 2 | 2 -> 0 | 0 -> 0 | color-contrast:7, heading-order:1 | none |
| results | 7 -> 2 | 5 -> 0 | 0 -> 0 | color-contrast:7, heading-order:1 | none |
| publicpage | 6 -> 1 | 19 -> 0 | 0 -> 0 | color-contrast:5, heading-order:1 | none |
| announcements | 6 -> 1 | 0 -> 0 | 0 -> 0 | color-contrast:5, heading-order:1 | none |


## 7. Mobile admin
* No page-level horizontal scroll at 320, 375, 430 or 768 on any admin route (baseline = after).
* **1024x768: all 16 navbar-bearing admin routes scrolled sideways by 187px** (baseline), because the desktop navigation bar needs about 1211px but appeared at 1024. Fixed by switching to the hamburger below 1280 (RESP-001). This also affects iPad landscape.
* `AdminHeader` squeezed its title between the logo and a "SYSTEM HIGH PRIVILEGE" badge at 375px (title wrapped to 3 lines). Fixed (badge wraps under the title).
* Modals (`Modal`) are bottom sheets on phones with a pinned header and footer; verified in the create-team sheet (same component).

## 8. Not verified
Create/publish/unpublish/clone/delete flows, status changes, exports, e-mail sends, banner upload and crop, real pagination, role-limited tab sets (an organizer with only `judge` permission sees a fallback card; code-read only).
