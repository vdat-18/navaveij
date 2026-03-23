## Status: Implemented, verification in progress

## Code Changes

1. Added `_validate_stage1_output()` in `backend/src/api/routes/contracts.py`.
2. Implemented deterministic checks for V2, V7, V9, V10 against route-time MCP context (`ruleset`, `clinical_signals`).
3. Updated `/api/recommend` to:
   - run validation on non-rule-based outputs
   - trigger deterministic `force_rule_based=True` fallback when validation fails
   - set `review_required = true` and preserve response shape.
