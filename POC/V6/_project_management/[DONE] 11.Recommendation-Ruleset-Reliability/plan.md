# Plan — Recommendation Ruleset Reliability

**Date:** 2026-03-30
**Input:** `README.md`
**Approach:** One coordinated reliability pass across bundled assets, runtime ruleset loading, package resolution semantics, API degradation handling, UI degraded-state rendering, and regression coverage.

---

## Approach

This issue should not be fixed with an isolated asset copy or a frontend-only fallback change.

The production symptom (`Unknown Plan`) is downstream of:
- missing V6-local ruleset assets in deployment
- runtime dependence on non-V6 fallback paths
- package resolution logic that does not fully match the current package map schema
- backend normalization that hides package-resolution failure as empty fields
- frontend rendering that treats empty fields as display fallbacks rather than explicit degradation

The implementation should therefore proceed in six stages:
1. bundle the missing V6-local ruleset assets
2. remove hidden runtime/test coupling to `POC/v3` and `doc_outputs`
3. fix age-band package resolution
4. make backend degradation explicit and machine-readable
5. make the dashboard render degraded states intentionally
6. add regression tests around the whole chain

---

## Tasks

### Task 1 — Bundle the missing ruleset artifacts into V6

**Files:**
- `assets/synthesis/rulesets/sample_ruleset_tier_config.json` — create
- `assets/synthesis/rulesets/sample_package_resolution.json` — create
- `assets/README.md` — update
- `scripts/tests/test_ruleset_path_resolution.py` — extend

**Work:**
- Add the tier config and package resolution JSON files to the V6 ruleset bundle.
- Update the asset README so the local V6 artifact set is documented accurately.
- Extend the ruleset path-resolution test so it fails if those files are absent from the V6-local bundle.

**Verification:**
- `python3 -m pytest POC/V6/scripts/tests/test_ruleset_path_resolution.py -q`

---

### Task 2 — Make V6 runtime ruleset loading self-contained

**Files:**
- `backend/src/mcp_server/utils.py`
- `scripts/tests/test_ruleset_path_resolution.py`
- `scripts/tests/test_ruleset_signal_pool_alignment_r8.py`

**Work:**
- Refactor ruleset path resolution so V6-local assets are canonical.
- Remove or tightly constrain fallback reads from `doc_outputs/...` and `POC/v3/...`.
- Update the signal-pool alignment test to use V6-local assets instead of `POC/v3`.

**Verification:**
- `python3 -m pytest POC/V6/scripts/tests/test_ruleset_path_resolution.py -q`
- `python3 -m pytest POC/V6/scripts/tests/test_ruleset_signal_pool_alignment_r8.py -q`

---

### Task 3 — Fix package resolution to match the actual package map schema

**Files:**
- `backend/src/mcp_server/utils.py`
- `scripts/tests/test_package_resolution_contract.py` — create

**Work:**
- Add a dedicated resolver contract test using real age-band examples from the package map.
- Update `resolve_package()` to support:
  - `age_15_to_20`
  - `age_20_to_35`
  - `age_35_to_40`
  - `age_40_plus`
  - `age_any`
- Remove the unsafe “first available key” fallback for unmatched standard-tier ages.

**Verification:**
- `python3 -m pytest POC/V6/scripts/tests/test_package_resolution_contract.py -q`
- `python3 -m pytest POC/V6/scripts/tests/test_ruleset_path_resolution.py -q`

---

### Task 4 — Make package-resolution degradation explicit in the backend contract

**Files:**
- `backend/src/mcp_server/tools/program_ruleset.py`
- `backend/src/api/routes/contracts.py`
- `scripts/tests/test_api_contract_routes.py`

**Work:**
- Add explicit normalized fields for unresolved package states.
- Candidate additions:
  - `resolved_package_status`
  - `metadata.degradation_reasons`
  - forced `review_required = true` when package resolution fails
- Update the contract tests so unresolved packages are treated as degraded responses, not silent successes.

**Verification:**
- `python3 -m pytest POC/V6/scripts/tests/test_api_contract_routes.py -q`

---

### Task 5 — Normalize patient identity resolution across MCP tools

**Files:**
- `backend/src/mcp_server/tools/hard_constraints.py`
- `backend/src/mcp_server/tools/clinical_signals.py`
- `backend/src/mcp_server/tools/biomarker_trends.py`
- `backend/src/mcp_server/tools/program_ruleset.py`
- `backend/src/mcp_server/tools/patient_event_timeline.py`
- `scripts/tests/test_patient_resolution_contract.py` — create

**Work:**
- Add a shared patient token/id resolution helper or equivalent common logic.
- Replace the current broken pattern where MCP tools call `resolve_patient_token(patient_token)` when deriving a patient ID.
- Cover token-only, id-only, and token+id call forms in tests.

**Verification:**
- `python3 -m pytest POC/V6/scripts/tests/test_patient_resolution_contract.py -q`

---

### Task 6 — Replace UI silent fallbacks with an explicit degraded state

**Files:**
- `frontend/src/types/recommendation.ts`
- `frontend/src/components/dashboard/RecommendationPanel.tsx`
- `frontend/src/components/dashboard/RecommendationPanel.test.tsx`

**Work:**
- Extend the frontend response type with the degradation metadata added in Task 4.
- Replace:
  - `Unknown Plan`
  - implicit `฿0`
with an intentional degraded-state render such as:
  - “Package unavailable”
  - “Manual review required”
  - no fake price display when the package is unresolved

**Verification:**
- `cd POC/V6/frontend && npm test -- RecommendationPanel.test.tsx`

---

### Task 7 — Final verification and documentation

**Files:**
- `README.md`
- `_development_summary.md`
- `_latest_test_results.md`

**Work:**
- Record the final implementation summary.
- Capture passing backend/frontend verification results.
- Document any remaining environment blockers if present.

**Verification:**
- `python3 -m pytest POC/V6/scripts/tests/test_ruleset_path_resolution.py POC/V6/scripts/tests/test_ruleset_signal_pool_alignment_r8.py POC/V6/scripts/tests/test_package_resolution_contract.py POC/V6/scripts/tests/test_patient_resolution_contract.py POC/V6/scripts/tests/test_api_contract_routes.py -q`
- `cd POC/V6/frontend && npm test -- RecommendationPanel.test.tsx`

---

## Notes

- During investigation, importing the full contract route locally was blocked by a BAML environment mismatch:
  - generated client version: `0.220.0`
  - installed `baml-py`: `0.213.0`
- That blocker should be resolved or explicitly worked around before claiming full verification success.
