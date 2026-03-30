# Problem Statement

## 1) Missing `LLM_TIMEOUT_MS` in `.env`

`clients.baml` declares `timeout_ms env.LLM_TIMEOUT_MS` for `NavaveijClient`. BAML reads this value directly from the OS environment at startup. `.env` defined `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL` — but not `LLM_TIMEOUT_MS`.

At runtime, BAML received an empty/undefined value for `timeout_ms` and applied **no HTTP timeout** to TrollLLM calls. TrollLLM (an external proxy over the public internet) could take 25–40 seconds depending on load, model queue depth, or network conditions. This was unbounded.

Note: `settings.llm_timeout_ms: int = 15000` existed in `shared/settings.py` as a Python-side field, but Pydantic Settings reads FROM the environment — it does not write to it. The Python field had no effect on BAML's env var lookup.

## 2) Frontend Axios Timeout Too Tight

`api.ts:38` set `API_TIMEOUT_MS = 30000`. The cold recommendation request path through `POST /api/recommend` involves:
- 4× MCP tool calls via the orchestrator (≈ 1–2s total)
- `AnalyzeClinicalRisks` LLM call (no timeout → up to 30+ seconds)
- `MatchAndCompose` LLM call (no timeout → up to 30+ seconds)

Even in the best case where TrollLLM responded quickly, the 30-second limit left no margin. When TrollLLM was slow (25–35s for one call), Axios terminated the connection before the backend could respond.

## 3) Inconsistency Between AI and Rule-Based Output

When Axios terminated the connection at 30s, the backend `asyncio` task was **not cancelled** — FastAPI does not cancel async tasks on client disconnect. The backend continued running. If TrollLLM responded at T=32s, the full workflow completed, `cache_service.set()` was called, and the recommendation was cached — **even though the client had already received a timeout error**.

On the user's next request (clicking back to the patient card):
- If the backend had cached the AI result in the interim → cache hit → fast AI response → "LLM response shows up"
- If the backend task was still running or had taken the rule-based fallback path → cache miss or RuleBased cache entry → "rule-based shows up"

This race between backend task completion and the Axios timeout window produced non-deterministic output on successive requests.
