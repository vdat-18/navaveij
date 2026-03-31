# Development Summary — Recommendation Ruleset Reliability

**Workstream:** 11
**Date:** 2026-03-30
**State:** Implementation complete, verification pending final checkpoint

---

## Summary

The implementation was completed in one coordinated pass across:
- V6-local ruleset bundling
- backend ruleset path canonicalization
- package age-band resolution
- MCP patient token/id normalization
- degraded package-resolution signaling in the contract API
- explicit degraded-state rendering in the dashboard
- backend and frontend regression coverage

---

## Work Completed

### Phase 1 — V6 ruleset bundle

- Added `assets/synthesis/rulesets/sample_ruleset_tier_config.json`
- Added `assets/synthesis/rulesets/sample_package_resolution.json`
- Updated `assets/README.md` so V6 documents the full local ruleset bundle

### Phase 2 — Backend canonicalization

- Removed cross-version fallback for tier config and package resolution in `backend/src/mcp_server/utils.py`
- Updated `test_ruleset_signal_pool_alignment_r8.py` to read from V6-local assets instead of `POC/v3`

### Phase 3 — Resolver correctness

- Fixed `resolve_package()` to support the package map’s actual age-band keys:
  - `age_15_to_20`
  - `age_20_to_35`
  - `age_35_to_40`
  - `age_40_plus`
  - `age_any`
- Removed the unsafe “first available band” fallback for unmatched standard-tier ages

### Phase 4 — MCP patient identity normalization

- Added `resolve_patient_identity()` in `backend/src/mcp_server/utils.py`
- Updated all MCP tools to resolve canonical `patient_token` / `patient_id` before Signal Store access

### Phase 5 — API degraded-state signaling

- Added `resolved_package_status` to the normalized recommendation response
- Added `metadata.degradation_reasons`
- Forced `review_required = true` when package resolution is unresolved

### Phase 6 — Prompt template path correction

- Fixed `backend/src/services/prompt_selector.py` to resolve prompts from the V6-local `baml_src/prompts/` directory instead of the parent `POC/` directory
- Added a regression test so prompt loading remains stable in the V6 test environment

### Phase 7 — Dashboard degraded-state rendering

- Extended the frontend recommendation type with `resolved_package_status`
- Replaced implicit `Unknown Plan` / `฿0` fallback behavior with:
  - `Package unavailable`
  - `Manual review required`
  - pricing-suppressed final settlement state when package resolution is unresolved

---

## Tests Added or Strengthened

- `scripts/tests/test_ruleset_path_resolution.py`
- `scripts/tests/test_package_resolution_contract.py`
- `scripts/tests/test_patient_resolution_contract.py`
- `scripts/tests/test_prompt_selector_paths.py`
- `scripts/tests/test_ruleset_signal_pool_alignment_r8.py`
- `scripts/tests/test_api_contract_routes.py`
- `frontend/src/components/dashboard/RecommendationPanel.test.tsx`
