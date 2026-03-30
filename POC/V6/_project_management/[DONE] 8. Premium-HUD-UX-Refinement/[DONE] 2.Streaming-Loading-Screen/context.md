# Context — Streaming Loading Screen

**Date:** 2026-03-23

---

## Problem

The recommendation loading screen was a single static panel (brain icon + fixed text) with no feedback about which pipeline step was running. The doctor waited 10–30 seconds with no information.

The backend already had `/recommend/stream` (SSE) on the `clinical` router at `/api/v1/clinical/recommend/stream`, but the frontend used the non-streaming `/recommend` endpoint on the `contracts` router (`/api/recommend`). Any call to `/api/recommend/stream` returned **404 Not Found**.

## Solution

1. Add `POST /recommend/stream` to `contracts.py` — same prefix as the existing `/recommend` the frontend uses.
2. Add `streamRecommendation()` to `api.ts` using native `fetch()` + SSE.
3. Replace the static loading block in `RecommendationPanel.tsx` with a colorful 4-step animated panel driven by `currentStage` state.

## Files Changed

| File | Change |
|------|--------|
| `backend/src/api/routes/contracts.py` | Added `POST /recommend/stream` SSE endpoint |
| `frontend/src/services/api.ts` | Added `StageUpdate` interface + `streamRecommendation()` |
| `frontend/src/components/dashboard/RecommendationPanel.tsx` | Added `PIPELINE_STAGES`, `currentStage` state, colorful 4-step loading panel |
