# Discovery — Per-Model Prompt Template Registry

**Date:** 2026-03-30
**Investigator:** Codex
**Trigger:** Client review of Technical Proposal + expanded client request (2026-03-30)
**Resolution:** All findings resolved — see `_development_summary.md` for implementation details

---

## Investigation Trigger

TOR §4.3 requires:

> *"The system must also provide 'Prompt Template Management' separated for each model"*

POC V6 at the start of this workstream had:
- A single static prompt body per BAML function, hardcoded inline in `.baml` files
- No per-model YAML registry or selector service
- `AI_ACTIVE_CLIENT` routing that changed the inference endpoint but sent identical prompts to every model
- BAML client names (`NavaveijClient`, `GPT4o`, `Claude35Sonnet`, `LocalLlama`) that did not reflect the deployed models

The 2026-03-30 client review expanded the original problem statement (workstream 9) into four coupled changes:

1. Rename clients to match actual deployed model identities
2. Per-model prompt registry with a YAML file per client
3. Split the "System Config" admin tab into separate MCP Configs and AI Configs tabs
4. LLM request audit logging per BAML function call, using the same 5-dimension framework as recommendation audit entries

---

## Files Audited

| File | Finding |
|---|---|
| `baml_src/clients.baml` | Client names did not match deployed models; `NavaveijWithFallback` was legacy-dead; `AnnotationModel` pointed to a separate env var |
| `baml_src/clinical/recommendation_output.baml` | All 4 BAML functions had prompt bodies hardcoded inline; no `system_prompt` injection mechanism |
| `baml_src/synthesis/*.baml`, `baml_src/test.baml`, `baml_src/clinical/safety_critic.baml` | Multiple non-clinical BAML files still referenced `NavaveijWithFallback` and old client names |
| `backend/src/services/workflows/clinical.py` | BAML calls had no system_prompt argument; no per-call latency recording |
| `backend/src/services/workflows/base.py` | `WorkflowContext` had no field for per-call LLM timing records |
| `backend/src/services/audit.py` | `log_recommendation()` and `log_decision()` existed; no `log_llm_request()` method |
| `backend/src/services/orchestrator.py` | Emitted one audit entry per recommendation; no LLM-call-level logging |
| `backend/src/api/routes/contracts.py` | `get_system_config()` hardcoded old client names and a static `template_version`; `_normalize_runtime_audit_entries()` had no handling for `LLM_REQUEST` events |
| `shared/settings.py` | `ai_active_client` default was `GPT4o`; comment listed stale valid values; no `openai_api_key`, `anthropic_api_key` fields |
| `.env.example` | Referenced `LLM_ANNOTATION_MODEL`, stale client names, wrong model strings |
| `frontend/src/components/access-monitoring/SystemConfigTab.tsx` | Monolithic — mixed AI model config and MCP tool inventory in one component |
| `frontend/src/components/access-monitoring/AccessMonitoringScreen.tsx` | Single `"sysconfig"` tab; no MCP/AI split |
| `frontend/src/types/access-monitoring.ts` | `AuditLogEntry.what` had no `function_name` or `prompt_template_key` fields |
| `frontend/src/components/access-monitoring/AuditLogSearchPanel.tsx` | `ACTION_OPTIONS` did not include `"LLMRequest"`; WHAT detail panel showed no LLM-specific fields |

---

## Root Causes Identified

### RC-1 — Prompt content is model-agnostic by construction

BAML functions (`AnalyzeClinicalRisks`, `MatchPolicy`, `WriteNarrative`, `AnnotateReasoningLines`) had their system prompt hardcoded inline. There was no parameter to inject a model-specific prompt at call time. Switching `AI_ACTIVE_CLIENT` changed where inference happened but not what was sent.

### RC-2 — Client naming did not reflect production reality

The Gemini endpoint was configured as `NavaveijClient` with no indication of the actual model family. `GPT4o` referenced `gpt-4o`; the client wanted `gpt-5.4-mini`. `Claude35Sonnet` referenced `claude-3-5-sonnet-20241022`; the client wanted `claude-haiku-4-5`. `LocalLlama` referenced `llama3.1:70b`; the client wanted `llama-3.3-70b-instruct`. This created a mismatch between documentation, the admin UI, and actual inference behavior.

### RC-3 — Audit trail was incomplete for LLM requests

`log_recommendation()` logged model_id at the recommendation level but did not capture per-function call timing, which prompt template was used, or which BAML function was invoked. This left a compliance gap under TOR §5.3 and the client's Who-What-Why-When-Where framework.

### RC-4 — Admin UI conflated two orthogonal concerns

The System Config tab mixed MCP tool inventory (protocol-level, rarely changes) with AI model configuration (switches per demo). Admin users could not quickly find model config without scrolling past MCP tool tables.

---

## Design Decisions Made

| Decision | Rationale |
|---|---|
| `AnnotationModel` uses the same fallback chain as `ActiveModel` | Client confirmed annotation should always match the active clinical model; no separate env var needed |
| One YAML prompt file per client (5 files, identical for POC) | Provides the structural hook for future per-model tuning without requiring code changes |
| Per-BAML-call audit entries (4 per recommendation, not one aggregate) | Per-call granularity is required to answer "which prompt template was used for MatchPolicy?" and "why did this function take 3× longer?" |
| `llm_call_records` appended in `ClinicalReasoningWorkflow`, flushed in `OrchestrationManager` | Keeps audit concerns out of the workflow; timing is captured closest to the actual call |
| "MCP Configs" and "AI Configs" as two new top-level tabs replacing "System Config" | Clearest conceptual separation; avoids nested sub-tab complexity for the POC |
