# README — Per-Model Prompt Template Registry

**Workstream:** 9
**Date:** 2026-03-30
**Status:** ✅ All parts complete
**Scope:** BAML client rename, per-model YAML prompt registry, admin UI split, LLM-level audit logging, client validation script

---

## Checkpoint — 2026-03-30

| Part | Description | State |
|---|---|---|
| 1 | BAML client rename (5 clients → provider-named) | ✅ Complete |
| 2 | Per-model prompt YAML registry + PromptTemplateSelector + BAML signature update + workflow wiring | ✅ Complete |
| 3 | System Config tab split → MCP Configs + AI Configs | ✅ Complete |
| 4 | `log_llm_request()` + orchestrator wiring + contract normalization + audit search UI | ✅ Complete |
| 5 | `scripts/validate_clients.py` smoke-test | ✅ Complete |

### Test state

- BAML generation: clean (`baml-cli generate` → 14 files written)
- `test_prompt_selector_paths.py`: 2 passed
- `test_gap9_verification_pack.py`: 3 passed
- Contract regression (`test_api_contract_routes.py` + `test_access_monitoring_contract.py`): 31 passed

---

## Context

TOR §4.3 requires per-model prompt template management. The original workstream 9 plan (2026-03-27) scoped this as a YAML registry + selector service. The 2026-03-30 client review expanded the scope to four coupled changes.

**Problem the original plan addressed:** All four clinical BAML functions — `AnalyzeClinicalRisks`, `MatchPolicy`, `WriteNarrative`, `AnnotateReasoningLines` — used a single static prompt regardless of which LLM client was active. Model switching via `AI_ACTIVE_CLIENT` changed inference routing but not prompt content.

**Added 2026-03-30:**
1. Client names did not match actual deployed models (e.g. `GPT4o` → `gpt-4o` when the target is `gpt-5.4-mini`).
2. Admin UI had MCP config and AI config in one tab — hard to navigate.
3. Audit trail had no per-LLM-call entries — could not answer "which prompt template was sent to which model for which function, and how long did it take?"

---

## Key Design Decisions

**`AnnotationModel` uses the same chain as `ActiveModel`**
Client confirmed annotation should always use the same model as clinical inference. The separate `LLM_ANNOTATION_MODEL` env var was removed.

**5 YAML files, identical content for POC**
Structural hook for future per-model tuning (e.g., XML-tagged prompts for Anthropic) without requiring code changes. A `version` tag in each file is logged in the audit trail as `template_version`.

**Per-BAML-call audit entries (4 per recommendation)**
Per-call granularity is required to answer "which function took 3× longer?" and "which prompt template was active for MatchPolicy?" — one aggregate entry per recommendation would not support this.

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

---

## Related Documents

- [`_discover.md`](./_discover.md) — root cause analysis and design decisions
- [`_development_summary.md`](./_development_summary.md) — detailed record of all changes
- [`_latest_test_results.md`](./_latest_test_results.md) — current test run output
- [`plan.md`](./plan.md) — original implementation plan (superseded; see `.claude/plans/tranquil-spinning-eclipse.md` for the final approved plan)
