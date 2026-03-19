# Integrated Plan — GAP-R3 + GAP-R2

**Date:** 2026-03-19  
**Status:** Planned  
**Order:** GAP-R3 first, then GAP-R2

---

## 1. Why These Two Are Planned Together

- GAP-R2 depends on GAP-R3 field contracts.
- Safety filtering in GAP-R2 needs stable add-on identifiers from Stage-1 output.
- Implementing GAP-R3 first minimizes rework in `safety.py`, `orchestrator.py`, and tests.

---

## 2. Objectives

### GAP-R3 — BAML Output Schema Alignment
- Update Stage-1 schema in `recommendation_output.baml` so add-ons and communication fields match onboarding contracts.
- Regenerate BAML client and align all schema consumers in v2 backend.

### GAP-R2 — Deterministic Post-AI Safety Validator
- Remove pre-AI demographic filtering from ruleset tool output.
- Replace LLM safety critic with deterministic validator that removes invalid add-ons post-AI and logs conflict events.
- Keep violations out of API response payload.

---

## 3. Implementation Sequence

### Step 1 — GAP-R3 Schema Refactor (entry gate)

**Primary file**
- `POC/v2/baml_src/clinical/recommendation_output.baml`

**Required schema changes**
- `AddOnItem`
  - rename `item_code` → `item_id`
  - rename `priority_level` → `priority`
  - add `label`, `product_code`, `price_thb`, `category`
- `CommunicationScript`
  - remove `clinical_conclusion`
  - rename `recommendation_explanation` → `recommendation_rationale`
  - rename `add_on_highlights` → `addon_highlights`

**Prompt updates**
- Explicitly instruct model to source add-on identity and pricing fields from `program_ruleset.add_on_library`.
- Require communication output to use only the new field names.

**Consumer alignment after schema change**
- `POC/v2/backend/src/services/workflows/clinical.py`
  - map BAML output using new add-on and communication keys in AI path and deterministic fallback path.
- `POC/v2/backend/src/api/routes/contracts.py`
  - normalize new add-on keys and communication structure while preserving Stage-2 response compatibility where needed.

**Step-1 gate**
- BAML generate succeeds.
- Updated unit tests for workflow/contracts pass with new keys.

---

### Step 2 — GAP-R2 Remove Pre-AI Filtering

**Primary files**
- `POC/v2/backend/src/mcp_server/tools/program_ruleset.py`
- `POC/v2/backend/src/mcp_server/utils.py`

**Changes**
- Stop filtering add-ons by demographics before AI.
- Return full `add_on_library`.
- Keep compatibility metadata fields, but update counts to reflect full list and zero exclusions.

**Step-2 gate**
- Ruleset response includes full candidate set for representative male/female/age profiles.

---

### Step 3 — GAP-R2 Deterministic Safety Validator

**Primary files**
- `POC/v2/backend/src/services/safety.py`
- `POC/v2/backend/src/services/orchestrator.py`

**Changes**
- Replace `ClinicalSafetyGuard` LLM-critic behavior with deterministic `SafetyRuleValidator.validate_and_filter(...)`.
- Validate each AI-selected add-on against:
  - gender constraints
  - age min/max
  - contraindication signal constraints from hard constraints / clinical context
- Output:
  - filtered `add_ons`
  - `conflict_events` for audit logging
- Wire validator in orchestrator after AI output creation and before final rehydration.
- Do not expose conflict details in API response.

**Step-3 gate**
- Invalid add-ons are removed from returned recommendation.
- Conflict events are available to audit logger path.

---

### Step 4 — Test and Regression Sweep

**Targeted test files**
- `POC/v2/scripts/tests/workflows/test_clinical_workflow.py`
- `POC/v2/scripts/tests/test_api_contract_routes.py`
- Add new safety-focused test module if needed:
  - `POC/v2/scripts/tests/test_safety_validator_rules_gap.py`

**Required evidence**
- GAP-R3 tests prove new Stage-1 field names and required fields.
- GAP-R2 tests prove:
  - pre-AI filtering no longer occurs
  - post-AI deterministic removal occurs
  - audit conflict event is produced
  - API payload does not reveal removed items

---

## 4. File Impact Matrix

- **BAML schema**
  - `baml_src/clinical/recommendation_output.baml`
- **Workflow normalization**
  - `backend/src/services/workflows/clinical.py`
  - `backend/src/api/routes/contracts.py`
- **Ruleset tooling**
  - `backend/src/mcp_server/tools/program_ruleset.py`
  - `backend/src/mcp_server/utils.py`
- **Safety + orchestration**
  - `backend/src/services/safety.py`
  - `backend/src/services/orchestrator.py`
- **Tests**
  - `scripts/tests/workflows/test_clinical_workflow.py`
  - `scripts/tests/test_api_contract_routes.py`
  - optional new safety-focused tests

---

## 5. Verification Plan

1. Regenerate BAML client and verify imports resolve.
2. Run targeted workflow and contract tests covering new schema keys.
3. Run deterministic safety tests with deliberate invalid add-ons.
4. Run broader backend regression subset if environment supports dependencies.
5. Record command outputs in:
   - `gaps/GAP-R3-baml-output-schema/_lastest_test_results.md`
   - `gaps/GAP-R2-safety-validator/_lastest_test_results.md`

---

## 6. Risks and Mitigations

1. **Schema rename regression in downstream mapping**
   - Mitigation: update workflow and contract normalization in same change set as BAML schema.
2. **Safety validator over-removal due to incomplete context**
   - Mitigation: constrain checks to explicit ruleset constraints and add fixture-based tests.
3. **Audit coupling for conflict logging**
   - Mitigation: emit structured conflict payload from validator and keep audit write in orchestrator layer.
4. **Runtime tooling blockers (`baml`, Python deps)**
   - Mitigation: run syntax/diagnostics fallback checks and document blockers in checkpoint files.

---

## 7. Definition of Done

GAP-R3 and GAP-R2 are complete when:

- Stage-1 BAML schema and prompts match onboarding field contracts.
- Backend workflow/contracts consume new schema without compatibility regressions.
- Ruleset tool returns unfiltered add-on candidates pre-AI.
- Deterministic post-AI safety validator removes ineligible add-ons and produces audit conflict events.
- Targeted tests pass (or blockers are explicitly recorded with compile/diagnostic evidence).
