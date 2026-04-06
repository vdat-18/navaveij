# Development Summary — Prompt Override + Runtime Versioning + Reset

**Date:** 2026-04-03
**Status:** Complete

## What Changed

### Backend

- Updated `backend/src/services/workflows/clinical.py` so the risk-profile cache key now includes `active_client`, `model_id`, and `template_version`.
- Added runtime prompt override helpers to `backend/src/services/prompt_selector.py`:
  - in-memory override store
  - auto-version stamping for prompt edits
  - explicit runtime version override
  - reset-to-YAML-default behavior
- Added prompt update/reset endpoints in `backend/src/api/routes/contracts.py`:
  - `PATCH /api/system-config/prompts/{client_name}`
  - `POST /api/system-config/prompts/{client_name}/reset`

### Frontend

- Added `updateClientPrompts()` and `resetClientPrompts()` to `frontend/src/services/api.ts`.
- Upgraded `frontend/src/components/access-monitoring/AIConfigsTab.tsx` from a read-only inspect modal to an inspect/edit modal with:
  - editable version field
  - editable textareas for each prompt template
  - save, cancel, and reset actions
  - inline loading/error states
  - whitespace-preserving prompt rendering

### Tests

- Extended backend coverage for:
  - runtime prompt override layering
  - explicit version override
  - reset behavior
  - risk-profile cache key partitioning by AI identity
  - prompt GET/PATCH/reset contract routes
- Added frontend API coverage for prompt update/reset methods.
- Extended `AIConfigsTab` coverage for inspect, edit, save, reset, whitespace preservation, and save-error behavior.

## Files Changed

- `backend/src/services/prompt_selector.py`
- `backend/src/services/workflows/clinical.py`
- `backend/src/api/routes/contracts.py`
- `scripts/tests/test_prompt_selector_paths.py`
- `scripts/tests/test_backend_cache_ttl.py`
- `scripts/tests/test_api_contract_routes.py`
- `frontend/src/services/api.ts`
- `frontend/src/services/api.prompt-override.test.ts`
- `frontend/src/components/access-monitoring/AIConfigsTab.tsx`
- `frontend/src/components/access-monitoring/AIConfigsTab.test.tsx`

## Notes

- Prompt overrides are intentionally non-persistent and disappear on restart.
- Model-name editing remains out of scope for this workstream and is still environment-backed.
