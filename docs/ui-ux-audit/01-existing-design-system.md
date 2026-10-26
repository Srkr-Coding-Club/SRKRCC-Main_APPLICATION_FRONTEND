# 01. Existing design system (documented before any change)

Sources read: `tailwind.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `src/components/ui/*`, `src/components/admin/hackathon/shared.ts`, `src/components/hackathons/dashboardStyles.ts`, plus usage counts across `src/**/*.tsx`.

## 1. Visual identity (what is intentional)

| Aspect | Established convention | Evidence |
|---|---|---|
| Brand colours | Orange `#FF7A00` (primary), hover `#E06B00`, burgundy `#8B2E3B`, gold `#FFA500`, navy `#1A1A2E`, purple `#6B3B84` | `tailwind.config.ts` `brand.*`; `#FF7A00` appears 652 times in TSX, `#1A1A2E` 485, `#8B2E3B` 59 |
| Default theme | **Dark first** (`html.dark` unless `localStorage.theme === 'light'`), dark ground `#0D0E15`, card `#151722`; light ground `#FAFAFC` | `layout.tsx` pre-paint script; `globals.css` |
| Two parallel colour vocabularies | (a) semantic "journey" tokens `journey-bg/surface/text/muted/accent/live` as `rgb(var(--...) / <alpha>)`, which flip with the theme; (b) hard-coded hex + `slate-*` + `dark:` pairs (`bg-[#FAFAFC] dark:bg-[#0D0E15]`, `text-[#1A1A2E] dark:text-white`) | 368 uses of `journey-accent`; 118 of `bg-[#FAFAFC]` vs 25 of `bg-[var(--background)]`. Public hackathon pages use (a); admin hackathon pages use (b) |
| Light-mode accent | `--journey-accent` is the deeper `#C2410C` in light and `#FF7A00` in dark, deliberately, "so accent text keeps 4.5:1" (comment in `globals.css`) | `globals.css` |
| Typography | Inter body; Poppins for `h1-h6` globally; Archivo ("display") for the landing and, via `.journey-type`, every hackathon page; JetBrains Mono for eyebrows, labels and nav pills | `layout.tsx` `next/font`, `globals.css`, `app/hackathons/layout.tsx` |
| Radius cap | "Nothing rounder than 10px except `rounded-full`" is enforced in `tailwind.config.ts` by remapping `rounded-lg/xl/2xl/3xl` | `tailwind.config.ts`; bypassed by 35 arbitrary values (`rounded-[28px]` x22, `[24px]` x8, `[20px]` x3, `[32px]` x1) |
| Surfaces | `glass-panel` (translucent gradient + blur + inset highlight), `glass-panel-solid` for popovers | `globals.css` |
| Shadows | `shadow-subtle`, `shadow-dramatic`, `shadow-brand-glow`, plus ad-hoc | `tailwind.config.ts` |
| Icons | `lucide-react` only | `package.json` |
| Motion | `prefers-reduced-motion: reduce` blanket rule present; global `*:focus-visible` outline present | `globals.css` L516, L532 |
| Breakpoints | Tailwind defaults (sm 640, md 768, lg 1024, xl 1280, 2xl 1536) | no override |

## 2. Type scale actually in use

| Class | Uses | Note |
|---|---|---|
| `text-xs` (12px) | 1006 | dominant "small" size |
| `text-sm` | 628 | dominant body |
| `text-[11px]` | 375 | de-facto label size (mono uppercase eyebrows, pills) |
| `text-[10px]` | 241 | below 12px by a wider margin |
| `text-[9px]` | 10 | smallest |
| `text-base` / `lg` / `xl` / `2xl` / `3xl` | 79 / 62 / 40 / 42 / 30 | |

Weights: `font-bold` 929, `font-semibold` 441, `font-medium` 143, `font-extrabold` 80, `font-black` 33.

Heading convention inside the public hackathon module: `font-semibold tracking-tight` (hero, dashboard, finder, judging, check-in). Admin convention: `font-extrabold` + Poppins. Both are internally consistent; the cross-over is documented in file 05.

## 3. Shared component inventory

| Pattern | Implementations found | Assessment |
|---|---|---|
| Text input | `SpotlightInput/Textarea/Select` (`ui/InputField.tsx`, 16px on phones, `aria-invalid`), admin `INPUT` constant (`admin/hackathon/shared.ts`, was 14px), raw `<input>` with ad-hoc classes in forms | Two systems; admin one lacked the 16px rule |
| Select | native `<select>` (admin), `FormSelect` custom listbox (27 uses), `ModernSelect` on the public form page | `FormSelect` lacked keyboard support and an accessible name (fixed) |
| Buttons | `BTN/BTN_PRIMARY/BTN_GHOST/BTN_DANGER` (admin shared), `BTN/BTN_ACCENT/BTN_QUIET` (participant `dashboardStyles.ts`), `PillButton`, inline class strings (~93 solid-accent buttons) | Two parallel constant sets with the same shape; solid accent buttons fixed to one text-colour token |
| Status badges | `StatusPill` (7 tones, `text-[10px]`), plus ~30 inline pill class strings in the public hackathon pages | Public pages re-implement pills with different shades (`emerald-600`, `#C25A00`, `sky-600`) than `StatusPill` (`emerald-700`, `amber-700`, `sky-700`) |
| Cards | `PublicListingCard`, `PageSectionCard`, `PANEL`/`glass-panel`, `StackCards`, `BounceCards` | |
| Modal | `ui/Modal.tsx` (focus trap via `useFocusTrap`, title `h3`), `ConfirmDialog` (`useConfirmDialog`) | |
| Toast | `ToastContext` + `ToastContainer` | |
| Loading | `LoadingSkeleton`, `LoadingSpinner`, inline `animate-pulse` blocks | |
| Navigation | `Navbar`, `AdminNavbar` (+ breadcrumb strip), `SectionNav` (hackathon detail), tablist in `HackathonManager` | |

## 4. Confirmed inconsistencies (each is tracked in `10-master-issue-register.md`)

1. **White text on the brand orange fails contrast.** `#FFFFFF` on `#FF7A00` = 2.61:1 (axe, dark theme, 10-16px bold labels and buttons). 93 single-line solid-accent buttons used `text-white`. In light mode `journey-accent` is `#C2410C` (4.97:1 with white) so the pairing was only broken in the default (dark) theme and wherever the hard-coded `#FF7A00` was used.
2. **Brand orange used as text on light surfaces.** 282 `text-[#FF7A00]` instances (2.55:1 on `#FCFCFE`, fails even the 3:1 large-text bar) although a theme-aware token already existed.
3. **At least six ad-hoc "darker orange for light mode" shades** (`#C25A00` x10, `#D85F00` x9, `#C25100` x4, `#A84600` x4, `#E06B00`, `#C2410C`, `#9A3412`) used for the same job.
4. **`--journey-muted` light value `#6F6F7F` is 4.07:1 on `journey-text/5` surfaces** (measured), used by every muted caption.
5. **Heading weight outlier**: hackathon detail `h1` was `font-extrabold` while every other participant-facing hackathon `h1` is `font-semibold`.
6. **Type scale has three sub-12px sizes** (9, 10, 11px) where one floor would do.
7. **Radius cap is documented but bypassed** by 35 arbitrary radii; not changed (see 07, T-3).

## 5. Principles applied to the fixes

* No new palette, no new fonts. The only new token is `--journey-on-accent` (`journey.on-accent`): it reuses the existing navy `#0D0E15` (dark) and the existing off-white `#FAFAFC` (light) as the text colour on solid accent fills.
* One token value adjusted, with measurement: light `--journey-muted` `111 111 127` -> `104 104 120` (`#6F6F7F` -> `#686878`) so captions reach >= 4.5:1 on the worst measured surface (4.08 -> 4.52).
* Where a token already existed (`journey-accent`), hard-coded hex was replaced by the token instead of inventing another shade.
* Shared components (`FormSelect`, `InputField`, `TagInput`) were extended in a backwards-compatible way.
