# README — Per-Model Prompt Template Registry

**Workstream:** 9
**Date:** 2026-03-30
**Status:** ⚠️ Verification failed — implementation is not approved for rollout
**Scope:** BAML client rename, per-model YAML prompt registry, admin UI split, LLM-level audit logging, client validation script

---

## Execution Decomposition

The approved repair path is broken into four implementation scopes so the work can be checkpointed safely:

1. [`1.Active-Client-Resolution`](./1.Active-Client-Resolution/README.md)
2. [`2.Workflow-Dispatch-and-Audit-Integrity`](./2.Workflow-Dispatch-and-Audit-Integrity/README.md)
3. [`3.API-Metadata-Cache-and-Admin-Consistency`](./3.API-Metadata-Cache-and-Admin-Consistency/README.md)
4. [`4.Validation-Harness-and-Final-Verification`](./4.Validation-Harness-and-Final-Verification/README.md)

Master sequence:
- [`plan.md`](./plan.md)

Each scope has its own:
- `README.md`
- `_discover.md`
- `_development_summary.md`
- `_latest_test_results.md`

The expectation is to checkpoint after each scope before continuing.

---

## Verification Checkpoint — 2026-03-30

| Part | Description | State |
|---|---|---|
| 1 | BAML client rename (5 clients → provider-named) | ⚠️ Partially implemented |
| 2 | Per-model prompt YAML registry + PromptTemplateSelector + BAML signature update + workflow wiring | ❌ Core behavior not verified |
| 3 | System Config tab split → MCP Configs + AI Configs | ✅ UI split present |
| 4 | `log_llm_request()` + orchestrator wiring + contract normalization + audit search UI | ⚠️ Present but inaccurate |
| 5 | `scripts/validate_clients.py` smoke-test | ❌ Invalid verification method |

### Test state

- BAML generation: clean (`baml-cli generate` → 14 files written)
- `test_prompt_selector_paths.py`: 2 passed
- `test_gap9_verification_pack.py`: 3 passed
- Contract regression (`test_api_contract_routes.py` + `test_access_monitoring_contract.py`): 31 passed
- Combined local re-run during verification: 36 passed

---

## Review Outcome

The original implementation claim does not hold after verification against the real V6 codebase.

Confirmed defects:
1. `AI_ACTIVE_CLIENT` does not drive the BAML runtime path as documented; the current `ActiveModel`/`AnnotationModel` setup is a fixed fallback chain.
2. `scripts/validate_clients.py` does not actually validate per-client switching because settings and the prompt selector are initialized once and do not update from the runtime env mutation it relies on.
3. Recommendation payload metadata and cache keys still hardcode `template_version = "v1.0"`.
4. Per-call LLM audit entries record inaccurate metadata: `model_id` was derived from a shared Gemini setting instead of the resolved per-client configuration, and parallel Agent 2 timings were logged as the same duration for both functions.
5. The workstream documents themselves are inconsistent; some files still claim full completion while others show pending tasks or verification by inspection only.

See:
- `_verification_review.md` for evidence and impact
- `_fix_proposal.md` for the recommended repair path
- `_testing_strategy.md` for the approval-grade test strategy required before implementation sign-off

---

## Context

TOR §4.3 requires per-model prompt template management. The original workstream 9 plan (2026-03-27) scoped this as a YAML registry + selector service. The 2026-03-30 client review expanded the scope to four coupled changes.

**Problem the original plan addressed:** All four clinical BAML functions — `AnalyzeClinicalRisks`, `MatchPolicy`, `WriteNarrative`, `AnnotateReasoningLines` — used a single static prompt regardless of which LLM client was active.

**Important correction after verification:** the current implementation does not reliably prove that `AI_ACTIVE_CLIENT` changes inference routing at runtime. That behavior remains unresolved and must be fixed before this workstream can be considered complete.

**Added 2026-03-30:**
1. Client names did not match actual deployed models (e.g. `GPT4o` → `gpt-4o` when the target is `gpt-5.4-mini`).
2. Admin UI had MCP config and AI config in one tab — hard to navigate.
3. Audit trail had no per-LLM-call entries — could not answer "which prompt template was sent to which model for which function, and how long did it take?"

---

## Key Design Decisions

**`AnnotationModel` uses the same chain as `ActiveModel`**
Client confirmed annotation should always use the same model as clinical inference. The separate `LLM_ANNOTATION_MODEL` env var was removed.

**Verification note:** this intent is valid, but the current implementation does not yet guarantee that both inference and annotation resolve through the same explicit, validated active-client selection path.

**5 YAML files, identical content for POC**
Structural hook for future per-model tuning (e.g., XML-tagged prompts for Anthropic) without requiring code changes. A `version` tag in each file is logged in the audit trail as `template_version`.

**Per-BAML-call audit entries (4 per recommendation)**
Per-call granularity is required to answer "which function took 3× longer?" and "which prompt template was active for MatchPolicy?" — one aggregate entry per recommendation would not support this.

**Verification note:** the current audit implementation does not yet satisfy this requirement because parallel Agent 2 timings are recorded as one shared duration and `model_id` is not derived from the resolved active client.

**`llm_call_records` in WorkflowContext, flushed in OrchestrationManager**
Keeps audit concerns out of the workflow; timing is captured as close as possible to the actual call; the orchestrator remains the single point of audit emission.

---

## How to Verify

```bash
# 1. BAML generation clean
uv run baml-cli generate

# 2. Prompt selector and gap-9 pack
.venv/bin/pytest scripts/tests/test_prompt_selector_paths.py scripts/tests/test_gap9_verification_pack.py -v

# 3. Regression suite
.venv/bin/pytest scripts/tests/test_api_contract_routes.py scripts/tests/test_access_monitoring_contract.py -q

# 4. LLM audit entries — after one POST /api/recommend:
grep '"LLM_REQUEST"' logs/audit.jsonl | python3 -m json.tool | head -40
# Frontend: /access-monitoring → Audit Log Search → filter action_type = LLMRequest

# 5. Client validation script
uv run python scripts/validate_clients.py
```

These checks are necessary but not sufficient. Verification must also prove:
- invalid `AI_ACTIVE_CLIENT` values fail closed instead of silently loading `gemini.yaml`
- the API response surfaces the real `template_version`
- cache keys partition by the real active client/template version
- per-call audit rows contain accurate `function_name`, `model_id`, and independent latency values
- provider-native env names are wired end to end (`GOOGLE_API_KEY`/`GEMINI_MODEL`, `OPENAI_MODEL`, `ANTHROPIC_MODEL`, `OPENROUTER_MODEL`, `LOCALHOSTED_MODEL`) with no remaining Gemini `LLM_*` dependency

---

## Related Documents

- [`_discover.md`](./_discover.md) — root cause analysis and design decisions
- [`_development_summary.md`](./_development_summary.md) — detailed record of all changes
- [`_latest_test_results.md`](./_latest_test_results.md) — prior test run output and its limits
- [`_verification_review.md`](./_verification_review.md) — verified defects, evidence, and impact
- [`_fix_proposal.md`](./_fix_proposal.md) — recommended repair strategy before implementation resumes
- [`_testing_strategy.md`](./_testing_strategy.md) — required test layers, phase gates, and sign-off evidence
- [`plan.md`](./plan.md) — master repair implementation plan and scope execution order
- [`1.Active-Client-Resolution/README.md`](./1.Active-Client-Resolution/README.md) — scope 1 checkpoint folder
- [`2.Workflow-Dispatch-and-Audit-Integrity/README.md`](./2.Workflow-Dispatch-and-Audit-Integrity/README.md) — scope 2 checkpoint folder
- [`3.API-Metadata-Cache-and-Admin-Consistency/README.md`](./3.API-Metadata-Cache-and-Admin-Consistency/README.md) — scope 3 checkpoint folder
- [`4.Validation-Harness-and-Final-Verification/README.md`](./4.Validation-Harness-and-Final-Verification/README.md) — scope 4 checkpoint folder
