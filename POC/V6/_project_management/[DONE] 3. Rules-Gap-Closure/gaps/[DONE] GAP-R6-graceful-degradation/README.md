# GAP-R6 — Graceful Degradation True Path

**Title:** Graceful degradation triggers on low confidence instead of AI failure
**Status:** Complete (targeted verification passed)

---

## Objective

Implement a true graceful degradation path that activates on LLM or BAML failure and
produces a rule-only recommendation from `get_program_ruleset` without invoking the AI.

## Scope

1. Wrap BAML call in `orchestrator.py` with try/except for LLM and BAML exceptions.
2. On exception: call `get_program_ruleset`; apply tier rules to fired signals;
   select top-priority triggered add-ons; build valid `RecommendationOutput`.
3. Set `recommendation_source = "RuleBased"`, `review_required = true`.
4. Rename current confidence-gate output to `recommendation_source = "AI_LowConfidence"`.

## Primary File

`POC/v2/backend/src/services/orchestrator.py`

## Checkpoint Files

- `_discovery.md`
- `_development_summary.md`
- `_lastest_test_results.md`
- `../GAP-R6-R7-R2tests-testblockers-plan.md`

## Framework Reference

`doc_outputs/onboarding/ai-team-onboarding.md` Component 11 (Graceful Degradation)

## Implementation Status

- Added orchestrator retry path: if primary workflow execution raises, rerun deterministic flow with `force_rule_based=True`.
- Preserved explicit source semantics in Stage-2 normalization so missing-source + review-required cases map to `AI_LowConfidence` instead of `RuleBased`.
- Added targeted regression tests for retry behavior and low-confidence source labeling.
