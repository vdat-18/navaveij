# Plan — Lead Assignment Flow

**Goal:** Add a reach-out lane where executives assign pre-analyzed patients to sales as leads. Sales views pre-computed recommendations, adds notes, and updates lead status. Walk-in flow remains unchanged and uses a separate patient pool.

**Architecture:** New backend route (`leads.py`) with in-memory store seeded from lead-only JSON fixtures. New executive screen at `/lead-assignment`. Sales tab toggle on existing `/` page. Separate `ReadOnlyRecommendationView` component for pre-runned data display.

**Tech Stack:** Python (FastAPI, Pydantic), TypeScript (React, Next.js App Router), Tailwind, Lucide React, Framer Motion

**Patient separation rule:** Lead fixtures use a distinct lead-only patient set. No walk-in patient ID, token, or name may appear in lead fixtures. Enforced by a non-overlap assertion in `test_leads_api.py`.

---

## Phase 1 — Fixtures

### Task 1 — Create sales user registry

**File:** `assets/sales_users.json`

- Create 2 canonical sales personas: `usr-sales-00001` (Somying Srisuk), `usr-sales-00002` (Arunee Srisawat)

### Task 2 — Create lead-only pre-runned recommendation payloads

**File:** `assets/pre_runned_recommendations.json`

- Create a lead-only patient set with new `patient_id`, `patient_token`, `patient_name`, profile fields, and scenario framing — **no overlap with the 3 walk-in patients** (`id_33cc44dd`, `id_1a2b3c4d`, `id_d4f2b7e6`)
- Use real captured AI payloads where available and schema-valid curated payloads otherwise
- Each entry:
  ```json
  {
    "patient_id": "lead-<unique>",
    "patient_token": "<unique-token>",
    "patient_name": "...",
    "age": ..., "gender": "...",
    "scenario_label": "...",
    "generated_at": "...",
    "ai_lead_summary": "1-2 paragraph sales-oriented AI summary",
    "recommendation": { /* PreRunnedRecommendationResponse payload */ }
  }
  ```

### Task 3 — Create seed lead assignments

**File:** `assets/lead_assignments_seed.json`

- 2-3 seed assignments covering different statuses (assigned, contacted, scheduled)
- All `patient_id` values must reference lead-only patients from `pre_runned_recommendations.json`

---

## Phase 2 — Backend: Leads API

### Task 4 — Create leads route module

**File:** `backend/src/api/routes/leads.py`

- Pydantic models: `LeadAssignment`, `CreateLeadRequest`, `UpdateLeadStatusRequest`, `PreRunnedPatientSummary`, `SalesUser`
- Load fixtures at module level (same pattern as `patients.py` and `contracts.py`)
- Auth header enforcement on every endpoint using the existing header-based auth pattern
- 7 endpoints:

  `GET /api/leads` — executive: all; sales: own only (filter by `assigned_to_user_id`)

  `GET /api/leads/{assignment_id}` — executive or owning sales user

  `POST /api/leads` — executive only; auto-generates ID, sets `assigned_at`, status → "assigned"

  `PATCH /api/leads/{assignment_id}/status` — sales only; valid statuses: assigned / contacted / scheduled / converted / declined

  `GET /api/pre-runned-patients` — executive only; returns summaries (no full recommendation payload); includes `is_assigned` flag

  `GET /api/pre-runned-patients/{patient_token}/recommendation` — executive or sales; returns full pre-computed recommendation

  `GET /api/sales-users` — executive only

### Task 5 — Register leads router

**File:** `backend/src/api/main.py`

- `from src.api.routes import leads` + `app.include_router(leads.router, prefix="/api", tags=["Lead Assignment"])`

---

## Phase 3 — Frontend: Types + API Service

### Task 6 — Create TypeScript types

**File:** `frontend/src/types/leads.ts`

- `LeadStatus` union, `LeadAssignment`, `PreRunnedPatient`, `SalesUser`

### Task 7 — Add lead API service

**File:** `frontend/src/services/api.ts`

- Add `leadService` with 6 methods:
  - `getPreRunnedPatients(): Promise<PreRunnedPatient[]>`
  - `getPreRunnedRecommendation(token: string): Promise<RecommendationResponse>`
  - `getLeads(): Promise<LeadAssignment[]>`
  - `assignLead(patientId, assignToUserId, assignToName, notes?): Promise<LeadAssignment>`
  - `updateLeadStatus(assignmentId, status, notes?): Promise<LeadAssignment>`
  - `getSalesUsers(): Promise<SalesUser[]>`

---

## Phase 4 — Frontend: Read-Only Recommendation View

### Task 8 — Create ReadOnlyRecommendationView

**File:** `frontend/src/components/leads/ReadOnlyRecommendationView.tsx`

- Props: `data: PreRunnedRecommendation`
- Render-only sections extracted from `RecommendationPanel`: package/tier summary, priority add-ons, reasoning trace, risk summary, and generated timestamp
- **Strictly no:** fetch/stream logic, client-side cache, approval/reject actions, email/report actions, deals drawer, stage progress
- Styling aligned with existing Navavej design tokens

---

## Phase 5 — Executive Lead Assignment Screen

### Task 9 — Add Lead Assignment to executive sidebar

**File:** `frontend/src/components/Sidebar.tsx`

- Add to `EXECUTIVE_MENU`: `{ icon: Users, label: "Lead Assignment", id: "lead-assignment", href: "/lead-assignment" }`

### Task 10 — Create executive lead assignment screen

**Files:** `frontend/src/app/lead-assignment/page.tsx`, `frontend/src/components/leads/ExecutiveLeadAssignmentScreen.tsx`

- Role guard: redirect non-executive users
- Left panel: Pre-runned patient cards with scenario, risk, tier, assigned state, and executive assignment controls
- Right panel: selected recommendation preview plus assignment tracker cards
- Assignment flow: select patient → choose sales user → add optional notes → assign → refresh lead state

---

## Phase 6 — Sales Lead Development

### Task 11 — Add tab toggle for sales on main page

**File:** `frontend/src/app/page.tsx`

- Add `salesTab` state (`"walkin" | "leads"`)
- Render tab toggle inside `isSearchFlowRole` block only when `user.role === "sales"`
- Conditionally render existing walk-in flow or `<SalesLeadDevelopmentPanel />`

### Task 12 — Create SalesLeadDevelopmentPanel

**File:** `frontend/src/components/leads/SalesLeadDevelopmentPanel.tsx`

- Fetch the logged-in sales user's assigned leads on mount
- Show a selected-lead list plus the full `<ReadOnlyRecommendationView />` for the active lead
- Provide status update controls and note editing backed by `leadService.updateLeadStatus()`

### Task 13 — Add second sales persona to login

**File:** `frontend/src/app/login/page.tsx`

- Add: `{ label: "Arunee Srisawat (Sales)", sub: "usr-sales-00002", name: "Arunee Srisawat", role: "sales" }`

---

## Phase 7 — Tests (first-class deliverable)

### Backend tests

**File:** `scripts/tests/test_leads_api.py`

- Executive can list and create assignments
- Sales sees only own leads
- Sales can update own lead status; cannot update another sales user's lead
- Unauthorized role and scope combinations are rejected (HTTP 403)
- Pre-runned recommendation endpoint returns stored payload without triggering orchestration
- **Non-overlap assertion:** no `patient_id` or `patient_token` in `pre_runned_recommendations.json` exists in `patient_registry.json`

### Frontend tests (Vitest)

- Sidebar shows "Lead Assignment" for executive only
- Sales login persona list includes second sales user
- Sales tab toggle renders on `/` for sales, not for physician
- `SalesLeadDevelopmentPanel` renders leads from mocked service
- `ReadOnlyRecommendationView` renders key sections without triggering any live fetch

### Verification commands

Run in `POC/V6` during and after implementation:
```
cd frontend && npm run test
cd frontend && npm run lint
cd frontend && npm run build
python3 -m pytest scripts/tests/test_leads_api.py
```

---

## Phase 8 — Docs Checkpoint

After code and tests pass:
- Update `README.md`, `_discover.md`, `plan.md` if any implementation diverged from plan
- Fill in `_development_summary.md` with final architectural decisions and file inventory
- Fill in `_latest_test_results.md` with actual test outputs

---

## Files Changed

| File | Change |
|---|---|
| `assets/sales_users.json` | **New** — sales persona registry |
| `assets/pre_runned_recommendations.json` | **New** — lead-only patients + fixture-backed payloads |
| `assets/lead_assignments_seed.json` | **New** — seed assignments (lead-only patient IDs) |
| `assets/patient_registry.json` | **Unchanged** — walk-in only |
| `backend/src/api/routes/leads.py` | **New** — 7 endpoints with auth enforcement |
| `backend/src/api/main.py` | Modified — register leads router |
| `scripts/tests/test_leads_api.py` | **New** — behavioral + non-overlap tests |
| `frontend/src/types/leads.ts` | **New** — TypeScript types |
| `frontend/src/services/api.ts` | Modified — `leadService` |
| `frontend/src/components/leads/ReadOnlyRecommendationView.tsx` | **New** — pure display component |
| `frontend/src/components/leads/ExecutiveLeadAssignmentScreen.tsx` | **New** — executive assignment UI |
| `frontend/src/components/leads/SalesLeadDevelopmentPanel.tsx` | **New** — sales lead view |
| `frontend/src/app/lead-assignment/page.tsx` | **New** — executive route |
| `frontend/src/app/page.tsx` | Modified — tab toggle for sales |
| `frontend/src/components/Sidebar.tsx` | Modified — Lead Assignment in executive menu |
| `frontend/src/app/login/page.tsx` | Modified — second sales persona |

---

## Out of Scope

- Reach-out patients in normal Patient Search (separate pool — by design)
- Reusing walk-in patient identities in the lead lane (explicitly rejected)
- Converting a reach-out lead to a walk-in flow (re-running AI)
- Free-form model-name editing / config screen changes (separate follow-up)
- Persistent lead storage (in-memory, resets on restart — POC appropriate)
- Real voice-to-text (mock animation + text input only)
- Email/notification on lead assignment
