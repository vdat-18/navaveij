# Latest Test Results — Backend Recommendation Pipeline Latency

Raw test output from the most recent regression run. Replaced after each step.

---

## Steps 1–3 — Post ENH-1 + ENH-7 + ENH-3

**Date:** 2026-03-19 | **Result:** 75 passed, 4 failed — same as baseline

All 4 failures are the same pre-existing frontend contract drift tests (unchanged). Backend pass count 75/75.

---

## Step 0 — Baseline (pre-enhancement)

**Command:** `uv run pytest scripts/tests -v`

**Date:** 2026-03-19

**Result:** 75 passed, 4 failed (pre-existing frontend contract failures, unrelated to backend)

```
platform darwin -- Python 3.12.12, pytest-9.0.2, pluggy-1.6.0
asyncio: mode=Mode.STRICT

PASSED scripts/tests/infrastructure/test_mcp_factory.py::test_mcp_factory_lifecycle
PASSED scripts/tests/shared/test_exceptions.py::test_exception_hierarchy
PASSED scripts/tests/shared/test_exceptions.py::test_exception_metadata
PASSED scripts/tests/test_access_monitoring_contract.py (6 tests)
PASSED scripts/tests/test_api_contract_routes.py (24 tests)
PASSED scripts/tests/test_audit_dimensions_rules_gap.py::test_gap_r7_audit_logger_writes_five_dimensions
PASSED scripts/tests/test_backend_cache_ttl.py (3 tests)
PASSED scripts/tests/test_end_to_end.py::test_with_synthesized_data
PASSED scripts/tests/test_end_to_end.py::test_multiple_scenarios
PASSED scripts/tests/test_frontend_reliability_contract.py (3 of 7 tests)
PASSED scripts/tests/test_frontend_terminology_visibility.py (2 tests)
PASSED scripts/tests/test_gap9_verification_pack.py (3 tests)
PASSED scripts/tests/test_orchestrator_mig3.py (5 tests)
PASSED scripts/tests/test_ruleset_path_resolution.py (2 tests)
PASSED scripts/tests/test_ruleset_signal_pool_alignment_r8.py (3 tests)
PASSED scripts/tests/test_safety_validator_rules_gap.py (3 tests)
PASSED scripts/tests/test_security_rbac_contract.py (6 tests)
PASSED scripts/tests/test_timeline_contract_payload.py (3 tests)
PASSED scripts/tests/workflows/test_clinical_workflow.py (3 tests)

FAILED scripts/tests/test_frontend_reliability_contract.py::test_dashboard_primary_nav_has_real_routes
FAILED scripts/tests/test_frontend_reliability_contract.py::test_mig6_page_has_privacy_mode_and_masks_patient_fields
FAILED scripts/tests/test_frontend_reliability_contract.py::test_mig6_page_wires_recommendation_metadata_callback
FAILED scripts/tests/test_frontend_reliability_contract.py::test_mig6_panel_masks_reasoning_trace_and_lifts_security_metadata

=================== 4 failed, 75 passed in 205.11s (3:25) ===================
```

**Note:** All 4 failures are pre-existing. They check for exact string patterns in `frontend/src/app/page.tsx` and `frontend/src/components/dashboard/RecommendationPanel.tsx` that no longer match the current frontend implementation. These are frontend contract drift issues unrelated to the backend pipeline enhancements. Backend test suites pass 100%.

---

<!-- Replace the content above after each step's test run -->
