# Context — High Latency and Recommendation Discard

**Date:** 2026-03-20 →
**Scope:** `POC/v2/baml_src/clinical/recommendation_output.baml` · `POC/v2/backend/src/services/workflows/clinical.py`

## Background

ENH-3 resolved the unbounded timeout (missing `LLM_TIMEOUT_MS` in `.env`) and added OpenRouter
as a fallback client. After those fixes, cold recommendation requests complete within ~18–42s
and the AI/RuleBased inconsistency was eliminated.

However, two structural inefficiencies remain from before ENH-3:

1. The 4 MCP phase calls are still sequential even though they are fully independent.
2. Agent 2 (`MatchAndCompose`) handles both policy matching and narrative writing in a
   single monolithic prompt. The narrative fields (`health_summary`, `next_steps`) do not
   depend on the policy output and could be generated concurrently.

Additionally, the fallback strategy is all-or-nothing:
- A failure anywhere in the two-agent chain causes complete discard of AI output.
- The rule-based fallback returns empty add-ons, giving ROC staff no add-on guidance.

## Trigger

User reported that despite ENH-3 fixes, wait time "remains high" and breakages "often lead to
entire recommendation being discarded" — confirmed by reviewing the current pipeline structure.

## Objective

1. Reduce cold recommendation latency by ~6s through two parallel optimizations:
   - Gather all 4 MCP reads in `asyncio.gather()` (saves ~2s)
   - Split Agent 2 into `MatchPolicy` + `WriteNarrative` running in parallel (saves ~4s)
2. Prevent full recommendation discard on partial AI failure:
   - Separate Agent 1 and Agent 2 failure handling
   - Return rule-matched add-ons in fallback paths instead of empty list
