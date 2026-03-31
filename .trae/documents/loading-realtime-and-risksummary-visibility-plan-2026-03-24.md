# Plan — Real-Time Loading Progress + Reliable Risk Summary Visibility

## Summary

This plan addresses two issues:

1. Loading currently looks artificial because step timing is frontend-simulated and equally paced; “Running AI Analysis” should visibly take longer and, per decision, progress should be driven by **real server events**.
2. Hovering the question-mark icon does not reliably surface `risk_summary` in practice because current UI uses native `title`; replace with a **custom tooltip/popover** bound to `risk_summary`.

Selected direction:
- Loading: **Add `/api/recommend/stream` SSE on contracts route** and wire frontend to it.
- Risk info: **Custom tooltip/popover** (not native title) using `risk_summary`.

## Current State Analysis

- Loading progression is hard-coded in frontend:
  - `STEP_INTERVAL_MS = 1500` and local `setInterval` step advancement in [LoadingSteps.tsx](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v2/frontend/src/components/dashboard/LoadingSteps.tsx#L16-L83).
  - `RecommendationPanel` simply shows/hides loading component around a single `/api/recommend` request in [RecommendationPanel.tsx](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx#L261-L339).
- Backend already supports staged callbacks (`on_stage`) and computes phase timings in orchestrator:
  - stage callbacks and timings in [orchestrator.py](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v2/backend/src/services/orchestrator.py#L30-L133).
- Existing SSE endpoint is legacy (`/api/v1/clinical/recommend/stream`) and uses `patient_id`/legacy route shape:
  - [clinical.py](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v2/backend/src/api/routes/clinical.py#L54-L93).
- `risk_summary` is produced in contracts response pipeline:
  - response model + payload assembly in [contracts.py](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v2/backend/src/api/routes/contracts.py#L32-L51) and [contracts.py](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v2/backend/src/api/routes/contracts.py#L551-L591).
- Frontend currently uses native `title` attribute on tiny icon for risk info:
  - [RecommendationPanel.tsx](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx#L395-L401).
  - This is fragile for touch devices/webviews and easy to miss.

## Proposed Changes

### 1) Add contracts-aligned SSE stream endpoint for real progress

**Files**
- `POC/v2/backend/src/api/routes/contracts.py`
- `POC/v2/backend/src/api/main.py` (route already mounted; only if import/wiring adjustment needed)
- `POC/v2/scripts/tests/test_api_contract_routes.py`

**What / Why**
- Add `POST /api/recommend/stream` to contracts router so frontend can get live stage events while keeping patient-token contract.
- Real-time events remove dummy pacing and naturally make AI analysis stage longer when backend actually takes longer.

**How**
- Implement SSE handler in contracts route (similar queue pattern used in legacy clinical route), but using:
  - `RecommendRequest` (`patient_token`, `force_rule_based`)
  - existing auth dependency (`require_recommendation_access`)
  - same normalization pipeline used by `/api/recommend` for final `result` event
- Stream event types:
  - `stage` → `{ type, stage, label }`
  - `result` → normalized response payload (same shape as `/api/recommend`)
  - `error` → structured error payload
- Ensure stage labels map cleanly to UI steps, including explicit “Running AI Analysis”.

### 2) Add frontend streaming client path and step-driven loading

**Files**
- `POC/v2/frontend/src/services/api.ts`
- `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx`
- `POC/v2/frontend/src/components/dashboard/LoadingSteps.tsx`
- `POC/v2/frontend/src/types/recommendation.ts` (only if stream event type helpers are added)
- `POC/v2/frontend/src/components/dashboard/RecommendationPanel.test.tsx`

**What / Why**
- Use SSE endpoint in dashboard recommendation flow so progress is server-driven, not interval-driven.
- Make “Running AI Analysis” naturally longer because backend emits stage transition only when AI phase actually advances.

**How**
- Add API service method for stream consumption (fetch + `ReadableStream` parsing).
- Refactor loading state in `RecommendationPanel`:
  - track `currentStage` from stream events
  - update loading steps using stage index from backend
  - on `result`, set final data and close loading
- Refactor `LoadingSteps` to support controlled mode:
  - accept optional `activeStep` prop for real-time mode
  - keep fallback timer mode only if stream unavailable (defensive fallback)

### 3) Replace native title with custom risk tooltip/popover

**Files**
- `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx`
- `POC/v2/frontend/src/components/dashboard/RecommendationPanel.test.tsx`

**What / Why**
- Replace native `title` hover with explicit custom tooltip/popover so `risk_summary` is reliably visible and readable across device/input modes.

**How**
- Render a small hover/focus tooltip anchored to question-mark icon.
- Content includes:
  - `risk_summary.description`
  - `source`
  - fallback note when `is_fallback === true`
- Keep keyboard accessibility (focusable trigger and visible content on focus).

## Assumptions & Decisions

- Decision locked: implement **real-time SSE** via `/api/recommend/stream` (contracts route), not legacy clinical route.
- Decision locked: implement **custom tooltip/popover** for risk summary visibility.
- Keep `/api/recommend` non-stream endpoint intact for compatibility and fallback.
- No backend model/formula changes to risk scoring logic; this is progress transport + UI visibility improvement.

## Verification Steps

1. **Backend tests**
- Add/extend tests in `test_api_contract_routes.py` to validate:
  - `/api/recommend/stream` emits stage events then result
  - result payload schema matches current normalized recommendation contract

2. **Frontend tests**
- `RecommendationPanel.test.tsx`:
  - stream events advance displayed steps
  - AI step remains active until next server event/result
  - risk tooltip/popover content renders from `risk_summary`

3. **Targeted commands**
- Frontend:
  - `npm run test -- src/components/dashboard/RecommendationPanel.test.tsx`
  - `npx eslint src/components/dashboard/RecommendationPanel.tsx src/components/dashboard/LoadingSteps.tsx src/services/api.ts src/components/dashboard/RecommendationPanel.test.tsx`
- Backend (from `POC/v2`):
  - `python3 -m pytest -q scripts/tests/test_api_contract_routes.py -k "recommend_stream or recommend_contract_route_success"`

4. **Manual checks**
- Start recommendation request and verify live stage progression from server events.
- Confirm “Running AI Analysis” appears longer when backend AI processing is slower.
- Hover/focus question icon and verify risk summary details are visible without relying on native browser tooltip.
