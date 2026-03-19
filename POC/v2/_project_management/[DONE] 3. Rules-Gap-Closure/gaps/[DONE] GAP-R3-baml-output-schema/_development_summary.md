## Status: Implemented, verification in progress

## Code Changes

1. Updated `baml_src/clinical/recommendation_output.baml`:
   - AddOnItem renamed to `item_id` / `priority` and enriched with `label`, `product_code`, `price_thb`, `category`.
   - CommunicationScript normalized to `health_summary`, `recommendation_rationale`, `addon_highlights`, `next_steps`.
   - Prompt instructions updated to enforce field population from ruleset context.
2. Updated `backend/src/services/workflows/clinical.py` to map new Stage-1 keys in AI and fallback outputs.
3. Updated `backend/src/api/routes/contracts.py` to normalize new keys while preserving Stage-2 response compatibility.
