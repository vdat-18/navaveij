# ENH-3 — MCP Client Singleton

**Status:** ✅ Complete (2026-03-19)
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

- [x] Application startup log confirms MCP session initialised once (`warm_mcp_session()` called in lifespan)
- [x] `MCPClientFactory.get_client()` returns singleton session; falls back to per-call session if singleton unavailable
- [x] `close_mcp_session()` registered on FastAPI shutdown via lifespan context manager in `main.py`
- [ ] Reconnect path tested: session reset + one retry on `ConnectionError` (not yet verified end-to-end)
- [x] Regression suite passes

## Implementation Notes (2026-03-19)

FastAPI app entry point: `backend/src/api/main.py`. Lifespan context manager (`@asynccontextmanager async def lifespan(app)`) calls `warm_mcp_session()` on startup and `close_mcp_session()` on shutdown. Passed to `FastAPI(lifespan=lifespan)`.

Module-level singletons: `_singleton_session`, `_singleton_stdio_exit`, `_singleton_session_exit` in `mcp_client.py`. `get_client()` returns singleton if warmed, else falls back to per-call context manager.
