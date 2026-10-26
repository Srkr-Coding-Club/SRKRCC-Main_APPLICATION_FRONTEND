# 05. Hackathon user / admin consistency

Scope: the same hackathon as an organizer configures it (`/admin/hackathons/[slug]`, 16 tabs) and as a participant sees it (`/hackathons`, `/hackathons/[slug]`, `.../dashboard`). Both were rendered from the same fixture record. Findings are limited to what that comparison shows; no organizer write was executed against a real backend.

## Legitimate differences (not defects)

| Aspect | Public / participant | Admin | Verdict |
|---|---|---|---|
| Colour vocabulary | Theme tokens `journey-*` | Hard-coded `#FAFAFC` / `#0D0E15` / `slate-*` with `dark:` pairs | Both resolve to the same brand colours; admin is dense tooling. Left as is. |
| Heading face and weight | Archivo (`.journey-type`), `font-semibold` | Poppins, `font-extrabold` | Intentional split (marketing vs control room). Each side is internally consistent after TYPO-001. |
| Density | 12-16px body, large cards | 12-14px, compact panels | Different jobs. |
| Navigation | Section tabs on the page, back link | 16-tab control room, breadcrumb strip | Different jobs. |

## Inconsistencies found

| ID | What a participant sees | What an organizer sees | Fix |
|---|---|---|---|
| HACK-CONS-001 | Detail page pill: **"Registrations live" / "Registrations closed"** | Admin list and manager: **"Registration open" / "Registration closed" / "Registration not open"**; participant dashboard: "Registration open / closed"; listing card: "Registration Closed" / "Registration opens soon" | Public detail pill now reads "Registration open / closed" (`HackathonDetailClient.tsx`). "Registration not open" (admin) vs "opens soon" (card) is the one remaining pair; it describes the same state for two audiences and is recorded as an enhancement. |
| HACK-CONS-002 | Listing title "Upcoming Hackathons (3)" counted a closed event (CodeFest 2025 carries a "Closed" badge) | List shows all three with correct status | Heading changed to "All Hackathons (N)". The count now matches what the organizer sees. |
| HACK-CONS-003 | Public status pills hand-coloured (`emerald-600`, `#C25A00`, `sky-600`, `slate-500`) | Shared `StatusPill` (`emerald-700`, `amber-700`, `sky-700`) | Public pills moved to the same shades as `StatusPill`; `StatusPill` itself darkened one step for 4.5:1 on its tint (see 07). Same state now has the same colour on both sides. |
| HACK-CONS-004 | Primary buttons: white text on orange (2.6:1 in dark) | Admin `BTN_PRIMARY` identical | One token (`journey-on-accent`) now drives both sides. |
| HACK-CONS-005 (observation) | Team size shown as "2 - 4 Members" on the detail page, "2 - 4" in the sidebar, "Team size 2-4" on the dashboard | "Team size 2–4" (en dash) in admin cards | Cosmetic (hyphen vs en dash, three phrasings). Not changed; recorded as Low. |
| HACK-CONS-006 (suspected) | `registration_closes_at` is formatted IST with an explicit "IST" label on the public page | Admin `datetime-local` inputs use the browser's local zone (`toLocalInput`) with no zone label | An organizer outside IST would enter a time that the public page then shows shifted. Needs a live check with a non-IST browser; not verifiable with fixtures. |
| HACK-CONS-007 | Prize amounts rendered from `prizes[]` in `text-[#FF7A00]` (2.55:1 on light) | Admin editor in `ObjectListEditor` | Display fixed (token), editor unchanged. |

## Data the two sides share, checked with the fixture
Title, theme, dates, deadline, team-size range, prize pool, mode/venue, tags, FAQ and sponsors flowed from the single record to both views without being re-labelled differently, except as listed. Banner crop is applied by `BannerImage` on the public side and edited by `BannerCropEditor` in admin; the fixture had no banner, so the crop round-trip was **not** tested (limitation).
