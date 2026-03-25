# MIG-6 Execution Plan — Frontend PII Privacy Mode Toggle

**Date:** 2026-03-19  
**Scope:**  
- `POC/v2/frontend/src/app/page.tsx`  
- `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx`  
- `POC/v2/scripts/tests/test_frontend_reliability_contract.py`  
**Status:** Planned

## Goal

Implement Privacy Mode on Screen 1 so users can switch between physician-readable PII and masked UUID-token view, including reasoning-trace masking, while preserving current MIG-5 mode-toggle and remount behavior.

## Confirmed Baseline

1. `page.tsx` currently holds `selectedPatient` and `isRuleBasedForced` only.
2. `RecommendationPanel` currently owns recommendation `data` in local state.
3. `getDisplayValue(...)` requires `security_metadata.rehydration_map`, which is only present in recommendation response payload.
4. MIG-4 already guarantees `security_metadata` in `/api/recommend` contract.

## UI Options

1. **Option A (Recommended): Header Privacy Pill + Page-Level Metadata Lift**
   - Add a red/green privacy toggle pill in header utility controls.
   - Lift `security_metadata` to `page.tsx` via callback from `RecommendationPanel`.
   - Use page-level `getDisplayValue(...)` for patient name/ID/MRN/phone/email.
   - Keep reasoning-trace switch in `RecommendationPanel` based on `privacyMode`.

2. **Option B: Panel-Local Privacy Toggle**
   - Add toggle inside `RecommendationPanel`.
   - Keep all metadata and masking logic local to panel.
   - Tradeoff: does not cleanly drive patient-card PII masking in `page.tsx` and diverges from v3 pattern.

## Planned Implementation Choice

Use **Option A**. It matches v3 structure and enables full-page PII masking, including patient card fields rendered in `page.tsx`.

## In-Scope Changes

1. `page.tsx`
   - Add `privacyMode` state.
   - Add `clinicalData`-adjacent state for `securityMetadata` received from panel callback.
   - Add `getDisplayValue(originalValue, fallbackToken)` helper with reverse lookup from `rehydration_map`.
   - Replace patient PII display fields with `getDisplayValue(...)`.
   - Add Privacy Mode toggle control (lock/unlock visual semantics, red/green state).
   - Pass `privacyMode` and callback prop to `RecommendationPanel`.

2. `RecommendationPanel.tsx`
   - Extend props with `privacyMode` and `onRecommendationData` callback.
   - After recommendation fetch success, pass fetched payload to parent callback.
   - Render reasoning trace from:
     - physician view: `data.reasoning_trace`
     - privacy view: `data.security_metadata?.masked_ai_output?.reasoning_trace` with fallback.
   - Preserve existing remount key behavior (`key={patientToken}`) and MIG-5 fetch behavior.

3. `test_frontend_reliability_contract.py`
   - Add source-level assertions for:
     - page-level `privacyMode` state and helper usage on patient fields.
     - callback wiring from `RecommendationPanel` to page-level metadata state.
     - panel reasoning-trace conditional masking path.

## Non-Goals for MIG-6

- No backend/orchestrator/contract edits.
- No timeline/access-monitoring screen changes.
- No migration to different state library.

## Implementation Steps

1. Add `privacyMode` and recommendation-metadata state in `page.tsx`.
2. Implement `getDisplayValue(...)` reverse map helper in `page.tsx`.
3. Replace patient card PII render values with helper-driven values.
4. Add privacy toggle button in header utility controls.
5. Extend `RecommendationPanel` props for `privacyMode` and callback.
6. Emit recommendation payload to parent on successful fetch.
7. Switch reasoning-trace source based on `privacyMode`.
8. Add/extend frontend reliability contract tests for MIG-6 wiring.
9. Update MIG-6 artifact files with implementation/test evidence.

## Acceptance Gates

1. Privacy toggle is visible and clearly indicates ON/OFF mode.
2. Patient name/ID/MRN/phone/email display as UUID tokens when Privacy Mode is ON.
3. Reasoning trace displays masked variant when Privacy Mode is ON.
4. Toggling back restores physician-readable values.
5. No regression to MIG-5 behavior:
   - mode toggle still refetches recommendations,
   - patient-change remount behavior remains unchanged.

## Risks and Mitigations

1. **Risk:** `security_metadata` missing for a response path.  
   **Mitigation:** `getDisplayValue(...)` and trace selector use safe fallback tokens/default trace.
2. **Risk:** callback updates cause unnecessary rerenders.  
   **Mitigation:** update metadata only on successful fetch completion.
3. **Risk:** privacy toggle accidentally changes fetch/remount semantics.  
   **Mitigation:** keep existing fetch dependencies and `key={patientToken}` unchanged.
4. **Risk:** masked trace content absent or not string.  
   **Mitigation:** coerce to string-safe fallback before split/render.

## Verification Plan

1. Run targeted frontend reliability contract tests covering MIG-6 source wiring.
2. Manual smoke on Screen 1:
   - select a patient, validate physician view values,
   - toggle Privacy Mode ON and validate tokenized patient fields + masked trace,
   - toggle OFF and confirm restoration,
   - toggle MIG-5 mode and ensure recommendation refetch still works.
3. Route sanity checks:
   - `/trend-timeline`, `/access-monitoring`, `/audit` still reachable from navbar.

## Exit Evidence to Capture

- Diffs for `page.tsx` and `RecommendationPanel.tsx`.
- Test output for MIG-6 frontend reliability assertions.
- Updated MIG-6 artifact files:
  - `README.md`
  - `_discovery.md`
  - `_development_summary.md`
  - `_lastest_test_results.md`
