# Plan

## Step 1 — Fix the 404: Add `/recommend/stream` to contracts router

The `contracts` router at `/api` is where the frontend calls for all recommendation operations. Add a `POST /recommend/stream` endpoint to `backend/src/api/routes/contracts.py` that:
- Accepts the same `RecommendRequest` body as `/recommend`
- Resolves the patient token to a patient
- Runs `orchestrator.generate_recommendation(..., on_stage=on_stage)` in a background task
- Emits SSE events: `{"type":"stage","stage":N,"label":"..."}` per pipeline phase, then `{"type":"result",...}` on completion
- Returns a `StreamingResponse` with `media_type="text/event-stream"`
- Add `import asyncio` and `from fastapi.responses import StreamingResponse` imports

## Step 2 — Add `streamRecommendation()` to `api.ts`

Add a `StageUpdate` interface and `clinicalService.streamRecommendation()`:
- Uses native `fetch()` (not axios) to connect to `/api/recommend/stream`
- Reads response body as `ReadableStream`, parses SSE lines
- Calls `onStage(update)` callback for each `{"type":"stage"}` event
- Returns `RecommendationResponse` when `{"type":"result"}` arrives
- Throws on `{"type":"error"}` or stream end without result

## Step 3 — Replace static loading block in `RecommendationPanel.tsx`

- Add `PIPELINE_STAGES` constant: 4 entries (stages 1, 2, 3, 6) with color, icon, description, and time hint
- Add `currentStage: StageUpdate | null` state (default null)
- Change `fetchRecommendation` to call `streamRecommendation(patientToken, setCurrentStage, isRuleBasedForced)`
- Replace the static loading `if (loading) {...}` block with a live panel showing:
  - Top progress bar (fills 25/50/75/100%)
  - Large colored icon (changes per active stage, fade/scale transition)
  - `AnimatePresence` animated label (stage name + description + time hint)
  - 4-step dot row (pulsing active, green checkmark done, gray pending)

## Step 4 — Verification

```bash
cd POC/v4/frontend && npx tsc --noEmit
```
Zero errors in non-test source files expected.
