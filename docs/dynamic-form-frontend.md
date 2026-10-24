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

## File uploads (direct to storage)

When the server reports `direct_upload` (`GET /forms/upload-config/`, read by `src/lib/uploadConfig.ts`), file questions on the form page use `src/components/forms/FileUploadField.tsx` instead of the older inline (base64) picker:

- `src/lib/fileUpload.ts` does the three steps: ask the server for a signed form, post the file straight to storage (XMLHttpRequest, for progress and cancel), then ask the server to confirm. Errors become an `UploadError` with a message and whether a retry makes sense.
- The picker checks size and type in the browser first (the question's "Max file size", else the server default of 2 MB), then uploads up to three files at a time. Images show a preview from the local file; every file has a progress bar, Cancel/Remove and, after a connection error, Retry. Leaving the page mid-upload asks for confirmation.
- The answer holds only references (`{upload_id, name, size, type}`), never file data. The form cannot be submitted while any file is still uploading.
- Drafts keep these references (the server re-checks them on restore), so the old "attach your files again" notice only shows when direct upload is off.
- The form builder's "Max file size (MB)" box shows the default and the platform maximum.

Tests: `src/lib/__tests__/fileUpload.test.ts`, `src/components/forms/__tests__/FileUploadField.test.tsx`, `e2e/file-uploads.spec.ts`.

## Hackathon idea form (slides, payment, editing)

`src/components/hackathons/IdeaPanel.tsx` is the team leader's idea form. Besides the written parts it shows, depending on what the organizers switched on (`config` from `GET /hackathons/{slug}/my-idea/`): a `.ppt/.pptx` picker, the LinkedIn post link, and, when a fee is set, the amount, the "how to pay" note, a payment-screenshot picker and an optional transaction ID. The pickers are the shared `FileUploadField` with `uploadWith` / `discardWith` pointing at `src/lib/ideaUpload.ts` (same direct-to-storage flow as form uploads). Submitting is disabled while a file is still going; the request sends `deck_file_id` / `payment_file_id` (an id, or `null` to remove). When editing is switched off the leader sees the saved idea read-only with the reason (`edit_blocked_reason`) and its files (opened through short-lived links).

Organizers set all of this on the manager's **Ideas** tab (fee, how to pay, presentation and LinkedIn required, "Teams can edit a submitted idea" with an optional "Editing closes at" time) and see each idea's LinkedIn link, presentation, payment screenshot and transaction ID there. The judging page shows judges the slides and LinkedIn link only; payment details never reach them.

Tests: `src/components/hackathons/__tests__/IdeaPanel.test.tsx`; live: `e2e-live/hackathon-ideas.live.spec.ts` (`pnpm test:e2e:live`).

**Payment QR code.** On the manager's Ideas tab organizers upload the QR image under "Payment QR code" (it is saved the moment it uploads, with a Remove button). The idea form shows it in the payment box with "Scan this QR code with any UPI app and pay ₹N" (`src/components/hackathons/PaymentQr.tsx`; its link lasts a minute, so it is fetched when shown and again on "Try again" or when a new QR is uploaded).
