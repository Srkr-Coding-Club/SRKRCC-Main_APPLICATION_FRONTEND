# Frontend State Management Report

Scope: `SRKRCC-Main_APPLICATION_FRONTEND` (Next.js 15 App Router, React 19, no state or data-fetching library).
Method: read the auth layer, the API client, the BFF proxy, the root layout, `useAdminData`, the public form page, the form builder wiring, the navbar family, notifications, the toast context and the hackathon module; counted usage patterns across `src/`. Numbers below are measured with `grep` on the working tree. Items marked **(verify)** are inferred from framework behaviour and should be confirmed before acting.

---

## 1. How state is managed today

There is **no state or data layer**. Everything is `useState` + `useEffect` + `fetchApi`, with three small shared pieces:

| Concern | Where it lives | Mechanism |
|---|---|---|
| Session identity | `src/lib/auth.ts` | `localStorage['srkrcc_user']` (full user JSON) + a client-written `srkrcc_user_role` cookie; HttpOnly access/refresh cookies set by the BFF routes |
| Auth propagation | `auth.ts` | custom DOM event `srkrcc_auth_change`, the `storage` event, and a throttled focus/visibility "resync" subscriber list |
| Token refresh | `auth.ts` + `api-client.ts` | module-level singleton promise (`activeRefreshPromise`); one retry on 401 |
| Toasts | `src/context/ToastContext.tsx` | the **only** React context in the app |
| Theme | inline script in `layout.tsx` + `ThemeToggle` | `localStorage['theme']` + `dark` class |
| Server data | every component | `fetchApi(...)` inside `useEffect`, results in local `useState` |
| Admin data | `src/lib/hooks/useAdminData.ts` | one 1,308-line hook: users, flags, forms, submissions, form builder, modals; polls every 8 s |
| Form drafts | `app/forms/[slug]/page.tsx` | `localStorage['srkrcc_form_draft_<slug>']` written on every keystroke |
| Filters / tabs | local state; URL only in 7 files | `useSearchParams` |
| Public pages | server components | `fetchApi` on the server (anonymous), props into a client component |

Measured inventory: 236 source files, 142 `'use client'`; `useState(` 356 uses in 78 files, `useEffect(` 148 in 87 files, `useReducer` 0, `useContext` providers 1; `fetchApi` 181 call sites in 47 files; `AbortController` in 2 files; cancel/ignore flags in 15 files; `.catch(() => ...)` 45 sites; `: any` 134, `as any` 22; `eslint-disable` 15; **frontend tests: 0** (the pre-push hook runs `tsc --noEmit` only).

---

## 2. What is done well (keep these)

- **Refresh-token singleton.** `activeRefreshPromise` correctly dedupes concurrent refreshes in one tab, and the long comment in the proxy documents why server-side dedupe was abandoned. Good, evidence-based decision.
- **Fail-closed admin gating.** `AdminGuard` never trusts `localStorage` or the role cookie for access; it waits for `/auth/me/`. Silent re-check on refocus is the right idea.
- **Middleware as a cheap first gate** for `/admin`, `/profile`, hackathon dashboards.
- **Good local patterns exist.** `useCollegeSearch` (abort + page restart), `useDMCQuery` (ref for latest params), `ConfirmDialog`, `useDebouncedValue`. They show the team already knows the right shapes.
- **Module flags fail open**, so a backend blip does not hide site sections.
- **`silentAuth`** on background polling keeps a stale session from bouncing visitors off public pages.
- **Server-component shell + client component** split on public hackathon/event pages.

---

## 3. Findings

Severity: **H** = bug or risk that users or data can hit now; **M** = significant maintainability/performance cost; **L** = polish.

### H1. "Who am I" is copied into eight components (no single source of truth)
Evidence: `Navbar.tsx:68-100`, `HeroSection.tsx:30-60`, `AdminGuard.tsx`, `AdminNavbar.tsx:120`, `ScannerGuard.tsx:29`, `LoginCard.tsx:64`, `forms/[slug]/page.tsx:773-778`, `profile/page.tsx:137`, `hackathons/[slug]/dashboard/page.tsx:43`. Navbar and HeroSection contain the same ~25-line block (read storage → listen to two events → call `/me` → subscribe to resync).
Impact:
- Every page load fires `/auth/me/` from several components at once (home: Navbar + HeroSection; admin: Guard + Navbar). `refreshAccessToken` is deduped but `/me` itself is not.
- `getStoredUser()` returns a **new object on every call** (`JSON.parse`), so any effect with `currentUser` in its dependency list re-runs on every sync. The forms page effects (`[form, currentUser, hasSubmitted]`) are exposed to this the moment anyone adds a resync listener there.
- A change made in one component (role, name) reaches the others only through a DOM event plus a re-read of `localStorage`; ordering is not guaranteed.
Fix: one `AuthProvider` + `useAuth()` (see §5), built on a single query for `/auth/me/` and `useSyncExternalStore` for the cached copy.

### H2. `fetchAndSyncCurrentUser` overwrites the stored user with a subset
Evidence: `auth.ts:204-217` builds `AuthUser` from `/me` but omits `club_id`, `membership_status`, `registered_at`, `referred_by_display` that the profile page stores (`profile/page.tsx:146-160`) and that `AuthUser` declares (`auth.ts:5-24`). `setStoredUser` replaces the whole object.
Impact: every focus resync (Navbar, HeroSection, guards) silently drops those fields from storage; the profile page's first paint (it reads storage before fetching) flickers/loses the Club ID; code that reads `getStoredUser().club_id` gets `undefined` depending on timing. Three different object shapes (`AuthUser`, `FullUserProfile`, the login route's `user`) are written into one key.
Fix: one `mapUser(apiUser)` used by login, `/me` and profile; store the full API shape or merge instead of replace.

### H3. Personal data in `localStorage`; form drafts are not user-scoped and survive logout
Evidence: `setStoredUser` persists email, phone, roll number, college, social links in plain text (`auth.ts:74-80`); drafts use `srkrcc_form_draft_${slug}` (`forms/[slug]/page.tsx:951,966`) and `clearAuthSession` (`auth.ts:83-93`) never removes them.
Impact: on a shared or lab computer (a college club, realistically) the next person who opens the same form sees the previous user's answers (names, phone numbers, free-text). Any XSS can read the whole profile from storage. Drafts are written on **every keystroke** and include whatever the user typed in every field.
Fix: key drafts by user id, clear them in `clearAuthSession`, debounce writes (e.g. 500 ms), exclude sensitive field types; keep only a minimal "display" cache of the user (id, name, role) in storage and keep the rest in memory.

### H4. `useAdminData` is a god hook that polls every dataset every 8 seconds
Evidence: `useAdminData.ts` is 1,308 lines with 22 `useState` calls, a 40-field `formMeta` object, form-builder editing state, preview state, five modal flags and all list state. Polling at `:404-417` calls `refetchAll(true)` every 8 s **and** on `focus` **and** on `visibilitychange` (a tab switch fires both). Seven admin pages call `useAdminData()` with no `include` (`builder`, `forms`, `members`, `responses`, `csv-ingestion`, `admin/page`, plus `users` partially), several only to read `publishedForms`.
Impact:
- Each open admin page fetches `/auth/users/?page_size=500`, `/feature-flags/`, `/forms/` and **`/forms/submissions/` (all submissions)** every 8 s. The form **builder** polls them while an admin edits a form.
- No in-flight guard, no abort: if a response takes longer than 8 s the requests overlap and an old response can overwrite a newer one.
- State is lost on every navigation (hook is per page), so each page switch re-downloads everything.
- `if (usersArray.length > 0)`, `flagsArray.length > 0`, `rawSubs.length > 0` (`:317,349,366`) mean an empty result never replaces stale data (e.g. after deleting the last submission).
- Silent fallbacks invent data: `joinedDate` `'2025-01-01'` (`:332`), `submitterEmail` `'student@srkr.ac.in'` (`:380`), `submittedAt = new Date()`.
- **Security:** `handleCreateUser` sends `password: newUser.password || 'password123'` (`:431`): an admin who leaves the field blank creates an account with a known password.
Fix: split into feature hooks backed by a query cache (§5); fetch only what the page renders; revalidate on focus with a `staleTime`, not on a timer; make the password required (or generate a one-time setup link, which the backend already supports).

### H5. No server-state layer: manual fetch/loading/error handling in ~90 files
Evidence: 181 `fetchApi` call sites; each component owns `loading`, `error`, data and refetch. Cancellation exists in 15 files (flags) and `AbortController` in 2; `fetchApi` ignores a caller-supplied `signal` (it creates its own, `api-client.ts:33-45`). `.catch(() => [])`/`catch {}` appear 45/52 times.
Impact:
- **Stale or out-of-order responses.** `useDMCQuery` (`hooks/dmc/useDMCQuery.ts`), the admin tabs and most list pages can apply an older response after a newer one.
- **Errors look like empty data.** An outage renders "No teams yet". (Several hackathon tabs were fixed this way during this session; the rest of the app still does it.)
- **No dedupe or cache**: the same list is fetched by sibling components and re-fetched on every mount; I had to hand-roll a module-level cache for the hackathon CTA (`useMyHackathonStatus`), which is exactly what a query cache provides.
- **Mutation then "reload everything"**: after any dashboard action the page refetches three endpoints.
Fix: TanStack Query (§5).

### H6. The public form page assembles answers from five sources with effects
Evidence: `forms/[slug]/page.tsx` has 18 `useState` and 8 `useEffect`. `formData` is written by: the draft-restore effect, the heuristic prefill effect, the profile-bound-field effect, the existing-response prefill inside `checkUserSubmission`, and `handleInputChange`. Priority between them depends on effect order and `{...a, ...prev}` merges. `handleInputChange` builds `{ ...formData, [id]: value }` from the closure (`:~958`) instead of a functional update. Status is encoded as separate booleans (`loading`, `notFound`, `hasSubmitted`, `isSubmitted`, `isEditMode`, `canEditResponse`), which allows impossible combinations.
Impact: lost keystrokes under fast typing when an effect updates `formData` in the same tick; hard-to-reason precedence; every keystroke re-runs the layout memo and writes storage.
Fix: derive instead of sync. `answers = {...prefill, ...profileBound, ...draft, ...userEdits}` computed in a memo from separate sources, a reducer for edits, and a single `status` union (`loading | notFound | ready | submitted | editing`).

### M1. Toast context re-renders every consumer on every toast
Evidence: `ToastContext.tsx:69-74` puts `toasts` in the same context value as the stable `toast.*` functions; `useToast()` is used by 36 components. Each `addToast`/`dismissToast` (and the container's timers) re-renders all of them. Also the "outside provider" fallback silently turns toasts into `console.*`, hiding a missing provider. No cap and no de-duplication (the same error stacks up).
Fix: two contexts (stable dispatch, changing list), cap at ~4, de-dupe by title+description, remove the silent fallback in development.

### M2. Notification polling ignores tab visibility and is not shared
Evidence: `NotificationBell.tsx:105-110` `setInterval(fetchCount, 40000)` with no `document.visibilityState` check; count and list state are local to the bell. With an expired session each poll triggers a refresh attempt.
Fix: one polling query with `refetchInterval` that pauses when hidden, shared by every bell/badge, invalidated by "mark read".

### M3. Rendering/caching strategy works against itself and pushes work to the client
Evidence: 30+ pages export `dynamic = 'force-dynamic'` and several also pass `next: { revalidate: 60 }` (`events/page.tsx:12,22`). **(verify)** `force-dynamic` disables fetch caching for the route, so the `revalidate` hints are ineffective there. The root layout awaits `getModuleFlags()` on every request (`layout.tsx:96`), so each page waits on it. Server-side `fetchApi` sends no cookies, so server components can only render anonymous data; everything personal (my team, my invites, my response, notifications) is fetched after mount, which produces the loading-skeleton flashes and request waterfalls seen on dashboards.
Fix: drop `force-dynamic` from genuinely public pages and rely on `revalidate` + tags; add a `serverFetch` that forwards the access-token cookie for pages that should render personalised data on the server; keep client queries only for interactive updates.

### M4. URL is barely used as state
Evidence: `useSearchParams` in 7 files. Search boxes, filters, pagination and selected rows (admin tables, public lists, hackathon tabs except the manage page) live only in component state, so refresh/back/share lose them. Public hackathon sections use hashes (added recently), the rest do not.
Fix: a tiny `useUrlState` hook (or `nuqs`) for filters, page and selected tab.

### M5. Type fragmentation and no runtime contract
Evidence: `UserRecord` is declared four times (`useAdminData.ts:38`, `UsersTab.tsx:12`, `EditUserModal.tsx:16`, `AssignAffiliateModal.tsx:9`), plus `User`, `AuthUser`, `FullUserProfile`, `EditableProfile`, `MemberRecord`. The 40-field `formMeta` type is written out in `useAdminData.ts` **and** `FormBuilderTab.tsx:127-160` (and `setFormMeta` is typed `Dispatch<SetStateAction<any>>`). 134 `: any`, 22 `as any`, 11 `fetchApi<any>`. `lib/types.ts` (1,055 lines) is hand-maintained against Django serializers with no generation or validation, so contract drift (like the new `college` fields) is found only at runtime.
Fix: generate types from the backend schema (drf-spectacular → openapi-typescript), validate the critical payloads (auth, forms) with zod at the boundary, delete the local copies.

### M6. Admin form builder is prop-drilled from the god hook
Evidence: `app/admin/builder/page.tsx:41` destructures ~25 values from `useAdminData()` and passes them to `FormBuilderTab` (15+ props, `:124-175`). `useEffect` there depends on `[formSlug, isNew]` but calls functions from the hook (hidden by `eslint-disable`).
Fix: a builder store (reducer or zustand slice) with `FormDraft` as the single type; the tab reads it via a hook, undo/redo comes cheap.

### M7. Cross-tab and cross-component consistency is partial
Evidence: only Navbar and HeroSection listen to the `storage` event. A logout in another tab leaves `AdminGuard`/`ScannerGuard` open until the next focus resync (throttled to 15 s). `ThemeToggle` does not sync across tabs and ignores `prefers-color-scheme` (the boot script defaults to dark when nothing is stored).
Fix: `BroadcastChannel('auth')` from the auth store; one theme store with `matchMedia`.

### M8. `eslint-disable` for hook dependencies hides stale-closure bugs
Evidence: 15 occurrences, e.g. `builder/page.tsx`, `HackathonFormPanel.tsx`, and my own `TeamFormModal`/`HackathonDetailClient` additions. Several effects call non-memoised functions declared in the component.
Fix: enable `react-hooks/exhaustive-deps` as an error for new code and fix the existing ones as each file is migrated.

### L1. Two hooks directories and ad-hoc caches
`src/hooks/dmc/` and `src/lib/hooks/` both exist. Module-level caches are re-implemented per feature (`useMyHackathonStatus`, `getModuleFlags`, the refresh singleton).

### L2. Reads from storage during render
`dashboard/page.tsx:43` (`const me = getStoredUser()` in the component body), `UsersTab.tsx:405`. It is impure and not reactive; harmless today because the output is only shown after data loads, but it would cause hydration mismatches the day it affects first paint.

### L3. Magic and fake defaults
Default `branch: 'CSE'` on missing data (`useAdminData.ts:~325`), `'Not set'` strings stored as data, year as ordinal strings (`formatYearOrdinal` in the hook vs `ordinalYear` in `utils.ts`), and `id: created?.id || Date.now()` for optimistic rows.

### L4. No tests
No unit, hook or e2e tests; the only gate is `tsc`. The state-heavy code (auth store, draft merging, polling, optimistic updates) is exactly where regressions hide.

---

## 4. Risk summary

| ID | Area | User-visible effect | Effort to fix |
|---|---|---|---|
| H3 | PII/drafts in storage | privacy leak on shared machines | small (hours) |
| H4 (password) | admin-created account default password | known-password accounts | trivial |
| H2 | stored user shape thrash | missing/flickering Club ID | small |
| H1 | duplicated auth state | extra requests, drift | medium |
| H4 (polling) | 8 s full-dataset polling | backend load, slow admin | medium |
| H5 | no server-state layer | stale data, hidden errors | large (incremental) |
| H6 | form page state | lost keystrokes, odd precedence | medium |
| M3 | caching strategy | slow public pages, flashes | medium |

---

## 5. Recommended target architecture

1. **Server state → TanStack Query.** One `QueryClientProvider`; `fetchApi` accepts a `signal` and throws typed errors; a query-key factory (`keys.hackathon(slug)`, `keys.me()`, `keys.adminForms()`...). Defaults: `staleTime` 30-60 s, `refetchOnWindowFocus`, retries only on network/5xx, `refetchInterval` only where truly live and paused when hidden. Mutations invalidate by key; optimistic updates through `onMutate`. This replaces: `useAdminData` polling, `NotificationBell` timer, `useMyHackathonStatus`, the manual `cancelled` flags, and most of the 148 effects.
2. **Auth → `AuthProvider` + `useAuth()`.** `me` is a query; a small external store (`useSyncExternalStore`) caches only `{id, name, role}` for first paint; `BroadcastChannel` for login/logout across tabs; `clearAuthSession` also clears drafts. Delete the six copy-pasted sync blocks and `subscribeToAuthResync`.
3. **Client/UI state stays local**, but forms use reducers: form answers (public page) and the builder (`FormDraft`) get a reducer or a small zustand store; booleans become a status union.
4. **URL state** for filters, page, tab, selection via a shared hook.
5. **Rendering**: public pages cached/revalidated; personalised pages use `serverFetch` with the session cookie and hydrate the query cache (`HydrationBoundary`) to remove skeleton flashes.
6. **Contracts**: generated types + zod on auth and form payloads.
7. **Guard rails**: `exhaustive-deps` as error, Vitest + Testing Library for the auth store, draft logic and reducers, one Playwright smoke test per role.

### Suggested order (each step ships independently)
**Quick wins (≈1 day, no architecture change)**
1. Remove the `'password123'` default; require a password or send a setup link.
2. Scope drafts per user id, clear them on logout, debounce the writes.
3. Fix `fetchAndSyncCurrentUser` to keep all fields (single `mapUser`).
4. Pause `NotificationBell` polling when hidden; stop the double trigger (`focus` + `visibilitychange`) in `useAdminData`; give pages that only need `publishedForms` `include: ['forms']`.
5. Split `ToastContext` into state and dispatch contexts.
6. Pass the caller's `signal` through `fetchApi`.

**Phase 1 (≈1 week): foundation.** Add TanStack Query, `AuthProvider`/`useAuth`, migrate Navbar/HeroSection/guards, notifications, hackathon status. Success measure: one `/auth/me/` per load.
**Phase 2 (≈1-2 weeks): admin.** Break up `useAdminData` into `useUsers/useForms/useSubmissions/useFlags`; builder store; remove polling in favour of focus-revalidation.
**Phase 3 (≈1 week): forms page** reducer + derived answers; draft service.
**Phase 4 (ongoing):** caching strategy for public pages, URL state, generated types, tests, enable the lint rule and clear `eslint-disable`s file by file.

---

## 6. Appendix: how the numbers were obtained

`grep -rE --include=*.ts --include=*.tsx` over `src/` for the patterns quoted above (e.g. `useState[<(]`, `useEffect\(`, `fetchApi[<(]`, `AbortController`, `\.catch\(\(\) =>`, `eslint-disable`). Line references are from the current working tree and will drift as files change. No runtime profiling was done: request counts and re-render claims are derived from reading the code paths, and should be confirmed with the React Profiler and the browser network tab when prioritising.
