# Verification Review — Per-Model Prompt Template Registry

**Date:** 2026-03-30
**Reviewer:** Codex
**Scope:** Verify the claimed completion of workstream 9 against the actual `POC/V6` implementation
**Verdict:** Not approved for rollout or demo as currently implemented

---

## Executive Summary

The local regression tests cited by this workstream do pass, but they do not verify the core behavior this workstream claims to deliver.

The most serious issue is that the implementation does not prove `AI_ACTIVE_CLIENT` controls the model used by the clinical BAML calls. The prompt selector and system-config UI read one source of truth, while the BAML execution path appears to follow a different, fixed fallback chain. That breaks the structural integrity of the feature: the selected model, prompt template, audit metadata, cache key, and admin UI can diverge.

This workstream should therefore be treated as partially implemented and blocked pending a repair pass.

---

## What Was Verified

### Local test re-run

Command run:

```bash
./.venv/bin/pytest scripts/tests/test_prompt_selector_paths.py scripts/tests/test_gap9_verification_pack.py scripts/tests/test_api_contract_routes.py scripts/tests/test_access_monitoring_contract.py -q
```

Observed result:

```text
36 passed in 1.02s
```

Interpretation:
- The local regression suite is green.
- The suite does not verify runtime client selection, true template propagation into the API payload, or accurate LLM audit metadata.

### Runtime checks

Observed in the current local environment:
- `settings.ai_active_client = claude-haiku-4.5`
- `prompt_selector.version = gemini-v1`

Changing `os.environ["AI_ACTIVE_CLIENT"]` inside a running Python process did not change either value, confirming that the current smoke-test script relies on an invalid assumption about runtime reconfiguration.

### Source checks

The following code paths were inspected directly:
- `baml_src/clients.baml`
- `backend/src/services/prompt_selector.py`
- `backend/src/services/workflows/clinical.py`
- `backend/src/services/audit.py`
- `backend/src/services/orchestrator.py`
- `backend/src/api/routes/contracts.py`
- `scripts/validate_clients.py`

---

## Findings

### 1. Critical — active-client switching is not structurally implemented

Evidence:
- `baml_src/clients.baml` defines `ActiveModel` and `AnnotationModel` as fixed fallback strategies:
  - `strategy [GeminiClient, OpenAIClient, AnthropicClient, LocalHostedClient, OpenRouterClient]`
- The file comments claim this resolves to `AI_ACTIVE_CLIENT`, but no env-driven selector is defined in the BAML strategy itself.
- `prompt_selector.py` selects prompt YAML from `settings.ai_active_client`, but BAML execution is not driven from that same code path.

Impact:
- The selected prompt template can differ from the actual model used for inference.
- The admin UI can report one active client while inference uses another.
- The audit trail cannot be trusted as a record of which model-template pair actually ran.

Why this matters:
- This is the core requirement of TOR §4.3.
- If model selection is ambiguous, the rest of the feature is built on a broken foundation.

### 2. High — `scripts/validate_clients.py` does not validate what it claims

Evidence:
- The script sets `os.environ["AI_ACTIVE_CLIENT"]` during runtime and assumes that importing `baml_client` afterward is enough to switch clients.
- `shared.settings.settings` is a module-level settings object.
- `src.services.prompt_selector.prompt_selector` is a module-level singleton initialized once.
- Runtime check confirmed both remained unchanged after env mutation inside the same process.

Impact:
- A green smoke test can be a false positive.
- The script does not prove per-client routing works.
- The workstream’s verification story is therefore unsound.

### 3. High — recommendation metadata and cache keys still use a hardcoded template version

Evidence:
- `backend/src/api/routes/contracts.py` writes `"template_version": "v1.0"` into normalized response metadata.
- The same file also includes `"template_version": "v1.0"` in `_recommendation_cache_key()`.
- Direct check of `_normalize_stage2()` showed that even when the incoming AI metadata contained `openai-v1`, the final payload returned `v1.0`.

Impact:
- The API payload does not reflect the real prompt template version.
- Cache partitioning is incorrect when prompt templates change.
- The docs’ claim that `template_version` is wired end-to-end is not true.

### 4. High — LLM audit rows are present but not accurate

Evidence:
- `backend/src/services/workflows/clinical.py` records `model_id` as `settings.llm_model` for all calls.
- That value corresponds to the generic Gemini-style config and is not a reliable resolved model identifier for OpenAI, Anthropic, OpenRouter, or LocalHosted clients.
- `MatchPolicy` and `WriteNarrative` are executed in parallel, but both rows are assigned the same shared gather duration rather than independent timings.

Impact:
- Audit data cannot answer which specific call was slower.
- Audit data can report the wrong model.
- This undermines both operational troubleshooting and compliance claims.

### 5. Medium — system-config can surface an invalid active client while the prompt selector silently falls back to Gemini

Evidence:
- `get_system_config()` returns `active_client = settings.ai_active_client`.
- If the env contains an old value such as `claude-haiku-4.5`, none of the listed clients are marked active.
- `PromptTemplateSelector` falls back to `gemini.yaml` for unknown values.

Impact:
- The UI can show “no active client,” while the backend silently uses Gemini prompts.
- Invalid config is not rejected early.
- This is a fail-open posture where fail-closed behavior is needed.

### 6. Medium — project-management docs are inconsistent and overstate completion

Evidence:
- `README.md` claimed all parts complete.
- `plan.md` still marked parts of audit logging and validation as pending.
- `_latest_test_results.md` admitted parts 4 and 5 were only verified by manual inspection and import checks.
- Prompt registry file headers contain copy-paste mistakes such as `uOpenAIClient` and `(gemini-3-flash-preview)` in non-Gemini files.

Impact:
- Reviewers cannot trust the current status narrative.
- The documentation needs to distinguish “code exists” from “behavior is verified.”

---

## Recommended Status

This workstream should remain open with the following status:

- UI split: present
- prompt registry files: present
- audit plumbing: present but not trustworthy yet
- active-client selection: unresolved
- validation story: unresolved
- rollout readiness: blocked

---

## Exit Criteria Before Re-Approval

The workstream should not be marked complete again until all of the following are true:

1. One validated source of truth determines active client, prompt template, API metadata, audit fields, and cache key inputs.
2. Invalid active-client values fail closed with a clear startup or request-time error.
3. Recommendation metadata returns the real `template_version`.
4. Per-call LLM audit rows contain accurate `function_name`, `model_id`, and independent latency values.
5. The client validation script runs each client in isolation and proves the same path used in production.
6. Automated tests cover the above behaviors directly.

