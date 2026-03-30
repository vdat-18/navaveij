# Scope 4 — Validation Harness and Final Verification

**Parent Workstream:** 9.Per-Model-Prompt-Template-Registry  
**Status:** ✅ Implemented and locally verified  
**Goal:** replace the invalid in-process validation method and produce final local evidence for the repaired workstream

---

## Outcome

Scope 4 is complete from an implementation and local verification standpoint.

What changed:

- `scripts/validate_clients.py` was rewritten to validate one client per subprocess
- `scripts/tests/test_validate_clients.py` now regression-tests the harness parsing and failure semantics
- child validation runs now hydrate `.env` before importing BAML/runtime modules
- the harness emits structured JSON per child and prints a readable parent summary table
- `LLMRequest` rows now retain masked request/response traces and the Access Monitoring UI can inspect them in a modal
- final local verification was rerun after provider-native env normalization
- the top-level workstream status docs were refreshed from fresh command output

---

## Verification Snapshot

### Regression bundle

```bash
AI_ACTIVE_CLIENT=GeminiClient .venv/bin/pytest \
  scripts/tests/test_validate_clients.py \
  scripts/tests/test_active_client_resolution.py \
  scripts/tests/test_prompt_selector_paths.py \
  backend/tests/test_clinical_workflow.py \
  scripts/tests/test_llm_audit_logging.py \
  scripts/tests/test_api_contract_routes.py \
  scripts/tests/test_access_monitoring_contract.py \
  scripts/tests/test_backend_cache_ttl.py \
  scripts/tests/test_end_to_end.py \
  scripts/tests/test_gap9_verification_pack.py \
  -q
```

Result:

```text
75 passed in 2.60s
```

### Validation harness

```bash
uv run python scripts/validate_clients.py
```

Result:

```text
Navaveij Client Connectivity Validation
============================================================
  GeminiClient       (gemini-3-flash-preview)       ✓ OK (3315ms)
  OpenAIClient       (gpt-5.4-mini)                 ✓ OK (11016ms)
  AnthropicClient    (claude-haiku-4-5)             ✓ OK (2213ms)
  OpenRouterClient   (openai/gpt-oss-120b)          ✓ OK (10894ms)
  LocalHostedClient  (llama-3.3-70b-instruct)       ✓ OK (10391ms)
============================================================
  All clients validated successfully.
```

Environment note:
- `LocalHostedClient` remains environment-configurable; in this setup it may use a proxy-backed endpoint instead of a strict localhost-only runtime.

---

## Notes

- The scope now has both harness regression tests and a live isolated harness run.
- `LocalHostedClient` remains environment-configurable; in this setup it is intentionally allowed to resolve through a proxy-backed endpoint.
