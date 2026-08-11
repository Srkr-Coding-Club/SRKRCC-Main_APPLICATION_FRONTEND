# Contributing to SRKR Coding Club (Frontend)

Thank you for contributing! This document outlines our git branching strategy, pull request workflow, coding standards, and helpful git commands.

---

## 🌿 Branching Strategy

We maintain three primary permanent branches:

```
feature/*  ──────► dev (Integration) ──────► staging (QA/Testing) ──────► main (Production)
```

| Branch | Environment | Purpose | Target for PRs |
|---|---|---|---|
| **`main`** | **Production** | Stable production code deployed to live servers. Only merges from `staging`. | Direct commits prohibited |
| **`staging`** | **Staging / QA** | Pre-production testing environment. Receives merged releases from `dev`. | Release PRs from `dev` |
| **`dev`** | **Development** | Active integration branch. All feature and bugfix PRs target `dev`. | **Default target for feature PRs** |

### Working Branch Naming Convention:
* **Features**: `feature/events-ui-redesign` or `feature/codequest-streak-counter`
* **Bug Fixes**: `bugfix/mobile-navbar-alignment` or `bugfix/fetch-headers-fix`
* **Hotfixes**: `hotfix/broken-asset-link` (branches directly off `main`)
* **Documentation**: `docs/update-frontend-setup-guide`

---

## 📝 Step-by-Step Pull Request (PR) Guide

### 1. Checkout the `dev` Branch & Sync
Always branch off the latest `dev` code:
```bash
git checkout dev
git pull origin dev
```

### 2. Create Your Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 3. Implement Your Changes
* Write clean React/Next.js TypeScript code following **[AGENTS.md](AGENTS.md)** guidelines.
* Prefer Server Components (`src/app/**/page.tsx`) by default; use `'use client'` only for interactive state/hooks.
* Explicitly export `export const dynamic = 'force-dynamic'` on pages fetching live backend data.

### 4. Run Local Verification
Before opening a PR, verify local build & linting:
```bash
# Verify Next.js production build and type check
make build

# Run ESLint check
make lint
```

### 5. Commit with Conventional Commit Messages
Write clear, descriptive commit messages using conventional prefixes:
* `feat: add glassmorphism hero banner to IconCoders page`
* `fix: resolve mobile navigation backdrop blur issue`
* `docs: update frontend setup and deployment documentation`
* `style: align card padding and Tailwind CSS tokens`

```bash
git add .
git commit -m "feat: your concise commit message"
```

### 6. Push & Open a Pull Request
Push your branch to GitHub:
```bash
git push -u origin feature/your-feature-name
```
Open a Pull Request on GitHub:
* **Base Branch**: `dev` *(Do NOT target `main` directly!)*
* **Compare Branch**: `feature/your-feature-name`
* Fill out the PR template describing changes, responsive layout tests, and API contract alignment.

---

## 🛠️ Git Helper Cheat Sheet for Contributors

### Branch Operations
```bash
# List all local & remote branches
git branch -a

# Switch to dev branch
git checkout dev

# Create and switch to a new branch
git checkout -b feature/my-new-feature

# Delete a local branch after merging
git branch -d feature/my-new-feature
```

### Syncing & Rebasing with `dev`
```bash
# Fetch latest remote changes
git fetch origin

# Rebase your feature branch on top of latest dev
git checkout feature/my-new-feature
git rebase origin/dev
```

### Stashing Uncommitted Work
```bash
# Temporarily stash working directory changes
git stash

# Apply stashed changes back
git stash pop
```

### Undo & Reset Helpers
```bash
# Undo last commit (keep local code changes)
git reset --soft HEAD~1

# Discard local uncommitted changes in a file
git checkout -- path/to/file.tsx
```
