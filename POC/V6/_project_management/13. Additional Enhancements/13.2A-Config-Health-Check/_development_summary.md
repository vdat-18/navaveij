# Development Summary — Client Health Check + Improved Active Client Switching

**Date:** 2026-04-02
**Status:** Complete

## What Changed

### Backend

- Added `backend/src/services/health_check.py` to wrap subprocess client validation into an async service.
- Added `POST /api/system-config/health-check` in `backend/src/api/routes/contracts.py`.
- Normalized invalid client names, malformed child output, and runtime failures into structured `status: "error"` payloads.

### Frontend

- Added `HealthCheckResponse` and `clinicalService.healthCheck()` in `frontend/src/services/api.ts`.
- Updated `frontend/src/components/access-monitoring/AIConfigsTab.tsx` so standby clients must pass a health check before `Set Active` becomes clickable.
- Added inline success and failure feedback:
  - `Tested` state with latency badge on success
  - `Retry` state with error message on failure
  - read-only model messaging that points users back to `.env`

### Tests

- Added backend tests in `scripts/tests/test_health_check.py`.
- Added frontend component coverage in `frontend/src/components/access-monitoring/AIConfigsTab.test.tsx`.
- Added frontend API coverage in `frontend/src/services/api.health-check.test.ts`.

## Files Changed

- `backend/src/services/health_check.py`
- `backend/src/api/routes/contracts.py`
- `scripts/tests/test_health_check.py`
- `frontend/src/services/api.ts`
- `frontend/src/services/api.health-check.test.ts`
- `frontend/src/components/access-monitoring/AIConfigsTab.tsx`
- `frontend/src/components/access-monitoring/AIConfigsTab.test.tsx`

## Notes

- Existing `scripts/tests/test_access_monitoring_contract.py` still contains pre-existing RBAC-role drift (`admin`/`dpo` expectations vs current `sysadmin`/`executive` policy). That issue is unrelated to 13.2A and was not changed in this workstream.
