# Lead Flow UI Overhaul — Plan Review & Improved Implementation Plan

> **For agentic workers:** Use checkbox (`- [ ]`) tasks to track progress.

## Summary

This document reviews the existing workstream 13.4 plan and proposes a refined, decision-complete implementation plan for overhauling **two pages** in POC/V6: the **Executive lead assignment workspace** and the **Sales “My Leads” workspace**. The primary improvements over the current plan are: (1) introduce a small shared visual system to prevent style drift, (2) explicitly handle selection + empty-state edge cases that will occur once unassigned/assigned leads are separated, (3) reduce “god component” risk by splitting into small components, and (4) tighten test + fixture alignment after content edits.

**In-scope (no backend changes):**
- Fix fixture content voice + patient naming redundancy + clinical-only risk summaries.
- Replace “Pre-runned” UI text with “Pre-run” (UI labels only).
- Executive: split “assignment” vs “tracking” into two distinct sections with a pipeline summary.
- Sales: replace flat list with Kanban board + detail panel + “Move to” workflow.
- Improve `ReadOnlyRecommendationView` so it renders all available payload fields.

**Out-of-scope (kept):**
- Drag-and-drop Kanban (dropdown-based status move only).
- Persistent storage beyond current in-memory seed behavior.
- Walk-in flow changes.

## Current State Analysis

### Existing plan quality (good)
- The current plan at `POC/V6/_project_management/13. Additional Enhancements/13.4-Lead-Flow-UI-Overhaul/plan.md` has the correct *sequence* (fixtures → visual system → view improvements → executive → sales → tests).
- It correctly states “No backend changes required” and matches `backend/src/api/routes/leads.py` behavior.

### Gaps / risks in the existing plan
1. **Style drift risk:** The plan suggests duplicating status/risk color maps in each component. That will inevitably drift between Executive/Sales/Recommendation.
2. **Selection edge cases are underspecified:** Once the Executive pool filters to *unassigned only*, existing “default select first patient” logic will frequently point at an assigned patient, or at a now-missing patient after assignment.
3. **Component size risk:** Executive tracker + Kanban will significantly increase component complexity. A “single file per screen” approach will become hard to reason about and test.
4. **Tests will break from fixture edits:** Existing Vitest fixtures currently assert (a) patient_name includes scenario parentheses, (b) “Pre-runned” copy, and (c) sales-language in risk_summary. The plan should call this out explicitly and include the exact expected new strings.
5. **Lead count badge implementation needs a decision:** Avoid duplicate network fetches by wiring a callback from `SalesLeadDevelopmentPanel` to `app/page.tsx`, or accept a small extra `GET /leads` call.

## Proposed Changes (decision-complete)

### Files to change (locked-in)

**Modify (fixtures):**
- `POC/V6/assets/pre_runned_recommendations.json`

**Modify (frontend, existing):**
- `POC/V6/frontend/src/components/leads/ReadOnlyRecommendationView.tsx`
- `POC/V6/frontend/src/components/leads/ExecutiveLeadAssignmentScreen.tsx`
- `POC/V6/frontend/src/components/leads/SalesLeadDevelopmentPanel.tsx`
- `POC/V6/frontend/src/app/page.tsx`
- `POC/V6/frontend/src/app/lead-assignment/page.tsx`

**Create (frontend, new small components/utilities):**
- `POC/V6/frontend/src/components/leads/leadVisualMaps.ts`
- `POC/V6/frontend/src/components/leads/LeadBadges.tsx`
- `POC/V6/frontend/src/components/leads/ExecutiveAssignmentSection.tsx`
- `POC/V6/frontend/src/components/leads/ExecutiveTrackerSection.tsx`
- `POC/V6/frontend/src/components/leads/SalesKanbanBoard.tsx`

**Modify / Create (tests):**
- `POC/V6/frontend/src/components/leads/ReadOnlyRecommendationView.test.tsx`
- `POC/V6/frontend/src/components/leads/SalesLeadDevelopmentPanel.test.tsx`
- `POC/V6/frontend/src/app/page.test.tsx`
- Create (if missing): `POC/V6/frontend/src/components/leads/ExecutiveLeadAssignmentScreen.test.tsx`

---

## Implementation Tasks (checkbox plan)

### Task 0 — Preflight: identify all UI “Pre-runned” strings

**Files (search targets):**
- `POC/V6/frontend/src/components/leads/**`
- `POC/V6/frontend/src/app/lead-assignment/page.tsx`

- [ ] Grep for `Pre-runned|pre-runned` and list every UI-facing occurrence to update.
- [ ] Confirm we will **not** rename API routes, JSON filenames, types, or variables named `pre_runned` (minimize churn).

---

### Task 1 — Fixture cleanup (voice + patient_name + clinical risk summaries)

**Modify:** `POC/V6/assets/pre_runned_recommendations.json`

- [ ] Remove scenario parentheses from `patient_name` for all 3 entries:
  - [ ] `"Siriporn Chantarak (Senior Cancer Screening Gap)"` → `"Siriporn Chantarak"`
  - [ ] `"Preecha Nimitr (Post-COVID Cardio Follow-up)"` → `"Preecha Nimitr"`
  - [ ] `"Nalinee Kittipong (Thyroid Nodule Follow-up)"` → `"Nalinee Kittipong"`

- [ ] Rewrite `ai_lead_summary` and `communication_script.program_justification` from third-person (“Sales should…”) to direct voice (“Position… / Frame…”).

- [ ] Rewrite `recommendation.risk_summary.description` to be clinical-only:
  - [ ] Patient 1 → `High preventive risk from accumulated screening gaps. Multiple overdue screenings warrant coordinated follow-up.`
  - [ ] Patient 2 → `Moderate post-infectious risk with lingering cardiopulmonary symptoms. Structured follow-up recommended.`
  - [ ] Patient 3 → `Medium continuity risk for a known thyroid finding. Interval reassessment and endocrine review recommended.`

---

### Task 2 — Terminology update: “Pre-runned” → “Pre-run” (UI labels only)

**Modify (minimum set, based on current code reads):**
- `POC/V6/frontend/src/components/leads/ExecutiveLeadAssignmentScreen.tsx`
- `POC/V6/frontend/src/components/leads/SalesLeadDevelopmentPanel.tsx`
- `POC/V6/frontend/src/components/leads/ReadOnlyRecommendationView.tsx`
- `POC/V6/frontend/src/app/lead-assignment/page.tsx`

- [ ] Update kicker labels:
  - [ ] `Pre-runned patient pool` → `Pre-run patient pool`
  - [ ] `Pre-runned recommendation` → `Pre-run recommendation`
- [ ] Update descriptive copy:
  - [ ] “Assign pre-runned …” → “Assign pre-run …”
  - [ ] “Executive-assigned pre-runned …” → “Executive-assigned pre-run …”

---

### Task 3 — Shared visual system (single source of truth)

**Create:** `POC/V6/frontend/src/components/leads/leadVisualMaps.ts`

- [ ] Export `LEAD_STATUS_ORDER = ["assigned","contacted","scheduled","converted","declined"] as const`
- [ ] Export `STATUS_STYLES` for badge + column header + dot classes:
  - assigned → blue
  - contacted → amber
  - scheduled → green
  - converted → emerald
  - declined → gray
- [ ] Export `RISK_STYLES` for `"High"|"Medium"|"Low"` plus fallback:
  - High → red
  - Medium → amber
  - Low → green
- [ ] Export `getNextLeadStatus(status)`:
  - assigned→contacted→scheduled→converted
  - declined→declined, converted→converted

**Create:** `POC/V6/frontend/src/components/leads/LeadBadges.tsx`

- [ ] `StatusBadge` uses `STATUS_STYLES`
- [ ] `RiskBadge` and `RiskDot` uses `RISK_STYLES`
- [ ] `CountBadge` renders a compact pill for counts (optionally tinted by status)

Decision: **use this shared module everywhere** (Executive cards, Tracker table, Kanban headers/cards, Recommendation header).

---

### Task 4 — ReadOnlyRecommendationView: completeness + hierarchy

**Modify:** `POC/V6/frontend/src/components/leads/ReadOnlyRecommendationView.tsx`

- [ ] Replace “Pre-runned recommendation” label with “Pre-run recommendation”.
- [ ] Add confidence display:
  - [ ] Render `Math.round(recommendation.confidence_score * 100)` as `“89% confidence”` near Risk/Tier.
- [ ] Render missing `communication_script` fields:
  - [ ] `top_findings` → “Key Findings”
  - [ ] `next_actions` → “Suggested Next Steps”
  - Each item uses existing `renderHighlightedText(text, sentiment, highlight_terms)`.
- [ ] Add sentiment left-border styling on annotated reasoning lines:
  - risk → red
  - reassuring → green
  - informational → teal
  - neutral → gray
- [ ] Update Risk/Tier display to use `RiskBadge` (risk is colored) and a neutral Tier pill/card.

---

### Task 5 — Executive page redesign: split Assignment + Tracker (single orchestrator)

#### Task 5a — Orchestrator and selection rules

**Modify:** `POC/V6/frontend/src/components/leads/ExecutiveLeadAssignmentScreen.tsx`

- [ ] Keep existing data fetching (`getPreRunnedPatients`, `getLeads`, `getSalesUsers`, `getPreRunnedRecommendation`, `assignLead`).
- [ ] Derive `unassignedPatients = patients.filter(p => !p.is_assigned)`.
- [ ] Selection rules (must implement exactly):
  - [ ] If `unassignedPatients.length === 0`: set `selectedPatientId = null` and show empty state in Assignment section.
  - [ ] Else if selected patient is null or not in `unassignedPatients`: select `unassignedPatients[0].patient_id`.
  - [ ] After successful assign + refresh: auto-select the next available unassigned patient (or null if none).
- [ ] Render:
  - [ ] `<ExecutiveAssignmentSection ... />` (top)
  - [ ] `<ExecutiveTrackerSection ... />` (bottom)

#### Task 5b — Assignment section (new component)

**Create:** `POC/V6/frontend/src/components/leads/ExecutiveAssignmentSection.tsx`

- [ ] Left column: **unassigned** pool only, compact cards:
  - patient name, scenario, tier pill, age pill, risk dot/left border
  - do **not** show full `ai_lead_summary` on the card
- [ ] Right column:
  - recommendation preview (existing `ReadOnlyRecommendationView`)
  - assign form (sales owner dropdown, executive notes, assign button)
  - disabled states:
    - disable if no selected patient
    - disable assign if no sales owner selected
- [ ] Empty states:
  - no unassigned leads → “No unassigned leads” message
  - no selection → “Select a lead to preview” message

#### Task 5c — Tracker section (new component)

**Create:** `POC/V6/frontend/src/components/leads/ExecutiveTrackerSection.tsx`

- [ ] Pipeline summary bar:
  - 5 segments in `LEAD_STATUS_ORDER`, each with count + status tint.
- [ ] Per-sales-rep breakdown:
  - show each sales user, total leads, and per-status counts.
- [ ] All-leads table:
  - columns: Risk dot, Patient, Scenario, Sales owner, Status badge, Assigned date
  - expansion behavior: use `<details>` for lowest-state complexity; inside expansion show notes (if any).
- [ ] Tracker empty state when `leads.length === 0`.

---

### Task 6 — Sales page redesign: Kanban board + detail panel

#### Task 6a — Kanban board component

**Create:** `POC/V6/frontend/src/components/leads/SalesKanbanBoard.tsx`

- [ ] Props: `leads`, `selectedLeadId`, `onSelectLead(assignmentId)`
- [ ] Render 5 columns in `LEAD_STATUS_ORDER`:
  - header: status + count badge
  - body: cards in that status
  - ensure empty columns still render (min-height)
  - horizontal scroll for small screens (`overflow-x-auto`)

#### Task 6b — Replace list with Kanban + keep current update workflow

**Modify:** `POC/V6/frontend/src/components/leads/SalesLeadDevelopmentPanel.tsx`

- [ ] Replace vertical list UI with `SalesKanbanBoard`.
- [ ] Keep detail panel showing:
  - `ReadOnlyRecommendationView`
  - “Move to” dropdown (default to `getNextLeadStatus(selectedLead.status)` but allow any status)
  - notes textarea
  - update button
- [ ] Selection rules:
  - on load: select the first lead from the first non-empty status column (in `LEAD_STATUS_ORDER`)
  - if selected lead disappears, reselect using the same rule
  - after status update, keep selection on that same assignment_id (it will move columns)
- [ ] Update empty-state copy to “pre-run”.

---

### Task 7 — Dashboard tab count badge (“My Leads (N)”)

**Modify:** `POC/V6/frontend/src/app/page.tsx`

Decision (to avoid duplicate fetch): **use a callback** from `SalesLeadDevelopmentPanel`:
- [ ] Add `myLeadsCount` state in `page.tsx`.
- [ ] Render “My Leads” button label as `My Leads` + small count pill.
- [ ] Pass `onLeadCountChange(count)` prop into `SalesLeadDevelopmentPanel`.
- [ ] In `SalesLeadDevelopmentPanel`, call `onLeadCountChange(leads.length)` after `refreshLeads()` and after successful status updates (when local leads state changes).

---

### Task 8 — Update tests (Vitest) to match new fixtures + new UI structure

**Modify:** `POC/V6/frontend/src/components/leads/ReadOnlyRecommendationView.test.tsx`
- [ ] Update expected header label: “Pre-run recommendation”
- [ ] Update expected patient name: without parentheses scenario
- [ ] Update expected risk summary string to the clinical-only rewrite
- [ ] Add assertions for:
  - confidence badge text (`/\\d+% confidence/`)
  - “Key Findings” and “Suggested Next Steps” sections (with at least one fixture item added if needed)

**Modify:** `POC/V6/frontend/src/components/leads/SalesLeadDevelopmentPanel.test.tsx`
- [ ] Update mocked lead names + risk summary to match fixture cleanups
- [ ] Update queries to find lead card within Kanban columns
- [ ] Update interactions to use “Move to” dropdown label (if renamed)

**Modify:** `POC/V6/frontend/src/app/page.test.tsx`
- [ ] Mock `leadService.getLeads` only if `page.tsx` now fetches count directly.
- [ ] If using callback-only (preferred), update the existing `SalesLeadDevelopmentPanel` mock to invoke `onLeadCountChange`.
- [ ] Update button accessible name expectations to allow `My Leads` + badge.

**Create (if missing):** `POC/V6/frontend/src/components/leads/ExecutiveLeadAssignmentScreen.test.tsx`
- [ ] Coverage: selection defaults to first unassigned, empty-state when none, assign button enable/disable, post-assign refresh removes the patient from unassigned list.

---

## Assumptions & Decisions

- **No backend/API changes**: confirm `backend/src/api/routes/leads.py` already supports all required data and role-based filtering.
- **Design language**: continue using existing Tailwind + `navavej-*` tokens to match the app.
- **Kanban interactions**: click-to-select + dropdown-to-move only (no drag/drop).
- **Component decomposition is required**: new small components will be created to keep files readable and tests focused.
- **Lead count badge**: implemented via callback from `SalesLeadDevelopmentPanel` to avoid extra network calls (preferred).

## Verification Steps

### Automated

Run:
```bash
cd POC/V6/frontend && npm run test
cd POC/V6/frontend && npm run build
cd POC/V6 && python3 -m pytest scripts/tests/test_leads_api.py
```

Expected:
- All Vitest tests pass (updated assertions for new UI + fixture strings).
- Next.js build passes.
- Leads API pytest remains passing (no backend changes).

### Manual (high-signal checks)

- Executive:
  - Only **unassigned** leads appear in the assignment pool.
  - Assigning a lead removes it from the pool and it appears in the tracker with status “assigned”.
  - Tracker shows correct counts per pipeline stage and per sales rep.
- Sales:
  - Leads are grouped into Kanban columns by status.
  - Selecting a card shows the correct recommendation + current notes.
  - Changing status via “Move to” updates the backend and moves the card to the new column.
- Content:
  - No third-person “Sales should…” phrasing remains in lead recommendations.
  - Risk summary text is clinical-only.
  - UI text says “Pre-run”, not “Pre-runned”.

