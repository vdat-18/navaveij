# Latest Test Results

**Date:** 2026-03-20
**Run scope:** `uv run pytest scripts/tests --ignore=scripts/tests/test_baml_recommendation_profile.py -v`

---

## Summary

```
79 collected — 74 passed, 5 failed in 2.11s
```

| Status | Count | Notes |
|--------|-------|-------|
| ✅ Passed | 74 | All backend, contract, workflow, and E2E tests |
| ❌ Failed | 5 | All pre-existing — `test_frontend_reliability_contract.py` only |

---

## Failing Tests (all pre-existing, not introduced by ENH-4)

| Test | File | Failure Reason |
|------|------|----------------|
| `test_dashboard_primary_nav_has_real_routes` | `test_frontend_reliability_contract.py` | `href: "/"` not found in dashboard source |
| `test_sidebar_navigation_links_to_existing_pages` | `test_frontend_reliability_contract.py` | `href: "/audit"` not found in sidebar source |
| `test_mig6_page_has_privacy_mode_and_masks_patient_fields` | `test_frontend_reliability_contract.py` | `privacyMode` state not found at expected location |
| `test_mig6_page_wires_recommendation_metadata_callback` | `test_frontend_reliability_contract.py` | `onSecurityMetadata` prop not found in dashboard |
| `test_mig6_panel_masks_reasoning_trace_and_lifts_security_metadata` | `test_frontend_reliability_contract.py` | `onSecurityMetadata?:` signature not found in panel |

These 5 failures were present before ENH-4 and are tracked separately (frontend contract divergence, not AI pipeline scope).

---

## Tests Added or Modified by ENH-4

| Test | File | Result |
|------|------|--------|
| `test_clinical_workflow_ai_path` | `workflows/test_clinical_workflow.py` | ✅ Passed (updated: `MatchPolicy` + `WriteNarrative` mocks) |
| `test_clinical_workflow_force_rule_based` | `workflows/test_clinical_workflow.py` | ✅ Passed (updated: `MatchPolicy` + `WriteNarrative` mocks) |
| `test_clinical_workflow_ai_exception_fallback` | `workflows/test_clinical_workflow.py` | ✅ Passed (unchanged) |

---

## Profile Test Suite (live LLM — run separately)

```bash
uv run pytest scripts/tests/test_baml_recommendation_profile.py -s --tb=no -q 2>&1 | tail -20
```

Profile suite (`test_baml_recommendation_profile.py`) requires live LLM access and is excluded from the regression run.
Expected outcome: `2a Policy (ms)` + `2b Narr (ms)` run in parallel — wall-clock Agent 2 budget drops from ~11s to ~7s.
