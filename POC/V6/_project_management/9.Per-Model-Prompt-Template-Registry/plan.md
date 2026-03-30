# Plan — Per-Model Prompt Template Registry (Revised)

**Original Date:** 2026-03-27
**Revised Date:** 2026-03-30
**Input:** `problem.md` + expanded client request (2026-03-30)
**Superseded by:** `/Users/nguyen.tran/.claude/plans/tranquil-spinning-eclipse.md`

> **Note:** The original 2026-03-27 plan covered Tasks 1–6 (YAML registry, PromptTemplateSelector, BAML signature update, workflow wiring, template_version in audit, .env.example update). The 2026-03-30 client review expanded the scope to include client rename, admin UI split, and LLM-level audit logging. This file reflects the full revised scope.

---

## Part 1 — BAML Client Rename ✅

### Client identity mapping

| Old | New | Provider | Model |
|---|---|---|---|
| `NavaveijClient` | `GeminiClient` | `openai-generic` | `gemini-3-flash-preview` (env `LLM_MODEL`) |
| `GPT4o` | `OpenAIClient` | `openai` | `gpt-5.4-mini` |
| `Claude35Sonnet` | `AnthropicClient` | `anthropic` | `claude-haiku-4-5` |
| `OpenRouterClient` | `OpenRouterClient` | `openai-generic` | `openai/gpt-oss-120b` (hardcoded) |
| `LocalLlama` | `LocalHostedClient` | `openai-generic` | `llama-3.3-70b-instruct` |
| `NavaveijWithFallback` | _(deleted)_ | — | — |

`ActiveModel` chain: `GeminiClient → OpenAIClient → AnthropicClient → LocalHostedClient → OpenRouterClient`
`AnnotationModel` uses the same chain as `ActiveModel` (no separate model).

**Status: Complete**

---

## Part 2 — Per-Model Prompt Template Registry ✅

### Task 1 — Create YAML template registry files ✅

**New files:**
- `baml_src/prompts/gemini.yaml` — `version: "gemini-v1"`
- `baml_src/prompts/openai.yaml` — `version: "openai-v1"`
- `baml_src/prompts/anthropic.yaml` — `version: "anthropic-v1"`
- `baml_src/prompts/openrouter.yaml` — `version: "openrouter-v1"`
- `baml_src/prompts/local.yaml` — `version: "local-v1"`

Content is identical for POC; tunable per model in production without code changes.

### Task 2 — Add `PromptTemplateSelector` service ✅

**New file:** `backend/src/services/prompt_selector.py`

```python
_CLIENT_TO_FILE = {
    "GeminiClient":      "gemini",
    "OpenAIClient":      "openai",
    "AnthropicClient":   "anthropic",
    "OpenRouterClient":  "openrouter",
    "LocalHostedClient": "local",
}
# Default fallback: gemini
```

### Task 3 — Update BAML function signatures ✅

Added `system_prompt: string` as first param to all 4 functions in `baml_src/clinical/recommendation_output.baml`. Static prompt body replaced with `{{ system_prompt }}`. `baml-cli generate` run — 14 files regenerated cleanly.

### Task 4 — Wire `PromptTemplateSelector` into `ClinicalReasoningWorkflow` ✅

`prompt_selector` imported and `system_prompt=prompt_selector.get("<key>")` passed to each BAML call. Per-call timing appended to `context.llm_call_records`.

### Task 5 — Add `template_version` to metadata and audit trail ⬜

Pending: orchestrator not yet reading `context.llm_call_records` and calling `log_llm_request()`.

### Task 6 — Update `.env.example` ✅

`LLM_ANNOTATION_MODEL` removed. New client names and model strings documented.

---

## Part 3 — System Config Tab Split (Frontend) ✅

Replaced single `"sysconfig"` tab with:
- **MCP Configs** tab — `MCPConfigsTab.tsx` (MCP Tool Inventory + Auth Configuration)
- **AI Configs** tab — `AIConfigsTab.tsx` (Active AI Model + BAML Client Registry)

`SystemConfigTab.tsx` deleted. `AccessMonitoringScreen.tsx` updated.

**Status: Complete**

---

## Part 4 — LLM Request Audit Logging ⬜

### Completed sub-tasks
- `WorkflowContext.llm_call_records` field added ✅
- Per-call timing recorded in `clinical.py` ✅
- `AuditLogEntry.what` extended with `function_name`, `prompt_template_key` ✅
- `"LLMRequest"` added to `ACTION_OPTIONS` in `AuditLogSearchPanel.tsx` ✅

### Remaining sub-tasks
- `audit.py` — add `log_llm_request()` method
- `orchestrator.py` — loop `context.llm_call_records → log_llm_request()`; inject `template_version` into recommendation metadata
- `contracts.py` — handle `LLM_REQUEST` events in `_normalize_runtime_audit_entries()`
- `AuditLogSearchPanel.tsx` — expand WHAT detail panel for LLM-specific fields

---

## Part 5 — Client Validation Script ⬜

**New file:** `scripts/validate_clients.py`

For each of the 5 named clients, makes a minimal BAML inference call and reports `✓ OK` or `✗ FAIL — <error>`. Exits non-zero if any client fails. Suitable for pre-demo smoke-testing.

---

## Files Changed Summary

| File | Status |
|---|---|
| `baml_src/clients.baml` | ✅ Done |
| `baml_src/prompts/gemini.yaml` | ✅ Done |
| `baml_src/prompts/openai.yaml` | ✅ Done |
| `baml_src/prompts/anthropic.yaml` | ✅ Done |
| `baml_src/prompts/openrouter.yaml` | ✅ Done |
| `baml_src/prompts/local.yaml` | ✅ Done |
| `backend/src/services/prompt_selector.py` | ✅ Done |
| `baml_src/clinical/recommendation_output.baml` | ✅ Done |
| `baml_client/` | ✅ Regenerated |
| `backend/src/services/workflows/base.py` | ✅ Done |
| `backend/src/services/workflows/clinical.py` | ✅ Done |
| `backend/src/services/audit.py` | ⬜ Pending |
| `backend/src/services/orchestrator.py` | ⬜ Pending |
| `backend/src/api/routes/contracts.py` | ✅ system-config done / ⬜ LLM_REQUEST normalize pending |
| `shared/settings.py` | ✅ Done |
| `.env.example` | ✅ Done |
| `frontend/src/types/access-monitoring.ts` | ✅ Done |
| `frontend/src/components/access-monitoring/MCPConfigsTab.tsx` | ✅ Done |
| `frontend/src/components/access-monitoring/AIConfigsTab.tsx` | ✅ Done |
| `frontend/src/components/access-monitoring/AccessMonitoringScreen.tsx` | ✅ Done |
| `frontend/src/components/access-monitoring/SystemConfigTab.tsx` | ✅ Deleted |
| `frontend/src/components/access-monitoring/AuditLogSearchPanel.tsx` | ✅ LLMRequest action done / ⬜ WHAT detail pending |
| `scripts/validate_clients.py` | ⬜ Pending |
