# GAP-R1 Implementation Plan — Confidence Calibrator Correction

**Date:** 2026-03-19  
**Status:** Planned  
**Scope:** `POC/v2/backend/src/api/routes/contracts.py` (`_normalize_stage2`) + focused tests in `POC/v2/scripts/tests/test_api_contract_routes.py`

---

## 1. Objective

Bring confidence calibration in POC v2 into exact alignment with the framework formula defined in `doc_outputs/onboarding/ai-team-onboarding.md` §8:

- `confidence_score = 0.4*signal_coverage + 0.4*data_completeness + 0.2*rule_agreement`
- `signal_coverage = signals_with_data / total_expected_signals`
- `data_completeness = required_fields_present / total_required_fields`
- `rule_agreement = 1.0` when `ai_tier == rule_preliminary_tier`, else `0.0`
- confidence tier thresholds unchanged (High ≥ 0.75, Medium ≥ 0.50, Low < 0.50)

---

## 2. Current Gaps to Close

From current `contracts.py` implementation:

1. `rule_agreement` uses `0.7` on mismatch (must be `0.0`).
2. `signal_coverage` uses fired-signal density (`signals_fired/applicable_signals`) instead of data-availability ratio.
3. `data_completeness` uses signal-count ratio (`signals_fired/(signals_fired+missing_signals)`) instead of required-field presence ratio.
4. Existing tests do not assert framework-level formula behavior or numeric expectations for mismatch scenarios.

---

## 3. Design Decisions for GAP-R1

### 3.1 Formula Inputs

- **signals_with_data**
  - Derive from `clinical_signals` signal IDs that have data presence in either:
    - `signals_fired`, or
    - explicitly available clinical payload references if present in the stage context.
  - Initial implementation anchor: use de-duplicated union of data-backed signal IDs already passed in stage output context.

- **total_expected_signals**
  - Primary source: `clinical_signals.applicable_signals`.
  - Fallback guard: denominator floor of `1` to prevent division-by-zero.

- **required_fields_present / total_required_fields**
  - Define a deterministic required field set for Stage 2 computation context:
    - `ai_recommended_tier`
    - `add_ons`
    - `communication_script`
    - `clinical_signals`
    - `reasoning_trace`
  - Count present fields by non-null existence (and non-empty object/list where applicable).
  - Keep this set local and explicit in `_normalize_stage2` to avoid hidden coupling.

### 3.2 Non-Goals in This Gap

- No changes to BAML schema (handled in GAP-R3).
- No graceful-degradation behavior changes (handled in GAP-R6).
- No audit payload expansion (handled in GAP-R7).

---

## 4. Implementation Steps

### Step 1 — Refactor confidence component calculations in `contracts.py`

- Replace current `signal_coverage`, `data_completeness`, and `rule_agreement` calculations.
- Keep confidence weights and tier thresholds unchanged.
- Keep output contract fields unchanged (`confidence_score`, `confidence_tier`) to preserve API compatibility.

**Exit check:** Code paths compile and `/api/recommend` contract shape remains unchanged.

### Step 2 — Add focused unit/route tests for formula correctness

Add/extend tests in `scripts/tests/test_api_contract_routes.py`:

- **Tier mismatch penalty test**
  - Given `ai_tier != rule_preliminary_tier`, assert `rule_agreement` effect yields `confidence_score <= 0.60` for controlled fixture.
- **Signal coverage semantics test**
  - Construct fixture where fired density and data-availability semantics differ; assert computed score follows framework denominator (`total_expected_signals`).
- **Data completeness semantics test**
  - Missing required Stage 2 fields should reduce completeness independently of fired-signal count.

**Exit check:** Tests fail before fix and pass after fix.

### Step 3 — Regression verification

- Run targeted tests for contracts route behavior to ensure no backward-compat break.
- Validate confidence tier still maps correctly across boundary values.

**Exit check:** Existing contract tests continue to pass with new formula logic.

---

## 5. Verification Plan

1. Run targeted contract suite:
   - `python3 -m pytest scripts/tests/test_api_contract_routes.py -k "confidence or recommend_contract_route"`
2. If environment supports full run:
   - `python3 -m pytest scripts/tests/test_api_contract_routes.py`
3. Record evidence in:
   - `_development_summary.md`
   - `_lastest_test_results.md`

Acceptance criteria for GAP-R1 closure:

- `rule_agreement` mismatch contributes `0.0`.
- `signal_coverage` uses expected-signal denominator semantics.
- `data_completeness` uses required-field presence semantics.
- At least one explicit test proves mismatch case score is capped per plan intent.

---

## 6. Risks and Mitigations

1. **Risk:** New completeness definition may change many fixtures unexpectedly.  
   **Mitigation:** Keep required field set minimal, explicit, and documented in test fixtures.

2. **Risk:** Ambiguity in `signals_with_data` source for edge cases.  
   **Mitigation:** Use deterministic in-context signal sources only; add fallback guards and explicit test coverage.

3. **Risk:** Confidence tier distribution shifts for existing scenarios.  
   **Mitigation:** Add boundary tests and preserve threshold constants.

---

## 7. Definition of Done (GAP-R1)

GAP-R1 is complete when:

- `_normalize_stage2()` formula components match framework definitions.
- New tests verify mismatch penalty and component semantics.
- Targeted regression passes and evidence is documented in the GAP-R1 checkpoint files.
