# 07. Typography, colour, icons and shared components

Principle kept throughout: **no new palette, no new font**. One new CSS variable was added (`--journey-on-accent`), built from two colours the site already uses; one existing variable was nudged (`--journey-muted`, light) after measurement.

## 1. Colour

All ratios are axe-core measurements on the rendered page (`e2e-audit/contrast.mjs`), not estimates. Thresholds: 4.5:1 normal text, 3:1 large text (24px, or 18.66px bold).

| ID | Existing colours / where | Measured | Why it is a problem | Smallest correction applied |
|---|---|---|---|---|
| COLOR-001 | `#FFFFFF` on brand `#FF7A00` (solid accent buttons and pills). 99 class lists (`bg-[#FF7A00]` or `bg-journey-accent` + `text-white`), incl. every hackathon CTA | **2.61:1** dark (10-16px bold); light theme already used `#C2410C` (4.97:1) | Primary call to action unreadable for low vision in the default theme | New token `journey-on-accent` = the site's own dark ground `13 14 21` on the vivid orange (7.0:1) in dark, and its own off-white `250 250 252` on `#C2410C` (4.97:1) in light. Brand orange itself unchanged. |
| COLOR-002 | `text-[#FF7A00]` on light surfaces, 282 sites (prize amounts, icons, links, eyebrows) | **2.55:1** on `#FCFCFE`, fails even the 3:1 large-text bar | A theme-aware token (`journey-accent`: `#C2410C` light, `#FF7A00` dark) already existed | Replaced with `text-journey-accent`; dark theme renders identically |
| COLOR-003 | `--journey-muted` light `#6F6F7F` on tinted surfaces (`journey-text/5`, `/10`) | 4.07-4.48:1 (worst `#E9E9EE`) | Every caption and secondary line | `#686878` -> 4.52:1 worst case, 5.25:1 on the page ground |
| COLOR-004 | `text-slate-500` (`#64748B`) on the dark ground `#0D0E15`, 336 sites without a dark variant | **4.04:1** | Secondary text across admin and hackathon admin in the default theme | Pair with the existing convention `dark:text-slate-400` (`#94A3B8`, ~7.7:1) |
| COLOR-005 | `text-slate-400` on light surfaces (hackathon module, shared ui) | 2.45-2.56:1 | Helper text, counters, "Markdown supported" | `text-slate-500 dark:text-slate-400` in 27 files / 89 sites. **267 occurrences remain in the rest of the app** |
| COLOR-006 | Status text and fills: `rose-500` text 3.76:1, `amber-600` text 3.19:1, `emerald-600` fill+white 3.77:1, `amber-500` fill+white 2.15:1, `sky-600` 4.1:1 | as listed | Error and warning messages | rose-600 / amber-700 (light) paired with the existing dark shades (185 sites); fills moved to 700 shades in the hackathon module |
| COLOR-007 | Five ad-hoc "dark orange for light mode" shades (`#C25A00` x10, `#D85F00` x9, `#C25100` x4, `#A84600` x4, `#E06B00`) doing the job of one | 3.2-3.6:1 as text on orange tint | Same meaning, different colours | Hackathon module and shared pills now use `journey-accent` / `orange-800` (`#9A3412`, already in the repo); `StatusPill` tones darkened one step |
| COLOR-008 | `journey-accent` text on `journey-accent/10-20` tint (chips, avatars, code badges) | 3.4-4.2:1 in light | Marginal | Fixed in the hackathon module (`orange-800` on light); **open elsewhere** |
| COLOR-009 | Gradient buttons `from-[#FF7A00] to-[#E06B00] text-white`, 4 on `forms/[slug]`, 1 in `AttendanceScannerTab` | ~2.6-3.4:1 | Public form submit buttons | **Open** (busiest public flow, ship with its tests) |
| COLOR-010 | Two colour vocabularies (theme tokens vs hard-coded `#FAFAFC`/`#0D0E15`/slate pairs): 368 `journey-accent` vs 118 `bg-[#FAFAFC]` | - | Maintenance, not a visible defect: both resolve to the same brand colours | Documented in 05; not refactored |

Preserved: `#FF7A00`, `#8B2E3B`, `#1A1A2E`, `#FFA500`, `#6B3B84` and every semantic distinction between success, warning and error. Status is never colour-only: pills carry text, and the closed/full call to action carries an icon and words.

## 2. Typography

| ID | Finding | Evidence | Status |
|---|---|---|---|
| TYPO-001 | `h1` weight outlier on the hackathon detail page (`extrabold` vs `semibold` on the five other participant pages) | grep | Fixed |
| TYPO-002 | Three sub-12px sizes in use (9, 10, 11px) for labels and pills: the hackathon module had about 2 / 34 / 140 of them (9px / 10px / 11px) | grep | 9px and 10px -> 11px in the hackathon module and shared pills; 11px remains the floor. Phone buttons that were 10px -> 12px |
| TYPO-003 | Eyebrow `truncate` at 320px | shot | Fixed |
| TYPO-004 | Two heading faces: Poppins (global `h1-h6`) vs Archivo (`.journey-type`, landing + all hackathon pages) | `globals.css` | Intentional; admin hackathon pages inside `/hackathons/[slug]/manage` render in the `journey-type` wrapper, so the same `HackathonManager` shows Archivo there and Poppins under `/admin`. Noted, not changed |
| TYPO-005 | 410 uses of `text-[11px]`, 204 of `10px`, 8 of `9px` outside the hackathon module | grep | Open |
| - | Font loading: `next/font` self-hosted, `display: swap`, 4 families; no layout shift seen at any viewport | crawl | Pass |
| - | Inputs 16px on phones | `SpotlightInput` already; admin `INPUT` fixed | Pass after fix |

## 3. Icons
Single library (`lucide-react`). Icons beside text are `aria-hidden`; icon-only buttons now carry names in the hackathon module (member actions, tag/domain remove, QR). No emoji used as interface icons in the hackathon module (searched). Sizes are consistent (`h-3.5` in buttons, `h-4` in headings, `h-5` in fact tiles).

## 4. Shared components

| Component | Finding | Action |
|---|---|---|
| `FormSelect` (27 uses) | No keyboard model, no name, Escape propagated to dialogs | Rebuilt interaction, same props plus `aria-label` / `aria-labelledby`; 6 unit tests |
| `InputField` | No error component | `FieldError` + `fieldErrorId` added; used in the team form and organizer questions |
| `StatusPill` | 10px, light text one shade short of 4.5:1 | 11px, darker light tones |
| `TagInput`, `MarkdownEditor` | No accessible name, 14px on phones, 12-16px remove buttons | Fixed |
| `Modal` | Focus trap, Escape, scroll lock, bottom sheet on phones | Already good; unchanged |
| Button constants | Two parallel sets (`BTN_PRIMARY/GHOST/DANGER` admin; `BTN_ACCENT/QUIET` participant) with identical shape | Not merged (no benefit that justifies the churn); both now use the same text token |
| Radius cap | `tailwind.config.ts` remaps `rounded-lg..4xl` to <=10px, but 35 arbitrary `rounded-[20-32px]` bypass it (22 of them `rounded-[28px]`, e.g. `PageHero`) | APP-UI-002 open; a design decision (the large radii are on hero panels and give them their look) |

## 5. Spacing, cards, shadows
Spacing and card padding follow `p-5 sm:p-6/7` and `gap-3/4/6` consistently within the hackathon module; no outliers worth changing. Card shells are shared (`PublicListingCard`, `PageSectionCard`, `PANEL`). No excess shadow found.
