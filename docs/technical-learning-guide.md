# Under the Hood: Frontend Technical Learning Guide

This guide explains **how Next.js 15 App Router, React Server Components (RSC), Client Components, HttpOnly Cookie Security, Edge Middleware, and Tailwind CSS glassmorphism work under the hood** in the SRKR Coding Club Frontend.

---

## 1. How Next.js 15 App Router Works Under the Hood

The App Router (`src/app`) uses a file-system based routing mechanism powered by React Server Components:

```
src/app/
├── layout.tsx              <-- Persistent Root Shell (Navbar + Footer + Global Theme)
├── loading.tsx             <-- Root Suspense & Route Transition Loader
├── not-found.tsx           <-- Custom 404 Not Found Page
├── forbidden.tsx / 403/    <-- Custom 403 Access Restriction Gate
├── error.tsx               <-- Global Error Boundary
├── page.tsx                <-- Home Page Dashboard (Server Component)
├── events/                 <-- Workshops & Hackathons Event Hub
├── hackathons/             <-- 48-Hour Build Sprint Hub
├── iconcoders/             <-- Premier Championship Arena
├── codequest/              <-- Daily Algorithmic Problem Solving Streak
├── profile/                <-- Real Database-Driven Member Profile
├── forms/
│   ├── page.tsx            <-- Live Forms Center Directory
│   └── [slug]/page.tsx     <-- Dynamic Form Submission Engine
└── admin/                  <-- Admin Control Room (Subtab Routed)
    ├── loading.tsx         <-- Admin Transition Loader
    ├── forms/page.tsx      <-- Forms Registry & Lifecycle Management
    ├── builder/page.tsx    <-- Dynamic Form Builder Canvas
    ├── users/page.tsx      <-- User Accounts & RBAC Management
    ├── flags/page.tsx      <-- Feature Flag Controls
    ├── audit-logs/page.tsx <-- Security & Mutation Trail Logs
    ├── data-health/page.tsx<-- Platform Data Integrity & Warnings
    └── csv-ingestion/page.tsx <-- Bulk Responses CSV Importer
```

### Server Components vs. Client Components Execution Flow

1. **React Server Components (RSC)**:
   - Pages without `'use client'` run **exclusively on the server**.
   - They query the backend (`http://localhost:8000/api`) during server-side rendering.
   - Zero JavaScript bundle weight for fetching logic is sent to the browser, maximizing initial page load speed and SEO performance.
2. **Client Components (`'use client'`)**:
   - Components requiring interactive state (`useState`, `useEffect`, event listeners) are marked with `'use client'`.
   - Next.js pre-renders HTML on the server and hydrates interactive event listeners in the browser.

---

## 2. HttpOnly Cookie Authentication & Edge Middleware Under the Hood

### Backend-For-Frontend (BFF) Route Handlers
Raw JWT tokens are never stored in browser `localStorage`. Instead, Next.js API route handlers act as a security proxy:
- **`POST /api/auth/login`**: Receives user credentials, calls Django's `/api/auth/token/`, and sets `HttpOnly` session cookies (`srkrcc_access_token` and `srkrcc_refresh_token`).
- **`POST /api/auth/refresh`**: Reads the `HttpOnly` refresh cookie server-side, requests renewed tokens from Django, and updates the access cookie.
- **`POST /api/auth/logout`**: Expire and clear session cookies.
- **`GET /api/auth/me`**: Reads the access cookie server-side and forwards it in the `Authorization: Bearer` header to Django.

### Next.js Edge Middleware ([src/middleware.ts](file:///c:/Users/chall/OneDrive/Desktop/SRKRCC-Main_APPLICATION_FRONTEND/src/middleware.ts))
Runs at the network edge before requests reach the App Router:
1. Intercepts all `/admin/*` paths.
2. Reads `request.cookies.get('srkrcc_access_token')`.
3. If unauthenticated $\rightarrow$ Redirects to `/login?next=${pathname}`.
4. If role is not `ADMIN` or `CLUB_LEAD` $\rightarrow$ Redirects to `/profile?error=admin_access_required`.

---

## 3. Dynamic Data Fetching & Revalidation Under the Hood

* **`export const dynamic = 'force-dynamic'`**:
  - Instructs Next.js that the route relies on live backend data (`http://localhost:8000/api`), preventing build-time static prerendering failures when the database updates dynamically.
* **`fetchApi` Helper (`src/lib/api-client.ts`)**:
  - Sets `credentials: 'include'` so `HttpOnly` cookies are automatically sent with requests.
  - Implements connection timeouts with `AbortController` and graceful offline fallbacks.

---

## 4. HTTP Security Headers Under the Hood

Configured in [next.config.ts](file:///c:/Users/chall/OneDrive/Desktop/SRKRCC-Main_APPLICATION_FRONTEND/next.config.ts):
- **`X-Frame-Options: SAMEORIGIN`**: Prevents clickjacking by blocking iframe embedding on untrusted domains.
- **`X-Content-Type-Options: nosniff`**: Prevents browser MIME-type sniffing.
- **`Referrer-Policy: strict-origin-when-cross-origin`**: Controls referrer leakage across origins.
- **`Permissions-Policy: camera=(), microphone=(), geolocation=()`**: Restricts unnecessary device APIs.

---

## 5. UI Design System & Tailwind CSS Glassmorphism

The application adheres to a dark-mode glassmorphism theme using CSS variables and Tailwind utilities:
- **`glass-panel`**: `bg-[#151722]/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800`
- **`gradient-text`**: `bg-gradient-to-r from-[#FF7A00] via-[#FF9E00] to-[#8B2E3B] bg-clip-text text-transparent`
- **Accent Primary**: `#FF7A00` (SRKRCC Vibrant Orange)
- **Accent Maroon**: `#8B2E3B` (SRKR Institutional Maroon)
- **Background Dark**: `#0D0E15` (Deep Slate)
