# Implementation Plan

## Step 1 — Activate BAML LLM Timeout

Update `POC/v2/.env`:
- Add `LLM_TIMEOUT_MS=20000` after `LLM_MODEL`.

Update `POC/v2/.env.example`:
- Add `LLM_TIMEOUT_MS=15000` with comment after `LLM_MODEL`.

## Step 2 — Widen Frontend Safety Net

Update `POC/v2/frontend/src/services/api.ts`:
- Change line 38: `API_TIMEOUT_MS = 30000` → `API_TIMEOUT_MS = 60000`.

## Step 3 — Verification

```bash
cd POC/v2

# Regression suite — must remain at 75 passed, 4 pre-existing frontend failures
uv run pytest scripts/tests -v

# Manual smoke test
# 1. Cold request — should complete in ≤42s (worst case), not timeout
# 2. Second request for same patient within 300s — must return from cache instantly with same source
```

## Worst-Case Latency After Fix

| Scenario | Breakdown | Total |
|----------|-----------|-------|
| AnalyzeClinicalRisks times out → rule-based | 2s MCP + 20s LLM timeout + <1s fallback | ~23s |
| Both LLM calls succeed near limit | 2s MCP + 20s + 20s | ~42s |
| Cache hit (repeat request within 300s) | sync file I/O + dict lookup | <100ms |

Frontend timeout (60s) clears worst case by ~18s.

---

## Step 4 — OpenRouter Fallback Client (subsequent)

Update `POC/v2/baml_src/clients.baml`:
- Add `OpenRouterClient` using `openai-generic` provider pointing to `https://openrouter.ai/api/v1`.
- Add `NavaveijWithFallback` using `fallback` provider with `strategy [NavaveijClient, OpenRouterClient]`.
- Update all 9 BAML function `client` declarations from `NavaveijClient` → `NavaveijWithFallback`.

Update `POC/v2/.env` and `POC/v2/.env.example`:
- Add `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`.

Run `baml-cli generate` to regenerate the Python client.

## Step 5 — Pipeline Profile Test (subsequent)

Add `POC/v2/scripts/tests/test_baml_recommendation_profile.py`:
- 4 parametrized tests, one per fixture scenario.
- Each test: load fixture → load ruleset via MCP tool → call Agent 1 → call Agent 2 sequentially.
- Time each step with `time.monotonic()`.
- Assert `suggested_tier` and `ai_recommended_tier` are valid enum values.
- Assert each agent completes within `LLM_TIMEOUT_MS + 5000ms`.
- Session-level fixture aggregates all results and prints a summary table after all tests.
