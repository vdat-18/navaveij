# Development Summary — Scope 2: Workflow Dispatch and Audit Integrity

**Status:** ✅ Complete

## Summary

Implemented Scope 2 by moving the workflow and audit path onto the resolver-driven runtime identity introduced in Scope 1.

The key design choice was to use BAML's existing per-call `client` override path for non-Gemini clients rather than regenerating client-specific wrapper functions. This kept the change set smaller while still providing explicit dispatch and accurate audit metadata.

## Files Changed

- `backend/src/services/workflows/clinical.py`
  - imported `resolve_active_client()` and `get_prompt_selector()`
  - added `_build_llm_client()` so non-Gemini clients use explicit BAML client overrides
  - added `_timed_llm_call()` to capture accurate per-call timing and metadata
  - recorded `active_client`, `model_id`, `model_provider`, and `template_version` into `context.metadata`
  - recorded `active_client`, `model_id`, `template_version`, `prompt_template_key`, and independent `latency_ms` values into `context.llm_call_records`
- `backend/src/services/orchestrator.py`
  - stopped relying on a shared Gemini model setting for recommendation audit emission
  - forwarded workflow-resolved model identity into `log_recommendation()`
  - forwarded `active_client` into `log_llm_request()`
  - injected resolved runtime identity into `context.ai_output["metadata"]`
- `backend/src/services/audit.py`
  - extended `log_recommendation()` to accept `model_provider`
  - extended `log_llm_request()` to accept and store `active_client`
- `backend/tests/test_clinical_workflow.py`
  - added Scope 2 coverage for explicit client dispatch and independent parallel-agent timings
- `scripts/tests/test_llm_audit_logging.py`
  - added orchestrator audit-forwarding coverage for resolved identity and per-call rows

## Scope Notes

- Gemini continues to use the default generated BAML client path. This is intentional so existing environment-driven Gemini behavior and legacy test patching stay stable.
- No BAML source change or regeneration was required in this scope because the generated async client already supports per-call `client` overrides.
