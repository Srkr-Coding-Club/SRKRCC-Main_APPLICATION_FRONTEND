# Dynamic Form Builder: Frontend Guide

How the form builder and the public form work in this repo. The server side (rules, limits, API) is described in the backend repo's `docs/features/dynamic-form-builder.md`; this page covers what lives here.

## Two engines that must agree

The browser re-implements the server's checks so people get answers instantly. Both are tested against the same JSON test cases, so they cannot drift silently.

| Concern | Frontend file | Backend counterpart |
|---|---|---|
| Conditions, pages, routing | `src/lib/formConditional.ts`, `formPages.ts` | `apps/forms/validation/conditional.py` |
| Answer rules and messages | `src/lib/formValidation.ts` | `validation/rules.py`, `engine.py` |
| Calculated totals | `src/lib/formula.ts` | `validation/formula.py` |
| Operators | `src/lib/conditionOperators.ts` | `validation/schema.py` |

If you change a rule, change both sides and the shared vectors (`src/lib/__tests__/conditionalVectors.test.ts`).

## Public form (`src/app/forms/[slug]/page.tsx`)

- Pages (PAGE_BREAK), routing, progress, `{{id}}` piping, defaults, hidden values (from the link), calculated fields.
- Autosave (`src/lib/hooks/useFormDraft.ts`): a server draft plus a per-person copy in the tab's session storage, so a lost session does not lose answers.
- After submitting (`src/components/forms/SubmissionThanks.tsx`, `src/lib/afterSubmit.ts`): thank-you text, optional redirect with a countdown. Redirects are re-checked in the browser (https or same-site path only).
- Bot protection: an invisible honeypot input (`hp_q7z4`) and an optional Cloudflare Turnstile widget (`src/components/forms/TurnstileWidget.tsx`, needs `NEXT_PUBLIC_TURNSTILE_SITE_KEY`).
- Language (`src/lib/i18n/formStrings.ts`): the form's own buttons and prompts in English, Telugu or Hindi. What the admin writes is shown as written. Built-in validation messages are English only.

## Admin builder (`src/app/admin/builder`, `src/components/admin/`)

- `ConditionBuilder.tsx` (conditions, groups, field-to-field comparison, actions, page routing), `FieldControls.tsx` (custom messages, defaults, hidden and calculated editors, cross-field rules), `AfterSubmitSettings.tsx`.
- History and safety: `FormHistoryModal.tsx`, `ReviewChangesModal.tsx` (shown before saving a live form), `FormChanges.tsx`, `FormTemplatesModal.tsx`; copy, template, import and export actions are in `FormsRegistryTab.tsx`. Shapes and wording helpers are in `src/lib/formHistory.ts`.
- `FormAnalyticsModal.tsx` (`src/lib/formAnalytics.ts`): totals, timeline, per-question answers, where unfinished responses stopped.
- Dialogs use `src/lib/hooks/useDialog.ts` (focus in, Escape closes, Tab stays inside, focus returns).

## Accessibility

Every question type is labelled, errors are tied to their question and announced, and a failed submit moves keyboard focus to the first problem. The public form, builder, responses screen, registry and every dialog are checked with axe-core, in unit tests and in a real browser.

## Tests and commands

| Command | What it runs |
|---|---|
| `pnpm test` | Vitest (jsdom): engines, hooks, components, axe checks, hostile-input sweep |
| `pnpm test:e2e` | Playwright (Chromium) against `next dev` on port 3100; the API is answered by the tests (`e2e/helpers.ts`, `e2e/admin-helpers.ts`). First run: `pnpm exec playwright install chromium` |
| `npx tsc --noEmit` | Type check |
| `pnpm build` | Production build |

## Environment

`NEXT_PUBLIC_TURNSTILE_SITE_KEY` (optional; only for forms that switch the bot check on). The matching secret, `TURNSTILE_SECRET_KEY`, belongs to the backend.

## Email Verification (what the website does)

The rules and the API are in the backend repo (`docs/features/email-verification.md`). Here, one provider and a few small components make them visible:

- `src/context/EmailVerificationContext.tsx` reads `email_verification` from `/auth/me/` (when signed in), follows signing in and out, re-checks when the tab regains focus (and every 15 seconds while blocked), and owns the "send the link" and "change email" actions with their cooldown. Outside the provider it reports "nothing to verify", so isolated pages and tests are unaffected.
- `VerificationBanner` (under the navbar: days left and a **Verify email** button), `VerifyDialog` (opened wherever the API answers `403 EMAIL_VERIFICATION_REQUIRED`; the API client raises one window event for it and keeps the person signed in), `BlockedScreen` (replaces a private page after the deadline; public pages never), `EmailVerificationCard` (profile page) and the shared `VerifyPanel`.
- `/account/verify-email` confirms with a button (a page load never uses the link, because mail scanners open links) and removes the token from the address bar; `/account/verify-email/not-me` is the "This wasn't me" page.
- A form is readable by an unverified person, but its questions are disabled (a `<fieldset disabled>`), autosave and the tab backup are off, and Submit is disabled with an explanation.
- Which pages count as private is in one place: `isPrivateRoute` in `src/lib/emailVerification.ts`. The server enforces the same rules; this only decides what to draw.
