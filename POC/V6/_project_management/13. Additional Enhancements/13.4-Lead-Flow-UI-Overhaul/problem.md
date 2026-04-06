# Problem — Lead Flow UI Overhaul

**Date:** 2026-04-03
**Source:** Post-implementation review of workstream 13.3 (Lead Assignment Flow)

---

## Problem Statement

The lead assignment feature (13.3) is functionally complete — backend, frontend, and tests all pass. However, the UI does not serve either persona well. The executive screen conflates assignment with tracking. The sales screen is a flat list with no pipeline visualization. The AI-generated recommendation text talks about sales in third person, which is jarring when sales users are the audience.

---

## Specific Problems

### Problem 1 — Executive screen mixes assignment and tracking

The `ExecutiveLeadAssignmentScreen` shows all patients (assigned and unassigned) in a single list, with the assignment form below and the tracker further below. A sales manager needs two distinct workflows:

- **Assign**: "Here are unassigned leads — who should take each one?" (focused, quick)
- **Track**: "How is my pipeline? Which reps are stuck? Which leads need attention?" (overview, monitoring)

The current UI serves neither well because it tries to do both in one scrollable view.

**Affected:** `frontend/src/components/leads/ExecutiveLeadAssignmentScreen.tsx`

### Problem 2 — Sales screen is a flat list, not a pipeline

The `SalesLeadDevelopmentPanel` shows leads in a vertical card list. Status is a small text badge on each card. There is no visual representation of the pipeline stages. A sales rep managing 5-10 leads needs to see at a glance: "Which leads are assigned? Which have I contacted? Which are scheduled?"

A Kanban-style board with columns per lifecycle stage would make pipeline state instantly visible and status progression intuitive.

**Affected:** `frontend/src/components/leads/SalesLeadDevelopmentPanel.tsx`

### Problem 3 — Recommendation text uses third-person voice for sales

The `communication_script` fields in `pre_runned_recommendations.json` refer to sales in third person:

- `program_justification`: "A premium package allows sales to frame the visit around..."
- `program_justification`: "This recommendation helps sales position the visit around..."
- `program_justification`: "This package gives sales a clear continuity message..."
- `ai_lead_summary`: "Sales should position this as...", "Sales should frame...", "Sales should emphasize..."

Sales users reading their own recommendation see text that talks about them as if they're not in the room. The voice should be direct: "Position this as...", "Frame the visit around...", "Your continuity message:..."

**Affected:** `assets/pre_runned_recommendations.json` — `ai_lead_summary`, `communication_script.program_justification` for all 3 patients

### Problem 4 — Risk summaries contain sales language instead of clinical language

The `risk_summary.description` fields mix clinical assessment with conversion/sales framing:

- "High preventive risk from accumulated screening gaps **with strong conversion value.**"
- "Moderate post-infectious risk **with strong reassurance-driven conversion potential.**"
- "Medium continuity risk **with a strong coordinated-follow-up value proposition.**"

Risk summary should be purely clinical. Sales framing belongs in `ai_lead_summary` or `communication_script`.

**Affected:** `assets/pre_runned_recommendations.json` — `recommendation.risk_summary.description` for all 3 patients

### Problem 5 — Patient names include scenario (redundant)

The `patient_name` field includes the scenario in parentheses:
- "Siriporn Chantarak (Senior Cancer Screening Gap)"

This is displayed next to the separate `scenario_label` field "Senior Cancer Screening Gap", creating visible redundancy on every card and header.

**Affected:** `assets/pre_runned_recommendations.json` — `patient_name` for all 3 patients

### Problem 6 — ReadOnlyRecommendationView omits available data

The `ReadOnlyRecommendationView` does not render:
- `communication_script.top_findings` — exists in all 3 patient payloads, never displayed
- `communication_script.next_actions` — exists in all 3 patient payloads, never displayed
- `confidence_score` / `confidence_tier` — exists in all 3 patient payloads, never displayed

These are valuable for both executives previewing a recommendation and sales acting on it.

**Affected:** `frontend/src/components/leads/ReadOnlyRecommendationView.tsx`

### Problem 7 — No visual risk/status differentiation

- Risk level badges ("High", "Medium") use identical gray pill styling regardless of severity
- Status badges ("assigned", "contacted", "scheduled") use identical styling regardless of lifecycle stage
- No risk-colored left borders on cards for quick triage
- The walk-in `RecommendationPanel` uses a full `ClinicalRiskGauge` with color-coded severity; the lead flow has nothing comparable

**Affected:** `ReadOnlyRecommendationView.tsx`, `ExecutiveLeadAssignmentScreen.tsx`, `SalesLeadDevelopmentPanel.tsx`

### Problem 8 — "Pre-runned" is grammatically incorrect

"Runned" is not a standard English past participle. The correct form is "pre-run". This appears in UI labels, section headers, and variable/type names throughout the lead flow.

**Affected:** UI labels in all lead components, fixture labels

---

## Impact

- The executive cannot efficiently manage a growing lead pipeline — assignment and tracking are tangled
- Sales reps have no visual pipeline — they must mentally track which leads are at which stage
- The third-person recommendation text undermines the "AI assistant helping you" narrative
- Missing data (top findings, next actions, confidence) leaves the recommendation display incomplete
- Lack of color coding makes risk triage and status tracking slower than necessary
