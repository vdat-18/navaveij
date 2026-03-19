# ENH-3 — MCP Client Singleton

**Status:** ⬜ Pending
**Bottleneck addressed:** B2 (stdio subprocess per request)
**Priority:** P1 (200–800ms saving per request)

---

## Files to Modify

| File | Change |
|------|--------|
| `backend/src/services/mcp_client.py` | Add module-level singleton session + `get_or_create_mcp_session()` + `close_mcp_session()` |
| `backend/src/services/orchestrator.py` | Replace `async with MCPClientFactory.get_client()` with `get_or_create_mcp_session()` |
| FastAPI app entry point (TBD) | Register startup/shutdown lifespan hooks |

## Exit Evidence

- [ ] Application startup log confirms MCP session initialised once
- [ ] Subsequent requests do not spawn a new subprocess (verify via process count or log)
- [ ] `close_mcp_session()` called cleanly on shutdown (no orphan processes)
- [ ] Reconnect path tested: session reset + one retry on `ConnectionError`
- [ ] Regression suite passes

## Notes

Identify the FastAPI app entry point / lifespan registration during implementation. The pattern `@app.on_event("startup")` or `lifespan` context manager is expected.

Reconnect handling: if a tool call raises `ConnectionError` or `BrokenPipeError`, set `_mcp_session = None` and retry the call once before raising.

_(Updated during implementation)_
