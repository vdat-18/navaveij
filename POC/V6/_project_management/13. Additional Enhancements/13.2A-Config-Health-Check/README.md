# README — Client Health Check + Improved Active Client Switching

**Workstream:** 13.2A
**Date:** 2026-04-03
**Status:** Implemented
**Scope:** Add subprocess-based health check validation and a "Test before Set Active" flow to the Config screen's AI Configs tab

---

## Context

The Config screen allows a sysadmin to switch the active LLM client via "Set Active," but there is no pre-switch validation. A misconfigured or down client silently breaks all downstream recommendations. The client wants the ability to test whether a given AI provider works before committing to it.

The repo already has a proven subprocess-based validation pattern in `scripts/validate_clients.py` — each client is tested in an isolated child process with a fresh BAML runtime. This workstream wraps that pattern into an API endpoint and enhances the frontend with a test-then-activate flow.

---

## Approach

1. **Backend:** New `health_check.py` service that spawns a child process per client (mirrors `validate_clients.py`). One new `POST /system-config/health-check` endpoint.
2. **Frontend:** AI Configs tab gains a "Test" button per row. "Set Active" is disabled until the test passes. Test results show provider, model, and latency.

The model column stays **read-only** — model IDs are configured via `.env` and frozen at BAML init time. "Changing the model" is achieved by switching between pre-configured clients.

## Implementation Notes

- Health-check failures are normalized into a `200` response payload with `status: "error"` so the UI can treat invalid client names and provider failures consistently.
- The subprocess runner adds `backend` and project root paths into `PYTHONPATH` before launching `python -m src.services.health_check --child`.
- AI Configs now uses an explicit `Test -> Set Active` flow for standby clients and shows inline retry/error or latency feedback per row.
- A 404 or missing health-check route is treated as a feature-level availability problem, with a blocking UI message that explains `Set Active` stays disabled until validation is working.
- Backend startup now logs the mounted `/api/system-config` routes to make stale runtime deployments easier to diagnose.
- The child process calls `b.HealthPing()` (defined in `baml_src/health_check.baml`) rather than `AnalyzeClinicalRisks` — a dedicated minimal BAML function that returns `{"ok": true}` only, avoiding the overhead of producing a full `ClinicalRiskProfile`.
- The Next.js proxy defaults to `http://localhost:8000` for local development. Set `BACKEND_URL` in `frontend/.env.local` to override.

---

## Related Documents

- [`problem.md`](./problem.md) — gap statement
- [`_discover.md`](./_discover.md) — codebase investigation findings
- [`plan.md`](./plan.md) — implementation plan with tracked tasks
- [`_development_summary.md`](./_development_summary.md) — filled after implementation
- [`_latest_test_results.md`](./_latest_test_results.md) — filled after implementation

---

## Files to Change

### Backend
| File | Change |
|---|---|
| `baml_src/health_check.baml` | **New** — `HealthPing() -> HealthPingResult` BAML function (minimal connectivity probe) |
| `backend/src/services/health_check.py` | **New** — subprocess health check service (child + parent pattern); child calls `b.HealthPing()` |
| `backend/src/api/routes/contracts.py` | 1 new endpoint: `POST /system-config/health-check` + Pydantic models |

### Frontend
| File | Change |
|---|---|
| `frontend/src/services/api.ts` | 1 new method: `healthCheck()` + `HealthCheckResponse` interface |
| `frontend/src/components/access-monitoring/AIConfigsTab.tsx` | Test-before-activate UX: per-row test state, Test/Retry button, conditional Set Active enabling |
| `frontend/src/app/api/proxy/[...path]/route.ts` | Default `BACKEND_URL` changed from hardcoded remote IP to `http://localhost:8000` |
| `frontend/.env.local` | **New** — sets `BACKEND_URL=http://localhost:8000` for local development |

---

## Out of Scope

- Runtime model ID overrides (BAML freezes model at init)
- Editing `.env` from the UI
- Health-checking all clients in parallel
- Persistent health status column (results are ephemeral per session)
