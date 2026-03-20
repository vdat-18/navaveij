# Actual Development

**Status:** ✅ Complete (2026-03-20)

## Investigation

Root cause confirmed by reading:
- `POC/v2/backend/src/services/workflows/clinical.py` — confirmed 4 sequential MCP calls across 3 phase methods with no ordering dependency
- `POC/v2/baml_src/clinical/recommendation_output.baml` — confirmed `MatchAndCompose` combined policy matching and narrative writing in one ~11s LLM call; dependency analysis showed `health_summary` and `next_steps` require only `risk_profile` (available before Agent 2 starts), not the selected add-ons
- `POC/v2/scripts/tests/test_baml_recommendation_profile.py` — confirmed ~18s end-to-end baseline

Key finding: The `MatchAndCompose` prompt's Part 2 fields split cleanly on add-on dependency:
- **Needs add-ons** (stays with policy agent): `recommendation_rationale`, `addon_highlights`
- **Needs only risk_profile** (runs concurrently): `health_summary`, `next_steps`

## Implemented Changes

### `POC/v2/baml_src/clinical/recommendation_output.baml`

Replaced `MatchAndCompose` + `RecommendationWithScript` with two parallel functions:

**New classes:**
- `PolicyScript` — `{ recommendation_rationale string, addon_highlights string[] }`
- `PolicyMatchResult` — `{ ai_recommended_tier Tier, tier_deviation_justification string?, selected_add_ons AddOnItem[], policy_reasoning string, policy_script PolicyScript }`
- `NarrativeScript` — `{ health_summary string, next_steps string }`

**New functions:**
- `MatchPolicy(risk_profile, program_ruleset) -> PolicyMatchResult` — tier selection, add-on selection, add-on-dependent communication text
- `WriteNarrative(risk_profile) -> NarrativeScript` — patient narrative from risk profile alone; no ruleset required

`MatchAndCompose` and `RecommendationWithScript` commented out in-file with deprecation notice.

### `POC/v2/backend/src/services/workflows/clinical.py`

**Parallel MCP fetch (Step 1 of plan):**
- Removed `_fetch_baseline()`, `_analyze_signals()`, `_evaluate_trends()` phase methods
- Replaced with single `asyncio.gather()` in `execute()` covering all 4 MCP tools
- Demographics extraction moved inline after the gather
- On-stage numbers: old stages 1/2/3 → single stage 1; old stage 4 → stage 2; old stage 5 → stage 3

**Parallel Agent 2 with granular fallback (Steps 2 + 3 of plan):**
- Agent 1 (`AnalyzeClinicalRisks`) failure: separate early-return to full rule-based fallback (unchanged behavior)
- Agent 2a + 2b launched via `asyncio.gather(..., return_exceptions=True)`:
  - `MatchPolicy` fails alone → rule-matched add-ons + narrative from `WriteNarrative`
  - `WriteNarrative` fails alone → `MatchPolicy` result + fallback narrative from `risk_profile.clinical_summary_bullets`
  - Both fail → full rule-based fallback
- `_map_final_to_ai_output()` updated to accept `policy_result: PolicyMatchResult | None` + `narrative: NarrativeScript | None`

**Rule-based add-on matching (Step 3 of plan):**
- Added `_match_add_ons_from_signals(signals_fired, ruleset) -> list[dict]`:
  - Iterates `ruleset.get("add_on_library", [])`, triggers on `trigger_signals` intersection
  - Reads `price_thb` from `navavej_product` sub-dict; preserves `null` — does not substitute 0
  - Sorts by priority: Red > Orange > Yellow > Green
- `_build_rule_based_output()` now accepts `ruleset` parameter and calls `_match_add_ons_from_signals()` — replaces previous `"add_ons": []`
- `addon_highlights` in fallback paths populated from matched add-on labels

### `POC/v2/scripts/tests/workflows/test_clinical_workflow.py`

- `test_clinical_workflow_ai_path`: updated `match_result` → `policy_result` (new `PolicyMatchResult` structure with `policy_script`); added `narrative` mock; patches updated to `b.MatchPolicy` + `b.WriteNarrative`
- `test_clinical_workflow_force_rule_based`: updated patches to `b.MatchPolicy` + `b.WriteNarrative`

### `POC/v2/scripts/tests/test_baml_recommendation_profile.py`

- Sequential `MatchAndCompose` call replaced with `asyncio.gather(b.MatchPolicy(...), b.WriteNarrative(...), return_exceptions=True)`
- Profile summary table updated: `Agent 2 (ms)` → `2a Policy (ms)` + `2b Narr (ms)` columns
- Assertions updated to `PolicyMatchResult` + `NarrativeScript` fields

### `POC/v2/baml_src/recommendation_tests.baml`

- `MatchAndCompose_MetabolicSyndrome` test renamed to `MatchPolicy_MetabolicSyndrome`
- Assertions updated: `communication_script.*` → `policy_script.*`
- Added `WriteNarrative_MetabolicSyndrome` test for Agent 2b

## Verification

Regression suite:

```
uv run pytest scripts/tests -v --ignore=scripts/tests/test_baml_recommendation_profile.py
→ 74 passed, 5 pre-existing frontend failures (test_frontend_reliability_contract.py)
```

No new failures introduced. The 2 clinical workflow tests that were failing before this enhancement (due to `MatchAndCompose` removal) are now passing.

## Expected Latency Improvement

| Segment | Before | After |
|---------|--------|-------|
| MCP Phase 1 (4 tools) | ~1.5–3s sequential | ~0.3–0.8s parallel |
| Agent 1 | ~7s | ~7s (unchanged) |
| Agent 2 | ~11s sequential | ~7s parallel (max of 2a/2b) |
| **Total cold path** | **~18s** | **~12s** |

Profile run pending against live LLM to confirm timing.
