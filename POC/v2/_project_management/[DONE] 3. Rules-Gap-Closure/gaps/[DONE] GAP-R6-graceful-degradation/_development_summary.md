## Status: Implemented and verified

## Code Changes

1. Updated `backend/src/services/orchestrator.py`:
   - wrap primary workflow execution in retry logic
   - on primary exception and non-forced mode, rerun with `force_rule_based=True`
2. Updated `backend/src/api/routes/contracts.py` source normalization:
   - when source is absent and review is required, use `AI_LowConfidence`.
3. Added tests in:
   - `scripts/tests/test_orchestrator_mig3.py` (`test_orchestrator_retries_rule_based_when_primary_path_raises`)
   - `scripts/tests/test_api_contract_routes.py` (`test_gap_r6_low_confidence_without_source_is_ai_low_confidence`)
