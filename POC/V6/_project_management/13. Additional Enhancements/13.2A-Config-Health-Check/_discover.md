# Discovery — Client Health Check + Improved Active Client Switching

**Date:** 2026-04-02
**Investigator:** Claude Code
**Trigger:** Client change request — test AI client connectivity before switching
**Resolution:** Pending implementation

---

## Investigation Scope

Audit of how active client switching works end-to-end, how the existing subprocess validation pattern operates, and what the BAML runtime supports for per-call overrides.

---

## Files Audited

### Active Client Resolution

| File | Finding |
|---|---|
| `backend/src/services/active_client.py:8-16` | `ResolvedActiveClient` frozen dataclass: `client_name`, `provider`, `model_id`, `prompt_registry_key` |
| `backend/src/services/active_client.py:19` | `_runtime_active_client: str | None = None` — in-memory override, resets on restart |
| `backend/src/services/active_client.py:21-52` | `_ACTIVE_CLIENTS` registry: 5 clients, model IDs read from `settings.*_model` at import time |
| `backend/src/services/active_client.py:55-61` | `set_runtime_active_client()`: validates client name exists in registry, sets override |
| `backend/src/services/active_client.py:64-73` | `resolve_active_client()`: candidate = explicit arg OR runtime override OR settings default |

### Existing Subprocess Validation Pattern

| File | Finding |
|---|---|
| `scripts/validate_clients.py:50-73` | `_run_child_validation()`: sets `AI_ACTIVE_CLIENT` in env, imports BAML fresh, calls `b.AnalyzeClinicalRisks()` with dummy inputs, returns structured JSON result |
| `scripts/validate_clients.py:77-125` | `_run_parent()`: iterates all 5 clients, spawns `subprocess.run()` per client with `--child --client {name}`, parses JSON stdout, reports ok/fail |
| `scripts/validate_clients.py:128-136` | `_run_child()`: entry point for child process, wraps `_run_child_validation()` in try/except, outputs JSON to stdout |

**Key insight:** The repo explicitly chose subprocess isolation because BAML client state is immutable after initialization. Each child process gets a clean BAML runtime with the target client's env vars. This is the **only trustworthy way** to validate a client.

### BAML Client Configuration

| File | Finding |
|---|---|
| `baml_src/clients.baml:17-67` | 5 named clients: GeminiClient (google-ai), OpenAIClient (openai), AnthropicClient (anthropic), LocalHostedClient (openai-generic), OpenRouterClient (openai-generic). Each reads model from `env.{PROVIDER}_MODEL` |
| `baml_src/clients.baml:74-89` | `ActiveModel` + `AnnotationModel` fallback chains: try all 5 clients in order |
| `baml_src/test.baml:4-16` | `HealthCheck` function: simple JSON response with status/model/timestamp. Hardcoded to `GeminiClient` — not suitable for per-client testing |

### Clinical Workflow Dispatch

| File | Finding |
|---|---|
| `backend/src/services/workflows/clinical.py:136-146` | `_build_llm_client()`: GeminiClient → bare `b`, all others → `b.with_options(client=resolved_client.client_name)`. Dispatches by **client name**, not model ID |
| `backend/src/services/workflows/clinical.py:227-229` | `resolve_active_client()` → `get_prompt_selector()` → `_build_llm_client()` — called fresh per recommendation |

### Frontend AI Configs Tab

| File | Finding |
|---|---|
| `frontend/src/components/access-monitoring/AIConfigsTab.tsx:35-43` | `handleSetActive()`: immediately calls `clinicalService.setActiveClient()`, no pre-validation |
| `frontend/src/components/access-monitoring/AIConfigsTab.tsx:107-131` | Actions column: "Active" badge OR "Set Active" + "Inspect" buttons. No health check button |
| `frontend/src/components/access-monitoring/AIConfigsTab.tsx:101` | Model column: static `<td>` with `client.model` text, read-only |

### API Endpoints

| File | Finding |
|---|---|
| `backend/src/api/routes/contracts.py:1177-1185` | `PATCH /system-config/active-client`: calls `set_runtime_active_client()`, returns new active client + template version |
| `backend/src/api/routes/contracts.py:1135-1174` | `GET /system-config`: returns all clients with provider, model, status |

---

## Key Findings

1. **Subprocess validation is the proven pattern.** `validate_clients.py` already implements truthful per-client validation via child processes. The health check service should reuse this exact pattern, not invent a new in-process approach.

2. **BAML `env` overrides (`b.with_options(env=...)`) are not trustworthy for health checks.** The repo moved away from in-process validation for a reason — provider-specific initialization (especially Google AI's Gemini provider) may cache config at import time.

3. **Model ID is frozen at startup.** `_ACTIVE_CLIENTS` reads `settings.*_model` once at import. The model column in the UI is correctly read-only. "Changing the model" is achieved by switching between pre-configured clients.

4. **The health check function in `test.baml` is hardcoded to GeminiClient.** It cannot be used for per-client validation. The subprocess approach calls `AnalyzeClinicalRisks` with dummy inputs instead — a more realistic validation.

5. **No existing health check API endpoint.** The subprocess validator is a CLI-only script, not exposed via the API.

---

## Recommendation

Create a `backend/src/services/health_check.py` that wraps the subprocess pattern from `validate_clients.py` into an async function callable from a FastAPI endpoint. The frontend adds a "Test" button per client row that must pass before "Set Active" is enabled.
