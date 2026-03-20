# Context — Recommendation Timeout and Inconsistent Fallback

**Date:** 2026-03-19 → 2026-03-20
**Scope:** `POC/v2/backend` (`.env`, `clients.baml`) · `POC/v2/frontend/src/services/api.ts` · `POC/v2/scripts/tests/test_baml_recommendation_profile.py`

## Background

The v2 recommendation pipeline calls two sequential LLM agents (Agent 1: `AnalyzeClinicalRisks`, Agent 2: `MatchAndCompose`) via BAML against TrollLLM — an external OpenAI-compatible proxy. ENH-6 previously wired up a `timeout_ms env.LLM_TIMEOUT_MS` directive in `clients.baml` and added `llm_timeout_ms: int = 15000` to `LLMSettings`, but never added `LLM_TIMEOUT_MS` to `.env`. The env var therefore resolved to an empty string at runtime, leaving BAML with no effective HTTP timeout on LLM calls.

Additionally, the frontend Axios client was configured with a 30-second hard limit (`API_TIMEOUT_MS = 30000` in `api.ts:38`), making the system brittle: any cold recommendation request where TrollLLM took longer than ~28 seconds would be cut off before the backend could respond.

## Trigger

User reported two unacceptable behaviors after deploying all ENH items:

1. **Timeout error:** "Request timed out after 30 seconds" — shown after "Synthesizing Clinical Intelligence - Checking signal store & rulesets..."
2. **Inconsistent output:** clicking away from a patient card and back sometimes showed AI-generated output, other times showed the rule-based fallback — with no user action changing the patient or data.

## Objective

- Eliminate the 30-second timeout error on cold recommendation requests.
- Make recommendation output deterministic and consistent for the same patient within the cache TTL window.

## Subsequent Work (2026-03-20)

After the primary fix was deployed, two further improvements were made within the same enhancement scope:

1. **OpenRouter fallback client** — TrollLLM remained a single point of failure. 503s and broken-pipe errors (observed during BAML test runs) still forced the rule-based fallback. Added `OpenRouterClient` + `NavaveijWithFallback` (BAML `fallback` provider) so any TrollLLM failure transparently retries via OpenRouter before the Python-side exception handler is reached.

2. **Pipeline latency profiling** — To validate the fix and support future model selection decisions, a pytest profile suite (`test_baml_recommendation_profile.py`) was added that runs the full two-agent pipeline sequentially across all four clinical fixture scenarios and emits a per-step timing table. Initial profile: ~18s end-to-end across all scenarios.
