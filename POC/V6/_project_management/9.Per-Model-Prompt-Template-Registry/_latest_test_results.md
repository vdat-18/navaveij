# Latest Test Results — Per-Model Prompt Template Registry

**Date:** 2026-03-30  
**State:** ✅ Fresh local verification completed

---

## Verification Ledger

### 1. BAML generation

**Command**

```bash
uv run baml-cli generate
```

**Result**

```text
2026-03-30T17:16:17.581 [BAML INFO] Generating clients with CLI version: 0.220.0
2026-03-30T17:16:17.612 [BAML INFO] Wrote 14 files to baml_client
2026-03-30T17:16:17.612 [BAML INFO] Generated 1 baml_client: ../baml_client
```

### 2. Final regression bundle

**Command**

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

**Result**

```text
................. [ 96%]
...                                                                      [100%]
75 passed in 2.60s
```

### 3. Isolated client validation

**Command**

```bash
uv run python scripts/validate_clients.py
```

**Result**

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

---

## What This Proves

- active-client resolution, prompt selection, workflow dispatch, audit metadata, API metadata, cache key partitioning, and admin contracts are all passing together in one fresh bundle
- `LLMRequest` rows now preserve masked request/response traces and the UI has test coverage for modal inspection of those traces
- Gemini now runs on the native `google-ai` provider path with provider-native env names
- `scripts/validate_clients.py` no longer depends on in-process env mutation; it validates each client in an isolated subprocess
- `scripts/tests/test_validate_clients.py` now regression-tests the harness parsing and failure behavior
- the current local environment credentials are sufficient to exercise all five named client configurations

Environment note:
- in this local setup, `LocalHostedClient` is intentionally allowed to resolve through a proxy-backed endpoint rather than a literal localhost-only transport

---

## Notes

- This file supersedes the earlier stale non-approval snapshot.
- `scripts/tests/test_validate_clients.py` now exists; the live subprocess harness run remains the end-to-end proof of real client connectivity.
