# ENH-8 — Cache Agent 1 Output (`ClinicalRiskProfile`)

**Status:** ⬜ Pending
**Bottleneck addressed:** B1 (sequential LLM calls — skips Agent 1 on warm hit)
**Priority:** P2 (~2–8s saving on warm requests; cold path unchanged)

---

## Background

`ClinicalRiskProfile` (Agent 1 output) is deterministic given the same clinical signals and biomarker trends. For returning patients — or any repeat recommendation request within the signal store TTL window (120s) — the risk profile will be identical. Caching it skips the `AnalyzeClinicalRisks` LLM call entirely on warm requests.

**Combined with ENH-7:** After ENH-7, cold requests make 2 LLM calls; with ENH-8, warm requests make 1 LLM call.

## Files to Modify

| File | Change |
|------|--------|
| `backend/src/services/workflows/clinical.py` | Add `_risk_profile_cache_key()` helper; add `_get_risk_profile()` async method; replace direct `await b.AnalyzeClinicalRisks(...)` with `await self._get_risk_profile(context)` |

## Pre-condition Check

- [ ] Confirm ENH-7 is complete (2-call chain in place)
- [ ] Confirm `TTLCacheService` is imported/available in `clinical.py` (it is used by the workflow already via `cache_service`)
- [ ] Confirm `settings.cache_signal_store_ttl_seconds` is the correct TTL to reuse (currently 120s)

## Implementation

```python
import hashlib, json

def _risk_profile_cache_key(masked_context: dict) -> str:
    payload = {
        "signals": masked_context.get("get_clinical_signals"),
        "trends": masked_context.get("get_biomarker_trends"),
    }
    return "risk_profile:" + hashlib.sha256(
        json.dumps(payload, sort_keys=True).encode()
    ).hexdigest()

async def _get_risk_profile(self, context: WorkflowContext) -> ClinicalRiskProfile:
    key = _risk_profile_cache_key(context.masked_context)
    hit, cached = cache_service.get(key)
    if hit:
        logger.debug("Agent 1 cache hit — skipping AnalyzeClinicalRisks")
        return cached
    profile = await b.AnalyzeClinicalRisks(
        clinical_signals=json.dumps(context.masked_context.get("get_clinical_signals"), indent=2),
        biomarker_trends=json.dumps(context.masked_context.get("get_biomarker_trends"), indent=2),
        hard_constraints=json.dumps(context.masked_context.get("get_hard_constraints"), indent=2),
        program_ruleset=json.dumps(context.masked_context.get("get_program_ruleset"), indent=2),
    )
    cache_service.set(key, profile, ttl_seconds=settings.cache_signal_store_ttl_seconds)
    return profile
```

Replace the direct call in `_generate_recommendation()`:
```python
# Before
risk_profile = await b.AnalyzeClinicalRisks(...)

# After
risk_profile = await self._get_risk_profile(context)
```

## Cache Key Notes

- Key covers `get_clinical_signals` + `get_biomarker_trends` — these are the inputs to Agent 1
- `get_hard_constraints` and `get_program_ruleset` are also passed to Agent 1 but are more stable (demographics don't change)
- `sort_keys=True` ensures key is deterministic regardless of dict insertion order
- Cache prefix `"risk_profile:"` avoids collision with signal store cache keys (`"signal_store:{id}"`)

## Exit Evidence

- [ ] Second request for the same patient within 120s logs "Agent 1 cache hit"
- [ ] `ai_chain_ms` on warm request ≈ ½ of cold value
- [ ] `force_rule_based=True` path is unaffected (bypasses Agent 1 entirely)
- [ ] Regression suite passes

## Notes

For POC: cache is in-memory and per-process. A server restart clears all cached profiles. This is acceptable — signal store data is static per session.

_(Updated during implementation)_
