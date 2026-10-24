# SRKR Coding Club — Main Application (Frontend)

> **One Platform. Many Features. Limitless Possibilities.**  
> The official unified web frontend for SRKR Coding Club, built with Next.js 15 (App Router), React 19, TypeScript, and Tailwind CSS.

---

## 📌 Project Overview

The **SRKR Coding Club Frontend** provides a modern, fast, glassmorphism-inspired dark-mode user experience for all club members, participants, judges, volunteers, and admins.

Key frontend features:
* **Next.js 15 App Router**: High-performance React Server Components (RSC) for initial load speed and SEO optimization.
* **Unified Platform Modules**: Pages for Home Dashboard, Events, Hackathons Engine, IconCoders Flagship (Hall of Fame), Codequest Daily Problems, Career Opportunities, and Blogs.
* **Admin Control Room**: Live view of module feature flags fetched on demand from the Django REST backend.
* **Dynamic Route Export**: Configured with `export const dynamic = 'force-dynamic'` for live data fetching from backend APIs.

---

## 🌿 Branching Strategy & Git Workflow

We maintain a strict 3-tier branching strategy across our repositories:

```
feature/*  ──────► dev (Integration) ──────► staging (QA/Testing) ──────► main (Production)
```

* **`main` (Production)**: Live production release branch. Only merges from `staging`.
* **`staging` (QA / Pre-Production)**: Testing and release candidate staging branch.
* **`dev` (Development Integration)**: Active integration branch. **All PRs target `dev`**.

> See **[CONTRIBUTING.md](CONTRIBUTING.md)** for our complete pull request protocol, branch conventions, and git cheat sheet.

---

## ⚙️ Prerequisites

Before setting up the frontend, ensure you have the following installed on your machine:

| Requirement | Minimum Version | Recommendation / Notes |
|---|---|---|
| **Node.js** | `v18.17.0+` (v20+ recommended) | [Download Node.js](https://nodejs.org/) |
| **npm** | `v9.0.0+` | Bundled with Node.js |
| **Backend API** | Running on `http://localhost:8000` | Follow instructions in `SRKRCC-Main_APPLICATION_BACKEND` |

---

## 🚀 Complete Quick Start Guide

### 1. Environment Configuration (`.env.local`)

Create a `.env.local` file in the root of `SRKRCC-Main_APPLICATION_FRONTEND` (or copy from `.env.local.example`):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

Every variable the frontend reads (`INTERNAL_API_BASE_URL`, `NEXT_PUBLIC_SITE_URL`, `CLIENT_IP_SHARED_SECRET`, `NEXT_IMAGE_REMOTE_HOSTS`, `HSTS_MAX_AGE_SECONDS`, `HSTS_INCLUDE_SUBDOMAINS`, `HSTS_PRELOAD`, `OUTPUT_STANDALONE`, `DOCKER_BUILD`) is listed and explained in [`.env.local.example`](.env.local.example). Hosting-specific values live only in environment variables, so changing platform needs no code change.

---

### 2. Install Dependencies

Install required packages (pnpm is this project's package manager — see `pnpm-lock.yaml`):

```bash
make setup
# Or directly:
pnpm install
```

---

### 3. Run Development Server

Start the Next.js development server on `http://localhost:3000`:

```bash
make dev
# Or directly:
pnpm run dev
```

Open `http://localhost:3000` in your browser to view the platform!

---

### 4. Production Build & Preview

To verify compilation and test the production build:

```bash
# Generate optimized production build
make build

# Start production server
make start
```

---

## 🛠️ Developer Commands Cheat Sheet

| Task | Command | Description |
|---|---|---|
| **Install Dependencies** | `make setup` | Runs `pnpm install`. |
| **Run Dev Server** | `make dev` | Starts Next.js dev server on `http://localhost:3000`. |
| **Production Build** | `make build` | Runs Next.js build verification (`pnpm run build`). |
| **Start Production** | `make start` | Runs Next.js production server (`pnpm start`). |
| **Code Linting** | `make lint` | Runs ESLint checks. |
| **Unit Tests** | `pnpm test` | Runs Vitest: the form condition engine (against the vectors it shares with the backend), the condition builder, multi-page navigation and autosave, the public form page, and axe accessibility checks of the form and the admin dialogs. |
| **Browser Tests** | `pnpm test:e2e` | Runs Playwright in Chromium against `next dev` on port 3100 (the API is answered by the tests, no backend needed): filling the public form by keyboard, validation focus, multi-page navigation, draft restore, languages, redirects, and an axe accessibility check with real colours. Needs the browser once: `pnpm exec playwright install chromium`. |

---

## ☁️ Production Deployment (Vercel & Docker)

* **Vercel (Recommended, Free Tier)**:
  1. Import `SRKRCC-Main_APPLICATION_FRONTEND` on [Vercel](https://vercel.com).
  2. Set Environment Variable: `NEXT_PUBLIC_API_BASE_URL=https://your-backend.onrender.com/api`
  3. Click **Deploy**! (Uses included [`vercel.json`](vercel.json)).
* **Docker Deployment**:
  Build and run the lightweight standalone Docker container:
  ```bash
  docker build -t srkrcc-frontend .
  docker run -p 3000:3000 -e NEXT_PUBLIC_API_BASE_URL=https://your-backend.onrender.com/api srkrcc-frontend
  ```

---

## 📂 Repository Directory Structure

```
SRKRCC-Main_APPLICATION_FRONTEND/
├── AGENTS.md                  ← AI Agent guidelines, Next.js rules, & doc protocol
├── CONTRIBUTING.md            ← Branching strategy, PR guide, & git cheat sheet
├── Makefile                   ← Developer shortcuts for npm commands
├── package.json               ← Dependencies & scripts
├── tsconfig.json              ← TypeScript configuration
├── tailwind.config.ts         ← Styling design tokens & custom colors
├── next.config.ts             ← Next.js runtime configuration
├── .env.local                 ← Local environment variables
├── src/                       
│   ├── app/                   ← App Router Routes
│   │   ├── globals.css        ← Glassmorphism & dark theme variables
│   │   ├── layout.tsx         ← Root layout (Navbar + Footer)
│   │   ├── page.tsx           ← Home Dashboard landing
│   │   ├── events/            ← Events & workshops listing
│   │   ├── hackathons/        ← Hackathons engine listing
│   │   ├── iconcoders/        ← Flagship IconCoders & Hall of Fame
│   │   ├── codequest/         ← Daily Problem of the Day
│   │   ├── career/            ← Career opportunities & job drives
│   │   ├── blogs/             ← Tech write-ups & tutorials
│   │   └── admin/             ← Admin Control Room (Feature Flags)
│   ├── components/            ← Reusable UI Components
│   │   ├── Navbar.tsx         ← Header navigation
│   │   └── Footer.tsx         ← Footer component
│   └── lib/                   ← Shared Utilities
│       ├── api-client.ts      ← Fetch wrapper for Django REST backend
│       └── types.ts           ← Shared TypeScript interfaces
└── docs/                      ← Technical learning guide
    ├── dynamic-form-frontend.md
    └── technical-learning-guide.md
```

---

## 📚 Technical Documentation & Learning Guides

For under-the-hood technical details on how Next.js 15 App Router, React Server Components, Tailwind CSS glassmorphism, and API fetching work:
* **[AGENTS.md](AGENTS.md)** — Architectural preservation & agent rules
* **[CONTRIBUTING.md](CONTRIBUTING.md)** — Branching strategy & Git contribution guide
* **[docs/technical-learning-guide.md](docs/technical-learning-guide.md)** — Deep-dive technical learning guide
* **[docs/dynamic-form-frontend.md](docs/dynamic-form-frontend.md)** - How the form builder and the public form work here: the two validation engines, autosave, accessibility, tests