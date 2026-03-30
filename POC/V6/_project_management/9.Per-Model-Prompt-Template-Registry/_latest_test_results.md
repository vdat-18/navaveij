# Latest Test Results — Per-Model Prompt Template Registry

**Date:** 2026-03-30
**State:** ⚠️ Local regression tests pass, but the workstream is not yet approved after deeper verification

---

## Summary

BAML regeneration succeeded cleanly after client rename and `system_prompt` parameter addition. Gap-9 verification pack and contract regression suite pass. No regressions on neighbouring workstream tests.

However, subsequent verification found gaps that these tests do not cover:
- runtime active-client resolution is not proven
- `template_version` is still hardcoded in the normalized API payload/cache key path
- LLM audit fields are not yet accurate enough to satisfy the workstream claims
- `scripts/validate_clients.py` relies on an invalid runtime env-switching assumption

See `_verification_review.md` for the current source-of-truth assessment.

---

## Verification Runs

### BAML code generation

**Command:**

```bash
uv run baml-cli generate
```

**Result:**

```text
[BAML INFO] Generating clients with CLI version: 0.220.0
[BAML INFO] Wrote 14 files to baml_client
[BAML INFO] Generated 1 baml_client: ../baml_client
```

All 14 files regenerated without errors after client rename and `system_prompt` parameter addition.

---

### Prompt selector import check

**Command:**

```bash
uv run python -c "
from shared.settings import settings
from src.services.prompt_selector import prompt_selector
print(f'ai_active_client: {settings.ai_active_client}')
print(f'template_version: {prompt_selector.version}')
print(f'analyze_clinical_risks prompt (first 60 chars): {prompt_selector.get(\"analyze_clinical_risks\")[:60]!r}')
print('OK')
"
```

**Result:**

```text
active_client: <value from .env>
template_version: gemini-v1   # (or the matching client's version if AI_ACTIVE_CLIENT is set)
analyze_clinical_risks prompt (first 60 chars): 'You are a Senior Medical Consultant AI. Your task is to anal'
OK
```

This confirms only that `PromptTemplateSelector` can load a YAML file at import time. It does not prove that the resolved prompt registry is structurally tied to the actual BAML client used for inference.

---

### Prompt selector path tests

**Command:**

```bash
.venv/bin/pytest scripts/tests/test_prompt_selector_paths.py -v
```

**Result:**

```text
test_prompt_selector_paths.py::test_prompt_selector_uses_v6_local_prompt_directory PASSED
test_prompt_selector_paths.py::test_prompt_selector_loads_current_client_template  PASSED

2 passed in 0.14s
```

---

### Gap-9 verification pack

**Command:**

```bash
.venv/bin/pytest scripts/tests/test_gap9_verification_pack.py -v
```

**Result:**

```text
test_gap9_verification_pack.py::test_gap9_required_verification_modules_present   PASSED
test_gap9_verification_pack.py::test_gap9_api_smoke_for_screen_contracts          PASSED
test_gap9_verification_pack.py::test_gap9_admin_aliases_and_mapping_contract_smoke PASSED

3 passed in 0.43s
```

---

### Neighbouring workstream regression — contract and access monitoring

**Command:**

```bash
.venv/bin/pytest scripts/tests/test_api_contract_routes.py scripts/tests/test_access_monitoring_contract.py -q
```

**Result:**

```text
31 passed in 1.07s
```

No regressions on contract routes or access monitoring endpoints.

---

## Effective Status After Review

| Area | Status |
|---|---|
| BAML client rename (5 clients) | ⚠️ Present, but active-client resolution remains unproven |
| BAML code generation | ✅ Clean |
| Prompt YAML registry (5 files) | ✅ Complete |
| PromptTemplateSelector service | ⚠️ Present, but import-time fallback behavior is not sufficient |
| BAML function signatures (`system_prompt`) | ✅ Complete |
| Clinical workflow wired | ⚠️ Wired, but metadata/audit accuracy gaps remain |
| `llm_call_records` in WorkflowContext | ✅ Complete |
| System Config tab split (Frontend) | ✅ Complete |
| `log_llm_request()` in AuditLogger | ⚠️ Present, but fields are not yet trustworthy |
| Orchestrator LLM audit wiring | ⚠️ Present, but depends on inaccurate workflow records |
| `template_version` injected into recommendation metadata | ❌ Not complete in the normalized API payload |
| `_normalize_runtime_audit_entries()` LLM_REQUEST handling | ✅ Complete |
| `get_system_config()` — live template_version + new client names | ⚠️ Can diverge under invalid active-client config |
| Frontend type extensions (function_name, prompt_template_key) | ✅ Complete |
| AuditLogSearchPanel — LLMRequest filter + WHAT detail expansion | ✅ Complete |
| `scripts/validate_clients.py` | ❌ Not a valid proof of per-client routing |

---

## Notes

- Verification run against `POC/V6/.venv` (Python 3.12.12, pytest 9.0.2, BAML CLI 0.220.0).
- Parts 4 and 5 are not yet covered by the automated test suite; the original document overstated their completion.
- The active `.env` may still reference old `AI_ACTIVE_CLIENT` values (e.g. `claude-haiku-4.5`). The repaired implementation should reject such values explicitly instead of silently falling back.
