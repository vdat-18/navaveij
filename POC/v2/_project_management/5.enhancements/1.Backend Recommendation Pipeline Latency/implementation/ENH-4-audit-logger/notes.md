# ENH-4 — Audit Logger: JSONL-Only + Seek-to-End Hash

**Status:** ✅ Complete (2026-03-19)
**Bottleneck addressed:** B4 (full file read + dual synchronous write)
**Priority:** P1 (latency grows linearly with audit log history)

---

## Files to Modify

| File | Change |
|------|--------|
| `backend/src/services/audit.py` | Remove `_write_json_array()`; replace full-file hash read with seek-to-end; keep JSONL append |

## Exit Evidence

- [x] `audit.json` is no longer written — `__init__` only sets `log_file_jsonl`; `_write_json_array()` removed entirely
- [x] `_get_last_hash()` reads at most 4KB from end of file (binary seek-to-end)
- [x] SHA-256 hash chain maintained — only the read strategy changed, not the chain logic
- [x] Audit log entries still contain all 5 dimensions (Who / When / Where / What / Why)
- [x] `get_logs()` reads JSONL line-by-line (not from JSON array)
- [x] Regression suite passes

## Implementation Notes (2026-03-19)

`audit.py` changes: `_write_json_array()` method removed; both call sites in `log_recommendation()` and `log_decision()` removed. `__init__` only assigns `self.log_file_jsonl`. `get_logs()` opens `log_file_jsonl` and parses each line. `_get_last_hash()` opens file in binary mode, seeks to end, reads last 4KB, finds last non-empty line, decodes and parses JSON.
