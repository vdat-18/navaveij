# Development Summary — Lead Flow UI Overhaul

**Workstream:** 13.4
**Status:** Completed (checkpoint 5 complete)
**Last updated:** 2026-04-06

---

## Feature Overview

This workstream overhauls the lead flow UX for two personas:

- **Executive:** separate “assign” from “track” by splitting the screen into Assignment (unassigned pool + preview + assign form) and Tracker (pipeline summary + per-rep breakdown + all-leads table).
- **Sales:** (pending) replace the flat list with a Kanban pipeline and a detail panel workflow for moving leads between stages.

Additionally, the pre-run recommendation content is updated to:
- remove scenario duplication from `patient_name`
- change third-person “Sales should…” voice to direct voice
- make risk summaries clinical-only

## Implementation Progress (Checkpoint 5)

**Completed**
- Fixtures updated: `assets/pre_runned_recommendations.json`
- UI copy: “Pre-runned” → “Pre-run” (UI text only)
- Shared styling helpers: `leadVisualMaps.ts` + `LeadBadges.tsx`
- `ReadOnlyRecommendationView` now renders confidence, key findings, next actions, and sentiment borders
- Executive UI refactored into new components + unassigned-only selection rules
- Sales UI refactored into Kanban board + detail panel workflow
- “My Leads” count badge wiring added (callback-based; avoids extra fetch)
- Tests and verification commands executed (Vitest + Next build + Leads API pytest)
- Focus mode: recommendation panels can be expanded to full-screen for distraction-free reading (sales detail panel + executive preview panel)
- Fixture expansion: added additional pre-run patients so the executive unassigned pool is more lively.
- Unassign flow: executives can unassign a lead from the tracker (returns it to the unassigned pool).

**Pending**
- None (awaiting any additional QA requests)

---

## Key Architectural Decisions

1. **Single source of truth for risk/status styling.** Introduced `leadVisualMaps.ts` and `LeadBadges.tsx` to avoid duplicated Tailwind maps across multiple screens.
2. **Keep API + internal naming stable.** The app continues to use `/pre-runned-*` endpoints and `pre_runned_*` identifiers internally; only UI labels were changed to “Pre-run”.
3. **Decompose the executive “screen” into focused components.** `ExecutiveLeadAssignmentScreen` is now an orchestrator that manages data + selection and composes:
   - `ExecutiveAssignmentSection` (unassigned pool + assign flow)
   - `ExecutiveTrackerSection` (pipeline + per-rep + all-leads)
4. **Prefer low-state UI for expandable rows.** The tracker uses `<details>` for row expansion to avoid additional state plumbing.

---

## Files Created / Modified

### Fixtures
- Modified: `assets/pre_runned_recommendations.json`

### Frontend (new)
- Created: `frontend/src/components/leads/leadVisualMaps.ts`
- Created: `frontend/src/components/leads/LeadBadges.tsx`
- Created: `frontend/src/components/leads/ExecutiveAssignmentSection.tsx`
- Created: `frontend/src/components/leads/ExecutiveTrackerSection.tsx`
- Created: `frontend/src/components/leads/SalesKanbanBoard.tsx`

### Frontend (modified)
- Modified: `frontend/src/components/leads/ReadOnlyRecommendationView.tsx`
- Modified: `frontend/src/components/leads/ExecutiveLeadAssignmentScreen.tsx`
- Modified: `frontend/src/components/leads/ExecutiveAssignmentSection.tsx` (focus mode / full-screen preview)
- Modified: `frontend/src/components/leads/ExecutiveTrackerSection.tsx` (unassign action)
- Modified: `frontend/src/components/leads/SalesLeadDevelopmentPanel.tsx` (Kanban + detail panel)
- Modified: `frontend/src/app/page.tsx` (“My Leads” count badge wiring)

### Backend (modified)
- Modified: `backend/src/api/routes/leads.py` (DELETE /leads/{assignment_id} for executive unassign)
- Modified: `frontend/src/app/lead-assignment/page.tsx`

### Project management docs
- Updated: `_project_management/13. Additional Enhancements/13.4-Lead-Flow-UI-Overhaul/plan.md`
- Updated: `_project_management/13. Additional Enhancements/13.4-Lead-Flow-UI-Overhaul/README.md`

---

## Known Constraints

- No backend changes expected; feature relies on existing in-memory lead assignment behavior.
- Drag-and-drop Kanban remains out of scope (dropdown-based status transitions only).
- Local environment note: `npm install` was rerun after clearing `frontend/node_modules` due to a Rollup optional-dependency resolution issue.
- Local environment note: if Rollup optional deps are missing, `npm install --include=optional` can restore them without deleting `node_modules`.
