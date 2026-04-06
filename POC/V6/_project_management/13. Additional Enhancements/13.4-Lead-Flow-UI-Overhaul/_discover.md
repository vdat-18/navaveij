# Discovery — Lead Flow UI Overhaul

**Date:** 2026-04-03
**Investigator:** Claude Code
**Trigger:** Post-implementation review of workstream 13.3 — UI quality and content voice identified as insufficient
**Resolution:** Pending implementation

---

## Investigation Scope

Full review of the 13.3 lead assignment implementation: backend endpoints, fixture data, all three frontend components, the read-only recommendation view, and comparison against the existing walk-in `RecommendationPanel` styling.

---

## Files Audited

### Fixture Data

| File | Finding |
|---|---|
| `assets/pre_runned_recommendations.json` | 3 lead patients. All `ai_lead_summary` fields use third-person voice ("Sales should..."). All `program_justification` fields refer to sales in third person. All `risk_summary.description` fields mix clinical assessment with sales conversion language. All `patient_name` fields include the scenario in parentheses, duplicating `scenario_label`. |
| `assets/lead_assignments_seed.json` | 2 seed assignments — lead_001 (Siriporn → Somying, status: assigned), lead_002 (Preecha → Arunee, status: contacted). Both reference correct lead-only patient IDs. |
| `assets/sales_users.json` | 2 sales personas matching login page. |

### Frontend Components

| File | Finding |
|---|---|
| `frontend/src/components/leads/ReadOnlyRecommendationView.tsx` | 148 lines. Renders: header with patient info + risk/tier/generated badges, recommendation summary (headline + program justification + reasoning trace), resolved package + price, priority add-ons with severity dots, risk summary with critical signals. Does NOT render: `top_findings`, `next_actions`, `confidence_score`. Risk/tier badges use neutral white — no color coding by severity. |
| `frontend/src/components/leads/ExecutiveLeadAssignmentScreen.tsx` | 233 lines. Single 2-column layout. Left: all patients (assigned + unassigned mixed), assignment form below. Right: recommendation preview, assignment tracker below. No pipeline summary. No per-rep view. Tracker shows all leads with neutral gray status badges. |
| `frontend/src/components/leads/SalesLeadDevelopmentPanel.tsx` | 197 lines. 2-column layout. Left: vertical lead card list + status/notes form. Right: recommendation view. Cards include full AI summary inline (3-4 lines each). Status is a plain text badge. No pipeline visualization. |

### Existing Recommendation Panel (for comparison)

| File | Finding |
|---|---|
| `frontend/src/components/dashboard/RecommendationPanel.tsx` | ~700+ lines. Uses `ClinicalRiskGauge` with color-coded severity arcs (green/yellow/red). Uses framer-motion animations. Has stage progress indicator. Has skeleton loading states. The lead flow `ReadOnlyRecommendationView` has none of these visual treatments. |

### Page Integration

| File | Finding |
|---|---|
| `frontend/src/app/page.tsx` | Sales tab toggle at lines 239-266. Two plain buttons "Walk-in" / "My Leads" with no count badge. `SalesLeadDevelopmentPanel` rendered when `salesView === "my-leads"`. |
| `frontend/src/app/lead-assignment/page.tsx` | 42 lines. Role guard (executive only). Title "Lead Assignment Flow" + subtitle. Renders `ExecutiveLeadAssignmentScreen`. |

---

## Key Findings

1. **Third-person voice is pervasive.** Every `ai_lead_summary` and every `program_justification` across all 3 patients talks about sales as "sales" rather than addressing them directly. This is consistent — not a one-off — and affects the core reading experience for the primary audience.

2. **Risk summaries are half-clinical, half-sales.** Each risk summary has a clinically valid first clause followed by a sales conversion appendage. The split is clean: removing the sales appendage leaves a valid clinical statement.

3. **Patient name redundancy is a fixture-level issue.** The `patient_name` field concatenates the name and scenario, but every UI location also displays `scenario_label` separately. The fix is in the JSON, not the components.

4. **`top_findings` and `next_actions` exist in all 3 payloads but are never rendered.** The `ReadOnlyRecommendationView` destructures `communicationScript` but only uses `summary_headline`, `program_justification`, and `priority_add_ons`. The `top_findings` and `next_actions` arrays are available but ignored.

5. **`confidence_score` is in the payload (0.84-0.89) but never displayed.** The walk-in `RecommendationPanel` shows a confidence indicator; the lead flow does not.

6. **No status/risk color system exists.** Both the executive tracker and sales lead list use the same neutral gray styling for all status and risk values. The walk-in flow uses a full color-coded gauge — the lead flow has no equivalent.

7. **Executive screen conflates two workflows.** Assigned and unassigned patients share the same list. The assignment form is below the patient list. The tracker is below the recommendation. Nothing is visually separated by purpose.

8. **Sales screen lacks pipeline shape.** The lead list is a vertical stack sorted by insertion order. There is no grouping by status, no columnar layout, no visual indication of pipeline progression. A Kanban board with status columns would directly address this.

9. **Backend is sufficient.** The existing 7 endpoints provide all data needed for the redesigned UI:
   - `GET /pre-runned-patients` returns `is_assigned` flag → can filter for assignment pool
   - `GET /leads` returns all leads with status → can group by status for Kanban + tracker
   - `GET /sales-users` → per-rep breakdown
   - No new endpoints needed.

---

## Recommendation

1. Fix fixture content first (voice, patient_name, risk_summary) — Phase 1
2. Establish shared color maps for status and risk — Phase 2
3. Improve `ReadOnlyRecommendationView` (colors, confidence, missing sections) — Phase 3
4. Redesign executive screen with split assignment + tracker — Phase 4
5. Build sales Kanban board — Phase 5
6. Update tests — Phase 6
