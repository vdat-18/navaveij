# Development Summary — Backend Recommendation Pipeline Latency

Interpreted status, closed items, measured latency, and open risks. Updated after each step.

---

## Overall Status

| Phase | Status |
|-------|--------|
| Step 0 — Baseline capture | ⬜ Pending |
| Step 1 — ENH-1 Timing + SSE | ⬜ Pending |
| Step 2 — ENH-2 Safety rule validator | ⬜ Pending |
| Step 3 — ENH-3 MCP client singleton | ⬜ Pending |
| Step 4 — ENH-4 Audit logger rewrite | ⬜ Pending |
| Step 5 — ENH-5 Signal store cache warm | ⬜ Pending |
| Step 6 — ENH-6 LLM timeouts | ⬜ Pending |
| Step 7 — ENH-7 Merge Agents 2+3 | ⬜ Pending |
| Step 8 — ENH-8 Cache Agent 1 output | ⬜ Pending |

---

## Latency Measurements

### Baseline (pre-enhancement)

| Metric | Value |
|--------|-------|
| End-to-end `latency_ms` (test patient) | — not yet captured — |
| Phase breakdown | — not instrumented — |

### Post-ENH-1 (after timing instrumentation)

| Phase | Measured ms |
|-------|-------------|
| `mcp_fetch_ms` | — |
| `ai_chain_ms` | — |
| `safety_ms` | — |
| `audit_ms` | — |
| `rehydration_ms` | — |
| **Total** | — |

### Post-All-ENH (target)

| Metric | Target |
|--------|--------|
| `safety_ms` | < 5ms (rule-based) |
| `ai_chain_ms` | ≤ 24s (3 LLM calls × 8s max) |
| `audit_ms` | < 20ms (JSONL append only) |
| End-to-end (new patient, fast LLM) | ≤ 10s |

---

## Closed Items

_(None yet — updated as each ENH step is completed)_

---

## Open Risks

| Risk | Severity | Status |
|------|----------|--------|
| SSE implementation may need frontend changes to consume | Medium | Open — Frontend team to implement consumer |
| RuleEvaluator `validate_safety()` not yet implemented (only `evaluate()` exists) | Medium | Open — ENH-2 implementation will confirm |
| BAML `timeout_ms` support depends on configured provider | Low | Open — verify against Gemini endpoint |
| Signal store index not invalidated if files change at runtime | Low | Open — document restart requirement for POC |
| `MatchAndCompose` dual-objective prompt may degrade output quality vs. two specialised calls | Medium | Open — verify with side-by-side test on sample patient after ENH-7 |
| Cached `ClinicalRiskProfile` stale if signal store updates within TTL window | Low | Open — acceptable for POC (static data per session) |

---

## Test Results Reference

See `_lastest_test_results.md` for raw output from the most recent regression run.
