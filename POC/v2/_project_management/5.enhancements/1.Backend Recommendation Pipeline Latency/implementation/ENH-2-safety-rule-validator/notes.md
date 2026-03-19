# ENH-2 — Replace Safety LLM Call with RuleEvaluator

**Status:** ⬜ Pending
**Bottleneck addressed:** B1 (4th sequential LLM call), B6 (no timeout on safety validator)
**Priority:** P0 (largest single latency saving — ~2–8s per request)

---

## Files to Modify

| File | Change |
|------|--------|
| `backend/src/services/safety.py` | Replace `b.ValidateRecommendation()` with `RuleEvaluator.validate_safety()` |
| `backend/src/services/rules.py` | Add `validate_safety(ai_output, hard_constraints)` method if not present |

## Pre-condition Check

- [ ] Confirm `rules.py` exists in v2 (`backend/src/services/rules.py`)
- [ ] Confirm `RuleEvaluator.evaluate()` is implemented and used in graceful fallback path
- [ ] Identify what safety checks `ValidateRecommendation` currently performs (gender, age, tier ceiling, safety flags)

## Exit Evidence

- [ ] `safety.py` makes no LLM calls
- [ ] Safety validation completes in < 5ms (timed by ENH-1 instrumentation)
- [ ] Ineligible add-ons are still removed from `add_ons[]` in the output
- [ ] Conflict events still written to audit log for each removed item
- [ ] Regression suite passes

## Notes

The `RuleEvaluator` is already used by `_build_rule_based_output()` in the graceful fallback path. The `validate_safety()` method applies the same hard constraint logic (gender, age, tier ceiling, safety flags from `get_hard_constraints` response) but operates on the AI-generated `add_ons[]` list rather than building a new recommendation from scratch.

_(Updated during implementation)_
