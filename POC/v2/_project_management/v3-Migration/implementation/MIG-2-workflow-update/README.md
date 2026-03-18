# MIG-2 — Workflow Update

**Status:** Not started
**Priority:** P0
**POC Scoring Impact:** Hybrid 35%
**Depends on:** MIG-1

## Objective

Update `clinical.py` workflow to:
1. Always run `RuleEvaluator` first for `rule_preliminary_tier`.
2. Chain the 3 BAML agents in sequence.
3. Fall back to rule-based output on any AI exception.
4. Support `force_rule_based` bypass parameter.

## Files Changed

- `POC/v2/backend/src/services/workflows/clinical.py`
- `POC/v2/backend/src/services/rules.py` (copy from v3 if absent in v2)

## Acceptance Gate

- `uv run pytest scripts/tests -v` → ≥ 40 passed (no regressions)
- Manual test: AI path returns `recommendation_source: "AI"`
- Manual test: `force_rule_based=True` returns `recommendation_source: "RuleBased"`
- Manual test: When AI fails, fallback path engages automatically
