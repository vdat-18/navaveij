# Latest Test Results — Scope 2: Workflow Dispatch and Audit Integrity

**Status:** ✅ Passing

## Verification Run

Command:

```bash
AI_ACTIVE_CLIENT=GeminiClient .venv/bin/pytest backend/tests/test_clinical_workflow.py scripts/tests/workflows/test_clinical_workflow.py scripts/tests/test_llm_audit_logging.py scripts/tests/test_orchestrator_mig3.py scripts/tests/test_audit_dimensions_rules_gap.py -q
```

Result:

```text
.....................                                                    [100%]
21 passed in 0.50s
```

## What This Proves

- workflow dispatch uses the resolved client identity for non-Gemini clients
- `MatchPolicy` and `WriteNarrative` no longer share one synthetic latency value
- orchestrator recommendation audit emission no longer hardcodes a shared Gemini model setting
- `LLMRequest` rows receive `active_client`, resolved `model_id`, and accurate per-call timing

## Planned Test Bundle

```bash
.venv/bin/pytest backend/tests/test_clinical_workflow.py scripts/tests/workflows/test_clinical_workflow.py scripts/tests/test_llm_audit_logging.py -q
```

## Approval Target

- explicit clinical dispatch works for the resolved client
- annotation stays aligned with the active client
- LLM audit rows contain accurate model/template/function/timing values

## Scope Verdict

Scope 2 is complete and checkpointed.
