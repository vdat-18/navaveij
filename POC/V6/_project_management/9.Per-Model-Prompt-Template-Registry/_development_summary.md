# Development Summary — Per-Model Prompt Template Registry

**Workstream:** 9
**Date:** 2026-03-30
**State:** ✅ All parts complete

---

## Summary

Implemented as a single coordinated pass across five problem areas that were originally scoped as one (per-model prompt registry) but expanded on 2026-03-30 to include client rename, admin UI split, LLM-level audit logging, and a client validation script.

---

## Work Completed

### Part 1 — BAML Client Rename

Renamed all five named BAML clients to match their actual deployed model identities:

| Old | New | Model |
|---|---|---|
| `NavaveijClient` | `GeminiClient` | `gemini-3-flash-preview` (env `GEMINI_MODEL`) |
| `GPT4o` | `OpenAIClient` | `gpt-5.4-mini` |
| `Claude35Sonnet` | `AnthropicClient` | `claude-haiku-4-5` |
| `LocalLlama` | `LocalHostedClient` | `llama-3.3-70b-instruct` |
| `OpenRouterClient` | `OpenRouterClient` | `openai/gpt-oss-120b` (hardcoded) |

- `NavaveijWithFallback` deleted (legacy, no callers).
- `ActiveModel` fallback chain updated: `GeminiClient → OpenAIClient → AnthropicClient → LocalHostedClient → OpenRouterClient`.
- `AnnotationModel` redefined with the **same** fallback chain as `ActiveModel` (no separate `LLM_ANNOTATION_MODEL` env var).
- All non-clinical BAML files (`test.baml`, `synthesis/hybrid_generator.baml`, `synthesis/enrichment.baml`, `clinical/safety_critic.baml`) updated from old names.
- `shared/settings.py`: `ai_active_client` default changed to `"GeminiClient"`, comment updated to list new valid values; added `openai_api_key`, `anthropic_api_key`, `openrouter_api_key` fields.
- `.env.example` rewritten around provider-native env names; removed `LLM_ANNOTATION_MODEL` and the legacy Gemini `LLM_*` keys.
- `backend/src/api/routes/contracts.py` `get_system_config()` updated to list new client names and mark the active client dynamically; `template_version` now sourced live from `prompt_selector.version`.

### Part 2 — Per-Model Prompt Template Registry

- Created `baml_src/prompts/` directory with five YAML files (identical content for POC; tunable per model in production):
  - `gemini.yaml` (version: `gemini-v1`)
  - `openai.yaml` (version: `openai-v1`)
  - `anthropic.yaml` (version: `anthropic-v1`)
  - `openrouter.yaml` (version: `openrouter-v1`)
  - `local.yaml` (version: `local-v1`)
- Created `backend/src/services/prompt_selector.py` — `PromptTemplateSelector` singleton that loads the YAML file matching `AI_ACTIVE_CLIENT` at startup; falls back to `gemini.yaml` for unknown client names.
- Updated all four BAML function signatures in `baml_src/clinical/recommendation_output.baml` to accept `system_prompt: string` as first parameter; static prompt body replaced with `{{ system_prompt }}`.
- Regenerated `baml_client/` via `baml-cli generate` (14 files written, no errors).
- Updated `backend/src/services/workflows/clinical.py`:
  - Imports `prompt_selector`.
  - Passes `system_prompt=prompt_selector.get("<key>")` to each BAML call.
  - Records per-call timing into `context.llm_call_records`.
- Added `llm_call_records: list[dict[str, Any]]` field to `WorkflowContext` in `backend/src/services/workflows/base.py`.

### Part 3 — System Config Tab Split (Frontend)

- Created `frontend/src/components/access-monitoring/MCPConfigsTab.tsx` — renders MCP Tool Inventory and Auth Configuration.
- Created `frontend/src/components/access-monitoring/AIConfigsTab.tsx` — renders Active AI Model badge (with live `template_version`) and BAML Client Registry table; includes updated `AI_ACTIVE_CLIENT` valid-values hint.
- Updated `frontend/src/components/access-monitoring/AccessMonitoringScreen.tsx`:
  - `TabKey` type changed from `"role" | "mapping" | "master" | "sysconfig"` to `"role" | "mapping" | "master" | "mcp_config" | "ai_config"`.
  - "System Config" tab replaced with two tabs: **MCP Configs** and **AI Configs**.
- Deleted `frontend/src/components/access-monitoring/SystemConfigTab.tsx`.

### Part 4 — LLM Request Audit Logging

Backend:
- `backend/src/services/audit.py` — added `log_llm_request()` method with full 5-dimension structure (WHO, WHEN, WHERE, WHAT, WHY). Each entry carries `event: "LLM_REQUEST"`, `function_name`, `model_id`, `template_version`, `prompt_template_key`, `latency_ms`, and links back to the parent recommendation via `parent_request_id`. Hash-chained identically to all other audit entries.
- `backend/src/services/orchestrator.py` — after `workflow.execute()`, loops `context.llm_call_records` and calls `log_llm_request()` for each record. Also injects `template_version` into `context.ai_output["metadata"]`.
- `backend/src/api/routes/contracts.py` — `_normalize_runtime_audit_entries()` now detects `what.event == "LLM_REQUEST"` and normalizes `action_type` to `"LLMRequest"`, surfaces `function_name` and `prompt_template_key` in the normalized `what` dict, and uses the actual `template_version` from the raw entry rather than a static `"v1.0"`.

Frontend:
- `frontend/src/types/access-monitoring.ts` — added `function_name?: string | null` and `prompt_template_key?: string | null` to `AuditLogEntry.what`.
- `frontend/src/components/access-monitoring/AuditLogSearchPanel.tsx`:
  - Added `"LLMRequest"` to `ACTION_OPTIONS` filter dropdown.
  - WHAT detail panel conditionally shows LLM-specific fields (`function_name`, `model_id`, `template_version`, `latency_ms`, `prompt_template_key`) when `action_type === "LLMRequest"`; standard recommendation fields shown for all other entry types.

### Part 5 — Client Validation Script

- Created `scripts/validate_clients.py` — per-client connectivity smoke-test.
  - Iterates all 5 named clients: `GeminiClient`, `OpenAIClient`, `AnthropicClient`, `OpenRouterClient`, `LocalHostedClient`.
  - For each: temporarily sets `AI_ACTIVE_CLIENT`, makes a minimal `AnalyzeClinicalRisks` call with dummy data, and reports `✓ OK (Xms)` or `✗ FAIL — <error>`.
  - Exits 0 if all pass, 1 if any fail (CI-friendly).
  - Usage: `uv run python scripts/validate_clients.py`

---

## Files Changed

| File | Change |
|---|---|
| `baml_src/clients.baml` | Renamed 5 clients, updated models, updated chains, removed NavaveijWithFallback |
| `baml_src/clinical/recommendation_output.baml` | Added `system_prompt` param to 4 functions |
| `baml_src/clinical/safety_critic.baml` | Updated client reference |
| `baml_src/test.baml` | Updated client references |
| `baml_src/synthesis/hybrid_generator.baml` | Updated client references |
| `baml_src/synthesis/enrichment.baml` | Updated client reference |
| `baml_src/prompts/gemini.yaml` | New |
| `baml_src/prompts/openai.yaml` | New |
| `baml_src/prompts/anthropic.yaml` | New |
| `baml_src/prompts/openrouter.yaml` | New |
| `baml_src/prompts/local.yaml` | New |
| `baml_client/` | Regenerated by `baml-cli generate` |
| `backend/src/services/prompt_selector.py` | New |
| `backend/src/services/workflows/base.py` | Added `llm_call_records` field |
| `backend/src/services/workflows/clinical.py` | Wired prompt_selector; per-call timing into llm_call_records |
| `backend/src/services/audit.py` | Added `log_llm_request()` |
| `backend/src/services/orchestrator.py` | Loops llm_call_records → log_llm_request; injects template_version into metadata |
| `backend/src/api/routes/contracts.py` | Updated `get_system_config()`; LLM_REQUEST normalization in audit endpoint |
| `shared/settings.py` | Updated `ai_active_client` default and comment; added API key fields |
| `.env.example` | Updated client names, model strings, and provider-native env keys; removed `LLM_ANNOTATION_MODEL` and legacy Gemini `LLM_*` keys |
| `frontend/src/types/access-monitoring.ts` | Added `function_name`, `prompt_template_key` to `AuditLogEntry.what` |
| `frontend/src/components/access-monitoring/MCPConfigsTab.tsx` | New |
| `frontend/src/components/access-monitoring/AIConfigsTab.tsx` | New |
| `frontend/src/components/access-monitoring/AccessMonitoringScreen.tsx` | Tab split (mcp_config + ai_config) |
| `frontend/src/components/access-monitoring/SystemConfigTab.tsx` | Deleted |
| `frontend/src/components/access-monitoring/AuditLogSearchPanel.tsx` | LLMRequest action type; expanded WHAT detail panel |
| `scripts/validate_clients.py` | New — per-client smoke-test |
