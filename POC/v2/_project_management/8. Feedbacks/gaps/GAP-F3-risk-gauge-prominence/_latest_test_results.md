# Test Results

**Status:** Verified (2026-03-24)

---

## Executed

- Frontend:
  - `npm run test -- src/components/dashboard/RecommendationPanel.test.tsx`
    - Result: pass
    - Risk checks include all gauge labels (`Critical`, `High`, `Medium`, `Low`), numeric confidence rendering, fallback badge display, and click-triggered risk summary toast content/anchoring.
- Backend:
  - `python3 -m pytest -q scripts/tests/test_api_contract_routes.py -k "recommend_stream_emits_stage_and_result or risk_summary_marks_fallback_when_signal_payload_is_defaulted or recommend_contract_route_success"` (run from `POC/v2`)
    - Result: pass (3 tests selected)
    - Checks include `overall_risk_level` response field, fallback provenance, and patient-specific `risk_summary.description`.

## Test Coverage

- Risk gauge rendering states in dashboard component tests
- Risk summary toast behavior and anchored rendering path in dashboard tests
- Risk field contract mapping, fallback provenance, and summary-content generation in backend normalization/route tests

## Notes

- Running backend tests from repository root failed due relative asset path; rerun from `POC/v2` succeeds.
