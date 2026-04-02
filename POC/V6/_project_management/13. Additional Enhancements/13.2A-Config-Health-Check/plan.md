# Plan — Client Health Check + Improved Active Client Switching

> Use checkbox (`- [ ]`) syntax to track steps during implementation. Execute tasks in order.

**Goal:** Add a subprocess-based health check service and API endpoint so the Config screen can validate a client before switching. Enhance the AI Configs tab with a "Test" → "Set Active" flow.

**Architecture:** New service module wrapping the existing subprocess validation pattern (`scripts/validate_clients.py`). One new API endpoint. Frontend UX change in the existing AI Configs tab.

**Tech Stack:** Python (FastAPI, subprocess, asyncio), TypeScript (React), Lucide React

---

## Phase 1 — Backend: Health Check Service

### Task 1 — Create subprocess health check module

**New file:** `backend/src/services/health_check.py`

- [ ] **Step 1:** Create the child-process validation function (mirrors `validate_clients.py:50-73`):
  - Sets `AI_ACTIVE_CLIENT={client_name}` in env copy
  - Imports BAML fresh, calls `b.AnalyzeClinicalRisks()` with dummy inputs
  - Returns JSON: `{client_name, ok, provider, model_id, template_version, latency_ms}` or `{client_name, ok: false, error: str}`

- [ ] **Step 2:** Create the parent-process runner:
  - `async def run_health_check(client_name: str) -> dict`
  - Validates `client_name` against `_ACTIVE_CLIENTS` registry
  - Spawns child via `asyncio.create_subprocess_exec()` with `--child --client {client_name}`
  - Parses JSON stdout, handles timeout (30s default), handles non-zero exit
  - Returns structured result dict

- [ ] **Step 3:** Add CLI entry point (`if __name__ == "__main__"` + argparse with `--child` and `--client` flags) so the module can run as both a library and a subprocess target

### Task 2 — Add health check API endpoint

**Modify file:** `backend/src/api/routes/contracts.py`

- [ ] **Step 1:** Add Pydantic models:
  ```python
  class HealthCheckRequest(BaseModel):
      client_name: str

  class HealthCheckResponse(BaseModel):
      client_name: str
      status: str  # "ok" | "error"
      provider: str | None = None
      model_id: str | None = None
      template_version: str | None = None
      latency_ms: int | None = None
      error_message: str | None = None
  ```

- [ ] **Step 2:** Add endpoint:
  ```python
  @router.post("/system-config/health-check", response_model=HealthCheckResponse)
  async def health_check(body: HealthCheckRequest, _auth=Depends(require_monitoring_access)):
  ```
  - Calls `run_health_check(body.client_name)`
  - Maps subprocess result to response model
  - Returns 200 with status "ok" or "error" (never 500 — errors are part of the payload)

---

## Phase 2 — Frontend: Test-Before-Activate UX

### Task 3 — Add health check API method

**Modify file:** `frontend/src/services/api.ts`

- [ ] **Step 1:** Add `HealthCheckResponse` TypeScript interface
- [ ] **Step 2:** Add `healthCheck(clientName: string): Promise<HealthCheckResponse>` to `clinicalService`

### Task 4 — Enhance AIConfigsTab with test flow

**Modify file:** `frontend/src/components/access-monitoring/AIConfigsTab.tsx`

- [ ] **Step 1:** Add state for per-row health check:
  ```typescript
  const [testingClient, setTestingClient] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, HealthCheckResponse>>({});
  ```

- [ ] **Step 2:** Add `handleTest(clientName)` function:
  - Sets `testingClient` state
  - Calls `clinicalService.healthCheck(clientName)`
  - Stores result in `testResults[clientName]`
  - Clears `testingClient`

- [ ] **Step 3:** Update Actions column rendering per row:
  - **If active:** "Active" badge (unchanged) + "Inspect"
  - **If not active, no test result:** "Test" button (amber outline) + "Set Active" (disabled, muted) + "Inspect"
  - **If testing:** Spinner + "Validating..." text + buttons disabled
  - **If test passed:** Green check + latency badge + "Set Active" (enabled, teal) + "Inspect"
  - **If test failed:** Red X + error tooltip + "Retry" button + "Set Active" (disabled) + "Inspect"

- [ ] **Step 4:** Add info tooltip on Model column: "Configured via .env — restart required to change model"

- [ ] **Step 5:** Update `handleSetActive()` to clear test result after successful switch

---

## Verification

- [ ] Health check returns `ok` with latency for a valid configured client (run against backend)
- [ ] Health check returns `error` for an invalid client name (422 or structured error)
- [ ] Subprocess does not leak state into parent process (verify by checking `_runtime_active_client` unchanged after test)
- [ ] "Set Active" button disabled until test passes
- [ ] After successful test + set active, config refreshes and new client shows as active
- [ ] Frontend builds without TypeScript errors
- [ ] Existing test suite still passes

---

## Files Changed

| File | Change type |
|---|---|
| `backend/src/services/health_check.py` | **New** — subprocess health check service |
| `backend/src/api/routes/contracts.py` | Modified — 1 new endpoint + 2 Pydantic models |
| `frontend/src/services/api.ts` | Modified — 1 new method + 1 interface |
| `frontend/src/components/access-monitoring/AIConfigsTab.tsx` | Modified — test-before-activate UX |

## Out of Scope

- Runtime model ID overrides (BAML clients freeze model at init; not feasible without restart)
- Editing the `.env` file from the UI
- Health-checking all clients in parallel (one-at-a-time is sufficient for a demo)
- Adding health check status as a persistent column (results are ephemeral per session)
