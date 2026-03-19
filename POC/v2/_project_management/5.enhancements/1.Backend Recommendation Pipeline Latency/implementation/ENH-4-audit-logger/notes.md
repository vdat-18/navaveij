# ENH-4 — Audit Logger: JSONL-Only + Seek-to-End Hash

**Status:** ⬜ Pending
**Bottleneck addressed:** B4 (full file read + dual synchronous write)
**Priority:** P1 (latency grows linearly with audit log history)

---

## Files to Modify

| File | Change |
|------|--------|
| `backend/src/services/audit.py` | Remove `_write_json_array()`; replace full-file hash read with seek-to-end; keep JSONL append |

## Exit Evidence

- [ ] `audit.json` is no longer written (only `audit.jsonl`)
- [ ] `_get_last_hash()` reads at most 4KB from end of file regardless of log size
- [ ] SHA-256 hash chain verified across 3+ consecutive entries (last_hash of entry N = current_hash of entry N-1)
- [ ] Audit log entries still contain all 5 dimensions (Who / When / Where / What / Why)
- [ ] `audit_ms` (from ENH-1 instrumentation) is < 20ms
- [ ] Regression suite passes

## Notes

The seek-to-end approach reads binary and finds the last non-empty line within the last 4KB. If a single log entry exceeds 4KB (unlikely at ~10KB average), increase the buffer. Open in binary mode to avoid UTF-8 boundary issues; decode only the found line.

Check whether any other code (tests, admin scripts) reads from `audit.json` and update accordingly.

_(Updated during implementation)_
