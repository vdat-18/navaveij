# ENH-6 — LLM Call Timeouts + Timeout Fallback

**Status:** ⬜ Pending
**Bottleneck addressed:** B6 (unbounded tail latency on slow/hung LLM)
**Priority:** P2 (defensive hardening; primary safety fix is ENH-2)

---

## Files to Modify

| File | Change |
|------|--------|
| `baml_src/clients.baml` | Add `timeout_ms env.LLM_TIMEOUT_MS` to `NavaveijClient` options |
| `shared/settings.py` | Add `llm_timeout_ms: int = 15000` |
| `backend/src/services/workflows/clinical.py` | Extend except clause to catch `asyncio.TimeoutError` |

## Exit Evidence

- [ ] `baml-cli generate` completes without errors after `clients.baml` edit
- [ ] `llm_timeout_ms` is readable from `settings.py`
- [ ] Simulated timeout (set `LLM_TIMEOUT_MS=1` in env) triggers graceful fallback and returns a `recommendation_source: "RuleBased"` response
- [ ] Regression suite passes

## Notes

If BAML's `openai-generic` provider does not honour `timeout_ms` directly, wrap the BAML calls in `asyncio.wait_for(b.AnalyzeClinicalRisks(...), timeout=settings.llm_timeout_ms / 1000)` at the Python level. Document which approach was used in `_discovery.md`.

Default timeout: 15 000ms (15s). This gives ample budget for a single LLM call while still bounding the worst-case wait. Adjust based on measured `ai_chain_ms` from ENH-1.

_(Updated during implementation)_
