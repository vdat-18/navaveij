# MIG-4 Discovery

## Key Risk

`_normalize_stage2()` in `contracts.py` is the central assembly function. The existing tests assert specific field shapes. The migration must not change the shape of any existing field — only add new ones (`security_metadata`, `recommendation_source`, `review_required`).

## Fields to Add to Response (not change)

- `recommendation_source` — string, "AI" or "RuleBased"
- `review_required` — bool
- `security_metadata` — object with `rehydration_map`, `masked_ai_output`, `is_poc_demo`

## fields that must remain unchanged

All Stage-2 fields already produced by `_normalize_stage2()`:
- `confidence_score`, `confidence_tier`
- `rule_preliminary_tier`, `ai_recommended_tier`
- `add_ons[]`, `reasoning_trace`, `supporting_signals[]`, `missing_signals[]`
- `communication_script`, `patient_high_alert`, `metadata`
