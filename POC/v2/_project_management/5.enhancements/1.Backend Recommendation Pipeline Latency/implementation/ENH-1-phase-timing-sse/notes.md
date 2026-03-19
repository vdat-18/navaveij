# ENH-1 — Per-Phase Timing Instrumentation + SSE Stage Stream

**Status:** ⬜ Pending
**Bottleneck addressed:** B5 (no per-phase timing)
**Priority:** P0 (first — needed to validate all other estimates)

---

## Files to Modify

| File | Change |
|------|--------|
| `backend/src/services/orchestrator.py` | Add `phase_timings` dict; emit progress via `progress_callback` |
| `backend/src/api/routes/clinical.py` | Add `POST /api/v1/clinical/recommend/stream` SSE endpoint |

## Exit Evidence

- [ ] Response metadata includes `phase_timings` with keys: `mcp_fetch_ms`, `ai_chain_ms`, `safety_ms`, `audit_ms`, `rehydration_ms`
- [ ] `/api/v1/clinical/recommend/stream` returns `text/event-stream` with 7 stage events followed by final JSON
- [ ] Existing `/api/v1/clinical/recommend` endpoint unchanged
- [ ] Regression suite passes

## Notes

_(Updated during implementation)_
