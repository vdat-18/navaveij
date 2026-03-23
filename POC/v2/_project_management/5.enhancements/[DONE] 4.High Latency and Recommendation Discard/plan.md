# Implementation Plan

## Step 1 — Parallelize the 4 MCP Calls

Update `POC/v2/backend/src/services/workflows/clinical.py`:
- Replace the 3 sequential phase methods (`_fetch_baseline`, `_analyze_signals`,
  `_evaluate_trends`) and the inline `get_program_ruleset` call with a single
  `asyncio.gather()` in `execute()`.
- Move the demographics extraction (previously in `_fetch_baseline`) inline after the gather.
- Remove the now-dead 3 phase methods.
- Shift on_stage numbers: old stage 4 → stage 2, old stage 5 → stage 3.

Expected: ~1.5–2.5s saved per cold request.

## Step 2 — Split Agent 2 into Two Parallel Functions

Update `POC/v2/baml_src/clinical/recommendation_output.baml`:
- Add `PolicyScript` class: `{ recommendation_rationale string, addon_highlights string[] }`
- Add `PolicyMatchResult` class: `{ ai_recommended_tier Tier, tier_deviation_justification string?, selected_add_ons AddOnItem[], policy_reasoning string, policy_script PolicyScript }`
- Add `NarrativeScript` class: `{ health_summary string, next_steps string }`
- Add `MatchPolicy(risk_profile, program_ruleset) -> PolicyMatchResult` function — focused
  on tier selection, add-on selection, and add-on-dependent communication text.
- Add `WriteNarrative(risk_profile) -> NarrativeScript` function — focused on patient
  narrative (health_summary, next_steps) from risk profile alone; no ruleset needed.
- Deprecate `MatchAndCompose` and `RecommendationWithScript` (comment out).
- Run `baml-cli generate` to regenerate Python client.

Update `POC/v2/backend/src/services/workflows/clinical.py`:
- After Agent 1 succeeds, fire both agents in parallel:
  ```python
  policy_result, narrative = await asyncio.gather(
      b.MatchPolicy(risk_profile=risk_profile, program_ruleset=...),
      b.WriteNarrative(risk_profile=risk_profile),
      return_exceptions=True,
  )
  ```
- Handle partial failures:
  - `MatchPolicy` fails → use rule-matched add-ons + narrative from `WriteNarrative`
  - `WriteNarrative` fails → use `MatchPolicy` result + fallback narrative from `risk_profile.clinical_summary_bullets`
  - Both fail → full rule-based fallback
- Update `_map_final_to_ai_output()` to accept `policy_result: PolicyMatchResult` +
  `narrative: NarrativeScript` instead of `result: RecommendationWithScript`.

Update `POC/v2/baml_src/recommendation_tests.baml`:
- Replace `MatchAndCompose` test with `MatchPolicy` + `WriteNarrative` tests.

Expected: Agent 2 time drops from ~11s to ~7s (max of parallel calls).

## Step 3 — Split AI Chain Failure Modes + Add Rule-Based Add-On Matching

Update `POC/v2/backend/src/services/workflows/clinical.py`:
- Separate Agent 1 failure (early return → full rule-based) from Agent 2 partial failure
  (handled by `return_exceptions=True` gather, not a shared try/except).
- Add `_match_add_ons_from_signals(signals_fired, ruleset) -> list[dict]` method:
  - Iterates `ruleset.get("add_on_library", [])`.
  - Triggers an item if `trigger_signals` intersects `signals_fired`.
  - Preserves `price_thb: null` — does not substitute 0.
  - Sorts by priority: Red > Orange > Yellow > Green.
- Wire into `_build_rule_based_output()`:
  - Add `ruleset` parameter.
  - Replace `"add_ons": []` with `self._match_add_ons_from_signals(...)`.
- Wire into the partial `MatchPolicy`-failure path.
- Safety Rule Validator in the orchestrator already handles post-output eligibility filtering.

## Step 4 — Verification

```bash
cd POC/v2

# Regenerate BAML client
uv run baml-cli generate

# Regression suite — must stay at 75 passed, 4 pre-existing failures
uv run pytest scripts/tests -v

# Latency profile — expect ~12-14s total vs previous ~18s
uv run pytest scripts/tests/test_baml_recommendation_profile.py -s --tb=no -q 2>&1 | tail -20

# Partial failure test — LLM_TIMEOUT_MS=1 should still return non-empty add_ons
LLM_TIMEOUT_MS=1 uv run pytest scripts/tests/test_baml_recommendation_profile.py -s --tb=no -q 2>&1 | tail -20
```

## Worst-Case Latency After Fix

| Scenario | Breakdown | Total |
|----------|-----------|-------|
| Both agents succeed near limit | ~0.5s MCP + 7s A1 + 7s A2 parallel | ~14.5s |
| MatchPolicy times out, WriteNarrative succeeds | ~0.5s + 7s + 20s timeout | ~27.5s |
| Agent 1 times out | ~0.5s + 20s timeout | ~20.5s |
| Cache hit (risk_profile cached) | ~0.5s MCP + 0s A1 + 7s A2 parallel | ~7.5s |
