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

---

### 2. Install Dependencies

Install required npm packages:

```bash
make setup
# Or via npm:
npm install
```

---

### 3. Run Development Server

Start the Next.js development server on `http://localhost:3000`:

```bash
make dev
# Or via npm:
npm run dev
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
| **Install Dependencies** | `make setup` | Runs `npm install`. |
| **Run Dev Server** | `make dev` | Starts Next.js dev server on `http://localhost:3000`. |
| **Production Build** | `make build` | Runs Next.js build verification (`npm run build`). |
| **Start Production** | `make start` | Runs Next.js production server (`npm start`). |
| **Code Linting** | `make lint` | Runs ESLint checks. |

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
    └── technical-learning-guide.md
```

---

## 📚 Technical Documentation & Learning Guides

For under-the-hood technical details on how Next.js 15 App Router, React Server Components, Tailwind CSS glassmorphism, and API fetching work:
* **[AGENTS.md](AGENTS.md)** — Architectural preservation & agent rules
* **[CONTRIBUTING.md](CONTRIBUTING.md)** — Branching strategy & Git contribution guide
* **[docs/technical-learning-guide.md](docs/technical-learning-guide.md)** — Deep-dive technical learning guide