# GAP-R3 — BAML Output Schema

**Title:** AddOnItem missing 4 fields; CommunicationScript has wrong field names
**Status:** Complete (targeted verification passed)

---

## Objective

Update the Stage 1 BAML schema so `AddOnItem` produces all 7 required fields and
`CommunicationScript` has exactly the 4 fields specified by the framework.

## Scope

**AddOnItem changes:**
- Rename `item_code` → `item_id`
- Rename `priority_level` → `priority`
- Add: `label string`, `product_code string`, `price_thb float?`, `category string`

**CommunicationScript changes:**
- Remove: `clinical_conclusion`
- Rename: `recommendation_explanation` → `recommendation_rationale`
- Rename: `add_on_highlights` → `addon_highlights`

**Prompt update:** Instruct AI to populate new fields from the `program_ruleset` context.

## Primary File

`POC/v2/baml_src/clinical/recommendation_output.baml`

## Checkpoint Files

- `_discovery.md`
- `_development_summary.md`
- `_lastest_test_results.md`
- `../GAP-R3-R2-integrated-plan.md`

## Framework Reference

`doc_outputs/onboarding/ai-team-onboarding.md` §7 Stage 1 Output Schema

## Implementation Status

- Updated `recommendation_output.baml`: `AddOnItem` has all 7 framework fields; `CommunicationScript`
  has exactly 4 framework fields with correct names.
- Updated prompts in `MatchProgramRules` and `ComposeRecommendation` to populate new fields.
- Aligned schema consumers:
  - `backend/src/services/workflows/clinical.py` — `_map_final_to_ai_output()` uses `item.item_id`,
    `item.priority.value`, and all new fields; `_build_rule_based_output()` uses `addon_highlights`.
  - `backend/src/api/routes/contracts.py` — `_normalize_stage2()` enrichment updated to read
    `item_id`/`priority` first with old-name fallback; outputs dual keys for backward compatibility.
    `_map_communication_script()` handles both old and new field names via `or`-fallback.
- Test `test_gap_r3_stage1_fields_are_normalized_for_stage2_contract` — PASSED.
- Full test suite: 23 passed in 0.64s.
