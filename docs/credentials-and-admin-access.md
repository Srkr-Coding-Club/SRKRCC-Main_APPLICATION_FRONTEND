# Credentials, Authentication & Admin Access Guide (Frontend)

This guide documents the **Frontend Authentication Architecture**, **HttpOnly Cookie Security Model**, **Pre-Configured Credentials**, and **Route Clearance Gates** across the SRKRCC platform.

---

## 1. Authentication Security Model: HttpOnly Cookies

### Why LocalStorage Was Replaced
Storing JWT access and refresh tokens in browser `localStorage` exposes them to Cross-Site Scripting (XSS) extraction attacks. 

The SRKRCC frontend implements a **Backend-For-Frontend (BFF) HttpOnly Cookie Architecture**:
- When a user logs in via `/api/auth/login`, Next.js sets `srkrcc_access_token` and `srkrcc_refresh_token` with:
  - `HttpOnly: true` (Inaccessible to JavaScript `document.cookie`)
  - `SameSite: Lax` (Defends against Cross-Site Request Forgery / CSRF)
  - `Path: /`
  - `Secure: true` (in production HTTPS)
- Next.js Edge Middleware ([src/middleware.ts](file:///c:/Users/chall/OneDrive/Desktop/SRKRCC-Main_APPLICATION_FRONTEND/src/middleware.ts)) reads `request.cookies` directly in the server environment and performs sub-millisecond route gating.

---

## 2. Pre-Configured Credentials

The database comes provisioned with the following credentials:

| Portal | Email | Password | Role | Permissions & Clearances |
| :--- | :--- | :--- | :--- | :--- |
| **Django Admin & Frontend** | `admin@srkr.ac.in` | `Admin@123` | `ADMIN` | **Superuser & Staff** — Full access to `/admin/*` and backend |
| **Django Admin & Frontend** | `clublead@srkr.ac.in` | `ClubLead@123` | `CLUB_LEAD` | **Staff** — Full access to `/admin/*` and club features |
| **Frontend Portal** | `judge@srkr.ac.in` | `Judge@123` | `JUDGE` | Hackathon project evaluation & grading |
| **Frontend Portal** | `rahul.sharma@srkr.ac.in` | `Member@123` | `MEMBER` | Pre-seeded with 14-day CodeQuest streak & form submissions |
| **Frontend Portal** | `member@srkr.ac.in` | `Member@123` | `MEMBER` | Event registration, CodeQuest, member profile |

---

## 3. Database Seeding Commands

### Master Database Seeding (Forms, Users, Responses, Streaks)
```powershell
cd c:\Users\chall\OneDrive\Desktop\SRKRCC-Main_APPLICATION_BACKEND
make seed-db
# Or: python scripts/seed_full_database.py
```

### Reset Credentials Only
```powershell
cd c:\Users\chall\OneDrive\Desktop\SRKRCC-Main_APPLICATION_BACKEND
make seed-users
# Or: python scripts/seed_default_users.py
```

---

## 4. Route Clearance Gates & Access Error Handling

- **Next.js Edge Middleware ([src/middleware.ts](file:///c:/Users/chall/OneDrive/Desktop/SRKRCC-Main_APPLICATION_FRONTEND/src/middleware.ts))**:
  - Intercepts all `/admin/*` paths.
  - If unauthenticated $\rightarrow$ Redirects to `/login?next=/admin/...`.
  - If role is not `ADMIN` or `CLUB_LEAD` $\rightarrow$ Redirects to `/profile?error=admin_access_required`.
- **Client Security Guard ([src/components/admin/AdminGuard.tsx](file:///c:/Users/chall/OneDrive/Desktop/SRKRCC-Main_APPLICATION_FRONTEND/src/components/admin/AdminGuard.tsx))**:
  - Wraps all admin pages to prevent unauthorized state leaks.
- **Dedicated Error & Loading Pages**:
  - **403 Forbidden**: [src/app/forbidden.tsx](file:///c:/Users/chall/OneDrive/Desktop/SRKRCC-Main_APPLICATION_FRONTEND/src/app/forbidden.tsx) & [src/app/403/page.tsx](file:///c:/Users/chall/OneDrive/Desktop/SRKRCC-Main_APPLICATION_FRONTEND/src/app/403/page.tsx).
  - **404 Not Found**: [src/app/not-found.tsx](file:///c:/Users/chall/OneDrive/Desktop/SRKRCC-Main_APPLICATION_FRONTEND/src/app/not-found.tsx).
  - **App Router Loader**: [src/app/loading.tsx](file:///c:/Users/chall/OneDrive/Desktop/SRKRCC-Main_APPLICATION_FRONTEND/src/app/loading.tsx) & [src/app/admin/loading.tsx](file:///c:/Users/chall/OneDrive/Desktop/SRKRCC-Main_APPLICATION_FRONTEND/src/app/admin/loading.tsx).
