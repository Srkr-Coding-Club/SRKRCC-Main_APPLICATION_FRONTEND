# e2e-audit

Tooling behind `docs/ui-ux-audit/`. Not part of `pnpm test` or `pnpm test:e2e`.

It needs no database: `fake-backend.mjs` is a stand-in for the Django API that serves realistic hackathon data, so both the server-rendered pages and the `/api/proxy/*` calls see data. **Never point it at production.**

```bash
# 1. stand-in API (port 8100, FAKE_PORT to change; the real Django dev server uses 8000)
node e2e-audit/fake-backend.mjs

# 2. the site, built, against it
INTERNAL_API_BASE_URL=http://localhost:8100/api NEXT_PUBLIC_API_BASE_URL=http://localhost:8100/api pnpm build
INTERNAL_API_BASE_URL=http://localhost:8100/api NEXT_PUBLIC_API_BASE_URL=http://localhost:8100/api pnpm exec next start -p 3100

# 3. measurements (set AUDIT_BASE to use another port; AUDIT_THEME=light for the light theme)
node e2e-audit/crawl.mjs <label> [routeRegex] [viewportRegex]   # 43 routes x 8 viewports x roles: overflow, targets, axe, console, screenshot
node e2e-audit/contrast.mjs <light|dark> <base> <anon|user|admin> <route...>    # every colour-contrast failure with ratio and colours
node e2e-audit/tabs.mjs <label> <base> <WxH> [theme]            # all 16 admin hackathon tabs
node e2e-audit/flows.mjs <base> <label>                          # keyboard / structure checks (exit 1 on any failure)
node e2e-audit/check-in-flow.mjs <base> [outDir]                # check-in console, admin panels, participant card (56 checks: sessions, team codes, stateful stand-in routes)
node e2e-audit/membership-flow.mjs <base> [outDir]             # club membership: organizers' Requests tab (approve, decline with a reason, approve several, Club Lead read-only) and the member's own card (42 checks)
node e2e-audit/reconcile-flow.mjs <base> [outDir]              # admin Past Members page: upload and column choice, groups, link one/all, mismatches, invite, missing members, export, delete, Club Lead read-only (66 checks)
node e2e-audit/club-id-flow.mjs <base> [outDir]               # admin Club ID panel: look-up, assign, reserve/release, move, clear (typed confirmation), counters, history, Club Lead read-only (48 checks)
node e2e-audit/directory-flow.mjs <base> [outDir]              # admin Users and Members pages: server-side filters in the address, verification badges and actions, paging, broadcast (42 checks)
node e2e-audit/finder-flow.mjs <base> [outDir]                 # organizer Team Finder tab: people / teams / requests, remove, place, stop, close, remind (46 checks)
node e2e-audit/payment-flow.mjs <base> [outDir]                # fee paid at registration: payment step, pending / rejected cards, organizer queue (66 checks)
node e2e-audit/team-modal.mjs <base> [outDir]                  # create-team modal at 7 sizes + light/dark (130 checks)
node e2e-audit/export-flow.mjs <base>                             # every Export control: file name, requested URL, formats, phone menu (47 checks)
node e2e-audit/withdraw-flow.mjs <base>                            # team withdrawal: participant dialog, pending/denied notice, creation limit, organizer panel (44 checks)
node e2e-audit/select-keyboard.mjs <base>                        # FormSelect keyboard behaviour
node e2e-audit/scroll-clip.mjs <base>                            # the 1024px admin overflow, by scrolling
python e2e-audit/compare.py before.json after.json [--hack]      # before / after tables
python e2e-audit/tables.py viewports before.json after.json
python e2e-audit/issues.py                                       # regenerates 10-master-issue-register.md
```

Roles are chosen by the cookie value: token `admin` is an administrator, `user` a participant with a team, `user-noteam` a participant without one. On Git Bash prefix commands that take a route regex with `MSYS_NO_PATHCONV=1`.

The colour and label sweeps used during the audit (`codemod-*.py`) are kept for re-running; see `docs/ui-ux-audit/12-implementation-log.md`.
