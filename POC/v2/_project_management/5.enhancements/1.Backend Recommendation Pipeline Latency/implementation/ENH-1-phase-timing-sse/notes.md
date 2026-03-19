# ENH-1 — Per-Phase Timing Instrumentation + SSE Stage Stream

**Status:** ✅ Complete (2026-03-19)
**Bottleneck addressed:** B5 (no per-phase timing)
**Priority:** P0 (first — needed to validate all other estimates)

---

## Files to Modify

| File | Change |
|------|--------|
| `backend/src/services/orchestrator.py` | Add `phase_timings` dict; emit progress via `progress_callback` |
| `backend/src/api/routes/clinical.py` | Add `POST /api/v1/clinical/recommend/stream` SSE endpoint |

## Exit Evidence

- [x] Response metadata includes `phase_timings` with keys: `workflow_ms`, `ai_chain_ms`, `safety_ms`, `audit_ms`, `rehydration_ms`, `total_ms`
- [x] `/api/v1/clinical/recommend/stream` returns `text/event-stream` with stage events followed by final JSON result
- [x] Existing `/api/v1/clinical/recommend` endpoint unchanged
- [x] Regression suite passes

## Implementation Notes (2026-03-19)

Phase timing: `time.monotonic()` markers at each phase boundary in `orchestrator.py`. `ai_chain_ms` is captured inside `clinical.py` and surfaced via `WorkflowContext`.

SSE endpoint: `StreamingResponse` with `text/event-stream` in `clinical.py`. Async task runs the recommendation pipeline while a generator streams stage-labelled JSON events. Final result emitted as a `result` event type. Error emitted as `error` event type.
