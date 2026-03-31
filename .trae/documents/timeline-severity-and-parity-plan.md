# Plan: Timeline severity badges + parity with Trend graphs

## Problem statement
After adding eGFR/BMI/BP into `significant_lab_events`, two issues remain:
1) New timeline rows don’t show **Optimal / Alert / Watch** (severity) because the timeline UI derives severity from `interpretation` / `threshold_crossed`, but the newly-added events currently set those fields to empty.
2) Timeline now shows **more rows than the Trend graphs**, because we added BMI + BP (SBP+DBP) + eGFR, while the Trend panel only graphs a curated subset (and BP is only one graph).

## Current behavior (why it happens)
### Severity logic in UI
In [ClinicalEventTimeline.tsx](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/V6/frontend/src/components/trend-timeline/ClinicalEventTimeline.tsx), lab severity is computed from:
- `item.interpretation` (expects values like `N`, `H`, `L`, etc.)
- `item.threshold_crossed` (expects values like `normal`, `above_high`, `below_low`)

But in backend timeline builder [utils.py](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/V6/backend/src/mcp_server/utils.py), `_append_lab_event()` currently sets:
- `threshold_crossed: ""`
- `interpretation: ""`

So the UI falls back to severity = `info` (badge “—”).

### Parity mismatch
Trend graphs are explicitly constructed in [TrendTimelineScreen.tsx](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/V6/frontend/src/components/trend-timeline/TrendTimelineScreen.tsx) as 6 series:
- FBS, HbA1c, LDL, BMI, BP Systolic, eGFR

Timeline now includes:
- all `labs[]` (includes HDL too)
- eGFR
- BMI
- BP Systolic + BP Diastolic

So timeline will naturally have more entries unless we filter/aggregate.

## Target behavior
1) Timeline should show meaningful severity badges for eGFR/BMI/BP (and ideally for all lab-like events).
2) Timeline should not exceed the Trend panel’s “signal set” unless explicitly desired.

## Proposed solution (recommended)
### A) Add deterministic severity fields in backend timeline events
Update `build_timeline_from_signal_store()` in `backend/src/mcp_server/utils.py` to populate:
- `threshold_crossed` with one of: `normal | above_high | below_low | borderline | unknown`
- `interpretation` with one of: `N | H | L | A | ""`

Rules (simple + deterministic):
- **eGFR**: compare value to 60
  - value >= 60 → `threshold_crossed=normal`, `interpretation=N`
  - value < 60 → `threshold_crossed=below_low`, `interpretation=L`
- **BMI**: compare value to BMI_TARGET (frontend constant is 23-ish Asian adjusted; backend doesn’t currently import it)
  - To avoid cross-layer coupling, define backend BMI thresholds explicitly (e.g. <= 23 normal, > 23 above_high) OR mark BMI as `unknown` severity and rely on UI label.
  - Recommended: use `category` already present in signal store (`Normal`, etc.) to map:
    - category == "Normal" → `N`
    - else → `A` or `H` depending on category
- **Blood pressure**:
  - SBP compare to 120 (or use `category`/`category_label` already present)
  - DBP compare to 80
  - Recommended: use `category`/`category_label` mapping first; fallback to numeric thresholds.

This keeps the UI unchanged and makes severity consistent.

### B) Restore parity by filtering/aggregating timeline lab events
Two viable approaches:

**B1 (Recommended): Filter timeline to the same set as Trend graphs**
- In backend, only emit timeline lab events for:
  - FBS, HbA1c, LDL, BMI, BP (SBP only), eGFR
- Exclude HDL and BP diastolic from timeline.

**B2: Keep all events but group BP into one combined row**
- Emit a single BP event per date with value like `118/74` (string) and unit `mmHg`.
- This requires changing the timeline contract/type because `value` is currently numeric.

Given your note (“timeline now has more data than trends”), B1 is the lowest-risk and keeps the contract stable.

## Implementation steps
1) Update backend timeline builder:
   - Add a small helper to compute `threshold_crossed` + `interpretation` for each added biomarker type.
   - Apply it to eGFR/BMI/BP events.
2) Apply parity rule:
   - Decide between B1 vs B2.
   - If B1: filter out HDL and DBP events (and any other labs not in the 6 trend series).
3) Update/extend tests:
   - Extend `scripts/tests/test_timeline_contract_payload.py` to assert:
     - eGFR events exist for patient id_33cc44dd
     - new events have non-empty `threshold_crossed` and/or `interpretation`
     - timeline lab labels are within the allowed set (if B1 chosen)
4) Frontend verification:
   - Confirm timeline badges show OPTIMAL/ALERT/WATCH for the new rows.
   - Confirm per-date “Points” count aligns with trend series count (or expected filtered count).

## Decision needed from you
Choose parity approach:
- **B1**: Filter timeline to match the 6 trend graphs (recommended)
- **B2**: Keep all labs, but aggregate BP into one row and accept timeline > trends
