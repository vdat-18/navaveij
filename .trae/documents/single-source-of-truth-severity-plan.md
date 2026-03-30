# Plan: Single source of truth for metric severity (Trend + Timeline)

## Problem
Trend severity is governed by frontend JSON rules (`frontend/src/data/metric_severity_rules.json`).
Timeline severity is governed by backend hard-coded thresholds (e.g., eGFR >= 60 ⇒ normal), which conflicts with the JSON (eGFR normal_min=90, borderline_min=60).

## Goal
Ensure Trend and Timeline use the **same severity rules** and cannot drift.

## Recommended approach (SSOT): Backend owns severity evaluation using the JSON rules
Make the backend the single source of truth for severity classification and emit normalized fields that both panels consume.

### Why backend SSOT is best here
- Timeline already depends on backend-emitted `interpretation` / `threshold_crossed`.
- Centralizing in backend prevents multiple clients (web, report export, future mobile) from re-implementing clinical logic.
- Backend can version and validate the ruleset.

## Design
### 1) Canonical rules file location
Move/standardize the rules file to a backend-owned canonical path, e.g.:
- `POC/V6/assets/synthesis/rulesets/metric_severity_rules.json`

Backend loads this file and exposes it (optional) via an endpoint for UI transparency.

Frontend should stop maintaining its own copy and instead:
- either fetch from backend endpoint, or
- import a generated/packaged copy that is produced from the canonical backend file during build.

### 2) Backend: implement a shared severity evaluator
Add a small evaluator in backend (e.g. `backend/src/services/metric_severity.py` or inside `mcp_server/utils.py` if we keep it local) that:
- loads the JSON once (with caching keyed by mtime)
- given `(metric_id, value)` returns:
  - `severity`: `normal | borderline | abnormal | unknown`
  - `interpretation`: `N | A | H | L | ""`
  - `threshold_crossed`: `normal | borderline | above_high | below_low | ""`

Mapping rules:
- `high_is_bad`:
  - value <= normal_max ⇒ normal (N, normal)
  - value <= borderline_max ⇒ borderline (A, borderline)
  - else ⇒ abnormal (H, above_high)
- `low_is_bad`:
  - value >= normal_min ⇒ normal (N, normal)
  - value >= borderline_min ⇒ borderline (A, borderline)
  - else ⇒ abnormal (L, below_low)

### 3) Backend: use evaluator everywhere we emit severity
Update `build_timeline_from_signal_store()` to compute eGFR/BMI/BP severity via evaluator instead of hard-coded thresholds.

Optionally also normalize `labs[]` events:
- If `lab_id` exists and is in rules, override/augment `interpretation` and `threshold_crossed` deterministically.

### 4) Frontend: consume backend severity consistently
Two options:

**Option A (minimal UI change):**
- Keep Trend graph computing severity client-side, but fetch the rules JSON from backend endpoint.
- Risk: still two evaluators (FE + BE), though same rules.

**Option B (true SSOT, recommended):**
- Backend returns severity per point in biomarker trends payload (or a parallel structure), so Trend graph does not evaluate thresholds at all.
- Trend graph uses `severity` to color dots and banner.

Given current contracts, Option B requires extending the biomarker trends API response to include per-point severity or at least `current_severity` + `history_severity[]`.

## Implementation steps
1) Canonicalize rules file location (choose backend-owned path as canonical).
2) Implement backend rules loader + evaluator with caching.
3) Update timeline builder to use evaluator for eGFR/BMI/BP (and optionally labs).
4) Update biomarker trends endpoint to include severity for trend series (if Option B).
5) Update frontend Trend graph to use backend-provided severity (Option B) OR fetch rules from backend (Option A).
6) Add tests:
   - Backend unit tests for evaluator (eGFR 64 ⇒ borderline; 97 ⇒ normal)
   - Contract tests ensuring timeline and trend agree for eGFR
   - Frontend tests verifying eGFR 64 renders WATCH when backend says borderline

## Verification checklist
- For the same patient/date/value, Trend and Timeline show the same label (OPTIMAL/WATCH/ALERT).
- No hard-coded thresholds remain in backend timeline builder.
- Ruleset version is logged/returned for traceability.

## Decision points
1) Do you want **true SSOT** (Option B: backend returns severity in biomarker trends payload), or is “same JSON rules in both places” acceptable (Option A)?
2) Should we keep the rules file in `assets/synthesis/rulesets/` as canonical, or move it under `backend/src/resources/`?
