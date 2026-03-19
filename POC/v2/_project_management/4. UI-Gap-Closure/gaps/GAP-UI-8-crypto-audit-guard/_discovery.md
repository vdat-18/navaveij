# Discovery

**Verified:** 2026-03-19

| Item | Status |
|---|---|
| Availability guard for `crypto.subtle` | ✅ Present — unavailable branch sets `verifyResult` to `"no-https"` |
| Error boundary for hash verification | ✅ Present — digest/encoding wrapped in `try/catch` |
| Failure state is visible in UI | ✅ Present — dedicated `"no-https"` message and `"fail"` fallback are rendered |
