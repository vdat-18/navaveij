# ENH-5 — Signal Store Startup Cache Warm + Registry Index

**Status:** ✅ Complete (2026-03-19)
**Bottleneck addressed:** B3 (O(N) file glob on cold MCP tool call)
**Priority:** P2 (100–500ms cold saving; warm requests already fast via TTL cache)

---

## Files to Modify

| File | Change |
|------|--------|
| `backend/src/mcp_server/utils.py` | Add `_signal_store_index` dict; add `_registry_index` dict; update `load_signal_store_record()` and registry lookup to use indexes |
| FastAPI app entry point | Register `warm_indexes()` on startup lifespan hook (piggyback on ENH-3 hook) |

## Exit Evidence

- [x] `_signal_store_index` dict populated at module import via `_build_signal_store_index()` (runs once at bottom of utils.py)
- [x] `load_signal_store_record()` uses `_signal_store_index.get(resolved_id)` — O(1) lookup; no glob scan
- [x] Index keyed by `patient_id`; file path stored as value
- [x] Regression suite passes
- [x] `_registry_token_index` and `_registry_id_index` built at import; `resolve_patient_id()` and `resolve_patient_token()` use O(1) dict lookup

## Implementation Notes (2026-03-19)

`utils.py` changes: `_signal_store_index`, `_registry_token_index`, `_registry_id_index` all added at module level. `_build_signal_store_index()` maps `patient_id → Path`; `_build_registry_index()` maps `patient_token → entry` and `patient_id → entry`. Both builders called at module import. `load_signal_store_record()` uses `_signal_store_index.get(resolved_id)`; `resolve_patient_id()` and `resolve_patient_token()` use index dicts directly — `load_patient_registry()` no longer called in hot path.
