# Hackathon submissions: verify, validate, extend (plan and outcome)

## What was verified first (live Django + Playwright)
- Project flow worked end to end for the team leader and the judge; the admin table showed only title and links (no way to read the project).
- Validation gaps found: any URL accepted as a repository, private/loopback hosts accepted, one-word descriptions accepted, an over-long URL caused a server error (500).
- Decks: `.ppt` and `.pptx` only; no preview for any file.

## What changed
| Area | Change |
| --- | --- |
| Backend rules | `link_rules.py` (repo/video/LinkedIn/any), minimum lengths, URL ≤ 200 characters returns a field error instead of a 500 |
| PDF | `.pdf` accepted as a deck, content checked by magic bytes, served inline for preview |
| Preview | PDF and image preview dialog (before sending and from saved files); PowerPoint is download-only |
| Admin | "Read project" dialog; idea files have Preview and Download |
| Forms | links checked before sending; errors beside the field; typed text kept |
| CSP | report-only `frame-src 'self' blob:` + upload origins |

## Link and detail rules
See `docs/technical-learning-guide.md` (section "Idea and project submissions"). Reachability checks are intentionally excluded (SSRF risk, links change).

## Tests
- Backend: `test_link_rules.py`, `SubmissionDetailRulesTests`, PDF cases in `test_idea_files_and_payment.py`.
- Vitest: `submissionLinks.test.ts`, `IdeaPanel`, `SubmissionPanel`, admin tabs.
- Live Playwright: `hackathon-submissions` (leader, refused save, admin reads, judge sees, 24-case rule table), `hackathon-idea-pdf`, `hackathon-ideas`.

## Risks
- Real S3 must allow `frame-src` origin in CSP once enforced (set `UPLOAD_CONNECT_SRC`).
- Browsers without an inline PDF viewer (some mobile) show a blank frame; the dialog offers Download.
- The host allowlists need occasional additions when teams use other sites.
