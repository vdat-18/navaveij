# Integrated Plan — GAP-R6 + GAP-R7 + GAP-R2 Test Hardening + Test Blocker Fixes

**Date:** 2026-03-19  
**Status:** Planned  
**Workstream:** WS-C (Resilience & Observability) + reliability hardening for GAP-R2 verification

---

## 1. Objectives

### GAP-R6 — True Graceful Degradation
- Ensure degradation is triggered by AI/validation failure conditions, not by low confidence alone.
- Build deterministic rule-only output path from ruleset/signals with `recommendation_source = "RuleBased"` and `review_required = true`.

### GAP-R7 — Audit 5-Dimension Expansion
- Capture full framework audit dimensions:
  - WHO: `user_id`, `user_role`
  - WHERE: `service_id`, `client_ip`
  - WHAT: `prompt`, `masked_response`, `latency_ms`
  - WHY: `action_type`, `request_id`
- Thread request/auth context through route → orchestrator → audit logger.

### GAP-R2 Test Hardening
- Expand GAP-R2 tests from unit validator checks to integration-level behavior:
  - orchestrator post-AI filtering behavior
  - conflict-event audit payload propagation
  - no safety leakage in API response shape

### Test Blocker Fixes
- Resolve runtime test environment blockers (`fastapi`, `loguru`) so pytest evidence can run in this environment.

---

## 2. Why This Bundle Is Parallel-Safe

- GAP-R6 primarily targets orchestration decision flow.
- GAP-R7 primarily targets audit contract and context threading.
- GAP-R2 tests target existing safety implementation verification.
- Test-blocker fixes target environment/bootstrap, independent of business logic changes.

Coordination point: orchestrator signature/context threading intersects R6 and R7; implement shared parameter plumbing once to avoid churn.

---

## 3. Implementation Scope

### 3.1 GAP-R6 — Graceful Degradation Path

**Primary file**
- `backend/src/services/orchestrator.py`

**Planned changes**
1. Introduce explicit degradation trigger handling for:
   - AI/BAML exceptions
   - validator failures from contracts path
2. Build deterministic fallback payload from ruleset/signal context (not AI output shadowing).
3. Differentiate low-confidence case as `AI_LowConfidence` (retain AI output with review flag).
4. Keep API response schema stable for downstream consumers.

**Supporting files**
- `backend/src/services/workflows/clinical.py` (if fallback helpers are reused or lifted)
- `backend/src/api/routes/contracts.py` (source labeling consistency)

---

### 3.2 GAP-R7 — Audit Expansion and Context Threading

**Primary files**
- `backend/src/services/audit.py`
- `backend/src/services/orchestrator.py`
- `backend/src/api/routes/contracts.py`

**Planned changes**
1. Expand `log_recommendation(...)` signature to accept audit dimension inputs:
   - `user_id`, `user_role`, `client_ip`, `request_id`, `action_type`, `latency_ms`, prompt/masked_response context
2. Extract request context in route:
   - auth values from `AuthContext`
   - client ip from FastAPI `Request`
   - generated request_id
3. Thread this context into orchestrator and audit logger without breaking existing call paths.
4. Keep immutable hash-chaining semantics unchanged.

---

### 3.3 GAP-R2 Test Hardening

**Primary test files**
- `scripts/tests/test_safety_validator_rules_gap.py`
- `scripts/tests/test_orchestrator_mig3.py`
- `scripts/tests/test_api_contract_routes.py`

**Planned additions**
1. Orchestrator-level test proving filtered add-ons are what reach final output.
2. Audit call assertion test verifying `safety_conflict_events` forwarding.
3. API-level regression to ensure removed safety items are absent from response.
4. Edge tests for age min/max and unknown add-on handling.

---

### 3.4 Test Blocker Remediation

**Current blockers**
- `ModuleNotFoundError: fastapi`
- `ModuleNotFoundError: loguru`

**Planned remediation**
1. Add deterministic environment bootstrap step for tests using project-declared dependencies in `pyproject.toml`.
2. Standardize test execution path in artifacts to use dependency-provisioned runtime.
3. If package installation remains unavailable in this runner, add explicit fallback evidence protocol:
   - compile checks + diagnostics + blocker capture format.

---

## 4. Verification Plan

1. Dependency/runtime verification:
   - confirm `fastapi` and `loguru` importable before pytest collection.
2. Targeted tests:
   - R6/R7 orchestration + audit tests
   - R2 expanded safety tests
3. Contract tests:
   - `/api/recommend` source/review semantics in failure vs low-confidence scenarios
   - audit payload field presence validation
4. Regression sanity:
   - maintain previously completed R1–R5 behavior expectations.

---

## 5. File Impact Matrix

- **Core logic**
  - `backend/src/services/orchestrator.py`
  - `backend/src/services/audit.py`
  - `backend/src/api/routes/contracts.py`
  - optional helper reuse in `backend/src/services/workflows/clinical.py`
- **Security/context plumbing**
  - `backend/src/api/security.py` (only if extension to auth context is needed)
- **Tests**
  - `scripts/tests/test_safety_validator_rules_gap.py`
  - `scripts/tests/test_orchestrator_mig3.py`
  - `scripts/tests/test_api_contract_routes.py`
  - optional new dedicated files:
    - `scripts/tests/test_graceful_degradation_rules_gap.py`
    - `scripts/tests/test_audit_dimensions_rules_gap.py`
- **Gap artifacts**
  - GAP-R6 and GAP-R7 README/discovery/development/tests
  - GAP-R2 test results update for expanded coverage

---

## 6. Risks and Mitigations

1. **Risk:** New audit signature breaks existing callsites.  
   **Mitigation:** introduce optional params with backward-compatible defaults during transition.

2. **Risk:** Graceful-degradation semantics overlap with existing fallback paths.  
   **Mitigation:** codify explicit source taxonomy (`AI`, `AI_LowConfidence`, `RuleBased`) and test each branch.

3. **Risk:** Environment still prevents package installation.  
   **Mitigation:** preserve explicit blocker reporting protocol and avoid marking fully complete without runnable pytest evidence.

4. **Risk:** R2 tests duplicate partial coverage without catching integration bugs.  
   **Mitigation:** prioritize route/orchestrator assertions over only pure-unit validator checks.

---

## 7. Definition of Done

This plan is complete when:

- GAP-R6 true degradation behavior is implemented and test-covered.
- GAP-R7 audit payload contains required 5-dimension fields from real request context.
- GAP-R2 has integration-grade tests beyond validator unit checks.
- Pytest blockers are resolved in runtime, or blocker evidence is explicitly documented with compile+diagnostic fallback evidence.
