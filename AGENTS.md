# AGENTS.md — Agent Guidelines & Architecture Rules (Frontend)

This document governs the behavior, standards, coding practices, and documentation lifecycle for AI agents operating on `SRKRCC-Main_APPLICATION_FRONTEND`.

---

## General Agent Coding Guidelines

Whenever writing, modifying, or refactoring code, agents MUST follow the existing architecture and engineering conventions of this repository.

### 1. Understand Before Changing

Before implementing a change:

* Understand the relevant feature, module, and execution flow.
* Follow the existing feature documentation and bounded-context workflow defined in this `AGENTS.md` and `docs/`.
* Inspect existing implementations, utilities, services, components, hooks, APIs, and abstractions before creating new ones.
* Reuse existing functionality whenever it is appropriate.
* Identify dependencies and potential consumers before modifying shared code.
* Do not modify unrelated parts of the codebase.

Agents MUST NOT make architectural decisions based only on generic best practices. Decisions must be grounded in the actual repository architecture.

### 2. Clean Code

Write code that is readable, predictable, maintainable, and easy for another developer to understand.

* Use meaningful and descriptive names.
* Keep components, hooks, functions, and modules focused.
* Follow the Single Responsibility Principle.
* Avoid deeply nested JSX/TSX logic.
* Prefer simple and explicit implementations over clever code.
* Avoid unnecessary comments; code should communicate its intent through structure and naming.
* Remove dead code and unused imports when working in the affected area.
* Avoid magic numbers and unexplained constants.
* Keep error handling explicit and consistent with existing project conventions.

### 3. SOLID Principles

Apply SOLID principles pragmatically.

* **Single Responsibility:** Keep responsibilities focused and avoid monolithic components.
* **Open/Closed:** Introduce extension points only when the component genuinely requires multiple implementations or future extensibility.
* **Liskov Substitution:** Component variants must respect the behavior expected by their props.
* **Interface Segregation:** Avoid unnecessarily large prop interfaces.
* **Dependency Inversion:** Keep UI components independent from API fetching mechanisms where an abstraction (e.g. `lib/api-client.ts`) provides real value.

Do NOT introduce abstractions merely to satisfy SOLID terminology.

### 4. LLD and Design Patterns

For non-trivial functionality, consider the Low-Level Design before implementation.

Identify:

* Component hierarchy & responsibilities
* Data flow (props vs server components vs local state)
* Error boundaries & loading states
* State ownership
* Integration boundaries with backend APIs

Use established UI patterns (Composition, Render Props, Custom Hooks) only when they solve a real problem. Do NOT introduce complex patterns when a simple prop or state variable provides a clearer solution.

### 5. DRY — Avoid Accidental Duplication

Before creating new code, search the repository for existing components and utilities.

* Reuse existing UI components (`src/components/`), icons (Lucide React), API utilities (`src/lib/api-client.ts`), and TypeScript types (`src/lib/types.ts`).
* Consolidate genuinely duplicated UI or data-fetching logic.
* Do not create parallel implementations of existing functionality.

Do NOT create generic helper files solely because two pieces of code look similar.

### 6. Minimal and Focused Changes

Prefer the smallest clean change that correctly solves the requested problem.

Agents MUST NOT:
* Rewrite working pages/components without justification.
* Refactor unrelated code or styling.
* Introduce heavy third-party UI libraries when vanilla CSS / Tailwind CSS suffices.
* Change established App Router routing architecture without a concrete reason.

### 7. Security First

Security MUST be considered whenever code is added or modified.

* Output sanitization & XSS protection.
* Token handling (stored securely, sent via HTTP authorization headers).
* Validate user inputs on forms prior to submission.
* Never expose API keys or sensitive backend credentials in client-side bundles (`NEXT_PUBLIC_` prefixed variables only for non-secrets).

### 8. Frontend-Specific Rules (Next.js 15 App Router)

* **Server vs Client Components**:
  - Prefer Server Components (`src/app/**/page.tsx`) by default for speed, SEO, and direct data fetching.
  - Use Client Components (`'use client'`) only when interactive state, browser hooks (`useState`, `useEffect`), or event listeners are strictly required.
* **Dynamic Route Export**:
  - Explicitly declare `export const dynamic = 'force-dynamic'` on pages fetching live backend data to prevent static prerender errors during production builds.
* **Styling & Aesthetics**:
  - Follow the established dark-mode glassmorphism aesthetic (`glass-panel`, `gradient-text`, `bg-slate-950`).
  - Use Tailwind CSS utilities defined in `tailwind.config.ts` and `src/app/globals.css`.

### Handling requests: bugs vs. enhancements

**Bug / issue reports** — find, validate, then fix:
1. Locate the relevant code and form a hypothesis from the source first.
2. Validate: reproduce or confirm the issue with the smallest targeted check (one test file/name, one spec, or direct inspection). If it can't be reproduced, say so instead of guessing or running broader suites.
3. Only then fix it, and re-run that same targeted check to prove the fix.
4. Never open with a full test suite or full build; widen only to the blast radius of the change.

**Enhancement / improvement requests** — understand, ask, then build:
1. Understand the relevant part of the application first (read the code, docs, and current behavior).
2. Ask the user which area/feature should be enhanced and what specifically should change, unless the request already states both clearly. Offer concrete options from what you found.
3. Do not start implementing until the user has confirmed the target and the desired change.

### Collaborating with the user: questions, options, and skills

Plan together before building. Use the interactive question tool (`AskUserQuestion`) instead of long free-text questions whenever a decision is genuinely the user's.

**When to ask**
* The request is ambiguous, has more than one reasonable interpretation, or the choice changes what gets built (scope, target page/role, behavior, visual direction, data/API impact).
* An enhancement request that doesn't name both the area and the change (see above).
* A bug whose expected behavior is unclear, or whose fix has product trade-offs.
* The change is hard to reverse or outward-facing (deleting data, migrations, API contract changes, commits, pushes, deploys).

**When NOT to ask**
* The answer is in the code, docs, tests, or this file: look it up instead.
* There is a conventional default: pick it, state it in one line, and proceed.
* A simple, clearly-scoped bug fix or edit. Do not interrogate the user on small tasks.

**How to ask well**
1. Do the homework first. Read the relevant code/docs so the options come from the real application, not generic ideas.
2. Ask 1-4 focused questions per round, each with 2-4 concrete, mutually exclusive options. Each option gets a short label plus what it means and its trade-off. Put the recommended option first and mark it "(Recommended)". Use multi-select only when choices are not mutually exclusive.
3. Use previews (mockup, code snippet, layout sketch) when the user must visually compare options, such as UI layouts.
4. Keep questions specific and answerable in a click. Avoid "what do you want?" and yes/no questions like "should I proceed?".
5. Never ask for something already stated earlier in the conversation.

**Follow-up questions**
* After each answer, decide whether it opens a new decision (edge cases, roles/permissions, mobile vs desktop, error states, empty states, data migration). If yes, ask a short follow-up round; if no, stop asking.
* Summarize the agreed plan in a few lines (what, where, how, what is out of scope) and get a go-ahead before implementing anything non-trivial.
* If scope grows mid-task, pause and re-confirm rather than silently expanding.

**Suggest skills and help**
Proactively offer the fitting skill or workflow, one line each, and let the user choose. Do not invoke heavy workflows unasked. Typical matches:
* Bug or error: `debug-issue` (or `engineering:debug`).
* Understanding an unfamiliar area: `explore-codebase`.
* UI/UX or visual work: `ui-ux-pro-max:ui-ux-pro-max`, `frontend-design:frontend-design`.
* Architecture or design decisions: `engineering:architecture`, `engineering:system-design`.
* Test planning: `engineering:testing-strategy`.
* Restructuring code: `refactor-safely`, `simplify`.
* Reviewing changes before merge: `code-review`, `review-changes`, `security-review`.
* Release readiness: `engineering:deploy-checklist`.
Also offer practical help: a quick plan, a comparison of options, a risk/impact summary, or a docs update.

**Tone**
Be concise and collaborative. Offer a recommendation with each question, never an exhaustive survey. After the user decides, act on it without re-litigating.

### 9. Testing and Validation

**Diagnose first, test narrowly, never start with the full suite.** Full-suite runs (`pnpm test` with no path, `pnpm run test:e2e`, `pnpm run test:e2e:live`, `pnpm run build`) are slow and expensive, and their output is mostly noise for a small change.

When investigating a bug or issue:

1. **Locate and read first.** Find the relevant code (CodeGraph / grep / read the file) and form a hypothesis from the source before running anything.
2. **Reproduce narrowly.** Confirm the bug with the smallest check that can show it: one Vitest file or test name (`pnpm vitest run src/path/file.test.ts -t "name"`), one Playwright spec/project, or a direct inspection. If the bug is not reproducible, say so; do not run broader suites hoping to find it.
3. **Fix, then re-run that same targeted check** to prove the fix.
4. **Widen only as far as the blast radius.** Run the tests of files that import/consume what you changed (use the impact graph), not the whole suite.

Before considering a change complete:

* Run `pnpm exec tsc --noEmit` for any `.ts`/`.tsx` change.
* Run the targeted tests for the files touched. Add or update tests only for meaningful behavior changes.
* Run the full Vitest suite, `pnpm run build`, or Playwright e2e **only** when the change touches shared code with many consumers (`src/lib/`, shared `src/components/ui/`, config, routing/layout), or when the user asks. Docs, copy, and single-component styling changes do not need them.
* Never run a full suite "to see what fails" or as an opening step. Do not re-run a suite that already passed unless code changed since.
* Validate responsive design (mobile, tablet, desktop) only when layout/styling changed.
* Verify API contract alignment with `src/lib/types.ts` when API calls or types changed.

### 10. Universal Backup Center Architectural Rules

Whenever modifying or extending the admin backup & ingestion workflows:

1. **Explicit Domain Selection**: The wizard must always prompt the administrator to explicitly select the backup domain (`USERS`, `FORMS`, `EVENTS`, `HACKATHONS`, or `UNKNOWN_RAW`). Auto-detection can only be displayed as an informative suggestion.
2. **Schema Matching Gauge & 50% Rule**: Show required field status and column matching confidence. Block structured import if required fields fail or match score is below 50%.
3. **Unmapped Column Visibility**: Always list unmapped columns in a dedicated section with assurance that they are preserved in row-level provenance.
4. **Schemaless Escape Hatch**: Always provide a prominent "Save as Raw Backup Vault" option whenever structured validation fails or when the admin prefers archival.
### 11. Password Setup UX & Login Interception Rules

Whenever handling authentication errors or member onboarding:

1. **Strict Contract Matching**:
   - Always evaluate `error.code === 'PASSWORD_SETUP_REQUIRED'` rather than substring searching error message text.
2. **Contextual Action Prompt**:
   - When login fails with `PASSWORD_SETUP_REQUIRED`, immediately offer the user a one-click action to request a setup link using the email already entered in the input, without requiring them to re-enter it on a separate page.
3. **Token-Only Clean URLs**:
   - The password setup route (`/account/setup-password?token=...`) must rely strictly on the `token` parameter. Never expose user email in URLs.
4. **Interactive Strength Validation**:
   - The password confirmation interface must enforce and visually guide the user through the rules in `getPasswordRules` / `validatePassword` (`src/lib/validation/auth.ts`): length ($\ge 8$), upper and lower case, a number, a special character, and no spaces, before permitting form submission. These mirror the server's `ComplexPasswordValidator`. The server also rejects common and all-numeric passwords; those can only be reported after submitting.
   - Do not add checks that depend on the member's name or email. That rule was removed.

### 12. Architecture Preservation & Automated Documentation Lifecycle

**MANDATORY DOCUMENTATION UPDATE PROTOCOL**:
Whenever an agent creates a new frontend page, component, or layout:
1. **Identify Gaps**: Inspect documentation files.
2. **Update Documentation**: Update frontend docs or changelog to reflect new routes or components.
3. **Maintain Technical Learning Guides**: Keep the Next.js 15 App Router technical learning guide (`docs/technical-learning-guide.md`) and Backup Center guide (`docs/backup-center.md`) updated.

---

## Under the Hood: Technical Learning Guide

To accelerate developer onboarding and understand the internal workings of this frontend, refer to:
* **[docs/technical-learning-guide.md](file:///c:/Users/chall/OneDrive/Desktop/SRKRCC-Main_APPLICATION_FRONTEND/docs/technical-learning-guide.md)** — In-depth guide on Next.js 15 App Router, React Server Components vs Client Components, dynamic fetch revalidation, and Tailwind CSS design tokens under the hood.
