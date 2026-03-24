# WS-A Implementation Plan — Visual & Display Quick Wins (GAP-F2/F3/F4/F13)

## Summary

Implement Workstream A from `feedbacks-gap-closure-plan.md` by delivering four frontend-only quick wins:

1. Replace `RecommendationPanel` loading spinner with a colorful 6-step workflow indicator (GAP-F2).
2. Make the risk gauge visually dominant with stronger zone contrast and critical pulse emphasis (GAP-F3).
3. Display confidence as numeric percentage with threshold-based color semantics (GAP-F4).
4. Update admin System Config UI from “BAML Client Registry” to “AI Gateway”, add provider logo rendering, and remove “Auth Configuration” block (GAP-F13).

No architecture changes, no backend contract changes required for WS-A baseline.

## Current State Analysis

- `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx`
  - Loading state is a single animated card and text (“Synthesizing Clinical Intelligence”), not step-based.
  - Risk gauge exists as a compact semicircle (`w-48 h-24`) and does not strongly dominate layout.
  - Confidence is currently shown as qualitative text (“Optimal Confidence”), not numeric `%`.
- `POC/v2/frontend/src/components/access-monitoring/SystemConfigTab.tsx`
  - Section label is “BAML Client Registry”.
  - Provider is text-only in a table; no logo render path.
  - “Auth Configuration” section is currently rendered.
- `POC/v2/frontend/src/services/api.ts`
  - `SystemConfig.all_clients` type includes `name/provider/model/status` only; no optional provider logo field.
- Existing tests:
  - `RecommendationPanel.test.tsx` already covers risk label rendering and core panel behavior.
  - No direct tests currently cover `SystemConfigTab`.

## Proposed Changes

### 1) GAP-F2 — Loading States

**Files**
- Create: `POC/v2/frontend/src/components/dashboard/LoadingSteps.tsx`
- Update: `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx`

**What**
- Add a reusable `LoadingSteps` component with 6 fixed, named steps:
  1. Fetching clinical constraints
  2. Loading clinical signals
  3. Retrieving biomarker trends
  4. Evaluating program ruleset
  5. Running AI analysis
  6. Validating safety rules
- Implement timed progression in UI while `loading === true`.
- Replace existing loading card in `RecommendationPanel` with `LoadingSteps`.

**How**
- In `LoadingSteps.tsx`, define internal step metadata (label + icon + color class).
- Use `useEffect` + interval timer (target ~1.5s) to advance `activeStep` while mounted.
- Provide visual states for completed/current/upcoming steps (e.g., check + highlight + dim).
- Ensure animation loops safely for long requests by capping at final step and keeping last step active until response returns.

**Why**
- Aligns with feedback requiring explicit “model thinking” progression and stronger explainability during wait time.

### 2) GAP-F3 — Risk-o-Meter Prominence

**File**
- Update: `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx`

**What**
- Refactor `ClinicalRiskGauge` visual treatment to become the hero element.
- Increase gauge footprint and stroke weight.
- Use explicit high-contrast zone colors (green/yellow/red, with critical emphasized).
- Add critical-only pulsing outer ring animation.

**How**
- Increase SVG dimensions and arc stroke widths.
- Keep existing risk-level mapping (`Low/Medium/High/Critical`) and update color mapping to saturated variants.
- Add a conditional pulse element/class when `value === "Critical"`.
- Maintain existing testable textual risk label so current tests remain valid.

**Why**
- Client feedback calls out immediate risk readability as a top visual issue.

### 3) GAP-F4 — Confidence Score as Numeric %

**File**
- Update: `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx`

**What**
- Replace primary confidence display text with numeric percentage: `Math.round(confidence_score * 100)% Confidence`.
- Apply semantic thresholds:
  - `>= 75%` green
  - `>= 50%` amber
  - `< 50%` red
- Keep qualitative tier as secondary/supporting text only (if present).

**How**
- Add small helper in component scope to derive percentage + class from `data.confidence_score`.
- Update the current strategy header strip where “Optimal Confidence” is shown.
- Add null-safe fallback when score is missing (e.g., `--% Confidence`) without crashing render.

**Why**
- Numeric confidence is explicitly requested and matches onboarding threshold definitions.

### 4) GAP-F13 — Admin Panel Updates

**Files**
- Update: `POC/v2/frontend/src/components/access-monitoring/SystemConfigTab.tsx`
- Update: `POC/v2/frontend/src/services/api.ts`

**What**
- Rename section label from “BAML Client Registry” to “AI Gateway”.
- Add provider logo/avatar in AI Gateway table.
- Remove “Auth Configuration” section from rendered UI.
- Extend `SystemConfig.all_clients` item shape with optional `provider_logo_url?: string`.

**How**
- Add a deterministic logo resolver in `SystemConfigTab`:
  - Use `client.provider_logo_url` when present.
  - Fallback to provider/name-based local mapping (openai, anthropic, llama/meta, fallback).
  - Fallback-of-fallback to a letter/avatar badge for unknown providers.
- Render a compact logo cell next to provider/client text.
- Remove Auth Configuration JSX block and unused `AUTH_MODE_DESCRIPTIONS` constant/import usage.
- Keep API response compatibility by making logo field optional in type only.

**Why**
- Meets client terminology preference (“AI Gateway”), improves visual trust cues with provider branding, and removes unnecessary auth UI from demo.

## Sequencing

1. Implement GAP-F2 in `RecommendationPanel` with new `LoadingSteps`.
2. Implement GAP-F3 and GAP-F4 in the same `RecommendationPanel` edit pass (minimizes churn).
3. Implement GAP-F13 in `SystemConfigTab` + `SystemConfig` typing.
4. Update/add tests and run targeted verification.

## Assumptions & Decisions

- Scope is strictly WS-A (`GAP-F2`, `GAP-F3`, `GAP-F4`, `GAP-F13`) only.
- No backend endpoint/schema change is required for WS-A; optional `provider_logo_url` is front-end tolerant.
- Loading step progression is UX-simulated (timer-based), not backend real-time telemetry.
- Existing panel visual language (Tailwind + navavej tokens + framer-motion) is preserved.
- “Auth Configuration” removal is UI-level for this phase; no auth behavior is modified.

## Verification Steps

1. **Unit tests (dashboard)**
   - Update `RecommendationPanel.test.tsx`:
     - Assert loading steps labels render during pending request.
     - Assert numeric confidence text renders from `confidence_score`.
     - Preserve/adjust existing risk label assertions after gauge refactor.
2. **Unit tests (access monitoring)**
   - Add `SystemConfigTab.test.tsx`:
     - Confirms “AI Gateway” label is shown.
     - Confirms “Auth Configuration” block is absent.
     - Confirms provider logo/avatar rendering path exists per client row.
3. **Lint + test command execution**
   - Run `npm run test -- src/components/dashboard/RecommendationPanel.test.tsx src/components/access-monitoring/SystemConfigTab.test.tsx`
   - Run `npm run lint` for touched files.
4. **Manual UI smoke checks**
   - Dashboard with selected patient: loading shows 6-step progression, gauge prominence visibly increased, confidence displays as `%`.
   - Access Monitoring (admin): AI Gateway section title present, provider logo visible, Auth Configuration section removed.

## Out of Scope for This Plan

- GAP-F5 to GAP-F12 and GAP-F1/F11 workstreams.
- Backend changes for real-time loading telemetry (SSE/WebSocket).
- Any change to recommendation logic, contracts, or security behavior.
