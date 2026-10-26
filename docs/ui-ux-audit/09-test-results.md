# 09. Test results

Environment: Windows 11, Node 23, Chromium (Playwright 1.47 for the repository suite, a newer browser for the audit scripts), production builds served with `next start`, stand-in API (`e2e-audit/fake-backend.mjs`). The baseline is `HEAD` (commit `d595292`) checked out in a separate git worktree and built with the same environment; the fixed build is the working tree. Nothing was run against production or against real data.

## 1. Summary

| Check | Baseline (`HEAD`) | Fixed build |
|---|---|---|
| `tsc --noEmit` | pass | pass |
| Vitest | 37 files, 580 tests pass (3 of 3 full runs) | 40 files, **595 tests pass** (15 new; 4 of 4 full runs after the fix below) |
| `next build` | pass | pass |
| Existing Playwright suite, project `chromium` | not run on baseline | **286 passed**, 0 failed (includes the new 1024px sweep: 12 public + 16 admin pages) |
| Existing Playwright device projects (iPhone 13 WebKit, Pixel 7, Firefox) | not run on baseline | **26 passed**, 1 skipped (already skipped upstream) |
| `e2e-audit/flows.mjs` (12 browser checks) | **1 pass / 11 fail** | **12 pass** |
| `e2e-audit/select-keyboard.mjs` | Escape does not close, no name, no arrow keys | closes, named, arrows move focus, focus returns |
| Crawl, dark, 8 viewports x 43 routes x roles | 344 pages, 0 load errors | 344 pages, 0 load errors |
| Crawl, light, 375 and 1440 | 86 pages | 86 pages |
| Admin tab probe, 16 tabs at 375 and 1024 | overflow 187px at 1024 on all tabs; axe violations on all 16 tabs (contrast, heading order, labels) | overflow 0; **0 axe violations on all 16 tabs at 375**; 16/16 tabs overflow-free at 1024 |
| `pnpm lint` | not configured (the repository has no ESLint config; `next lint` stops at an interactive prompt) | same |

The repository suite was not run against the baseline because its result is not what changed; the fixed build passes it completely, including the tests that cover the registration form, forms, admin editing, e-mail verification and the responsive sweep. If a reviewer wants the baseline run, point `playwright.config.ts` at the worktree's server.

## 2. Route coverage

`next` has 48 pages and 5 API routes. 41 pages were crawled at all 8 viewports in their relevant roles (43 route/role combinations). Not crawled:

| Page | Reason | Covered elsewhere |
|---|---|---|
| `/account/setup-password`, `/account/verify-email`, `/account/verify-email/not-me` | Need a one-time token from an e-mail | `e2e/email-verification.spec.ts` (passes) |
| `/attendance/scan` | Camera / volunteer permission | `admin/attendance/scan` crawled |
| `/certificates/verify/[code]` | Needs a verifiable code from the real API | Not covered (suggest a fixture) |
| `/codequest/batch-schedule` | Admin or Club Lead only, real data | Not covered |
| `/events/[slug]` | Needs an event fixture | `e2e/public-scenarios.spec.ts` covers quick RSVP |
| `/forms/[slug]` | Public form, large; fixture-heavy | `public-form.spec.ts`, `public-scenarios.spec.ts`, `devices.spec.ts`, `file-uploads.spec.ts` |

Protected routes were reached with simulated cookies (`srkrcc_access_token`, `srkrcc_user_role`), not with a real sign-in; this tests the pages, not the authentication. Admin routes were opened as an `ADMIN` only; no `CLUB_LEAD`, `JUDGE` or `VOLUNTEER` session was simulated beyond the per-hackathon permission fixture. Four admin routes (`audit-logs`, `codequest`, `data-health`, `jobs`) rendered their error boundary because the fixture did not return their payload shape; their layout was therefore not assessed (only the error state).

## 3. Functional checks (`flows.mjs`, baseline -> fixed)

| Check | Baseline | Fixed |
|---|---|---|
| Empty submit announces "Team name is required." on the name field | fail (`aria-describedby` missing) | pass |
| Problem-statement error shown | pass | pass |
| Picker: ArrowDown opens, Escape closes only the list, dialog stays | fail (dialog closed) | pass |
| Server clash message tied to the name field | fail | pass |
| Section tabs keep the current section in view at 375px | fail (x=1371 in a 375px bar) | pass |
| Admin tabs: ArrowRight selects next, single tab stop | fail (16 tab stops) | pass |
| Admin tabs: End selects the last | fail | pass |
| Admin tab panel wired and headed | fail | pass |
| Skip link first, visible, moves focus to `<main>` | fail | pass |
| One `<main>` on `/hackathons` | fail (2) | pass |
| Listing: keyboard focus spreads the fanned cards | fail | pass |
| Phone detail page: register bar appears after the header button scrolls away | fail (no bar exists) | pass |

Unit tests added: `FormSelect` (names, keyboard, Escape does not reach a parent, axe), `RegistrationDetailsFields` (required checkbox error is rendered, errors linked to fields, axe), `TeamFormModal` (announced name error, server clash placement, picker name, Escape keeps the dialog). Note on a test-tool trap found while writing them: a `vi.fn()` that rejects makes Vitest report an unhandled error even though the component handles it, so the clash test uses a plain function.

## 4. Visual regression
Before/after screenshots (same viewport and conditions) of the listing, detail, dashboard, certificate, admin list, manager, login and the registration sheet were compared by eye during the audit. Differences seen are the intended ones: orange buttons carry dark text in dark theme, the eyebrow wraps, the certificate fits, the 1024px admin fits, light-theme prize amounts are the deeper orange. No unintended layout change was seen. Screenshots are not committed; `e2e-audit/crawl.mjs` regenerates them. No pixel-diff tool was added. Dynamic content that would defeat one: relative dates, the pulsing live ring, GSAP entrance animation, the intro.

Raw measurement files are not committed; the scripts regenerate them.

## 5. Console and network
* Hackathon routes (participant and admin): **0** console errors and **0** failed requests, baseline and fixed, after the fixtures were corrected.
* Whole crawl: 104 console errors (baseline) vs 80 (fixed). All are on `/`, `/profile` and four admin routes: TypeErrors reading a field the stand-in API did not provide, plus 404s for `/hackathons/my-teams` and `/my-invites` that the first fixture did not serve. They are not attributed to the application (L3). The drop from 104 to 80 comes from fixing the fixture (profile 404s), not from the application.

## 6. Failures and limits
* **One existing test became flaky and was fixed.** `IdeaPanel.test.tsx > sends the uploaded files by id...` clicked "Submit idea" right after the file reported "uploaded", while the button still read "Uploading..." for one more tick. It passed alone and passed 3 of 3 full runs on the baseline, but failed 3 of 5 full runs on the fixed tree (more tests and axe runs in the same workers change the scheduling; no IdeaPanel code was involved). The test now waits for the button (`findByRole`). 4 of 4 full runs pass afterwards. The race was latent in the test, not in the UI.
* No test failed. One audit script (`flows.mjs`) failed ten of its eleven checks on the baseline by design; that is the evidence.
* The `e2e-audit` crawler counts target sizes with an element-bounds test, so a 20px-high text link inside a paragraph is exempt, as WCAG 2.5.8 allows.
* Chromium only for the audit scripts.
