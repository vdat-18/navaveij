## Status: Implemented

## Patch Bundles

### Bundle A — Added Signals

- ADVANCED low-moderate `signal_pool` additions:
  - `fbs_upward_trend`
  - `diagnosis_fatty_liver`
- PREMIUM_MULTI_SIGNAL `signal_pool` additions:
  - `diabetes_confirmation_required`
  - `history_syncope`

### Bundle B — Removed Signals

- ADVANCED low-moderate `signal_pool` removals:
  - `family_hx_early_heart_attack`
  - `symptom_fatigue`
  - `history_loss_of_consciousness`
  - `occupational_risk_factory`

## Files Changed

1. `POC/v3/assets/synthesis/rulesets/sample_ruleset_tier_config.json`
   - updated PREMIUM and ADVANCED signal pools
   - updated associated pool rationale entries
2. `POC/v2/scripts/tests/test_ruleset_signal_pool_alignment_r8.py`
   - added deterministic pool membership and duplicate checks
