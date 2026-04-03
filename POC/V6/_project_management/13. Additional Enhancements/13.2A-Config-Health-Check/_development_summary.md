# Development Summary — Client Health Check + Improved Active Client Switching

**Date:** 2026-04-03
**Status:** Complete

## What Changed

### Backend

- Added `backend/src/services/health_check.py` to wrap subprocess client validation into an async service.
- Added `POST /api/system-config/health-check` in `backend/src/api/routes/contracts.py`.
- Normalized invalid client names, malformed child output, and runtime failures into structured `status: "error"` payloads.
- Added startup route logging in `backend/src/api/main.py` so mounted `/api/system-config` routes are visible during boot and stale runtime mismatches are easier to spot.

### Frontend

- Added `HealthCheckResponse` and `clinicalService.healthCheck()` in `frontend/src/services/api.ts`.
- Updated `frontend/src/components/access-monitoring/AIConfigsTab.tsx` so standby clients must pass a health check before `Set Active` becomes clickable.
- Added inline success and failure feedback:
  - `Tested` state with latency badge on success
  - `Retry` state with error message on failure
  - read-only model messaging that points users back to `.env`
- Hardened the health-check path so a `404 Not Found` becomes a clear feature-level message: `Health check service unavailable. Backend may be outdated or needs restart.`
- Added a blocking banner in the AI Configs tab to explain why `Set Active` remains disabled when validation infrastructure is unavailable.

### Tests

- Added backend tests in `scripts/tests/test_health_check.py`.
- Added backend startup logging coverage in `scripts/tests/test_ai_client_startup.py`.
- Added frontend component coverage in `frontend/src/components/access-monitoring/AIConfigsTab.test.tsx`.
- Added frontend API coverage in `frontend/src/services/api.health-check.test.ts`.

## Files Changed

- `backend/src/services/health_check.py`
- `backend/src/api/main.py`
- `backend/src/api/routes/contracts.py`
- `scripts/tests/test_health_check.py`
- `scripts/tests/test_ai_client_startup.py`
- `frontend/src/services/api.ts`
- `frontend/src/services/api.health-check.test.ts`
- `frontend/src/components/access-monitoring/AIConfigsTab.tsx`
- `frontend/src/components/access-monitoring/AIConfigsTab.test.tsx`

## Post-Implementation Refinements (2026-04-03)

### Dedicated BAML health-check function

Replaced the `AnalyzeClinicalRisks` + dummy-data pattern with a purpose-built BAML function:

- **New file:** `baml_src/health_check.baml` — defines `HealthPingResult { ok bool }` and `function HealthPing() -> HealthPingResult` with a single-line prompt (`Reply with {"ok": true} and nothing else.`)
- **Updated:** `backend/src/services/health_check.py` — child process now calls `await b.HealthPing()` instead of `b.AnalyzeClinicalRisks()` with 5 dummy arguments
- Run `baml-cli generate` after this change to regenerate `baml_client/`

Rationale: `AnalyzeClinicalRisks` requires the model to produce a full `ClinicalRiskProfile` schema, which is expensive and risks validation failures unrelated to connectivity. `HealthPing` produces `{"ok": true}` — the absolute minimum needed to confirm the model is reachable and responding.

### Proxy default URL fix

- **Updated:** `frontend/src/app/api/proxy/[...path]/route.ts` — changed hardcoded fallback from `http://13.229.14.32:8000` to `http://localhost:8000`
- **Added:** `frontend/.env.local` with `BACKEND_URL=http://localhost:8000` for local development

Without this fix, local dev builds proxy traffic to the remote server, which may not have the latest endpoints deployed — causing spurious "Health check service unavailable" errors even when the local backend is running correctly.

## Notes

- Existing `scripts/tests/test_access_monitoring_contract.py` still contains pre-existing RBAC-role drift (`admin`/`dpo` expectations vs current `sysadmin`/`executive` policy). That issue is unrelated to 13.2A and was not changed in this workstream.
- `baml-cli generate` must be re-run after adding `health_check.baml` before the backend will start cleanly.
