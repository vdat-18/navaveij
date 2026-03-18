# MIG-2 Discovery

## Source Reference

v3 workflow: `POC/v3/backend/src/services/workflows/clinical.py`

## Key Observations

- v3 workflow adds `force_rule_based: bool = False` to `execute()`.
- v3 always instantiates `RuleEvaluator` and captures `rule_preliminary_tier` before the AI path.
- v3 wraps the 3-agent chain in `try/except`; on any exception, builds rule-based output and sets `review_required = True`.
- v3 uses `_build_rule_based_output()` and `_map_final_to_ai_output()` as private helpers in the workflow class.

## Critical: _map_final_to_ai_output contract

This helper must produce the following keys to satisfy `_normalize_stage2()` in contracts.py:

| Key | Source | Notes |
|---|---|---|
| `ai_recommended_tier` | `final.plan.ai_recommended_tier` | Must match Tier enum values |
| `tier_deviation_justification` | `final.plan.tier_deviation_justification` | Optional |
| `add_ons` | `final.plan.selected_add_ons` | Serialize BAML objects to dicts |
| `reasoning_trace` | Join `risk_profile.clinical_summary_bullets` + `plan.policy_reasoning` | Non-empty required |
| `supporting_signals` | `risk_profile.supporting_signal_ids` | List of signal IDs |
| `missing_signals` | `risk_profile.missing_signal_ids` | List of signal IDs |
| `communication_script` | `final.communication_script` | Serialize; must have all 4 sections |
| `rule_preliminary_tier` | `rule_tier` from RuleEvaluator | Always present |

## RuleEvaluator Presence Check

Must verify: does `POC/v2/backend/src/services/rules.py` exist? If not, copy from `POC/v3/backend/src/services/rules.py`.
