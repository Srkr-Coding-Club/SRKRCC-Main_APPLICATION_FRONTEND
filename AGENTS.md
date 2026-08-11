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

### 9. Testing and Validation

Before considering a change complete:

* Run TypeScript compiler checks and Next.js build verification (`npm run build` or `make build`).
* Validate responsive design (mobile, tablet, desktop).
* Verify API contract alignment with `src/lib/types.ts`.

### 10. Architecture Preservation & Automated Documentation Lifecycle

**MANDATORY DOCUMENTATION UPDATE PROTOCOL**:
Whenever an agent creates a new frontend page, component, or layout:
1. **Identify Gaps**: Inspect documentation files.
2. **Update Documentation**: Update frontend docs or changelog to reflect new routes or components.
3. **Maintain Technical Learning Guides**: Keep the Next.js 15 App Router technical learning guide (`docs/technical-learning-guide.md`) updated explaining how server components, client interactivity, and API fetching work under the hood.

---

## Under the Hood: Technical Learning Guide

To accelerate developer onboarding and understand the internal workings of this frontend, refer to:
* **[docs/technical-learning-guide.md](file:///c:/Users/chall/OneDrive/Desktop/SRKRCC-Main_APPLICATION_FRONTEND/docs/technical-learning-guide.md)** — In-depth guide on Next.js 15 App Router, React Server Components vs Client Components, dynamic fetch revalidation, and Tailwind CSS design tokens under the hood.
