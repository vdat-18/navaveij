# Cross-Gap Latest Test Results

**Status:** Verified (2026-03-24)

## Executed

- Frontend unit tests:
  - `npm run test -- src/components/dashboard/RecommendationPanel.test.tsx`
  - Result: pass (12 tests)
- Backend targeted tests (from `POC/v2` root):
  - `python3 -m pytest -q scripts/tests/test_api_contract_routes.py -k "recommend_stream_emits_stage_and_result or risk_summary_marks_fallback_when_signal_payload_is_defaulted or recommend_contract_route_success"`
  - Result: pass (3 selected tests)
- Frontend targeted lint:
  - `npx eslint src/components/dashboard/LoadingSteps.tsx src/components/dashboard/RecommendationPanel.tsx src/components/dashboard/RecommendationPanel.test.tsx src/types/recommendation.ts`
  - Result: 0 errors, warnings only (pre-existing warnings in `RecommendationPanel.tsx`)

## Coverage focus

- Loading bar hierarchy and compact step rendering
- Risk gauge text/state rendering including fallback indicator path and anchored click-toast summary
- Backend response includes `overall_risk_level` and `risk_summary` provenance semantics with patient-specific description generation

## Notes

- Running backend tests from repository root causes relative asset-path failures; running from `POC/v2` root resolves this.
