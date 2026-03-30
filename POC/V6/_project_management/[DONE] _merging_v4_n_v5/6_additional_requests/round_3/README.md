# Round 3 — Highlight Bug Fix, Test Debt Cleanup, Privacy Rendering

## Goal
Fix broken text highlighting (markdown `**...**` leaking into UI), resolve all 19 pre-existing test failures, and properly wire privacy-mode rendering for the reasoning trace.

## Steps

### R3a — Fix markdown bold leaking + missing highlights
**Files:** `backend/src/services/text_annotations.py`, `backend/src/services/workflows/clinical.py`, `frontend/src/shared/recommendationTextFormatting.tsx`

The BAML agent outputs text with `**bold**` markers. The backend's `find_highlight_terms()` stripped `**` during search but left it in the `text` field sent to the frontend. Additionally, Pass 3 (extract `**...**` inner text as highlight terms) was promised in the docstring but never implemented.

### R3b — Fix 19 pre-existing test failures
**Files:** Multiple test files + production code (see _development_summary.md)

19 tests across scripts/tests (15) and frontend vitest (4) were failing due to stale assertions, missing context provider mocks, code gaps flagged by contract tests, and an admin route parameter mismatch.

### R3c — Wire privacy-aware reasoning rendering
**File:** `frontend/src/components/dashboard/RecommendationPanel.tsx`

The privacy-mode reasoning trace variable (`reasoningTrace`) was added as dead code to satisfy a contract test. Properly wire it into the rendering pipeline so that in privacy mode, the component falls back to monospaced token-masked plain text instead of structured annotated lines.

### R3d — Rehydration + security metadata
**Files:** `backend/src/services/orchestrator.py`, `backend/src/services/workflows/base.py`

Add `rehydration_map` field to `WorkflowContext`, implement token-to-real-name replacement in the orchestrator, and populate `security_metadata` with `rehydration_map` and `masked_ai_output`.

### R3e — Audit schema versioning
**File:** `backend/src/services/audit.py`

Nest `action_type`/`request_id` under `why.request_context` (per contract test spec). Add `schema_version: 2` to distinguish from the flat V1 format.

## Acceptance Criteria
- [ ] No raw `**...**` visible in rendered text
- [ ] AI-bolded terms not in CLINICAL_PHRASES still get highlight chips
- [ ] Backend pytest: 4/4 pass
- [ ] Scripts integration tests: 82/82 pass (run separately from backend)
- [ ] Frontend vitest: 49/49 pass
- [ ] `npm run build` exits 0
- [ ] Privacy mode renders monospaced token-masked reasoning (not structured annotated lines)
- [ ] Rehydration replaces tokens longest-first (no prefix collision)
- [ ] Audit entries include `schema_version: 2`
