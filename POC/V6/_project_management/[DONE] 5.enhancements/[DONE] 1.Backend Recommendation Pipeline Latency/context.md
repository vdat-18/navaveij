# Context — Backend Recommendation Pipeline Latency

**Date:** 2026-03-19
**Author:** AI Engineering Review
**Folder:** `_project_management/5.enhancements/1.Backend Recommendation Pipeline Latency/`

---

## 1. What Is This Project?

**Navaveij** is a Smart Health Checkup Recommendation Dashboard being built for Navavej International Hospital (Bangkok). The system uses a hybrid Rule + AI model to recommend personalised annual checkup packages and add-on examinations for patients, and presents the output to a physician (ROC Staff) via a web dashboard.

The POC evaluation scoring is weighted as:

| Criterion | Weight |
|---|---|
| Hybrid Recommendation Engine + MCP | 35% |
| Pluggable AI + FHIR terminology | 25% |
| UX / XAI Explainability | 20% |
| Security, Privacy & Audit | 20% |

The SLA targets for the recommendation response are:

| Patient Type | Total Budget |
|---|---|
| New patients (first visit) | ≤ 10 seconds |
| Existing patients (returning) | ≤ 30 seconds |

---

## 2. What Is This Enhancement?

A general assessment flagged the backend recommendation pipeline as too slow. A code-level situation analysis (2026-03-19) confirmed the assessment and identified six discrete bottlenecks.

**The core problem:** The recommendation pipeline executes every step in strict serial order, making four separate LLM API calls with no timeouts, no concurrency, and no short-circuit paths. At typical LLM response times (2–8s per call), the AI chain alone can consume 8–32 seconds before any MCP data fetching, audit logging, or network overhead is counted.

**A secondary problem:** Because there is no per-phase timing or progress reporting, the endpoint behaves as a black box. Users see a spinner with no indication of which stage is running, which compounds perceived latency.

This enhancement addresses both problems: reducing actual latency by eliminating avoidable bottlenecks, and reducing perceived latency by adding processing stage visibility.

---

## 3. Situation Analysis Summary

Full findings in `solution-plan.md §2`. Summary:

| # | Bottleneck | Severity | Est. Latency Impact |
|---|-----------|----------|---------------------|
| 1 | 4 sequential LLM calls (incl. safety validator) | 🔴 Critical | 8–32s |
| 2 | MCP stdio subprocess spawned per request | 🔴 Critical | 200–800ms |
| 3 | O(N) file glob on cold MCP tool call | 🟠 High | 100–500ms |
| 4 | Audit logger full file read + dual synchronous write | 🟠 High | Grows with log size |
| 5 | No per-phase timing (blocks accurate diagnosis) | 🟡 Medium | N/A |
| 6 | Safety validator: no timeout, no rule fallback | 🟡 Medium | Unbounded tail |

---

## 4. Scope of This Enhancement

**In scope:**

1. Per-phase timing instrumentation across the orchestrator pipeline.
2. SSE stage stream endpoint — real-time processing stage visibility for the frontend.
3. Replace `ValidateRecommendation` LLM call with deterministic `RuleEvaluator` (eliminates 4th LLM round-trip).
4. MCP client singleton — eliminate per-request stdio subprocess startup.
5. Audit logger rewrite — JSONL-only append, seek-to-end hash read, remove JSON array dual-write.
6. Signal store startup cache warm — pre-index all records at server start, eliminate O(N) cold glob.
7. LLM call timeouts + graceful timeout fallback to rule-based output.
8. Merge Agents 2 + 3 → `MatchAndCompose` — eliminates one LLM call from the 3-call chain. True parallelism is not possible (Agent 3 depends on both Agent 1 and 2); collapsing Agents 2+3 is the best achievable reduction.
9. Cache Agent 1 output (`ClinicalRiskProfile`) — on warm hit, the AI chain runs 1 LLM call total.

**Out of scope:**

- Full parallelisation of the LLM chain (hard dependency graph prevents it).
- Replacing the file-based signal store with a database (owned by Data Platform team).
- Frontend SSE consumer implementation (Frontend team scope; backend SSE contract is in scope).
- Non-latency UI improvements.

---

## 5. Key Reference Documents

- `doc_outputs/onboarding/ai-team-onboarding.md` — Architecture overview, SLA targets (§10)
- `POC/v2/_project_management/5.enhancements/1.Backend Recommendation Pipeline Latency/solution-plan.md`
- `POC/v2/backend/src/services/orchestrator.py` — Pipeline entry point
- `POC/v2/backend/src/services/workflows/clinical.py` — AI chain (3-agent + safety)
- `POC/v2/backend/src/services/safety.py` — Safety validator (current LLM call)
- `POC/v2/backend/src/services/audit.py` — Audit logger (current blocking dual-write)
- `POC/v2/backend/src/services/mcp_client.py` — MCP client (current per-request subprocess)
- `POC/v2/backend/src/mcp_server/utils.py` — Signal store record loader (O(N) glob)
- `POC/v2/backend/src/services/rules.py` — Existing RuleEvaluator (reuse in ENH-2)
- `POC/v2/backend/src/api/routes/clinical.py` — Recommendation endpoint (SSE addition target)
- `POC/v2/_project_management/5.enhancements/1.Backend Recommendation Pipeline Latency/implementation/_discovery.md`
- `POC/v2/_project_management/5.enhancements/1.Backend Recommendation Pipeline Latency/implementation/_development_summary.md`
