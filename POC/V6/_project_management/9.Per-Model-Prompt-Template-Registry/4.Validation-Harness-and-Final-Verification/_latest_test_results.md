# Latest Test Results — Scope 4: Validation Harness and Final Verification

**Status:** ✅ Fresh local verification completed

## Commands

### BAML generation

```bash
uv run baml-cli generate
```

Result:

```text
2026-03-30T17:16:17.581 [BAML INFO] Generating clients with CLI version: 0.220.0
2026-03-30T17:16:17.612 [BAML INFO] Wrote 14 files to baml_client
2026-03-30T17:16:17.612 [BAML INFO] Generated 1 baml_client: ../baml_client
```

### Final regression bundle

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

### Isolated client validation

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

## Notes

- `LocalHostedClient` is environment-configurable and is allowed to use a proxy-backed endpoint in this local setup.
- `scripts/tests/test_validate_clients.py` now exists; the live harness run above remains the proof of real client connectivity
