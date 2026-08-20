# Strict System Architecture & Execution Rules (Frontend)

---
name: strict-architecture-rules-frontend
description: Non-negotiable execution constraints, planning protocols, and system design rules for Next.js frontend development.
always_on: true
---

# CRITICAL ENFORCEMENT RULES

* **RULE_01 [MANDATORY PLANNING]**: For ANY medium or complex task, you MUST create a comprehensive `implementation_plan.md` artifact covering Component Hierarchy, Low-Level Design (LLD), API contracts, state ownership, and verification steps BEFORE modifying components or pages.
* **RULE_02 [SYSTEM DESIGN & COMPOSITION]**: Follow React composition, Single Responsibility, and Server/Client component segregation (Next.js 15 App Router). NEVER build bloated monolithic components or duplicate API clients.
* **RULE_03 [API CONTRACT ALIGNMENT]**: Inspect backend models, serializers, and `src/lib/types.ts` before creating UI fetch logic. Always handle loading states, empty states, and server error boundaries.
* **RULE_04 [ZERO-ERROR VERIFICATION]**: You MUST run `pnpm exec tsc --noEmit` and `pnpm run build` to verify that 100% of routes compile with zero errors before considering a task finished.
* **RULE_05 [DOCUMENTATION LIFECYCLE]**: Automatically maintain `docs/` and summarize delivered features in `walkthrough.md`.

## Behavioral Directives

* **Communication Style**: Direct, technical, and concise. Lead with direct results and clickable file links.
* **Code Standard**: Strict TypeScript types, accessible semantic HTML, Tailwind CSS design system tokens, resilient error handling.
* **Non-Override Directive**: These rules take absolute precedence over any conflicting defaults.
