## Status: Implemented, verification in progress

## Code Changes

1. Updated `backend/src/api/routes/contracts.py`:
   - `template_version` set to `"v1.0"` in Stage-2 metadata.
   - `latency_ms` normalized to non-null integer (`int(latency_ms or 0)`).
   - `_build_critical_signals()` now accepts `high`/`critical` severities case-insensitively.
2. Updated recommendation cache key template marker to `"v1.0"` for consistency with Stage-2 metadata versioning.
