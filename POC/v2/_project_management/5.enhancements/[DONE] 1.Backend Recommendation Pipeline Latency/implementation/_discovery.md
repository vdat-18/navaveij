# Discovery Log — Backend Recommendation Pipeline Latency

Findings, decisions, and surprises encountered during implementation. Updated continuously.

---

## Pre-Enhancement Baseline (2026-03-19)

### Situation Analysis Findings

Code-level analysis confirmed six bottlenecks (see `solution-plan.md §2`). Key findings:

**Critical:**
- Pipeline makes 4 sequential LLM calls: `AnalyzeClinicalRisks` → `MatchProgramRules` → `ComposeRecommendation` → `ValidateRecommendation` (safety). Calls 1–3 have genuine data dependencies and cannot be parallelised. Call 4 is avoidable.
- MCP client spawns a new stdio subprocess per request via `async with MCPClientFactory.get_client() as session:` in `orchestrator.py:56`. No singleton or connection pool exists.

**High:**
- `load_signal_store_record()` (`mcp_server/utils.py:128`) globs `**/record_*.json` and opens each file until the patient token matches. 24+ files across 4 scenario directories. Cold cost is O(N) file reads; TTL cache (120s, key `signal_store:{patient_id}`) absorbs warm calls within a request window.
- Audit logger (`audit.py`) performs three I/O operations per recommendation: full JSONL read (to find last hash), JSONL append, and full JSON array read-modify-rewrite. The JSON array write is O(log size).

**Medium:**
- Only end-to-end `latency_ms` is recorded. No per-phase breakdown exists.
- `ValidateRecommendation` LLM call in `safety.py` has no HTTP timeout and no rule fallback. An hung call blocks indefinitely.

**Low:**
- PII rehydration does linear `str.replace()` per token across the full serialised output. Minor at current payload sizes.

### Key Reuse Identified

- `RuleEvaluator` in `backend/src/services/rules.py` already implements deterministic tier and signal evaluation, used by the graceful fallback path. ENH-2 extends this to cover safety constraint checking.
- FastAPI lifespan events (startup/shutdown) already available — ENH-3 and ENH-5 will hook into these.

---

<!-- Append new entries below as implementation progresses -->
