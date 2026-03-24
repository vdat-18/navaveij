# Plan — Anchored Risk Summary Toast + Backend-Generated Summary Text

## Summary

This plan addresses both requested fixes:

1. Move the Risk Summary toast from global top-right to an anchored position next to the clicked button.
2. Replace definition-like text with a patient-specific, backend-generated risk summary.

Locked decisions from intent/implementation chat:
- Summary text source: **backend-generated** (`risk_summary.description`).
- Toast interaction: **single anchored toast that repositions and refreshes on each click**.

## Current State Analysis

- In the dashboard, clicking **Risk Summary** currently shows a fixed-position toast at top-right:
  - [RecommendationPanel.tsx](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx#L447-L459)
- The displayed text is assembled from:
  - `risk_summary.description`
  - `risk_summary.source`
  - fallback note
  - [RecommendationPanel.tsx](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx#L431-L437)
- Backend currently sets `risk_summary.description` to a generic definition string:
  - [contracts.py](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v2/backend/src/api/routes/contracts.py#L587-L593)
- Existing tests validate toast existence/content and backend risk summary presence:
  - [RecommendationPanel.test.tsx](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v2/frontend/src/components/dashboard/RecommendationPanel.test.tsx#L171-L200)
  - [test_api_contract_routes.py](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v2/scripts/tests/test_api_contract_routes.py#L124-L214)

## Proposed Changes

### 1) Backend: generate a proper patient-specific risk summary

**File**
- `POC/v2/backend/src/api/routes/contracts.py`

**What**
- Replace static `risk_summary.description` with generated concise summary text.
- Summary should be based on available patient-specific signals, not a definition.

**How**
- Add helper (e.g., `_build_risk_summary_description`) that composes:
  - overall risk level (`overall_risk_level`)
  - top 1–2 critical signal labels/severity from normalized `critical_signals`
  - fallback wording only when `is_risk_fallback` is true
- Example shape (not hardcoded exact phrase):  
  “Overall risk is High, driven by elevated renal and cardiovascular risk signals.”
- Keep existing `risk_summary.source`, `is_fallback`, and metadata fields unchanged.

**Why**
- Ensures the UI displays meaningful content directly from backend truth.
- Keeps cross-client behavior consistent and avoids duplicating business wording in frontend.

### 2) Frontend: anchor toast next to clicked button

**File**
- `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx`

**What**
- Position risk toast relative to the clicked button instead of viewport corner.
- Clicking button again refreshes content and timer; no stacking.

**How**
- Add anchor-ref based positioning:
  - store trigger button ref (`useRef<HTMLButtonElement | null>`)
  - on click, compute element rect and set anchored absolute/fixed coordinates near button
- Render a single toast instance with those coordinates.
- Keep existing auto-dismiss timeout behavior, reset timer on each click.

**Why**
- Matches expected local interaction and improves contextual clarity.

### 3) Frontend: use backend summary as primary body text

**File**
- `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx`

**What**
- Use backend `risk_summary.description` as the primary toast body.
- Keep source/fallback line as secondary metadata only.

**How**
- Build toast content from:
  1) `data.risk_summary?.description` (primary, required fallback if missing)
  2) small metadata line: source/fallback
- Ensure text stays concise and readable (max width and wrapping).

**Why**
- Aligns with your requirement for a proper summary rather than a term definition.

### 4) Update tests for anchoring and summary behavior

**Files**
- `POC/v2/frontend/src/components/dashboard/RecommendationPanel.test.tsx`
- `POC/v2/scripts/tests/test_api_contract_routes.py`

**What**
- Frontend tests:
  - confirm clicking button shows one toast (role status) with backend summary text
  - confirm repeated click refreshes same toast behavior (no stacking assertion via single role/status path)
- Backend tests:
  - assert `risk_summary.description` is non-generic and includes patient-specific elements under controlled mock data

**Why**
- Locks expected UX and prevents regression back to generic description/global toast placement.

## Assumptions & Decisions

- Keep current SSE loading flow unchanged; this plan only targets risk-summary interaction/content.
- No new external toast library is required; existing framer-motion and local state are sufficient.
- Summary wording remains deterministic and concise to avoid unpredictable phrasing.

## Verification Steps

1. Backend tests (from `POC/v2`):
- `python3 -m pytest -q scripts/tests/test_api_contract_routes.py -k "recommend_stream_emits_stage_and_result or risk_summary"`

2. Frontend tests:
- `npm run test -- src/components/dashboard/RecommendationPanel.test.tsx`

3. Targeted lint:
- `npx eslint src/components/dashboard/RecommendationPanel.tsx src/components/dashboard/RecommendationPanel.test.tsx src/api/routes/contracts.py`

4. Manual UI check:
- Click Risk Summary button → toast appears adjacent to the button.
- Click again → same toast refreshes/repositions; no global top-right detached behavior.
- Toast body reads as patient-specific summary, not a definition sentence.
