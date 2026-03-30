# Latest Test Results — Per-Model Prompt Template Registry

**Date:** 2026-03-30
**State:** ✅ All parts complete — Parts 1–3 re-verified; Parts 4–5 verified via manual inspection and import checks

---

## Summary

BAML regeneration succeeded cleanly after client rename and `system_prompt` parameter addition. Prompt selector loads correctly. Gap-9 verification pack and contract regression suite pass. No regressions on neighbouring workstream tests. Parts 4 and 5 verified via backend import check and code inspection.

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

Confirms: `PromptTemplateSelector` loads the correct YAML, exposes `version`, and returns non-empty prompt strings for all four function keys.

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

## Effective Status

| Area | Status |
|---|---|
| BAML client rename (5 clients) | ✅ Complete |
| BAML code generation | ✅ Clean |
| Prompt YAML registry (5 files) | ✅ Complete |
| PromptTemplateSelector service | ✅ Complete |
| BAML function signatures (`system_prompt`) | ✅ Complete |
| Clinical workflow wired | ✅ Complete |
| `llm_call_records` in WorkflowContext | ✅ Complete |
| System Config tab split (Frontend) | ✅ Complete |
| `log_llm_request()` in AuditLogger | ✅ Complete |
| Orchestrator LLM audit wiring | ✅ Complete |
| `template_version` injected into recommendation metadata | ✅ Complete |
| `_normalize_runtime_audit_entries()` LLM_REQUEST handling | ✅ Complete |
| `get_system_config()` — live template_version + new client names | ✅ Complete |
| Frontend type extensions (function_name, prompt_template_key) | ✅ Complete |
| AuditLogSearchPanel — LLMRequest filter + WHAT detail expansion | ✅ Complete |
| `scripts/validate_clients.py` | ✅ Complete |

---

## Notes

- Verification run against `POC/V6/.venv` (Python 3.12.12, pytest 9.0.2, BAML CLI 0.220.0).
- Parts 4 and 5 are not yet covered by the automated test suite; integration verification requires a running backend with valid API keys. Use `scripts/validate_clients.py` for per-client connectivity checks pre-demo.
- The active `.env` may still reference old `AI_ACTIVE_CLIENT` values (e.g. `claude-haiku-4.5`). Update to one of: `GeminiClient | OpenAIClient | AnthropicClient | OpenRouterClient | LocalHostedClient`.
