# ENH-5 — Signal Store Startup Cache Warm + Registry Index

**Status:** ⬜ Pending
**Bottleneck addressed:** B3 (O(N) file glob on cold MCP tool call)
**Priority:** P2 (100–500ms cold saving; warm requests already fast via TTL cache)

---

## Files to Modify

| File | Change |
|------|--------|
| `backend/src/mcp_server/utils.py` | Add `_signal_store_index` dict; add `_registry_index` dict; update `load_signal_store_record()` and registry lookup to use indexes |
| FastAPI app entry point | Register `warm_indexes()` on startup lifespan hook (piggyback on ENH-3 hook) |

## Exit Evidence

- [ ] Startup log confirms signal store index built (N files indexed)
- [ ] First MCP tool call for a known patient does not trigger glob scan (confirmed via log or timing)
- [ ] `mcp_fetch_ms` (from ENH-1 instrumentation) does not spike on cold requests
- [ ] Index covers both `patient_id` and `patient_token` as lookup keys
- [ ] Regression suite passes

## Notes

The index is built at module import or first call, and warmed explicitly at FastAPI startup. For POC, the index is not invalidated at runtime — a server restart is required if signal store files change. Document this limitation in `_discovery.md`.

Registry index: keyed by `patient_id` → patient record dict. Replaces the `next((item for item in registry if ...), None)` linear scan in `utils.py:88-89`.

_(Updated during implementation)_
