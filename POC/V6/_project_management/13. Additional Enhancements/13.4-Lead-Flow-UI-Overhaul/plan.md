# Plan — Lead Flow UI Overhaul (updated)

**Goal:** Overhaul the lead assignment UI so (1) the executive screen separates assignment from tracking, (2) the sales screen uses a Kanban board, (3) the recommendation voice speaks directly to the reader, and (4) the read-only recommendation view renders all available data with proper hierarchy.

**Prerequisite:** Workstream 13.3 (Lead Assignment Flow) — functionally complete, tests passing.

**No backend changes required.** Existing routes in `backend/src/api/routes/leads.py` are sufficient.

**Implementation gating:** Do not start implementation until the requester explicitly gives the go-ahead.

---

## Phase 0 — Preflight (copy audit)

### Task 0 — Locate all UI “Pre-runned” strings to update

**Files (search targets):**
- `frontend/src/components/leads/**`
- `frontend/src/app/lead-assignment/page.tsx`

- [ ] Grep for `Pre-runned|pre-runned` and list every UI-facing occurrence to update.
- [ ] Confirm we will **not** rename API routes, JSON filenames, types, or variables named `pre_runned` (minimize churn).

---

## Phase 1 — Content Fixes (fixtures)

### Task 1 — Fix recommendation voice and data

**File:** `assets/pre_runned_recommendations.json`

**1a. Remove scenario from patient_name (avoid redundancy with scenario_label):**
- `"Siriporn Chantarak (Senior Cancer Screening Gap)"` → `"Siriporn Chantarak"`
- `"Preecha Nimitr (Post-COVID Cardio Follow-up)"` → `"Preecha Nimitr"`
- `"Nalinee Kittipong (Thyroid Nodule Follow-up)"` → `"Nalinee Kittipong"`

**1b. Rewrite third-person voice to direct voice:**

Patient 1 (Siriporn):
- `ai_lead_summary`: "...Sales should position this as..." → "...Position this as..."
- `communication_script.program_justification`:
  - From: `A premium package allows sales to frame the visit around convenience, completion, and physician-reviewed screening closure.`
  - To: `Frame the visit around convenience, completion, and physician-reviewed screening closure. A premium package supports this positioning.`

Patient 2 (Preecha):
- `ai_lead_summary`: "...Sales should frame the package as..." → "...Frame the package as..."
- `communication_script.program_justification`:
  - From: `This recommendation helps sales position the visit around reassurance, lingering symptoms, and efficient physician escalation if needed.`
  - To: `Position the visit around reassurance, lingering symptoms, and efficient physician escalation if needed.`

Patient 3 (Nalinee):
- `ai_lead_summary`: "...Sales should emphasize..." → "...Emphasize..."
- `communication_script.program_justification`:
  - From: `This package gives sales a clear continuity message: one coordinated visit for reassessment, explanation, and next-step clarity.`
  - To: `Your continuity message: one coordinated visit for reassessment, explanation, and next-step clarity.`

**1c. Fix risk_summary to be purely clinical (remove sales framing):**
- Patient 1:
  - From: `High preventive risk from accumulated screening gaps with strong conversion value.`
  - To: `High preventive risk from accumulated screening gaps. Multiple overdue screenings warrant coordinated follow-up.`
- Patient 2:
  - From: `Moderate post-infectious risk with strong reassurance-driven conversion potential.`
  - To: `Moderate post-infectious risk with lingering cardiopulmonary symptoms. Structured follow-up recommended.`
- Patient 3:
  - From: `Medium continuity risk with a strong coordinated-follow-up value proposition.`
  - To: `Medium continuity risk for a known thyroid finding. Interval reassessment and endocrine review recommended.`

---

## Phase 2 — Terminology (“Pre-run” UI labels only)

### Task 2 — Fix “Pre-runned” grammar in UI labels

**Files (minimum set):**
- `frontend/src/components/leads/ExecutiveLeadAssignmentScreen.tsx`
- `frontend/src/components/leads/SalesLeadDevelopmentPanel.tsx`
- `frontend/src/components/leads/ReadOnlyRecommendationView.tsx`
- `frontend/src/app/lead-assignment/page.tsx`

- [ ] Change UI-facing labels from “Pre-runned” → “Pre-run”.
- [ ] Keep internal variable/type names as-is to avoid churn across the codebase.

---

## Phase 3 — Shared Visual System (single source of truth)

### Task 3 — Add shared lead visual maps + badge components

**Create:**
- `frontend/src/components/leads/leadVisualMaps.ts`
- `frontend/src/components/leads/LeadBadges.tsx`

**3a. leadVisualMaps.ts**
- [ ] Export `LEAD_STATUS_ORDER = ["assigned","contacted","scheduled","converted","declined"] as const`.
- [ ] Export `STATUS_STYLES` (assigned=blue, contacted=amber, scheduled=green, converted=emerald, declined=gray).
- [ ] Export `RISK_STYLES` for `"High"|"Medium"|"Low"` plus fallback (High=red, Medium=amber, Low=green).
- [ ] Export `getNextLeadStatus(status)` implementing: assigned→contacted→scheduled→converted, declined/converted are terminal.

**3b. LeadBadges.tsx**
- [ ] `StatusBadge` uses `STATUS_STYLES`.
- [ ] `RiskBadge` + `RiskDot` uses `RISK_STYLES`.
- [ ] `CountBadge` renders a compact pill (optionally tinted by status).

---

## Phase 4 — ReadOnlyRecommendationView Improvements (completeness + hierarchy)

### Task 4 — Add missing sections and visual improvements

**Modify:** `frontend/src/components/leads/ReadOnlyRecommendationView.tsx`

- [ ] Fix header label: “Pre-run recommendation”.
- [ ] Display confidence: `Math.round(confidence_score * 100)` as “89% confidence” near risk/tier.
- [ ] Render `communication_script.top_findings` as “Key Findings”.
- [ ] Render `communication_script.next_actions` as “Suggested Next Steps”.
- [ ] Add sentiment left-border styling on `reasoning_trace_annotated` rows:
  - risk → red
  - reassuring → green
  - informational → teal
  - neutral → gray
- [ ] Use `RiskBadge` for risk (colored), keep tier neutral.

---

## Phase 5 — Executive Screen Redesign (Assignment + Tracker)

### Task 5 — Split Executive screen into Assignment section + Tracker section

**Modify:** `frontend/src/components/leads/ExecutiveLeadAssignmentScreen.tsx`

**Create:**
- `frontend/src/components/leads/ExecutiveAssignmentSection.tsx`
- `frontend/src/components/leads/ExecutiveTrackerSection.tsx`

**Selection rules (must implement exactly):**
- [ ] `unassignedPatients = patients.filter(p => !p.is_assigned)`
- [ ] If `unassignedPatients.length === 0`: `selectedPatientId = null`
- [ ] Else if selected patient is null or not in `unassignedPatients`: select `unassignedPatients[0].patient_id`
- [ ] After successful assign + refresh: auto-select next unassigned patient (or null if none)

**ExecutiveAssignmentSection:**
- [ ] Left column: unassigned pool only (compact cards; no inline long ai_lead_summary).
- [ ] Right column: recommendation preview + assign form (disabled until a patient + sales owner selected).
- [ ] Empty states:
  - no unassigned leads → show a clear “No unassigned leads” message
  - no selection → “Select a lead to preview”

**ExecutiveTrackerSection:**
- [ ] Pipeline summary bar: 5 segments in `LEAD_STATUS_ORDER`, with tinted counts.
- [ ] Per-sales-rep breakdown: always show every sales user, including 0-lead reps.
- [ ] All-leads table with expand rows (use `<details>` to keep state minimal).

**Also modify:** `frontend/src/app/lead-assignment/page.tsx`
- [ ] Update subtitle copy to “pre-run”.

---

## Phase 6 — Sales Kanban Board (pipeline visualization)

### Task 6 — Replace vertical list with Kanban + keep detail panel

**Modify:** `frontend/src/components/leads/SalesLeadDevelopmentPanel.tsx`

**Create:** `frontend/src/components/leads/SalesKanbanBoard.tsx`

**SalesKanbanBoard:**
- [ ] Props: `leads`, `selectedLeadId`, `onSelectLead(assignmentId)`
- [ ] Render 5 columns in `LEAD_STATUS_ORDER` with count badges.
- [ ] Ensure empty columns render (min-height).
- [ ] Horizontal scroll on small screens (`overflow-x-auto`).

**SalesLeadDevelopmentPanel:**
- [ ] Replace list with Kanban.
- [ ] Keep detail panel:
  - `ReadOnlyRecommendationView`
  - “Move to” dropdown (default `getNextLeadStatus(current)` but allow any)
  - Notes textarea + Update button
- [ ] Selection rules:
  - default: first lead from first non-empty status column
  - after update: keep selection on same assignment_id
- [ ] Update empty-state copy to “pre-run”.

---

## Phase 7 — “My Leads” count badge (sales dashboard)

### Task 7 — Show count badge without extra fetch

**Modify:** `frontend/src/app/page.tsx`

- [ ] Add state `myLeadsCount`.
- [ ] Pass `onLeadCountChange(count)` prop down to `SalesLeadDevelopmentPanel`.
- [ ] In `SalesLeadDevelopmentPanel`, call callback after refresh + after status updates.
- [ ] Render “My Leads” button with a small count pill.

---

## Phase 8 — Tests & Verification

### Task 8 — Update existing tests to match new UI + fixture strings

**Modify:**
- `frontend/src/components/leads/ReadOnlyRecommendationView.test.tsx`
- `frontend/src/components/leads/SalesLeadDevelopmentPanel.test.tsx`
- `frontend/src/app/page.test.tsx`

**Create (if missing):**
- `frontend/src/components/leads/ExecutiveLeadAssignmentScreen.test.tsx`

### Verification commands

```bash
cd POC/V6/frontend && npm run test
cd POC/V6/frontend && npm run build
cd POC/V6 && python3 -m pytest scripts/tests/test_leads_api.py
```

### Manual verification (high signal)

- Executive:
  - Only unassigned leads appear in assignment pool.
  - Assigning removes from pool and adds to tracker.
  - Tracker pipeline + per-rep breakdown counts look correct.
- Sales:
  - Leads grouped into Kanban by status; cards move after update.
  - Detail panel shows recommendation + notes.
- Content:
  - No “Sales should…” language remains.
  - Risk summary is clinical-only.
  - UI text says “Pre-run”, not “Pre-runned”.
