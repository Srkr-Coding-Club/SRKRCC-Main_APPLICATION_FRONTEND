# Backup Center & Universal Ingestion Frontend Guide

## 1. Overview

The **Universal Backup Center** (`/admin/csv-ingestion`) provides a comprehensive interface for ingesting, validating, and archiving college spreadsheets.

```text
Backup Center
├── Tab 1: Ingestion Wizard
│   ├── Step 1: Intake & Preserve (SHA-256 Hashing, 10MB limit)
│   ├── Step 2: Target Domain Selection (Users, Forms, Events, Hackathons, Unknown)
│   ├── Step 3: Column Mapping & Unmapped Column Preservation
│   ├── Step 4: 50% Schema Confidence Gauge & Raw Fallback
│   └── Step 5: Row-Level Preview & Confirmed Commit
└── Tab 2: Backup Vault Archive
    ├── Search by filename or SHA-256
    ├── Forensic metadata (Rows, Columns, Format, Uploader)
    └── Authenticated Direct File Download
```

---

## 2. Ingestion Flow & UI States

### Step 1: Intake & Preserve
- File Dropzone accepts `.csv` and `.xlsx` files up to 10 MB.
- Sends `multipart/form-data` to `POST /api/admin/backups/upload/`.
- Computes SHA-256 hash and immediately creates an immutable `BackupJob`.
- Displays heuristic suggestion badge (e.g. `Suggested: Users / Members — 87% Match`).

### Step 2: Explicit Domain Selection
- Cards for:
  - 👤 **Club Member Directory (`USERS`)**
  - 📝 **Form Submissions (`FORMS`)** (Shows target form picker)
  - 🎪 **Events & Workshops (`EVENTS`)**
  - 🏆 **Hackathons & Sprints (`HACKATHONS`)**
  - 🗄️ **Unknown / Schemaless Raw Vault (`UNKNOWN_RAW`)**

### Step 3: Column Mapping & Unmapped Preservation
- Maps uploaded headers to domain attributes.
- Displays `Unmapped Columns (Preserved in Raw Provenance)` ensuring no legacy columns are dropped.

### Step 4: Schema Validation & 50% Confidence Gauge
- Evaluates:
  - Required Fields: `PASS` / `FAIL`
  - Confidence: Percentage gauge ($\ge 50\%$ required for structured import)
- If validation fails, activates prominent button: **Save as Raw Vault Backup**.

### Step 5: Preview & Confirmed Commit
- Interactive diff table showing action per row (`CREATE`, `UPDATE`, `CONFLICT`).
- Optional triggers: e.g. `Send Welcome / Activation Email` for members.
- Confirmation executes atomic commit with transaction savepoints.
