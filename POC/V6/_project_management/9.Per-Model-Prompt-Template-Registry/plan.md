# Per-Model Prompt Template Registry Repair Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair workstream 9 so active-client resolution, prompt selection, clinical dispatch, metadata, cache behavior, audit logging, and client validation all derive from one explicit and testable runtime path.

**Architecture:** Replace the current split brain between BAML fallback configuration, Python settings, prompt-selector singleton, API normalization, and validation script with one explicit active-client resolver. Route clinical calls through that resolver, propagate the same resolved identity into prompts, metadata, caches, and audit rows, and verify each stage through dedicated tests before moving to the next scope.

**Tech Stack:** Python 3.12, FastAPI, Pydantic Settings, BAML, pytest, React/TypeScript, JSONL audit logging

---

## Scope Map

Implementation is split into four controlled scopes:

1. `1.Active-Client-Resolution`
2. `2.Workflow-Dispatch-and-Audit-Integrity`
3. `3.API-Metadata-Cache-and-Admin-Consistency`
4. `4.Validation-Harness-and-Final-Verification`

Each scope has its own checkpoint docs:
- `README.md`
- `_discover.md`
- `_development_summary.md`
- `_latest_test_results.md`

Do not start a later scope until the earlier scope has an updated checkpoint and passing scope-local tests.

---

## Chunk 1: Active-Client Resolution

### Task 1: Introduce a fail-closed resolver as the single source of truth

**Files:**
- Create: `backend/src/services/active_client.py`
- Modify: `shared/settings.py`
- Modify: `backend/src/services/prompt_selector.py`
- Test: `scripts/tests/test_active_client_resolution.py`
- Test: `scripts/tests/test_prompt_selector_paths.py`
- Docs: `_project_management/9.Per-Model-Prompt-Template-Registry/1.Active-Client-Resolution/*`

- [ ] **Step 1: Write failing resolver tests**
- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
.venv/bin/pytest scripts/tests/test_active_client_resolution.py scripts/tests/test_prompt_selector_paths.py -q
```

Expected:
- new resolver tests fail because the resolver does not exist yet

- [ ] **Step 3: Implement `active_client.py`**
- [ ] **Step 4: Refactor prompt selection to depend on the resolver**
- [ ] **Step 5: Run scope tests**
- [ ] **Step 6: Update scope checkpoints**

---

## Chunk 2: Workflow Dispatch and Audit Integrity

### Task 2: Replace implicit clinical routing with explicit resolver-driven dispatch

**Files:**
- Modify: `baml_src/clients.baml`
- Modify: `baml_src/clinical/recommendation_output.baml`
- Modify: `backend/src/services/workflows/clinical.py`
- Modify: `backend/src/services/workflows/base.py`
- Modify: `backend/src/services/audit.py`
- Modify: `backend/src/services/orchestrator.py`
- Regenerate: `baml_client/`
- Test: `backend/tests/test_clinical_workflow.py`
- Test: `scripts/tests/workflows/test_clinical_workflow.py`
- Test: `scripts/tests/test_llm_audit_logging.py`
- Docs: `_project_management/9.Per-Model-Prompt-Template-Registry/2.Workflow-Dispatch-and-Audit-Integrity/*`

- [ ] **Step 1: Write failing workflow and audit tests**
- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
.venv/bin/pytest backend/tests/test_clinical_workflow.py scripts/tests/workflows/test_clinical_workflow.py scripts/tests/test_llm_audit_logging.py -q
```

Expected:
- new dispatch/audit assertions fail on the current implementation

- [ ] **Step 3: Implement explicit dispatch**
- [ ] **Step 4: Correct audit record generation**
- [ ] **Step 5: Regenerate BAML client code and run tests**
- [ ] **Step 6: Update scope checkpoints**

---

## Chunk 3: API Metadata, Cache, and Admin Consistency

### Task 3: Make API payloads, cache keys, and monitoring UI reflect the resolved client state

**Files:**
- Modify: `backend/src/api/routes/contracts.py`
- Modify: `frontend/src/components/access-monitoring/AIConfigsTab.tsx`
- Modify: `frontend/src/components/access-monitoring/AccessMonitoringScreen.tsx`
- Modify: `frontend/src/components/access-monitoring/AuditLogSearchPanel.tsx`
- Modify: `frontend/src/types/access-monitoring.ts`
- Test: `scripts/tests/test_api_contract_routes.py`
- Test: `scripts/tests/test_access_monitoring_contract.py`
- Test: `scripts/tests/test_backend_cache_ttl.py`
- Test: `frontend/src/components/access-monitoring/AuditLogSearchPanel.test.tsx`
- Docs: `_project_management/9.Per-Model-Prompt-Template-Registry/3.API-Metadata-Cache-and-Admin-Consistency/*`

- [ ] **Step 1: Write failing API/cache tests**
- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
.venv/bin/pytest scripts/tests/test_api_contract_routes.py scripts/tests/test_access_monitoring_contract.py scripts/tests/test_backend_cache_ttl.py -q
```

Expected:
- new assertions fail until metadata and cache behavior are repaired

- [ ] **Step 3: Implement metadata and cache repair**
- [ ] **Step 4: Adjust admin monitoring contract/UI**
- [ ] **Step 5: Run scope tests**
- [ ] **Step 6: Update scope checkpoints**

---

## Chunk 4: Validation Harness and Final Verification

### Task 4: Replace the validation script and produce final sign-off evidence

**Files:**
- Modify: `scripts/validate_clients.py`
- Test: `scripts/tests/test_validate_clients.py`
- Test: `scripts/tests/test_gap9_verification_pack.py`
- Test: `scripts/tests/test_end_to_end.py`
- Docs: `_project_management/9.Per-Model-Prompt-Template-Registry/4.Validation-Harness-and-Final-Verification/*`
- Docs: `_project_management/9.Per-Model-Prompt-Template-Registry/_latest_test_results.md`
- Docs: `_project_management/9.Per-Model-Prompt-Template-Registry/_development_summary.md`
- Docs: `_project_management/9.Per-Model-Prompt-Template-Registry/README.md`

- [ ] **Step 1: Write failing validation-harness tests**
- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
.venv/bin/pytest scripts/tests/test_validate_clients.py -q
```

Expected:
- fail until the script is rewritten around isolated execution

- [ ] **Step 3: Implement isolated validation**
- [ ] **Step 4: Run final verification bundle**
- [ ] **Step 5: Run end-to-end smoke gate**
- [ ] **Step 6: Update final checkpoints**

---

## Execution Handoff

Plan complete and saved to `_project_management/9.Per-Model-Prompt-Template-Registry/plan.md`. Execute scope-by-scope, updating each scope’s checkpoint docs before moving forward.
