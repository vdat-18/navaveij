## Status: Implemented, verification in progress

## Code Changes

1. Updated `POC/v2/backend/src/api/routes/contracts.py` in `_normalize_stage2()`:
   - replaced mismatch branch for `rule_agreement` from `0.7` to `0.0`
   - replaced signal coverage derivation to expected-signal availability logic
   - replaced data completeness derivation to required-field presence ratio logic
2. Added deterministic GAP-R1 tests in `POC/v2/scripts/tests/test_api_contract_routes.py`:
   - `test_gap_r1_rule_agreement_mismatch_is_zero`
   - `test_gap_r1_signal_coverage_uses_expected_minus_missing`
   - `test_gap_r1_data_completeness_uses_required_field_presence`

## Notes

- API response shape remains unchanged; only confidence component math was updated.
