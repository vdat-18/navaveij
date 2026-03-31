# WS-A Follow-up Plan — Loading Bar, Risk Meaning, AI Gateway Note

## Summary

This follow-up plan addresses three concerns:

1. Make the loading UI clearly led by a **horizontal hero loading bar** with compact step context.
2. Verify and fix risk-gauge data truth so it reflects real recommendation output, then explain the meaning in UI.
3. Add an explicit project-management note that **AI Gateway needs further refactor design** (deferred for now).

The plan includes frontend and backend updates because current risk field wiring appears inconsistent between API model and frontend usage.

## Current State Analysis

- `LoadingSteps.tsx` already has a top horizontal bar, but the dominant visual remains the vertical step cards, not the bar.
  - File: `POC/v2/frontend/src/components/dashboard/LoadingSteps.tsx`
- `RecommendationPanel.tsx` renders a larger gauge, but risk semantics are not explained to users.
  - File: `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx`
- Frontend expects top-level `overall_risk_level` in `RecommendationResponse`.
  - File: `POC/v2/frontend/src/types/recommendation.ts`
- Backend `/api/recommend` response model (`RecommendResponse`) currently does not declare `overall_risk_level`, while normalization builds most other stage-2 fields.
  - File: `POC/v2/backend/src/api/routes/contracts.py`
- MCP clinical signals tool can return fallback hardcoded values when no record exists (`overall_risk_level: "Low"`), which can look dummy if surfaced without context.
  - File: `POC/v2/backend/src/mcp_server/tools/clinical_signals.py`
- AI Gateway section has been renamed and updated in UI, but no documented “needs refactor” note exists in GAP documentation yet.
  - File: `POC/v2/_project_management/8. Feedbacks/gaps/GAP-F13-admin-panel-updates/README.md`

## Proposed Changes

### A) Loading UI refinement (hero horizontal bar + compact steps)

**Files**
- `POC/v2/frontend/src/components/dashboard/LoadingSteps.tsx`
- `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx` (if prop wiring is needed)
- `POC/v2/frontend/src/components/dashboard/RecommendationPanel.test.tsx`

**What / Why**
- Recompose loading layout so the horizontal bar becomes the clear primary visual.
- Keep compact steps as secondary context to preserve explainability.

**How**
- Center and enlarge the horizontal bar container (thicker track/fill, stronger contrast, central placement).
- Convert current full row step cards into compact inline chips/list beneath the hero bar.
- Keep current timed progression model (`~1.5s`) and terminal step hold until request resolves.
- Update tests to assert hero bar container plus key compact step labels.

### B) Risk gauge truth + meaning (backend fix + UI explanation)

**Files**
- `POC/v2/backend/src/api/routes/contracts.py`
- `POC/v2/frontend/src/types/recommendation.ts`
- `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx`
- `POC/v2/scripts/tests/test_api_contract_routes.py`
- `POC/v2/frontend/src/components/dashboard/RecommendationPanel.test.tsx`

**What / Why**
- Ensure risk displayed on gauge is sourced from actual API payload and not accidental fallback/undefined behavior.
- Clarify what the gauge means for end users: overall at-a-glance patient health risk signal summary.

**How**
- Backend:
  - Extend `RecommendResponse` to include:
    - `overall_risk_level: str`
    - `risk_summary: dict[str, Any]` with provenance-friendly fields (e.g., `source`, `is_fallback`, optional `pipeline_run_id` reference).
  - In `_normalize_stage2`, map `overall_risk_level` from `clinical_signals` and populate `risk_summary` from available context.
  - Preserve existing confidence logic unchanged.
- Frontend:
  - Extend `RecommendationResponse` type with `risk_summary`.
  - Add concise tooltip/help text near gauge title:
    - Explains this is an overall health risk level based on clinical signals.
    - Shows fallback notice when `risk_summary.is_fallback === true`.
  - Keep gauge visual style unless fallback state requires a subtle warning badge.
- Tests:
  - Backend tests assert `overall_risk_level` and `risk_summary` are present and correctly mapped.
  - Frontend tests assert tooltip text and fallback badge logic render correctly.

### C) AI Gateway deferred-refactor note (documentation only)

**Files**
- `POC/v2/_project_management/8. Feedbacks/gaps/GAP-F13-admin-panel-updates/README.md`
- (optional sync) `POC/v2/_project_management/8. Feedbacks/feedbacks-gap-closure-plan.md` status/evidence section

**What / Why**
- Record your explicit concern that AI Gateway UI still needs a deeper refactor direction.
- Keep this visible for next design iteration without blocking current WS-A follow-up fixes.

**How**
- Add a short “Open Follow-up Note” section in GAP-F13 README:
  - Current implementation accepted for closure baseline.
  - Refactor pending around IA/visual hierarchy/content density.
  - To be defined in next UI refinement pass.

## Assumptions & Decisions

- Chosen loading direction: **Hero horizontal bar + compact steps**.
- Risk deliverable: **Document + tooltip**, plus technical fix if contract mismatch exists.
- Risk contract fix is in scope now (backend + frontend alignment).
- AI Gateway concern should be captured in **GAP README note** (not just transient chat context).
- No additional shadcn package installs are required for this pass.

## Verification Steps

1. **Backend tests**
   - Run targeted `test_api_contract_routes.py` cases for `/api/recommend` and `_normalize_stage2`.
   - Add assertions for `overall_risk_level` and `risk_summary` mapping and fallback semantics.

2. **Frontend unit tests**
   - `RecommendationPanel.test.tsx`:
     - Hero horizontal loading bar presence.
     - Compact step labels still visible.
     - Risk meaning tooltip text.
     - Fallback warning rendering branch.
   - Keep existing confidence/gauge behavior tests passing.

3. **Targeted lint/tests**
   - Run frontend targeted tests for touched components.
   - Run backend targeted tests for touched contracts route tests.
   - Use targeted lint checks for touched frontend files to avoid unrelated repository-wide blockers.

4. **Manual smoke checks**
   - Dashboard loading state: bar reads as primary visual at first glance.
   - Risk gauge: value shown matches API payload and meaning is understandable via tooltip.
   - AI Gateway docs: follow-up refactor note exists in GAP-F13 README.

## Out of Scope

- Full AI Gateway redesign implementation in this pass.
- Reworking risk computation formula (confidence scoring remains unchanged).
- Real-time backend progress streaming (SSE/WebSocket).
