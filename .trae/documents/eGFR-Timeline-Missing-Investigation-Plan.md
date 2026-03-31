# Investigation Plan: eGFR Missing from Clinical Event Timeline

## Problem Summary
Patient "Boon-Mee Siriwat (Healthy Routine Checkup) • id_33cc44dd" shows:
- **Trend Panel**: 6 graphs (FBS, HbA1c, LDL, BMI, BP Systolic, **eGFR**)
- **Clinical Event Timeline**: Only 4 test results per date (missing eGFR)

## Root Cause Analysis

### Data Flow Architecture

```
Signal Store Record (JSON)
    └── biomarker_trends
            ├── labs[]        ← Timeline uses THIS only
            │     ├── fbs
            │     ├── hba1c
            │     ├── ldl
            │     └── hdl
            ├── egfr{}        ← Timeline MISSES this (separate key)
            ├── bmi{}
            └── blood_pressure{}
```

### Source Code Evidence

1. **Trend Panel** ([TrendTimelineScreen.tsx:78-145](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/V6/frontend/src/components/trend-timeline/TrendTimelineScreen.tsx#L78-L145))
   - Explicitly constructs 6 `BiomarkerSeries`:
     - FBS, HbA1c, LDL from `biomarkers.labs[]`
     - BMI from `biomarkers.bmi`
     - BP Systolic from `biomarkers.blood_pressure`
     - **eGFR from `biomarkers.egfr`** (line 83)

2. **Timeline Panel** ([utils.py:533-554](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/V6/backend/src/mcp_server/utils.py#L533-L554))
   - `build_timeline_from_signal_store()` only iterates `biomarker_trends.get("labs", [])`
   - **Does NOT include `egfr`** which is stored as a separate top-level key

3. **Signal Store Data** ([healthy_routine_checkup_seed.json:178-193](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/V6/assets/synthesis/seeds/healthy_routine_checkup_seed.json#L178-L193))
   - `biomarker_trends.egfr` exists with `loinc_code: "62238-1"` and history
   - But it's NOT inside `biomarker_trends.labs[]` array

## Why 6 Graphs but Only 4 Timeline Events?

| Metric | Trend Panel Source | Timeline Source | Appears in Timeline? |
|--------|-------------------|-----------------|---------------------|
| FBS | `labs[]` | `labs[]` | Yes |
| HbA1c | `labs[]` | `labs[]` | Yes |
| LDL | `labs[]` | `labs[]` | Yes |
| HDL | `labs[]` | `labs[]` | Yes (but not shown in Trend Panel) |
| BMI | `bmi{}` | Not processed | **No** |
| BP Systolic | `blood_pressure{}` | Not processed | **No** |
| **eGFR** | `egfr{}` | Not processed | **No** |

## Solution Options

### Option A: Add eGFR to Timeline in `build_timeline_from_signal_store()`
**File**: `backend/src/mcp_server/utils.py`
- After processing `labs[]`, also process `egfr` section
- Add eGFR history entries to `significant_lab_events`
- Pros: Minimal change, targeted fix
- Cons: BMI and BP still won't appear in timeline

### Option B: Process All Biomarker Trend Sections
**File**: `backend/src/mcp_server/utils.py`
- Process `egfr`, `bmi`, and `blood_pressure` in addition to `labs[]`
- Pros: Complete parity with Trend Panel
- Cons: More changes, need to handle BP's dual-value (sbp/dbp) format

### Option C: Restructure Signal Store (Not Recommended)
- Move eGFR into `labs[]` array
- Pros: Data model consistency
- Cons: Breaking change, affects other consumers

## Recommended Approach: Option A (Targeted Fix)

Add eGFR processing to `build_timeline_from_signal_store()` in `utils.py`:

```python
# After labs processing (around line 554), add:

# Process eGFR (stored separately from labs array)
egfr_data = biomarker_trends.get("egfr", {})
egfr_history = egfr_data.get("history", [])
for entry in egfr_history:
    date = entry.get("date", computed_at[:10])
    dates.append(date)
    significant_lab_events.append({
        "event_id": f"lab-{lab_counter:03d}",
        "date": date,
        "loinc_code": egfr_data.get("loinc_code", "62238-1"),
        "label": "eGFR",
        "value": entry.get("value"),
        "unit": egfr_data.get("unit", "mL/min/1.73m2"),
        "interpretation": "",
        "interpretation_label": egfr_data.get("ckd_stage_label", ""),
        "threshold_crossed": "",
        "normal_range": "",
    })
    lab_counter += 1
```

## Files to Modify

| File | Change |
|------|--------|
| `backend/src/mcp_server/utils.py` | Add eGFR processing in `build_timeline_from_signal_store()` |

## Verification Steps

1. Run backend unit tests: `pytest backend/tests/`
2. Load patient id_33cc44dd in UI
3. Verify Clinical Event Timeline now shows eGFR test results
4. Verify all 6 biomarkers have corresponding timeline entries

## Open Questions for User

1. Should BMI and BP also appear in the Clinical Event Timeline? (Currently both are missing)
2. Should we add a category field to distinguish "lab" vs "vital sign" events?
