# Plan: Fix eGFR severity mismatch (Timeline shows OPTIMAL but Trend shows Alert)

## What you’re seeing
Timeline row:
- `Lab eGFR OPTIMAL 97 mL/min/1.73m2 (N)`

Trend graph:
- eGFR graph shows an alert state (red)

## Why it’s showing OPTIMAL (root cause)
No, the UI is not hard-coding “OPTIMAL” for eGFR specifically.

The timeline badge is derived from generic lab severity logic in [ClinicalEventTimeline.tsx](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/V6/frontend/src/components/trend-timeline/ClinicalEventTimeline.tsx):
- If `interpretation === "N"` OR `threshold_crossed === "normal"` → severity = `normal` → badge label **OPTIMAL**.

We recently added deterministic fields for eGFR in the backend timeline builder [utils.py](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/V6/backend/src/mcp_server/utils.py):
- `if value >= 60: threshold_crossed = "normal"; interpretation = "N"`

So for eGFR=97, the backend explicitly marks it as normal, and the timeline UI correctly renders OPTIMAL.

## Why this conflicts with the Trend graph
The Trend graph’s “Alert” is currently driven by a simplistic frontend rule in [BiomarkerTrendGrid.tsx](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/V6/frontend/src/components/trend-timeline/BiomarkerTrendGrid.tsx):
- It assumes **higher-than-reference is abnormal** for most metrics.
- For eGFR, the reference is set to `60` in [TrendTimelineScreen.tsx](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/V6/frontend/src/components/trend-timeline/TrendTimelineScreen.tsx#L136-L144).
- Therefore eGFR=97 is incorrectly treated as “> 60 ⇒ abnormal”, and the graph shows an alert.

So the bug is actually in the Trend graph abnormality direction logic, not in the timeline.

## Correct clinical interpretation (for this app)
Given the app’s own reference of 60 for eGFR:
- **Below 60** should be abnormal/alert.
- **Above/equal 60** should be normal/optimal.

## Fix strategy (recommended)
### Step 1 — Make abnormality direction explicit per biomarker series
Update the `BiomarkerSeries` model (frontend type) to include something like:
- `abnormality_direction: "high" | "low" | "range"`

Then set it in `TrendTimelineScreen.tsx` when building the 6 series:
- eGFR: `abnormality_direction = "low"`
- BP Systolic: `abnormality_direction = "high"`
- BMI: `abnormality_direction = "high"` (or range, depending on desired behavior)
- FBS/HbA1c/LDL: `abnormality_direction = "high"`

Update `BiomarkerTrendGrid.tsx` to use this field instead of the current heuristic.

### Step 2 — Align the status banner and dot coloring with the same rule
Currently the banner uses `current <= reference` as “Optimal” for most metrics, which is also wrong for eGFR.
Once `abnormality_direction` exists, use it for:
- last-dot color
- status banner (Optimal vs Alert)

### Step 3 — Add a focused unit test
Add/extend a test for `BiomarkerTrendGrid` or `TrendTimelineScreen` to assert:
- eGFR with reference 60 and value 97 is NOT flagged abnormal when direction is `low`.

## Verification checklist
- Trend graph for eGFR=97 no longer shows alert.
- Timeline eGFR remains OPTIMAL.
- BP and other “high-is-bad” metrics still show alert when above reference.

## Notes on “hard-coding”
- Timeline: severity labels are generic mappings (normal→OPTIMAL, abnormal→ALERT, borderline→WATCH). Not eGFR-specific.
- Trend graph: currently uses a hard-coded heuristic (“higher is worse except HDL”), which is the real source of the mismatch.
