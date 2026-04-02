# Scope 2 — Workflow Dispatch and Audit Integrity

**Parent Workstream:** 9.Per-Model-Prompt-Template-Registry
**Status:** ✅ Completed and checkpointed
**Goal:** Route clinical calls explicitly from the resolved active client and make per-call audit data accurate.

---

## Why This Scope Exists

Even with a correct resolver, the workstream is still unsafe until the workflow, orchestration, and audit paths all consume the same resolved identity.

This scope covers:
- clinical dispatch
- annotation alignment
- per-call timing accuracy
- trustworthy LLM audit rows

This scope is now complete. Downstream scopes can assume:
- clinical LLM calls resolve against the Scope 1 client identity
- non-Gemini clients are dispatched explicitly through BAML call options
- per-call records use independent timing and resolved model metadata
- orchestrator audit emission consumes workflow metadata instead of hardcoded model values

---

## Primary Deliverables

- explicit client dispatch for clinical calls
- resolver-bound prompt injection
- accurate `llm_call_records`
- correct `LLMRequest` audit emission

## Files Completed

- `backend/src/services/workflows/clinical.py`
- `backend/src/services/orchestrator.py`
- `backend/src/services/audit.py`
- `backend/tests/test_clinical_workflow.py`
- `scripts/tests/test_llm_audit_logging.py`
