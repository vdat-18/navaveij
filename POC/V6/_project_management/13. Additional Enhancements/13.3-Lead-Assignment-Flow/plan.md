# Plan — Lead Assignment Flow

> Use checkbox (`- [ ]`) syntax to track steps during implementation. Execute tasks in order.

**Goal:** Add a reach-out lane where executives assign pre-analyzed patients to sales as leads. Sales views pre-computed recommendations, adds notes (with voice mock), and updates lead status. Walk-in flow unchanged.

**Architecture:** New backend route (`leads.py`) with in-memory store seeded from JSON fixtures. New executive screen at `/lead-assignment`. Sales tab toggle on existing `/` page. Separate `RecommendationReadOnlyView` component for pre-runned data display.

**Tech Stack:** Python (FastAPI, Pydantic), TypeScript (React, Next.js App Router), Tailwind, Lucide React, Framer Motion

---

## Phase 1 — Shared Fixtures

### Task 1 — Create sales user registry

**New file:** `assets/sales_users.json`

- [ ] **Step 1:** Create file with 2 canonical sales personas:
  ```json
  [
    {"user_id": "usr-sales-00001", "name": "Somying Srisuk", "role": "sales"},
    {"user_id": "usr-sales-00002", "name": "Arunee Srisawat", "role": "sales"}
  ]
  ```

### Task 2 — Capture pre-runned recommendation payloads

**New file:** `assets/pre_runned_recommendations.json`

- [ ] **Step 1:** Run the backend with a working AI client
- [ ] **Step 2:** Call `POST /recommend` for each of the 3 existing demo patients, capture the full JSON response
- [ ] **Step 3:** Optionally add 2-3 more patients to `assets/patient_registry.json` for the reach-out pool, run them too
- [ ] **Step 4:** Wrap each captured response in the pre-runned envelope:
  ```json
  {
    "patient_id": "...",
    "patient_token": "...",
    "patient_name": "...",
    "age": 45, "gender": "Female",
    "scenario_label": "Metabolic Syndrome Risk",
    "generated_at": "2026-03-28T10:00:00Z",
    "ai_lead_summary": "Pre-written 1-2 paragraph AI-style sales summary",
    "recommendation": { /* captured payload */ }
  }
  ```
- [ ] **Step 5:** Write `ai_lead_summary` for each patient — a 1-2 paragraph sales-oriented summary of the AI findings and recommended tier

### Task 3 — Create seed lead assignments

**New file:** `assets/lead_assignments_seed.json`

- [ ] **Step 1:** Create 2-3 seed assignments covering different statuses:
  ```json
  [
    {"assignment_id": "lead_001", "patient_id": "...", "patient_token": "...",
     "assigned_to_user_id": "usr-sales-00001", "assigned_to_name": "Somying Srisuk",
     "assigned_by_user_id": "usr-executive-00001", "assigned_at": "2026-03-29T09:00:00Z",
     "status": "assigned", "notes": "", "scenario_label": "Metabolic Syndrome Risk"},
    {"assignment_id": "lead_002", ...}
  ]
  ```

---

## Phase 2 — Backend: Leads API

### Task 4 — Create leads route module

**New file:** `backend/src/api/routes/leads.py`

- [ ] **Step 1:** Define Pydantic models:
  - `LeadAssignment`: assignment_id, patient_id, patient_token, assigned_to_user_id, assigned_to_name, assigned_by_user_id, assigned_at, status, notes, scenario_label
  - `CreateLeadRequest`: patient_id, assigned_to_user_id, assigned_to_name, notes?
  - `UpdateLeadStatusRequest`: status, notes?
  - `PreRunnedPatientSummary`: patient_id, patient_token, patient_name, age, gender, scenario_label, generated_at, ai_lead_summary, ai_recommended_tier, overall_risk_level, is_assigned
  - `SalesUser`: user_id, name, role

- [ ] **Step 2:** Load fixture data at module level (same pattern as `patients.py`):
  - Load `assets/pre_runned_recommendations.json` → `_pre_runned: list[dict]`
  - Load `assets/lead_assignments_seed.json` → `_assignments: list[dict]`
  - Load `assets/sales_users.json` → `_sales_users: list[dict]`

- [ ] **Step 3:** Implement 7 endpoints:

  `GET /api/leads` (executive, sales)
  - Executive: return all assignments
  - Sales: filter by `assigned_to_user_id == auth.user_id`

  `GET /api/leads/{assignment_id}` (executive, sales)
  - Return single assignment, with role-based access check

  `POST /api/leads` (executive only)
  - Create new assignment from request body
  - Auto-generate `assignment_id`, set `assigned_by_user_id` from auth, `assigned_at` to now, `status` to "assigned"
  - Add to `_assignments` in-memory list

  `PATCH /api/leads/{assignment_id}/status` (sales only)
  - Update status and notes for an existing assignment
  - Validate status is one of: assigned, contacted, scheduled, converted, declined

  `GET /api/pre-runned-patients` (executive)
  - Return list of pre-runned patient summaries (without full recommendation payload)
  - Include `is_assigned: bool` flag (check if patient_id exists in `_assignments`)

  `GET /api/pre-runned-patients/{patient_token}/recommendation` (executive, sales)
  - Return the full pre-computed recommendation for a patient

  `GET /api/sales-users` (executive)
  - Return sales user registry

### Task 5 — Register leads router

**Modify file:** `backend/src/api/main.py`

- [ ] **Step 1:** Import and register: `from src.api.routes import leads` + `app.include_router(leads.router, prefix="/api", tags=["Lead Assignment"])`

---

## Phase 3 — Frontend: Types + API Service

### Task 6 — Create TypeScript types

**New file:** `frontend/src/types/leads.ts`

- [ ] **Step 1:** Define types: `LeadStatus`, `LeadAssignment`, `PreRunnedPatient`, `SalesUser`

### Task 7 — Add lead API service

**Modify file:** `frontend/src/services/api.ts`

- [ ] **Step 1:** Add `leadService` object with 6 methods:
  - `getPreRunnedPatients(): Promise<PreRunnedPatient[]>`
  - `getPreRunnedRecommendation(token: string): Promise<RecommendationResponse>`
  - `getLeads(): Promise<LeadAssignment[]>`
  - `assignLead(patientId, assignToUserId, assignToName, notes?): Promise<LeadAssignment>`
  - `updateLeadStatus(assignmentId, status, notes?): Promise<LeadAssignment>`
  - `getSalesUsers(): Promise<SalesUser[]>`

---

## Phase 4 — Frontend: Read-Only Recommendation View

### Task 8 — Extract RecommendationReadOnlyView

**New file:** `frontend/src/components/shared/RecommendationReadOnlyView.tsx`

- [ ] **Step 1:** Define props: `data: RecommendationResponse`, `patient?: Patient`, `privacyMode?: boolean`

- [ ] **Step 2:** Extract rendering-only sections from `RecommendationPanel`:
  - Tier recommendation card (package name + tier badge)
  - Add-ons list with priority color badges (Red/Orange/Yellow/Green)
  - Annotated reasoning trace (if `reasoning_trace_annotated` available, else plain `reasoning_trace`)
  - Risk summary + patient high alert section
  - Communication script (summary headline, top findings, next actions)
  - Confidence badges (score, tier, signal coverage, data completeness)
  - Resolved package details

- [ ] **Step 3:** Ensure no fetch/stream logic, no client-side cache, no approval/reject, no email report, no deals drawer, no stage progress. Pure display only.

- [ ] **Step 4:** Match the existing visual style (navavej design tokens, card layouts, badge colors)

---

## Phase 5 — Executive Lead Assignment Screen

### Task 9 — Add Lead Assignment to executive sidebar

**Modify file:** `frontend/src/components/Sidebar.tsx`

- [ ] **Step 1:** Import `UserPlus` from lucide-react
- [ ] **Step 2:** Add to `EXECUTIVE_MENU` (between Executive Dashboard and Access Monitoring):
  ```typescript
  { icon: UserPlus, label: "Lead Assignment", id: "lead-assignment", href: "/lead-assignment" },
  ```

### Task 10 — Create executive Lead Assignment screen

**New file:** `frontend/src/app/lead-assignment/page.tsx`

- [ ] **Step 1:** Role guard: redirect non-executive users

**New file:** `frontend/src/components/lead-assignment/LeadAssignmentScreen.tsx`

- [ ] **Step 2:** Data loading: fetch pre-runned patients, leads, and sales users on mount

- [ ] **Step 3:** Left panel (~60%) — Pre-Runned Patient Pool:
  - Table with columns: Patient Name, Scenario, Risk Level (badge), AI Tier, Generated Date
  - Unassigned rows: "Assign" button
  - Already-assigned rows: "Assigned to {name}" (muted text)

- [ ] **Step 4:** Right panel (~40%) — Assignment Tracker:
  - Table with columns: Patient, Assigned To, Status (color badge), Date
  - Status badge colors: assigned=teal, contacted=blue, scheduled=amber, converted=green, declined=red
  - Click row → expand to show AI lead summary snippet

- [ ] **Step 5:** Assignment flow:
  - "Assign" button → inline dropdown of sales users (from `/api/sales-users`)
  - Optional notes field
  - "Confirm" → calls `leadService.assignLead()`
  - On success: refresh both panels

---

## Phase 6 — Sales Lead Development (tab on main page)

### Task 11 — Add tab toggle for sales on main page

**Modify file:** `frontend/src/app/page.tsx`

- [ ] **Step 1:** Add state: `const [salesTab, setSalesTab] = useState<"walkin" | "leads">("walkin");`

- [ ] **Step 2:** Inside the `isSearchFlowRole` block, after `NavavejBrand` in the navbar (~line 179):
  - If `user.role === "sales"`: render tab toggle ("Walk-in" | "My Leads")
  - If `user.role === "physician"`: no tab (physicians don't have leads)
  - Tab styling: matches the Navavej design system (teal active, gray inactive)

- [ ] **Step 3:** Conditionally render content:
  - `salesTab === "walkin"`: existing patient search + recommendation flow (unchanged)
  - `salesTab === "leads"`: render `<LeadDevelopmentView />`

### Task 12 — Create LeadDevelopmentView component

**New file:** `frontend/src/components/leads/LeadDevelopmentView.tsx`

- [ ] **Step 1:** Data loading: fetch leads on mount via `leadService.getLeads()`

- [ ] **Step 2:** Filter tabs: All | Assigned | Contacted | Scheduled | Converted | Declined

- [ ] **Step 3:** Lead cards (expandable):
  - **Collapsed state:** Patient name, scenario label, risk level badge, AI tier badge, status badge, assigned date
  - **Expanded state:**
    - AI Lead Summary — pre-generated paragraph, styled as "AI-generated" callout (sparkle icon, light teal bg)
    - Full recommendation via `<RecommendationReadOnlyView data={...} />`
    - Voice notes mock: Mic button with recording animation (CSS pulse). Click toggles animation state. Text input field for actual note entry. Looks like voice input for demo.
    - Status update: dropdown + notes textarea + "Update" button

- [ ] **Step 4:** Update handler: calls `leadService.updateLeadStatus()`, refreshes lead list on success

### Task 13 — Add second sales persona to login

**Modify file:** `frontend/src/app/login/page.tsx`

- [ ] **Step 1:** Add persona: `{ label: "Arunee Srisawat (Sales)", sub: "usr-sales-00002", name: "Arunee Srisawat", role: "sales" }`

---

## Verification

- [ ] **Executive flow:** Login as executive → see "Lead Assignment" in sidebar → navigate → see pre-runned patients in left panel + assignments in right panel → assign a patient to a sales user → assignment appears in tracker
- [ ] **Sales flow:** Login as sales → see "Walk-in" / "My Leads" tab toggle → switch to "My Leads" → see assigned leads → expand a lead → see AI summary + full recommendation (no AI fetch triggered) → add note via text field → update status to "contacted" → status badge updates
- [ ] **Two sales users:** Login as first sales → see only own leads. Login as second sales → see only own leads (different from first).
- [ ] **Physician unchanged:** Login as physician → no tab toggle visible → same flow as before
- [ ] **No live AI fetch for leads:** Network tab shows no calls to `/recommend` or `/recommend/stream` when viewing lead details
- [ ] **Frontend builds without TypeScript errors**
- [ ] **Existing test suite still passes**

---

## Files Changed

| File | Change type |
|---|---|
| `assets/sales_users.json` | **New** — shared sales persona registry |
| `assets/pre_runned_recommendations.json` | **New** — captured recommendation payloads |
| `assets/lead_assignments_seed.json` | **New** — seed assignments for demo |
| `backend/src/api/routes/leads.py` | **New** — lead CRUD API (7 endpoints) |
| `backend/src/api/main.py` | Modified — register leads router |
| `frontend/src/types/leads.ts` | **New** — TypeScript types |
| `frontend/src/services/api.ts` | Modified — `leadService` (6 methods) |
| `frontend/src/components/shared/RecommendationReadOnlyView.tsx` | **New** — pure display component |
| `frontend/src/app/lead-assignment/page.tsx` | **New** — executive route |
| `frontend/src/components/lead-assignment/LeadAssignmentScreen.tsx` | **New** — executive assignment UI |
| `frontend/src/components/leads/LeadDevelopmentView.tsx` | **New** — sales lead view |
| `frontend/src/app/page.tsx` | Modified — tab toggle for sales |
| `frontend/src/components/Sidebar.tsx` | Modified — "Lead Assignment" in executive menu |
| `frontend/src/app/login/page.tsx` | Modified — second sales persona |

## Out of Scope

- Reach-out patients appearing in the normal Patient Search (they are a separate pool)
- Converting a reach-out lead into a walk-in flow (re-running AI)
- Executive access to the Config screen (separate RBAC question, flagged in 13.2)
- Persistent lead storage (in-memory, resets on restart — POC appropriate)
- Real voice-to-text (mock animation only, text input for actual notes)
- Email/notification when a lead is assigned
