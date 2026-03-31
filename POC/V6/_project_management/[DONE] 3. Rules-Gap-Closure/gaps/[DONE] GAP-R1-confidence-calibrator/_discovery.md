# Discovery

Status: Complete

## Findings

1. Onboarding formula requires:
   - `signal_coverage = signals_with_data / total_expected_signals`
   - `data_completeness = required_fields_present / total_required_fields`
   - `rule_agreement = 1.0` if AI tier matches rule tier, otherwise `0.0`
2. Existing `_normalize_stage2()` deviated in all three components:
   - mismatch penalty used `0.7`
   - signal coverage used fired-density ratio
   - data completeness used fired-vs-missing signal ratio
3. Existing tests did not verify component-level formula behavior with deterministic numeric expectations.
