# GAP-R1 — Confidence Calibrator Formula

**Title:** Confidence calibrator formula deviations
**Status:** Complete (targeted verification passed)

---

## Objective

Correct three sub-formula deviations in `_normalize_stage2()` in `contracts.py` so the
confidence score matches the framework specification in `ai-team-onboarding.md` §8.

## Scope

1. Set `rule_agreement = 0.0` when AI tier ≠ rule preliminary tier (previously `0.7`).
2. Redefine `signal_coverage` as data availability ratio, not active-signal ratio.
3. Redefine `data_completeness` as required-field presence ratio, not signal count ratio.

## Primary File

`POC/v2/backend/src/api/routes/contracts.py` — `_normalize_stage2()` function

## Checkpoint Files

- `_discovery.md`
- `_development_summary.md`
- `_lastest_test_results.md`
- `plan.md`

## Implementation Status

- Confidence formula logic updated in `contracts.py` `_normalize_stage2()`:
  - `rule_agreement` mismatch contributes `0.0`.
  - `signal_coverage` uses expected-signal availability semantics: `(expected − missing) / expected`.
  - `data_completeness` uses required-field presence semantics: `fields_present / total_required_fields`.
- Deterministic GAP-R1 tests added in `scripts/tests/test_api_contract_routes.py`:
  - `test_gap_r1_rule_agreement_mismatch_is_zero` — PASSED
  - `test_gap_r1_signal_coverage_uses_expected_minus_missing` — PASSED
  - `test_gap_r1_data_completeness_uses_required_field_presence` — PASSED
- Full test suite: 23 passed in 0.64s.

## Framework Reference

`doc_outputs/onboarding/ai-team-onboarding.md` §8, Component 8 (Confidence Calibrator)
