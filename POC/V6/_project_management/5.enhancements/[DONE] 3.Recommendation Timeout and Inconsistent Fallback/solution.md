# Solution

## Decisions

- Fix the missing env var — not the BAML config or the Python settings (both are already correct).
- Widen the frontend timeout to accommodate the bounded worst case, not the unbounded previous behavior.
- Do not add `asyncio.wait_for` wrappers or SSE migration — `LLM_TIMEOUT_MS` in BAML is the correct layer.

## Approach

### 1. Add `LLM_TIMEOUT_MS` to `.env`

Set `LLM_TIMEOUT_MS=20000` (20 seconds per LLM HTTP call). This activates the `timeout_ms env.LLM_TIMEOUT_MS` directive already present in `clients.baml`. With this set:

- If TrollLLM exceeds 20s on `AnalyzeClinicalRisks`, BAML raises an exception that is caught at `clinical.py:170` → immediate rule-based fallback. Total workflow time ≈ 2s (MCP) + 20s (timeout) = ~22s.
- If both LLM calls respond just under the limit: 2s + 20s + 20s = 42s.

LLM calls are now time-bounded. Backend tasks complete predictably.

### 2. Add `LLM_TIMEOUT_MS` to `.env.example`

Document the variable with an explanatory comment so future environment setups do not omit it.

### 3. Increase `API_TIMEOUT_MS` in `api.ts`

Change `API_TIMEOUT_MS` from `30000` to `60000`. With `LLM_TIMEOUT_MS=20000` enforced, worst case = 42s. 60s gives ~18s of headroom above worst case. This eliminates the race condition:

- Backend always completes before the Axios timeout fires.
- The first request that succeeds (AI or RuleBased) is cached.
- All subsequent requests within the 300s TTL are served from cache — consistent output.

## What Was Not Changed

- `clients.baml` — `timeout_ms env.LLM_TIMEOUT_MS` is already correct.
- `shared/settings.py` — `llm_timeout_ms: int = 15000` is already correct as a Python-side default.
- `clinical.py` — exception handler at line 170 already catches all BAML errors and falls back correctly.
- No `asyncio.wait_for` wrapper — would duplicate the BAML-native timeout.
- No SSE migration — the blocking endpoint is appropriate once total latency is bounded.

---

## Subsequent Additions (same enhancement scope)

### OpenRouter Fallback Client

Added `OpenRouterClient` and `NavaveijWithFallback` to `clients.baml`. All BAML functions now use `NavaveijWithFallback` (BAML `fallback` provider) instead of `NavaveijClient` directly.

- Strategy: try `NavaveijClient` (TrollLLM) first; on any failure, retry with `OpenRouterClient` (OpenRouter).
- Both clients share `LLM_TIMEOUT_MS` so the per-call budget is consistent across providers.
- Required new env vars: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` (added to `.env` and `.env.example`).

This eliminates single-point-of-failure on TrollLLM — 503s, broken pipes, and overload that previously forced rule-based fallback will now transparently retry via OpenRouter.

### BAML Pipeline Profile Test

Added `scripts/tests/test_baml_recommendation_profile.py` — a pytest suite that runs `AnalyzeClinicalRisks → MatchAndCompose` sequentially for all four clinical fixture scenarios and emits a per-step timing table.

**Profile result (2026-03-19):**

```
  Scenario                           Agent 1 (ms)   Agent 2 (ms)   Total (ms)
----------------------------------------------------------------------------
  ✅ MetabolicSyndromeRisk                   7,036         10,778       17,814
  ✅ HealthyRoutineCheckup                   7,024         10,913       17,937
  ✅ UncontrolledHypertension                7,653         10,407       18,060
  ✅ SeniorCancerScreeningGap                6,359         12,119       18,478
```

End-to-end pipeline duration is consistently ~18s — well within the 42s worst-case bound and the 60s frontend limit.
