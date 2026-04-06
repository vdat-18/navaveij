# Development Summary — Per-Model Prompt Template Registry

**Workstream:** 9  
**Date:** 2026-03-30  
**State:** ✅ Implemented and locally verified

---

## Summary

The workstream ended as four coupled repairs plus one config cleanup:

1. validated active-client resolution
2. workflow dispatch and audit integrity
3. API metadata/cache/admin consistency
4. isolated client validation and final verification
5. trace-level `LLMRequest` audit expansion and UI inspection
6. provider-native env normalization for Gemini/OpenAI/Anthropic/OpenRouter/LocalHosted

The resulting system now derives prompt selection, runtime metadata, cache keys, audit fields, and admin display from the same resolved client identity.

---

## Scope Outcomes

### Scope 1 — Active Client Resolution

- added `backend/src/services/active_client.py` as the single validated registry for:
  - `client_name`
  - `provider`
  - `model_id`
  - `prompt_registry_key`
- refactored `prompt_selector.py` to consume the resolver instead of local fallback maps
- changed invalid `AI_ACTIVE_CLIENT` handling from silent fallback to explicit failure

### Scope 2 — Workflow Dispatch and Audit Integrity

- updated `backend/src/services/workflows/clinical.py` to dispatch by resolved client identity
- preserved the Gemini default-client path and used explicit `b.with_options(client=...)` for non-Gemini clients
- recorded accurate per-call audit metadata and independent latencies
- updated `backend/src/services/orchestrator.py` and `backend/src/services/audit.py` to emit resolved model identity into recommendation and `LLMRequest` rows
- expanded `LLMRequest` rows to retain masked input/output traces per function call

### Scope 3 — API Metadata, Cache, and Admin Consistency

- removed hardcoded `"v1.0"` and shared-model assumptions from recommendation metadata normalization
- partitioned recommendation cache keys by resolved `active_client`, `model_id`, and `template_version`
- rebuilt `/api/system-config` from the validated resolver path
- aligned access-monitoring contracts and UI with resolved runtime metadata

### Scope 4 — Validation Harness and Final Verification

- rewrote `scripts/validate_clients.py` as an isolated subprocess-per-client harness
- ensured `.env` is hydrated before BAML imports in child validation runs
- produced structured pass/fail results per client and a human-readable summary table
- refreshed the workstream docs from fresh command output instead of the old placeholder status
- added `scripts/tests/test_validate_clients.py` as harness regression coverage

### Trace-Level `LLMRequest` Audit Expansion

- extended workflow trace capture so each LLM call records:
  - masked input trace
  - masked output trace
  - prompt/template/runtime identity metadata
- preserved those fields through `/api/audit-logs` normalization
- added a modal inspector in `AuditLogSearchPanel.tsx` so admins can review masked request/response traces for `LLMRequest` rows

### Provider-Native Env Normalization

- moved Gemini from the legacy OpenAI-compatible env contract to the native `google-ai` provider
- normalized config files and settings around:
  - `GOOGLE_API_KEY`, `GEMINI_MODEL`
  - `OPENAI_API_KEY`, `OPENAI_MODEL`
  - `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`
  - `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_BASE_URL`
  - `LOCALHOSTED_BASE_URL`, `LOCALHOSTED_API_KEY`, `LOCALHOSTED_MODEL`
- removed the old Gemini `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`, and `LLM_ANNOTATION_MODEL` contract from active use

---

## Main Files Changed

### Runtime and config

- `baml_src/clients.baml`
- `shared/settings.py`
- `backend/src/services/active_client.py`
- `backend/src/services/prompt_selector.py`
- `backend/src/services/workflows/clinical.py`
- `backend/src/services/orchestrator.py`
- `backend/src/services/audit.py`
- `backend/src/api/routes/contracts.py`
- `.env.example`
- `.env`

### Frontend/admin consistency

- `frontend/src/components/access-monitoring/AIConfigsTab.tsx`
- `frontend/src/components/access-monitoring/AccessMonitoringScreen.tsx`
- `frontend/src/components/access-monitoring/AuditLogSearchPanel.tsx`
- `frontend/src/components/access-monitoring/AuditLogSearchPanel.test.tsx`
- `frontend/src/types/access-monitoring.ts`

### Verification

- `scripts/validate_clients.py`
- `scripts/tests/test_validate_clients.py`
- `scripts/tests/test_active_client_resolution.py`
- `scripts/tests/test_prompt_selector_paths.py`
- `backend/tests/test_clinical_workflow.py`
- `scripts/tests/test_llm_audit_logging.py`
- `scripts/tests/test_api_contract_routes.py`
- `scripts/tests/test_access_monitoring_contract.py`
- `scripts/tests/test_backend_cache_ttl.py`
- `scripts/tests/test_end_to_end.py`
- `scripts/tests/test_baml_recommendation_profile.py`

---

## Verification Evidence

- `uv run baml-cli generate` regenerated the BAML client cleanly.
- the final local regression bundle passed with `75 passed in 2.60s`
- `uv run python scripts/validate_clients.py` validated all five named clients successfully

Environment note:
- `LocalHostedClient` remains environment-driven. In the current local setup it may point at a proxy-backed endpoint instead of a literal localhost Ollama process.

---

## Residual Notes

- Historical documents such as `_verification_review.md` and the scope `_discover.md` files intentionally preserve the original defects and review findings.
- The harness now has dedicated regression coverage in `scripts/tests/test_validate_clients.py`.
