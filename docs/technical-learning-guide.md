# Under the Hood: Frontend Technical Learning Guide

This guide explains **how Next.js 15 App Router, React Server Components (RSC), Client Components, Tailwind CSS glassmorphism, and API client fetching work under the hood** in the SRKR Coding Club Frontend.

---

## 1. How Next.js 15 App Router Works Under the Hood

The App Router (`src/app`) uses a file-system based routing mechanism powered by React Server Components:

```
src/app/
├── layout.tsx      <-- Persistent Root Shell (Navbar + Footer)
├── page.tsx        <-- Home Page Dashboard (Server Component)
├── events/
│   └── page.tsx    <-- Events Module Page (Server Component)
├── hackathons/
│   └── page.tsx    <-- Hackathons Module Page
├── iconcoders/
│   └── page.tsx    <-- IconCoders Flagship Landing & Hall of Fame
├── codequest/
│   └── page.tsx    <-- Codequest Daily Problem
├── career/
│   └── page.tsx    <-- Career Opportunities Page
├── blogs/
│   └── page.tsx    <-- Technical Blogs & Member Stories
├── forms/
│   ├── page.tsx    <-- Forms Center Directory
│   └── [slug]/
│       └── page.tsx <-- Dynamic Form Submission Engine
└── admin/
    └── page.tsx    <-- Modular Admin Control Room (8 Unified Tabs)
        ├── AdminHeader.tsx         <-- Admin Header & Brand
        ├── DashboardTab.tsx       <-- Metrics & Analytics Charts
        ├── UsersTab.tsx           <-- RBAC & User Control Table
        ├── FormBuilderTab.tsx     <-- MS Drag & Drop Form Builder
        ├── ManageFormsTab.tsx     <-- Forms Control & Offline Overrides
        ├── EventsHackathonsTab.tsx<-- Workshops & Flagship Engine
        ├── ContentHubTab.tsx      <-- Technical Articles & Placement Drives
        ├── FlagsTab.tsx           <-- Feature Flag Controls
        └── AuditLogsTab.tsx       <-- Security Mutation Trail Logs
```

### Server Components vs. Client Components Execution Flow

1. **React Server Components (RSC)**:
   - Pages without `'use client'` run **exclusively on the server**.
   - They fetch data directly from the Django backend (`http://localhost:8000/api`) during server rendering.
   - Zero JavaScript bundle weight for fetching logic is sent to the browser, maximizing initial page load speed and SEO performance.
2. **Client Components (`'use client'`)**:
   - Components needing interactivity (e.g. `Navbar.tsx` for route tracking via `usePathname()`) are marked `'use client'`.
   - Next.js pre-renders HTML on the server and hydrates interactive event listeners in the browser.

---

## 2. Dynamic Data Fetching & Revalidation Under the Hood

* **`export const dynamic = 'force-dynamic'`**:
  - Instructs Next.js that the route relies on live backend data (`http://localhost:8000/api`), preventing build-time static prerendering failures when backend server is offline or dynamic.
* **`fetchApi` Helper (`src/lib/api-client.ts`)**:
  - Wraps standard `fetch` with `cache: 'no-store'` so fresh feature flags, events, and problems are fetched on every request.

---

## 3. Styling Engine & Glassmorphism Design Tokens

* **Tailwind CSS + CSS Custom Properties**:
  - Dark mode palette (`bg-slate-950`, `text-slate-100`).
  - Glassmorphism backdrop blur filters (`glass-panel` class):
    ```css
    .glass-panel {
      background: rgba(17, 24, 39, 0.7);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    ```
  - Vibrant gradient accents (`gradient-text`) for hero titles and flagship highlights.

---

## 4. Maintenance & Gap Update Protocol

Whenever you update frontend code:
1. Ensure TypeScript interfaces in `src/lib/types.ts` match Django REST Framework serializers.
2. Run `npm run build` or `make build` to verify type checking and page compilation.
3. Update relevant documentation if new pages or UI modules are introduced.
