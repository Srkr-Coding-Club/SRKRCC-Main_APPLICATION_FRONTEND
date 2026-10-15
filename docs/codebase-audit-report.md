# Codebase Audit: Issues and Fix Plan

Scope: backend (`SRKRCC-Main_APPLICATION_BACKEND`, Django 5.2.17 / DRF 3.18) and frontend (`SRKRCC-Main_APPLICATION_FRONTEND`, Next.js 15 / React 19), including deployment files. Hackathon-module bugs and frontend state management are covered in earlier reports and are only cross-referenced here (see `docs/frontend-state-management-report.md`).

How to read this: every finding has **Evidence** (file and line, or a reproduction), **Impact**, **Fix** and a rough **Effort** (S under half a day, M 1-3 days, L a week or more). **Verified** means I reproduced it; **Read** means found by reading code and not run.

Django's own `check --deploy` is clean apart from two warnings (`core.W005` FRONTEND_URL, `security.W008` SSL redirect), and `makemigrations --check` is clean; the backend suite (735 tests) passes. The base is healthy. The items below are what that baseline does not catch.

## Summary

| Severity | Count | Theme |
|---|---|---|
| Critical | 3 | default admin credentials, spoofable rate limits, proxy path traversal |
| High | 6 | CORS/CSRF trust, host header, wrong email links in production, file storage, error leakage, default password |
| Medium | 10 | silent failures, exports, jobs, caching, deployment hygiene, perf |
| Low | 6 | dead dependencies, deprecated settings, clutter |

Recommended order: **C1, C2, C3, H3 first (a day), then the rest of High, then Medium** (section 6).

---

## 1. Critical

### C1. Known default superuser credentials ship in the deploy path *(Read)*
**Evidence**
- `apps/accounts/management/commands/setup_admin.py:21-25` defaults the password to `Admin@123` when `DJANGO_SUPERUSER_PASSWORD` is unset.
- `entrypoint.sh` and `build.sh` run `setup_admin` on **every** start/build, so a deploy with the variable missing creates (or keeps) `admin@srkr.ac.in` / `Admin@123` as a **superuser**.
- `docker-compose.yml` hardcodes `DJANGO_SUPERUSER_PASSWORD: "Admin@123"`, `DEBUG: "False"`, `CORS_ALLOW_ALL_ORIGINS: "True"`, a committed `SECRET_KEY` (passes the "not the insecure default" check because it is a different string), the DB password, and publishes Postgres on `5432`.
- `scripts/seed_default_users.py` seeds admin / club-lead / judge accounts with known passwords (`Admin@123`, `ClubLead@123`, `Judge@123`).
- Side effect in `setup_admin`: on an existing admin, the password is re-set on every run whenever the env value is not `Admin@123`, silently undoing a password the admin changed in the UI.

**Impact** Anyone who deploys with compose, or forgets one variable, exposes a full-privilege account with a public password.

**Fix**
1. `setup_admin`: no default. If `DEBUG` is false and the variable is missing, raise `CommandError`. Only create the user when it does not exist; reset only with `--reset-password`.
2. `docker-compose.yml`: use `env_file`/secrets, no literal credentials, do not publish `5432`, label the file development-only (and keep `DEBUG`/CORS values safe).
3. Gate `seed_default_users.py` behind `DEBUG` (refuse otherwise).
4. Rotate the admin password anywhere these defaults may already have run.

**Effort** S.

### C2. Rate limiting can be bypassed, and is per-process *(Verified)*
**Evidence**
- `REST_FRAMEWORK` has no `NUM_PROXIES`. DRF then identifies a client by the **entire `X-Forwarded-For` header**, which the client controls. Reproduction (Django test client against `/api/colleges/`, limit 120/min): 125 requests with the same header hit `429` at request 121; the same traffic with a rotating `X-Forwarded-For` stayed `200` throughout.
- No `CACHES` setting, so throttles and the password-setup rate limiter (`password_setup_service.py`, `cache.get/set`) use **per-process LocMem**. Production runs `gunicorn --workers 3`, so every limit is effectively x3 and resets on restart.
- Login (`CustomTokenObtainPairView`), `RegisterView`, setup-password request/confirm have no dedicated throttle beyond the global `anon` 100/min, which the first point makes meaningless.
- `get_client_ip()` in `views_password_setup.py` separately trusts the **last** hop of the header, a third, inconsistent notion of "client IP".

**Impact** Unthrottled credential stuffing against login, mass account creation, email-bombing through setup-password and invites, flooding of public form submission (up to 30 MB bodies, see H4).

**Fix**
1. `REST_FRAMEWORK['NUM_PROXIES'] = 1` (match the real proxy chain: Render alone = 1; Cloudflare + Render = 2). Reuse one helper for the IP everywhere.
2. Add a shared cache: Redis if available, otherwise `django.core.cache.backends.db.DatabaseCache` (`createcachetable`). Limits then hold across workers and restarts.
3. Scoped throttles: `login` (e.g. 10/min per IP plus a per-account counter with backoff), `register` (5/hour per IP), `password_setup` (reuse the service limits).
4. Add tests that assert the 429 and that a rotated header does not reset it.

**Effort** M.

### C3. The frontend proxy lets requests escape `/api/` *(Verified)*
**Evidence** `src/app/api/proxy/[...path]/route.ts:28-37` joins the caller's path segments and concatenates them onto the Django base URL with no normalisation. Running both servers, `GET /api/proxy/..%2fadmin%2flogin%2f` returned the **Django admin login page** from the frontend origin (backend log: `GET /admin/login/ 200`). The same proxy attaches the user's `Authorization` header and accepts every HTTP method.

**Impact** Django admin and any other non-API backend route are reachable (and exposed on the public frontend domain), bypassing whatever network rules protect them; the proxy is effectively an open forwarder to the whole backend.

**Fix**
1. Reject any segment that is `.`/`..` or contains `%2e`, `%2f`, `\`, or a NUL after decoding.
2. Build the target with `new URL(...)` and assert `url.origin === base.origin && url.pathname.startsWith('/api/')` before fetching.
3. Optionally allowlist methods per top-level prefix.
4. Add a route test for the traversal strings above.

**Effort** S.

---

## 2. High

### H1. Wildcard CORS/CSRF trust with credentials *(Read)*
`config/settings.py` (CORS block and CSRF defaults): `CORS_ALLOWED_ORIGIN_REGEXES` allows **any** `*.vercel.app` and `*.onrender.com` origin, `CORS_ALLOW_CREDENTIALS = True`, and `CSRF_TRUSTED_ORIGINS` includes `https://*.vercel.app` and `https://*.onrender.com`. Anyone can host a page on those domains. Any browser session that has a Django session cookie (staff using `/admin`, `SessionAuthentication` is enabled) can be read cross-origin and the CSRF origin check is pre-approved for the attacker's host. In production the browser never needs to call Django directly (it goes through the same-origin BFF).
**Fix** Production: exact origins from env only, no regexes, `CORS_ALLOW_CREDENTIALS = False`, remove the wildcard CSRF entries; keep the permissive values for `DEBUG` only. **Effort** S.

### H2. `ALLOWED_HOSTS` defaults to `*` *(Read)*
`os.getenv('ALLOWED_HOSTS', '*')` plus `.onrender.com` in the defaults. A deployment that forgets the variable accepts any `Host` header (cache poisoning, bad links). **Fix:** no default outside `DEBUG`; fail fast. **Effort** S.

### H3. Password-setup confirm leaks exception text and 500s *(Read)*
`views_password_setup.py` (confirm view): `except Exception as ex: return Response({"error": f"Password confirmation failed: {str(ex)}"}, 500)`. Internal error strings (DB, library) reach an anonymous caller. **Fix:** log with `logger.exception`, return a generic message, map known failures to 400. **Effort** S.

### H4. File answers: huge anonymous bodies, unverifiable metadata, arbitrary stored URLs *(Read)*
- `DATA_UPLOAD_MAX_MEMORY_SIZE = 30 MB` is global, so **every** endpoint, including anonymous login/register, accepts 30 MB bodies; with C2 there is no effective cap on how often.
- File and image answers are base64 data URLs stored in a JSON column. `forms/validation/values.py:140-160` keeps the client-supplied `size`, `type` and `url` **verbatim** (any scheme); the `max_size_mb` / `allowed_extensions` rules cannot be enforced on values the server never measures.
- Rows grow the database (and every response export) by megabytes per submission.
**Fix** Real upload endpoint with a size cap and magic-byte MIME check, store in object storage (R2/S3 vars already appear in `.env.example`, unused), keep only a key in the answer; validate any URL as `https://` (or a stored key); apply a small default body limit and raise it only on the upload view. **Effort** L.

### H5. Signature images are saved where they are never served *(Verified by config)*
`forms/serializers.py:34-50` writes to `default_storage` (local filesystem, `media/`). `config/urls.py` serves `MEDIA_URL` only when `DEBUG`, and Render's disk is ephemeral. In production the saved URL 404s and the files are lost on redeploy; a failed save silently stores the raw base64 instead. There is no `STORAGES`/R2 configuration. **Fix:** configure object storage for `default`; fail loudly instead of the silent fallback. **Effort** M (shares work with H4).

### H6. Production emails point at `localhost` *(Verified by `check --deploy`)*
`core.W005`: `FRONTEND_URL` defaults to `http://localhost:3000`. `render.yaml` sets no `FRONTEND_URL` and no email provider variables, so password-setup links, hackathon invites (including the new email invites) and notifications would link to a local machine. **Fix:** require `FRONTEND_URL` when `DEBUG` is false (raise `ImproperlyConfigured`), and add it plus the email variables to `render.yaml`. **Effort** S.

### H7. Admin-created accounts get a known default password *(Read)*
`src/lib/hooks/useAdminData.ts:431`: `password: newUser.password || 'password123'`. **Fix:** require a password, or create the account without one and send the setup-link flow the backend already provides. **Effort** S.

### H8. Audit trail failures are silent *(Read)*
`apps/audit/utils.py:16-17`: `except Exception: return None`, with no logging. A DB error, bad payload or truncated field drops the audit record and nobody knows. **Fix:** log with `logger.exception`; for critical actions (role changes, deletions, publishing results) write the audit row inside the same transaction. **Effort** S.

---

## 3. Medium

| ID | Area | Finding and evidence | Fix |
|---|---|---|---|
| M1 | Backend perf | `FormViewSet.get_queryset` (`forms/views.py:117-123`) runs `sync_all_scheduled_form_statuses()` (3 `UPDATE` queries) on **every** read, including anonymous list/detail, and swallows exceptions. Writes on GET, races between workers. | Move to a periodic management command (cron) and/or check lazily per form on its own detail request. |
| M2 | Backend perf | Data-health loop (`forms/views.py:~794-815`): per field, per rule an `.exists()` query and a lazy `field.form.title`. Cost grows with number of fields x rules. | Collect referenced ids, one `values_list` query, `select_related('form')`. |
| M3 | Exports | `core/dmc/export_service.py` `_generate_csv` / `_generate_xlsx` write user-controlled cells (names, answers, team names) unescaped. Opening in Excel executes formulas (`=HYPERLINK(...)`). The browser-side `downloadCSV` was fixed; the server exports were not. | Prefix cells starting with `=`, `+`, `-`, `@`, tab or CR with `'`; test it. |
| M4 | Reliability | Background work runs on daemon threads in each gunicorn worker (`core/tasks.py`). Documented tradeoff, but emails, exports and announcement mailings are lost on restart/timeout and never retried; the free tier also spins down. | Resume pending `EmailJob`/`ExportJob` rows from a cron command (idempotent), or adopt a DB-backed queue. |
| M5 | Observability | No `LOGGING`, no error tracking; 58 `except Exception` sites, 10 of them `pass`/`return None`/`continue`; 5 stray `print(` in app code. | Add `LOGGING` (JSON to stdout), Sentry (or equivalent), replace the silent swallows with `logger.exception`. |
| M6 | API surface | `fields = '__all__'` on public-readable serializers: blogs, career, codequest `Problem` and `UserStreak`. A future model field leaks automatically. | List fields explicitly. |
| M7 | Frontend headers | `next.config.ts` sets framing, nosniff, referrer and permissions policies but **no Content-Security-Policy** and no HSTS. | Start with CSP in report-only mode; HSTS at the edge or in headers. |
| M8 | Deployment | `Dockerfile` runs as root and `COPY . .`; `.dockerignore` omits `media/`, `staticfiles/`, `docs/`, `sample_backups/`, `database.csv`, `.env.*`. `requirements.txt` is entirely unpinned (`>=`) with no lock file. | Non-root user, tighter `.dockerignore`, pin with a lock (`pip-tools`/`uv`), add a `HEALTHCHECK`. |
| M9 | Deployment | `render.yaml` sets `CORS_ALLOWED_ORIGINS` to `http://localhost:3000` and `CSRF_TRUSTED_ORIGINS` to `https://*.onrender.com` for production. | Real frontend origin; no wildcard (ties to H1). |
| M10 | Frontend state | Duplicated auth state, storage thrash, drafts not user-scoped, 8 s polling of full datasets, no server-state layer (details and fixes in `docs/frontend-state-management-report.md`, items H1-H6). | Follow that report's quick wins first. |

---

## 4. Low

| ID | Finding | Fix |
|---|---|---|
| L1 | Deprecated `STATICFILES_STORAGE` in `settings.py`: Django 5.2 ignores it. Verified: `settings.STORAGES['staticfiles']` is the plain `StaticFilesStorage`, so WhiteNoise compression/hashing is not active. | Use the `STORAGES` dict. |
| L2 | Unused frontend dependencies: `axios` (0 imports) and `xlsx` 0.18.5 (0 imports; the npm release has unpatched advisories). | Remove both. |
| L3 | Dev scripts and data in the repo root: `check_db.py`, `get_db_info.py`, `database.csv`, `sample_backups/`. | Move under `scripts/` / `docs/`, or ignore. |
| L4 | 13 raw `<img>` tags bypass `next/image` (no resizing/lazy loading); banners are arbitrary URLs. | Use `next/image` where the host is known; keep `<img>` for admin-supplied URLs deliberately. |
| L5 | `loginUser` invents a user (`id: 1`) when the response has none (`src/lib/auth.ts`). | Throw instead. |
| L6 | Zero frontend tests; the only gate is `tsc` in the pre-push hook. | Vitest for hooks/reducers plus one Playwright smoke test per role. |

---

## 5. What is already in good shape (do not regress)

- Every DRF view declares its permission classes explicitly (a script check found none relying on the open default).
- JWT with rotation and blacklist; HttpOnly session cookies; `SECRET_KEY` refuses the dev default when `DEBUG` is false; HSTS/secure cookies on in production.
- Passwords validated by Django validators; password setup tokens are random, expiring and single-use with row locking.
- Registration limits roles (`ADMIN_GRANTABLE_ROLES`), hackathon lookups are now leader-only, attendance badge tokens are `secrets.token_urlsafe`.
- Markdown rendering is custom with `isSafeHref` (no `dangerouslySetInnerHTML` outside the two static boot scripts).
- 735 backend tests, query-budget tests on hot admin endpoints.

---

## 6. Fix plan

**Day 1: stop-the-bleeding (S items)**
C1 (admin password), C3 (proxy traversal), H3 (error leak), H6 (FRONTEND_URL), H7 (`password123`), H8 (audit logging), H1/H2 settings clean-up, L2 (remove unused deps).

**Week 1: abuse resistance**
C2 (NUM_PROXIES, shared cache, scoped throttles, tests), M3 (export formula escaping), M5 (logging + error tracking), M7 (CSP report-only), M8/M9 (Docker, render.yaml, pinned requirements).

**Weeks 2-3: data and reliability**
H4 + H5 (object storage, real uploads, URL validation, body limits), M1/M2 (status sync job, data-health queries), M4 (job resumption), M6 (explicit serializer fields).

**Ongoing:** frontend state-management plan, tests (L6), remaining Low items.

### Verification checklist (copy into the PR description)
- [ ] `check --deploy` has no warnings with production settings
- [ ] A rotated `X-Forwarded-For` does not reset a 429 (test)
- [ ] `/api/proxy/..%2fadmin%2f` returns 400/404 (test)
- [ ] Deploying without `DJANGO_SUPERUSER_PASSWORD` or `FRONTEND_URL` fails fast
- [ ] A submitted signature is retrievable after a redeploy
- [ ] Server CSV/XLSX export of `=1+1` opens as text
- [ ] Admin-created user without a password gets a setup link, not `password123`

---

## 7. Method and limits

Read: settings, urls, every DRF view's permission declaration (scripted), accounts/password-setup, forms validation and views, audit, tasks, export service, Dockerfile/compose/render/entrypoint/build, frontend config, proxy route, auth, root layout, admin guard. Ran: `check --deploy`, `makemigrations --check`, the full test suite, a DRF throttle probe, and a live request through the proxy. Not done: dependency vulnerability scans (no network access to advisory databases here; run `pip-audit` and `pnpm audit`), load testing, a full manual accessibility pass, and a review of every one of the ~236 frontend files. Counts are from `grep` over the working tree.

---

## Phase 1 status (implemented)

| Item | Result |
| --- | --- |
| C1 default admin password | `setup_admin` has no default outside `DEBUG`, rejects well-known passwords, never resets an existing admin without `--reset-password`; demo seeders refuse to run with `DEBUG=False` |
| C3 proxy path traversal | Segments validated (no `..`, `.`, `/`, `\`, `%`, control chars) and final URL checked against the API base. Verified live: `..%2fadmin%2flogin%2f` now returns 400 |
| H3 error leakage | Password-confirm and the proxy return generic messages; details are logged |
| H6 silent audit failure | Failed audit writes are logged with `logger.exception` |
| H7 `password123` | Blank admin-created user passwords become a random one |
| H1/H2 settings | `config/security_config.py`: no wildcard hosts/CORS/CSRF with `DEBUG=False`, `FRONTEND_URL` mandatory and public, credentialed CORS off by default; compose/render/docs updated |
| L2 unused deps | `axios` and `xlsx` removed from `package.json` (**`pnpm-lock.yaml` not regenerated**: run `pnpm install`) |

Verification: backend suite 782 tests OK (21 new); `tsc --noEmit` clean. Not verified: a `DEBUG=False` boot against real Render/compose, and a production `next build` (offline).

## Phase 2 status (implemented)

| Item | Result |
| --- | --- |
| C2 rate limiting | `apps/core/client_ip.py` is the one definition of client IP (BFF-supplied IP only with a shared secret, otherwise `X-Forwarded-For` counted from the right by `TRUSTED_PROXY_COUNT`); custom throttles in `apps/core/throttling.py` replace DRF's; new `login` (10/min) and `register` (10/hour) scopes; production cache is the shared DB cache (`createcachetable` in `build.sh`/`entrypoint.sh`). Tests prove a rotated `X-Forwarded-For` no longer resets the limit |
| M3 export formula injection | Server CSV/XLSX exports prefix `= + - @ TAB CR` cells with `'` |
| M5 observability | `LOGGING` (JSON to stdout in production), optional Sentry via `SENTRY_DSN`, silent `except: pass` sites in serializers/forms/email now log; `print` calls replaced |
| M7 headers | `Content-Security-Policy-Report-Only` and HSTS added in `next.config.ts` |
| M8/M9 deployment | Non-root Docker user, `HEALTHCHECK`, tighter `.dockerignore`, direct dependencies pinned, `render.yaml` variables |

Verification: backend suite 799 tests OK; `tsc --noEmit` clean; CSP/HSTS headers confirmed on the dev server. Not verified: behaviour on real Render/Vercel, the Docker image build, and the DB cache table in production.
