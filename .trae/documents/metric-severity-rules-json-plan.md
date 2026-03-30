# Plan: Centralize severity + graph alert rules in a JSON rules file

## Goal
Create a single JSON data file that governs:
- how each clinical metric determines **normal/borderline/abnormal**
- how the Trend graph decides **alert coloring** and the Status banner label

This removes the current implicit heuristic in `BiomarkerTrendGrid.tsx` ("higher is worse except HDL") and prevents mismatches like eGFR.

## Scope (V6)
Metrics currently shown in Trend panel (6):
- FBS
- HbA1c
- LDL
- BMI
- BP Systolic
- eGFR

Metrics currently present in Signal Store biomarker_trends.labs[] (at least):
- fbs, hba1c, ldl, hdl

We will design the JSON to support both:
- the 6 trend metrics
- any additional lab metrics that may be added later

## Step 1 — Inventory all clinical metrics used by Trend + Timeline
Read and enumerate:
1) Frontend trend series construction in [TrendTimelineScreen.tsx](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/V6/frontend/src/components/trend-timeline/TrendTimelineScreen.tsx)
2) Backend biomarker payload shape in [biomarker-trends.ts](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/V6/frontend/src/types/biomarker-trends.ts)
3) Seed(s) and/or generated signal store records under `assets/synthesis/generated/**/record_*.json` to discover which `lab_id` values exist.

Deliverable: a list of metric identifiers we need rules for (e.g. `egfr`, `bmi`, `bp_systolic`, `fbs`, `hba1c`, `ldl`, `hdl`).

## Step 2 — Define a JSON schema for metric severity rules
Create a JSON file (recommended location: `POC/V6/assets/synthesis/rulesets/metric_severity_rules.json`) with entries like:

```json
{
  "version": "metric_severity_rules_v1",
  "metrics": {
    "egfr": {
      "label": "eGFR",
      "loinc": "62238-1",
      "unit": "mL/min/1.73m2",
      "direction": "low_is_bad",
      "thresholds": {
        "normal_min": 90,
        "borderline_min": 60,
        "abnormal_below": 60
      }
    },
    "bp_systolic": {
      "label": "Systolic Blood Pressure",
      "loinc": "8480-6",
      "unit": "mmHg",
      "direction": "high_is_bad",
      "thresholds": {
        "normal_max": 119,
        "borderline_max": 129,
        "abnormal_above": 129
      }
    }
  }
}
```

Supported rule types (keep minimal but extensible):
- `high_is_bad` (FBS, HbA1c, LDL, BP systolic, BMI)
- `low_is_bad` (eGFR, HDL)
- optional `range_is_good` (future)

Threshold fields will be normalized into 3 buckets:
- normal
- borderline
- abnormal

## Step 3 — Implement rule evaluation in frontend Trend graph
Update Trend graph rendering in [BiomarkerTrendGrid.tsx](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/V6/frontend/src/components/trend-timeline/BiomarkerTrendGrid.tsx) to:
- load the JSON rules (either static import or fetched via API depending on existing patterns)
- for each series, look up its rule by a stable key (e.g. `metric_id`)
- compute severity for each point and for `current`
- drive:
  - dot coloring
  - status banner (Optimal vs Alert vs Watch)

This eliminates the current heuristic and fixes eGFR.

## Step 4 — Align Timeline severity with the same rules (optional but recommended)
Currently timeline severity is derived from `interpretation`/`threshold_crossed`.
We can either:
- keep backend emitting those fields, but compute them using the same JSON rules (backend loads the JSON too)
OR
- keep backend as-is and only fix Trend graph (minimum change)

Recommended: backend loads the same JSON so both panels are consistent.

## Step 5 — Tests
Add/extend frontend tests to assert:
- eGFR=97 with `low_is_bad` and borderline_min=60 is **normal** (no alert)
- HDL uses `low_is_bad`
- BP systolic uses `high_is_bad`

If backend also uses JSON:
- add a backend unit test that loads the rules and asserts emitted `interpretation/threshold_crossed` for eGFR.

## Decisions to confirm (so the JSON is clinically correct)
1) eGFR thresholds: do we want CKD staging (G1 >=90 normal, G2 60–89 borderline, <60 abnormal) or just <60 abnormal?
2) BMI thresholds: use Asian-adjusted cutoffs (Normal 18.5–22.9, Overweight 23–24.9, Obese >=25) or keep current single target?
3) BP systolic: use ACC/AHA (Normal <120, Elevated 120–129, HTN >=130) as above?

Once you confirm these, I’ll encode them into the JSON rules.
