# README — Per-Model Prompt Template Registry

**Workstream:** 9  
**Date:** 2026-03-30  
**Status:** ✅ Implemented and locally verified  
**Scope:** resolver-driven client identity, per-model prompt registry, workflow/audit integrity, API/admin consistency, validation harness, trace-level `LLMRequest` audit inspection, provider-native env normalization

---

## Summary

This workstream is now operating on one consistent runtime identity path:

- `AI_ACTIVE_CLIENT` resolves through a validated client registry
- prompt template selection follows the resolved client
- workflow metadata, recommendation metadata, audit rows, cache keys, and `/system-config` all use the same resolved client/model/template identity
- `scripts/validate_clients.py` validates each client in an isolated subprocess rather than mutating env vars inside one initialized process
- `LLMRequest` audit rows now retain masked input/output traces for per-call review
- the Access Monitoring UI provides a modal inspector for those trace payloads
- `POC/V6/.env.example` and `POC/V6/.env` use provider-native env names

Historical discovery/review documents remain in this folder as audit trail for the earlier defects and repair plan.

---

## Scope Status

1. [`1.Active-Client-Resolution`](./1.Active-Client-Resolution/README.md) — complete
2. [`2.Workflow-Dispatch-and-Audit-Integrity`](./2.Workflow-Dispatch-and-Audit-Integrity/README.md) — complete
3. [`3.API-Metadata-Cache-and-Admin-Consistency`](./3.API-Metadata-Cache-and-Admin-Consistency/README.md) — complete
4. [`4.Validation-Harness-and-Final-Verification`](./4.Validation-Harness-and-Final-Verification/README.md) — complete

Master sequence:
- [`plan.md`](./plan.md)

Each scope still keeps its own:
- `README.md`
- `_discover.md`
- `_development_summary.md`
- `_latest_test_results.md`

---

## Final Outcomes

- Gemini now uses the native `google-ai` provider instead of the old OpenAI-compatible configuration path.
- Recommendation metadata and cache partitioning no longer hardcode `"v1.0"` or a shared model setting.
- Audit rows preserve resolved `active_client`, `model_id`, `model_provider`, `template_version`, per-call timing, and masked request/response traces.
- Access-monitoring contracts/UI are aligned with the repaired backend metadata.
- `scripts/tests/test_validate_clients.py` now regression-tests the isolated harness behavior.
- Provider-native env names are wired end to end:
  - Gemini: `GOOGLE_API_KEY`, `GEMINI_MODEL`
  - OpenAI: `OPENAI_API_KEY`, `OPENAI_MODEL`
  - Anthropic: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`
  - OpenRouter: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_BASE_URL`
  - Local hosted: `LOCALHOSTED_BASE_URL`, `LOCALHOSTED_API_KEY`, `LOCALHOSTED_MODEL`

---

## Fresh Verification

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

Environment note:
- `LocalHostedClient` is environment-configurable. In this local setup it is intentionally allowed to use a proxy-backed endpoint rather than a strict localhost-only transport.

---

## Notes

- The historical review files such as [`_verification_review.md`](./_verification_review.md) and the various `_discover.md` files describe the original defects; they are intentionally not rewritten as final-state documents.
- `scripts/tests/test_validate_clients.py` now exists and covers the subprocess harness contract in addition to the live validation run above.

---

## Related Documents

- [`_development_summary.md`](./_development_summary.md) — final implementation summary across scopes
- [`_latest_test_results.md`](./_latest_test_results.md) — final verification ledger
- [`_discover.md`](./_discover.md) — original discovery and root-cause notes
- [`_verification_review.md`](./_verification_review.md) — verified defect record that drove the repair plan
- [`_fix_proposal.md`](./_fix_proposal.md) — approved repair strategy
- [`_testing_strategy.md`](./_testing_strategy.md) — original approval criteria and test layers
