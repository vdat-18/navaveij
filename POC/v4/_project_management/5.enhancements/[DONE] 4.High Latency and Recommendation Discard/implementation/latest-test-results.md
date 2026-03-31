# Latest Test Results

**Date:** 2026-03-20
**Run scope:** `uv run pytest scripts/tests --ignore=scripts/tests/test_baml_recommendation_profile.py -q`

---

## Summary

```
79 collected — 79 passed, 0 failed in 35.93s
```

| Status | Count | Notes |
|--------|-------|-------|
| ✅ Passed | 79 | All backend, contract, workflow, frontend reliability, and E2E tests |
| ❌ Failed | 0 | — |

---

## All Tests Passing

All 5 previously failing `test_frontend_reliability_contract.py` tests now pass after the follow-up fixes applied in this session:

| Test | Fix Applied |
|------|-------------|
| `test_dashboard_primary_nav_has_real_routes` | Test updated to read `Sidebar.tsx` (nav was extracted from `page.tsx`) |
| `test_sidebar_navigation_links_to_existing_pages` | `/audit` entry added to `Sidebar.tsx` |
| `test_mig6_page_has_privacy_mode_and_masks_patient_fields` | Test updated to match `usePrivacyMode()` hook and current `getDisplayValue` signature |
| `test_mig6_page_wires_recommendation_metadata_callback` | Test updated: `onSecurityMetadata` → `onRecommendationLoad` |
| `test_mig6_panel_masks_reasoning_trace_and_lifts_security_metadata` | Test updated: prop name corrected, split pattern updated |

---

## Warning: Audit Hash Parse Error

```
WARNING | src.services.audit:_get_last_hash:40 - Could not parse last audit hash: Expecting value: line 1 column 1 (char 0)
```

**Root cause:** `_get_last_hash()` was calling `json.loads()` without an inner try/except per line.
**Status:** ✅ Fixed — `audit.py` now uses per-line `JSONDecodeError` handling (inner `continue`) so partial/empty lines are skipped silently. The outer `except` only fires on real I/O errors and logs `"Could not read audit log"`.

---

## Tests Added or Modified by ENH-4

| Test | File | Result |
|------|------|--------|
| `test_clinical_workflow_ai_path` | `workflows/test_clinical_workflow.py` | ✅ Passed |
| `test_clinical_workflow_force_rule_based` | `workflows/test_clinical_workflow.py` | ✅ Passed |
| `test_clinical_workflow_ai_exception_fallback` | `workflows/test_clinical_workflow.py` | ✅ Passed |

---

## Profile Test Suite (live LLM — run separately)

```bash
uv run pytest scripts/tests/test_baml_recommendation_profile.py -s --tb=no -q 2>&1 | tail -20
```

Profile suite (`test_baml_recommendation_profile.py`) requires live LLM access and is excluded from the regression run.
Expected outcome: `2a Policy (ms)` + `2b Narr (ms)` run in parallel — wall-clock Agent 2 budget drops from ~11s to ~7s, total cold path from ~18s to ~12s.
