# Discovery — Recommendation Ruleset Reliability

**Date:** 2026-03-30
**Investigator:** Codex
**Trigger:** UI shows `Unknown Plan` for recommendations in production, with backend logs reporting missing ruleset files

---

## Investigation Trigger

Reported production symptom:
- dashboard recommendation card displays `Unknown Plan`

Observed backend logs:

```text
Retrieving program ruleset for patient_token: tok_hmac_1a2b3c4d
Ruleset tier config not found: /home/ec2-user/navavej-backend/assets/synthesis/rulesets/sample_ruleset_tier_config.json
Package resolution map not found: /home/ec2-user/navavej-backend/assets/synthesis/rulesets/sample_package_resolution.json
```

---

## Files Audited

| File | Finding |
|---|---|
| `doc_outputs/onboarding/ai-team-onboarding.md` | Confirms package resolution is backend-owned and query-time ruleset data is required |
| `POC/V6/assets/README.md` | V6 asset bundle documentation is incomplete; tier config and package map absent |
| `POC/V6/backend/src/mcp_server/utils.py` | Runtime ruleset loader falls back to `doc_outputs` and `POC/v3`; resolver age-band logic is incomplete |
| `POC/V6/backend/src/mcp_server/tools/program_ruleset.py` | Empty `resolved_package` is returned when package map is unavailable |
| `POC/V6/backend/src/api/routes/contracts.py` | Contract route normalizes `resolved_package` without explicit unresolved-state handling |
| `POC/V6/frontend/src/components/dashboard/RecommendationPanel.tsx` | UI falls back to `Unknown Plan` and implicitly to `฿0` |
| `POC/V6/scripts/tests/test_ruleset_path_resolution.py` | Existing coverage verifies data can load, but not that it loads from V6-local assets |
| `POC/V6/scripts/tests/test_ruleset_signal_pool_alignment_r8.py` | Reads ruleset from `POC/v3`, masking the V6 bundle boundary |
| `POC/V6/backend/src/mcp_server/tools/hard_constraints.py` | Uses broken patient token/id resolution pattern |
| `POC/V6/backend/src/mcp_server/tools/clinical_signals.py` | Uses broken patient token/id resolution pattern |
| `POC/V6/backend/src/mcp_server/tools/biomarker_trends.py` | Uses broken patient token/id resolution pattern |
| `POC/V6/backend/src/mcp_server/tools/patient_event_timeline.py` | Uses broken patient token/id resolution pattern |

---

## Root Cause

### Root Cause 1 — V6 production artifact is incomplete

The deployed V6 backend expects these files under `assets/synthesis/rulesets/`:
- `sample_ruleset_tier_config.json`
- `sample_package_resolution.json`

Those files are not present in the current V6 asset bundle. Local development often still works because `backend/src/mcp_server/utils.py` falls back to:
- `doc_outputs/architecture/AI/Recommendation Engine/v3/samples/...`
- `POC/v3/assets/synthesis/rulesets/...`

Production does not have those fallback paths, so the loader returns:
- empty `tier_selection_rules`
- empty `package_resolution_map`
- empty `resolved_package`

### Root Cause 2 — Package resolution logic is partially wrong even when data exists

Direct resolver checks during investigation showed:
- `("Standard", "male", 25)` resolved to `Basic`
- `("Standard", "male", 38)` resolved to `Basic`
- `("Standard", "female", 25)` resolved to `Basic`

Expected outcomes from the current package map are:
- age 25 -> `Gold`
- age 38 male -> `Platinum - Men`
- age 25 female -> `Gold`

This happens because `resolve_package()` does not correctly match standard-tier age-band keys such as `age_20_to_35` and `age_35_to_40`.

### Root Cause 3 — Degradation is hidden instead of explicit

The contract API currently treats missing package resolution as structurally valid by normalizing:
- empty package name
- empty package code
- null price

The frontend then turns that silent failure into:
- `Unknown Plan`
- `฿0`

This is the wrong layer to discover the problem.

---

## Additional Risks Found

### Risk 1 — Hidden V6-to-v3 coupling in tests

`test_ruleset_signal_pool_alignment_r8.py` reads directly from `POC/v3/assets/...`.

Impact:
- V6 tests can pass while V6 deployment artifacts are incomplete
- bundle integrity is not really being tested

### Risk 2 — MCP patient resolution inconsistency

Several MCP tools do:
- `resolved_patient_id = patient_id or resolve_patient_token(patient_token)`

That is the wrong direction of resolution. The tools should derive patient ID from token, not token from token.

Impact:
- token-only requests can degrade incorrectly
- neighboring failures can be masked as “record not found”

### Risk 3 — Local full-route verification is currently blocked

Attempting to import the full contract route locally surfaced:
- generated BAML client version `0.220.0`
- installed `baml-py` version `0.213.0`

Impact:
- full route import-based verification may fail locally until the environment is aligned

---

## Direct Evidence Collected

### Evidence 1 — V6 asset docs only list two ruleset files
- `sample_add_on_items.json`
- `sample_promotions.json`

### Evidence 2 — Current frontend fallback
Package label render path:

```tsx
data.resolved_package?.name || data.resolved_package?.package_name || "Unknown Plan"
```

Billing render path:

```tsx
data.resolved_package?.price_thb ?? 0
```

### Evidence 3 — Runtime loader searches outside V6
The current loader checks:
- V6 local path
- `doc_outputs/...`
- `POC/v3/...`

### Evidence 4 — Existing path-resolution test is not sufficient
It verifies that something loads, but not that it loads from the V6-local bundle.

---

## Recommended Fix Shape

One coordinated pass should:
1. bundle missing ruleset assets into V6
2. make V6-local paths canonical
3. fix age-band resolver semantics
4. add explicit degraded package-resolution metadata to the backend contract
5. make the UI render degraded states intentionally
6. add regression coverage around bundle integrity and package resolution
