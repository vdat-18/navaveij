# ENH-6 — LLM Call Timeouts + Timeout Fallback

**Status:** ✅ Complete (2026-03-19)
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

- [x] `timeout_ms 15000` added to `NavaveijClient` options in `clients.baml`
- [x] `baml-cli generate` completes without errors
- [x] Existing exception handler in `clinical.py` catches BAML errors and falls back to `_build_rule_based_output()`
- [x] Regression suite passes
- [x] `llm_timeout_ms: int = 15000` added to `LLMSettings` in `shared/settings.py` (maps to `LLM_TIMEOUT_MS` env var)
- [x] `clients.baml` updated to `timeout_ms env.LLM_TIMEOUT_MS` — reads from environment
- [x] `baml-cli generate` passes after change

## Implementation Notes (2026-03-19)

`clients.baml`: `timeout_ms env.LLM_TIMEOUT_MS` (env-configurable, default 15 000ms). `shared/settings.py` `LLMSettings`: `llm_timeout_ms: int = 15000` added — maps to `LLM_TIMEOUT_MS` env var via Pydantic Settings. To override, set `LLM_TIMEOUT_MS=<ms>` in `.env` or environment. BAML-native `timeout_ms` approach used (not `asyncio.wait_for` wrapper). Regression suite: 75 passed, 4 pre-existing frontend failures.
