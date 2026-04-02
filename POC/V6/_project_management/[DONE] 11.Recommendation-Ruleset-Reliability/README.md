# README — Recommendation Ruleset Reliability

**Date:** 2026-03-30
**Status:** Implementation complete — 40 backend / 19 frontend tests passing
**Scope:** Backend ruleset loading, package resolution, response normalization, dashboard degraded-state UX, regression coverage

---

## Context

The V6 dashboard recommendation flow depends on three ruleset artifacts:
- `sample_ruleset_tier_config.json`
- `sample_package_resolution.json`
- `sample_add_on_items.json`

The frontend calls the contract API at `/api/recommend`, which:
1. resolves the patient by `patient_token`
2. loads Signal Store data and Ruleset Store data
3. generates or falls back to a recommendation
4. normalizes the result into the dashboard contract

The dashboard then renders the resolved package name and price from `resolved_package`.

Relevant codepaths:
- `backend/src/api/routes/contracts.py`
- `backend/src/mcp_server/tools/program_ruleset.py`
- `backend/src/mcp_server/utils.py`
- `frontend/src/components/dashboard/RecommendationPanel.tsx`

---

## Issue

The backend logs show missing ruleset artifacts in production:

```text
Ruleset tier config not found: /home/ec2-user/navavej-backend/assets/synthesis/rulesets/sample_ruleset_tier_config.json
Package resolution map not found: /home/ec2-user/navavej-backend/assets/synthesis/rulesets/sample_package_resolution.json
```

That failure propagates into the dashboard as:
- empty `resolved_package`
- missing package name
- missing package price
- frontend fallback to `Unknown Plan`

This is not a frontend-only problem. The investigation found a broader reliability issue:

1. **V6 is not self-contained**
   - `POC/V6/assets/README.md` only documents `sample_add_on_items.json` and `sample_promotions.json`.
   - The tier config and package resolution files are absent from the V6 asset bundle.
   - Runtime path resolution falls back to `doc_outputs/...` or `POC/v3/...`, which masks the problem locally but fails in production packaging.

2. **Package resolution logic is partially incompatible with the shipped JSON schema**
   - `resolve_package()` does not correctly match the package map’s standard-tier age bands such as `age_20_to_35` and `age_35_to_40`.
   - For standard-tier adults it can silently fall back to the first available age band, which returns the wrong package even when the JSON file exists.

3. **Backend degradation is too implicit**
   - Missing ruleset artifacts normalize to empty structures instead of an explicit degraded package-resolution state.
   - The UI is forced to infer failure from missing fields and currently renders `Unknown Plan` and `฿0`.

4. **Hidden cross-version coupling exists in runtime and tests**
   - V6 runtime loader searches outside V6.
   - At least one V6 ruleset test reads directly from `POC/v3`.

5. **There is adjacent patient identity resolution debt**
   - Multiple MCP tools call `resolve_patient_token(patient_token)` where patient ID resolution is intended.
   - This is not the logged production root cause, but it is a neighboring reliability defect that should be fixed in the same pass.

---

## Solution Strategy

Apply one coordinated fix rather than patching symptoms:

1. **Make V6 rulesets deployable on their own**
   - Add the missing tier config and package map into `POC/V6/assets/synthesis/rulesets/`
   - Update docs and tests so V6 treats those files as required local assets

2. **Make runtime resolution V6-canonical**
   - Remove or sharply constrain cross-version fallback paths in `backend/src/mcp_server/utils.py`
   - Stop depending on `POC/v3` and `doc_outputs` for normal V6 operation

3. **Fix package selection semantics**
   - Update `resolve_package()` to correctly support the actual age-band keys used by the package map
   - Eliminate silent fallback to the first key for unmatched standard-tier ages

4. **Expose degraded package resolution explicitly**
   - Extend the normalized API response with machine-readable package-resolution status and degradation reasons
   - Mark unresolved packages as review-required

5. **Render degraded states intentionally in the UI**
   - Replace `Unknown Plan` / `฿0` fallback behavior with an explicit “package unavailable / manual review required” state

6. **Lock the whole flow down with regression coverage**
   - backend asset-bundle tests
   - package-resolution contract tests
   - patient token/id resolution tests
   - API contract tests for degraded package resolution
   - frontend rendering tests for unresolved packages

---

## Key Findings

### Finding 1 — V6 asset bundle is incomplete
- Evidence: `POC/V6/assets/README.md`
- Impact: production backend cannot load ruleset tier config or package map unless non-V6 files happen to exist

### Finding 2 — The frontend symptom is a downstream fallback
- Evidence: `frontend/src/components/dashboard/RecommendationPanel.tsx`
- Rendering path:
  - package label: `resolved_package?.name || resolved_package?.package_name || "Unknown Plan"`
  - billing value: `resolved_package?.price_thb ?? 0`

### Finding 3 — Standard-tier package resolution is wrong for adults
- Evidence: direct invocation of `resolve_package()` against the current package map
- Example observed during investigation:
  - `("Standard", "male", 25)` resolved to `Basic`
  - expected: `Gold`

### Finding 4 — V6 tests currently hide the boundary problem
- Evidence: `scripts/tests/test_ruleset_signal_pool_alignment_r8.py`
- The test reads the ruleset from `POC/v3/assets/...` instead of V6-local assets

### Finding 5 — Full route import is locally blocked by environment drift
- Evidence from investigation:
  - generated BAML client: `0.220.0`
  - installed `baml-py`: `0.213.0`
- This is an environment issue, not the production root cause, but it needs to be accounted for in verification.

---

## Files Most Likely To Change

- `POC/V6/assets/synthesis/rulesets/sample_ruleset_tier_config.json`
- `POC/V6/assets/synthesis/rulesets/sample_package_resolution.json`
- `POC/V6/assets/README.md`
- `POC/V6/backend/src/mcp_server/utils.py`
- `POC/V6/backend/src/mcp_server/tools/program_ruleset.py`
- `POC/V6/backend/src/mcp_server/tools/hard_constraints.py`
- `POC/V6/backend/src/mcp_server/tools/clinical_signals.py`
- `POC/V6/backend/src/mcp_server/tools/biomarker_trends.py`
- `POC/V6/backend/src/mcp_server/tools/patient_event_timeline.py`
- `POC/V6/backend/src/api/routes/contracts.py`
- `POC/V6/frontend/src/types/recommendation.ts`
- `POC/V6/frontend/src/components/dashboard/RecommendationPanel.tsx`
- `POC/V6/scripts/tests/test_ruleset_path_resolution.py`
- `POC/V6/scripts/tests/test_ruleset_signal_pool_alignment_r8.py`
- `POC/V6/scripts/tests/test_api_contract_routes.py`

---

## Out of Scope

- redesigning recommendation policy or clinical rules themselves
- changing the high-level recommendation architecture
- migrating to a new ruleset storage model
- changing unrelated dashboard UX outside degraded package handling
