# Discovery

Status: Complete (post-GAP-4 follow-up fixes)

## Problem observed

- Trend panel and Clinical Event Timeline could disagree on severity labels for the same metric/value (e.g., eGFR showing WATCH in Trend but OPTIMAL in Timeline).
- Clinical Event Timeline initially expanded all date groups, creating a long scroll and reducing scanability.
- Timeline lab event coverage did not include eGFR/BMI/BP derived from `biomarker_trends`, and lab counts could diverge from the 6 trend graphs.

## Root causes

### Severity mismatch

- Trend graph severity was computed client-side using heuristic comparisons.
- Timeline severity was derived from backend-emitted `interpretation` / `threshold_crossed` fields.
- Backend eGFR logic used a hard-coded threshold (>= 60 => normal) that conflicted with the intended staging thresholds.

### Timeline UX

- Date groups were rendered expanded by default.

## Decisions

### Single source of truth

- Canonical severity rules are defined in JSON:
  - `assets/synthesis/rulesets/metric_severity_rules.json`
- Backend is the single source of truth for severity evaluation:
  - `backend/src/services/metric_severity.py`
- Backend emits severity fields for biomarker trends and timeline events.
- Frontend consumes backend-provided severity for Trend status/alert rendering.

### Timeline parity

- Timeline lab events are filtered to match the 6 trend graphs:
  - FBS, HbA1c, LDL, BMI, BP systolic, eGFR

### Timeline default collapsed

- All date groups start collapsed and expand on click.

## Files updated

Backend:

- `assets/synthesis/rulesets/metric_severity_rules.json`
- `backend/src/services/metric_severity.py`
- `backend/src/mcp_server/utils.py`

Frontend:

- `frontend/src/components/trend-timeline/BiomarkerTrendGrid.tsx`
- `frontend/src/components/trend-timeline/TrendTimelineScreen.tsx`
- `frontend/src/components/trend-timeline/ClinicalEventTimeline.tsx`
- `frontend/src/types/biomarker-trends.ts`
- `frontend/src/types/timeline.ts`
- `frontend/src/components/trend-timeline/ClinicalEventTimeline.test.tsx`

## Verification notes

- Frontend tests and build pass.
- Backend compiles cleanly; run `scripts/tests` in a fully provisioned backend runtime for contract verification.
