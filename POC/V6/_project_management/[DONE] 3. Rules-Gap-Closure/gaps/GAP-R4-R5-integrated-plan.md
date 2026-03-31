# Integrated Plan — GAP-R4 + GAP-R5

**Date:** 2026-03-19  
**Status:** Planned  
**Order:** GAP-R4 and GAP-R5 in one execution wave (R4 validator first, R5 completeness in parallel-safe sequence)

---

## 1. Objectives

### GAP-R4 — Post-BAML Validation Rules
- Enforce framework rules V2, V7, V9, V10 after AI Stage-1 output is available.
- Trigger graceful degradation path when validation fails.

### GAP-R5 — Stage-2 Completeness
- Ensure Stage-2 response always includes:
  - `patient_high_alert.critical_signals[]`
  - `patient_high_alert.missing_data_alerts[]`
  - `metadata.template_version`
  - `metadata.latency_ms`

---

## 2. Dependency and Sequencing

1. **Prerequisite:** GAP-R3 must be in place (requires `item_id` and `price_thb` availability).
2. Implement **R4 validator core first** so failure handling contract is explicit.
3. Implement **R5 response completeness** immediately after, using existing stage assembler paths.
4. Add/adjust tests for both gaps in one pass to minimize fixture churn.

---

## 3. Implementation Scope

### 3.1 GAP-R4 — Validator Engine

**Primary implementation file options**
- Option A: keep validator in `backend/src/api/routes/contracts.py`
- Option B: create `backend/src/services/validator.py` and call from contracts route

**Selected approach**
- Start in `contracts.py` for minimal moving parts and direct access to normalization context.

**Rules to enforce**
- **V2:** every `item_id` in `ai_output.add_ons[]` exists in `ruleset.add_on_library`.
- **V7:** every `supporting_signals[]` entry exists in `clinical_signals.applicable_signals`.
- **V9:** if `clinical_signals.signals_fired[]` is non-empty, `add_ons[]` must be non-empty.
- **V10:** each add-on `price_thb` must match ruleset value or be null.

**Failure behavior**
- Emit structured validation failure info in logs/context.
- Route should invoke existing graceful degradation behavior without changing API contract shape.

---

### 3.2 GAP-R5 — Stage-2 Completeness

**Primary files**
- `backend/src/api/routes/contracts.py` (`_normalize_stage2`)
- `backend/src/services/workflows/clinical.py` (if latency capture threading is needed)

**Required response guarantees**
- `patient_high_alert.critical_signals[]` derived from high/critical risk flags.
- `patient_high_alert.missing_data_alerts[]` derived from `missing_signals[]`.
- `metadata.template_version` present and non-null.
- `metadata.latency_ms` present and non-null.

**Implementation note**
- Current code already contains partial structures; this gap ensures full framework semantics and non-null guarantees under all paths (AI, rule-based fallback, validation-triggered degradation).

---

## 4. Affected Files Matrix

- `POC/v2/backend/src/api/routes/contracts.py`
  - add R4 validation function(s)
  - enforce failover trigger logic
  - guarantee R5 fields in `_normalize_stage2`
- `POC/v2/backend/src/services/workflows/clinical.py`
  - confirm/propagate latency timing source into route normalization path
- `POC/v2/scripts/tests/test_api_contract_routes.py`
  - add/adjust R4 and R5 assertions
- Optional:
  - `POC/v2/scripts/tests/test_gap9_verification_pack.py` (if matrix expectations need extension)

---

## 5. Test Strategy

### GAP-R4 tests
1. Invalid `item_id` in AI add-ons causes validator failure and graceful degradation output.
2. Invalid `supporting_signals` reference causes validator failure.
3. Non-empty `signals_fired` with empty add-ons causes validator failure.
4. Invented `price_thb` mismatch causes validator failure.

### GAP-R5 tests
1. `/api/recommend` payload includes non-empty `patient_high_alert` structure for high-risk fixture.
2. `metadata.template_version` and `metadata.latency_ms` are non-null across AI and fallback paths.

---

## 6. Verification Commands

1. Syntax/compile safety:
   - `python3 -m py_compile backend/src/api/routes/contracts.py backend/src/services/workflows/clinical.py scripts/tests/test_api_contract_routes.py`
2. Targeted tests:
   - `PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 python3 -m pytest scripts/tests/test_api_contract_routes.py -k "gap_r4 or gap_r5 or recommend_contract_route" -v`
3. Optional broader regression:
   - `PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 python3 -m pytest scripts/tests -k "contract or gap9" -v`

Record outcomes in:
- `gaps/GAP-R4-validation-rules/_lastest_test_results.md`
- `gaps/GAP-R5-stage2-completeness/_lastest_test_results.md`

---

## 7. Risks and Mitigations

1. **Risk:** Validator incorrectly flags legacy-compatible payloads.  
   **Mitigation:** Normalize keys before rule checks and include clear test fixtures for new and fallback formats.

2. **Risk:** Graceful degradation trigger path changes recommendation source semantics.  
   **Mitigation:** Preserve existing response fields and source labeling contracts in assertions.

3. **Risk:** Metadata nullability regressions in fallback path.  
   **Mitigation:** Add path-specific tests and apply defaults in `_normalize_stage2`.

4. **Risk:** Runtime dependency blockers prevent pytest evidence.  
   **Mitigation:** run `py_compile` + diagnostics and document blockers explicitly in gap artifacts.

---

## 8. Definition of Done

GAP-R4 + GAP-R5 are complete when:

- V2/V7/V9/V10 checks are enforced post-BAML with deterministic failure behavior.
- Validation failures trigger graceful degradation without response contract breakage.
- Stage-2 output always includes framework-required `patient_high_alert` and metadata fields.
- Targeted tests pass, or environment blockers are clearly documented with compile/diagnostic evidence.
