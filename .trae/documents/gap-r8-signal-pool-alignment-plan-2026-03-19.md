# GAP-R8 Signal Pool Alignment Plan (Clinical-Gated)

## Summary
- Close GAP-R8 by aligning signal pools in `sample_ruleset_tier_config.json` with framework-ledger traceability requirements.
- Use a clinical-gated execution model: no unapproved signal membership changes are promoted before clinical sign-off.
- Deliver a decision-complete implementation checklist that can be executed without additional design choices.

## Current State Analysis
- GAP-R8 is currently marked not started and explicitly gated on clinical confirmation in:
  - `POC/v2/_project_management/[DONE] 3. Rules-Gap-Closure/gaps/GAP-R8-signal-pool-alignment/README.md`
- Framework/plan docs identify divergence:
  - Missing in ADVANCED low-moderate pool: `fbs_upward_trend`, `diagnosis_fatty_liver`
  - Undocumented extras in ADVANCED low-moderate pool: `family_hx_early_heart_attack`, `symptom_fatigue`, `history_loss_of_consciousness`, `occupational_risk_factory`
  - Missing in PREMIUM_MULTI_SIGNAL: `diabetes_confirmation_required`, `history_syncope`
  - Source docs:
    - `POC/v2/_project_management/[DONE] 3. Rules-Gap-Closure/rules-gap-discovery.md`
    - `POC/v2/_project_management/[DONE] 3. Rules-Gap-Closure/rules-gap-closure-plan.md`
- Actual config target exists and currently contains mixed aligned + undocumented signals:
  - `POC/v3/assets/synthesis/rulesets/sample_ruleset_tier_config.json`

## Proposed Changes

### 1) Create a clinical decision ledger for GAP-R8
- **File:** `POC/v2/_project_management/[DONE] 3. Rules-Gap-Closure/gaps/GAP-R8-signal-pool-alignment/_discovery.md`
- **What:** Add a table for each disputed signal with columns: signal_id, pool, current_state, framework_reference, clinical_guideline_source, decision_status.
- **Why:** Converts ambiguity into explicit approvals/rejections and prevents accidental policy drift.
- **How:** Seed rows for all six known disputed/missing signals and mark decision status as `pending_clinical_review`.

### 2) Define exact JSON patch sets but keep them gated
- **File:** `POC/v2/_project_management/[DONE] 3. Rules-Gap-Closure/gaps/GAP-R8-signal-pool-alignment/_development_summary.md`
- **What:** Document two patch bundles:
  - **Bundle A (additions if approved):**
    - ADVANCED low-moderate pool: add `fbs_upward_trend`, `diagnosis_fatty_liver`
    - PREMIUM_MULTI_SIGNAL pool: add `diabetes_confirmation_required`, `history_syncope`
  - **Bundle B (removals if not approved):**
    - ADVANCED low-moderate pool: remove `family_hx_early_heart_attack`, `symptom_fatigue`, `history_loss_of_consciousness`, `occupational_risk_factory`
- **Why:** Keeps implementation deterministic after clinical decisions arrive.
- **How:** Record exact JSON paths and ordering rules; no direct config edit until sign-off checkpoint is met.

### 3) Implement approved patch set in ruleset config
- **File:** `POC/v3/assets/synthesis/rulesets/sample_ruleset_tier_config.json`
- **What:** Apply only clinically approved membership changes to:
  - `tier_selection_rules[rule_id=ADVANCED_METABOLIC_OR_CVD].conditions[type=signal_count_threshold].signal_pool`
  - `tier_selection_rules[rule_id=PREMIUM_MULTI_SIGNAL].conditions[type=signal_count_threshold].signal_pool`
- **Why:** Enforces framework traceability and removes undocumented pool drift.
- **How:** Update arrays idempotently (no duplicates, preserve deterministic order conventions used in file).

### 4) Add automated pool-integrity verification test
- **File (new):** `POC/v2/scripts/tests/test_ruleset_signal_pool_alignment_r8.py`
- **What:** Add tests that:
  - load `sample_ruleset_tier_config.json`
  - assert required approved signals exist in target pools
  - assert rejected signals are absent
  - assert no duplicates in each pool
- **Why:** Prevents regression and reintroduction of undocumented signals.
- **How:** Encode expected sets from approved clinical ledger snapshot, not from ad-hoc constants in business code.

### 5) Record test and gate evidence
- **File:** `POC/v2/_project_management/[DONE] 3. Rules-Gap-Closure/gaps/GAP-R8-signal-pool-alignment/_lastest_test_results.md`
- **What:** Record:
  - config syntax check pass
  - R8 test pass
  - framework §9 gate checklist completion status
- **Why:** Provides auditable closure evidence for GAP-R8.
- **How:** Include exact commands and pass/fail outputs.

### 6) Update GAP-R8 status for closure
- **File:** `POC/v2/_project_management/[DONE] 3. Rules-Gap-Closure/gaps/GAP-R8-signal-pool-alignment/README.md`
- **What:** Move status from `Not started` to `Complete` only after clinical sign-off + tests pass.
- **Why:** Keeps status aligned with governance and evidence.
- **How:** Update objective/status notes and reference decision ledger + test evidence files.

## Assumptions & Decisions
- Decision locked: **Clinical-gated only**. No unilateral promotion of disputed signal pool membership.
- Decision locked: **Plan + checklist deliverable** for this phase.
- Assumption: GAP-R8 applies to v3 synthesis config at `POC/v3/assets/synthesis/rulesets/sample_ruleset_tier_config.json`.
- Assumption: Current `[DONE] 3. Rules-Gap-Closure` path is the source-of-truth project management location.
- Non-goal: No changes to GAP-R1..R7 logic unless strictly required by the R8 verification harness.

## Verification Steps
1. Config parse check
   - `python3 -m json.tool POC/v3/assets/synthesis/rulesets/sample_ruleset_tier_config.json > /dev/null`
2. Targeted R8 tests
   - `python3 -m pytest POC/v2/scripts/tests/test_ruleset_signal_pool_alignment_r8.py -v`
3. Cross-check pools are duplicate-free and match approved expected sets.
4. Confirm framework §9 pre-production gate checklist entries are marked complete in GAP-R8 test results.
5. Run diagnostics on touched files and ensure no syntax/type errors.

## Execution Checklist
- [ ] Fill clinical decision ledger with pending rows for all disputed/missing signals.
- [ ] Receive clinical approvals/rejections and freeze approved expected pools.
- [ ] Apply approved JSON patch set to ruleset config.
- [ ] Add and pass R8 pool-integrity tests.
- [ ] Update GAP-R8 README + checkpoint artifacts with closure evidence.
