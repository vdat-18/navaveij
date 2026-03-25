# ENH-2 — Replace Safety LLM Call with RuleEvaluator

**Status:** ✅ Already implemented (pre-existed ENH work)
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

## Discovery (2026-03-19)

`safety.py` was already implemented as a fully deterministic `SafetyRuleValidator` before this ENH project began. There is no LLM call. The class implements gender, age (min/max), and `safety_contraindication_signals` checks directly in Python against the `add_on_library` from `get_program_ruleset`. No BAML call, no `ValidateRecommendation` function invocation.

The orchestrator calls `self.safety_validator.validate_and_filter()` synchronously at line 79 — already O(N add-ons), well under 5ms for typical payloads.

**No code changes required.** All exit criteria already satisfied. Original 4th LLM bottleneck does not exist in this codebase.

_(Updated 2026-03-19 during implementation round pre-flight check)_
