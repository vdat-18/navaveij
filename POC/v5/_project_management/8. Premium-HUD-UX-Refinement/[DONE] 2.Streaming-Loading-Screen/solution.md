# Solution

## Decisions

- Add the SSE endpoint to `contracts.py` (not `clinical.py`) — this is the correct router since the frontend calls `/api/recommend*` for all recommendation operations. Avoids a URL change in the frontend.
- Use native `fetch()` + `ReadableStream` for SSE consumption — axios does not support streaming out of the box; `fetch` is the standard browser API for this.
- `PIPELINE_STAGES` config is frontend-only — the backend stage numbers (1, 2, 3, 6) map to UI metadata (color, icon, description, hint) without any backend contract change.
- No backend workflow changes — the orchestrator and clinical workflow already had `on_stage` callback support in v4. Only the contracts router needed the new endpoint.

## Approach

### Backend: `POST /recommend/stream` in contracts.py

Same SSE pattern as the existing `/api/v1/clinical/recommend/stream`:
1. Resolve patient from token
2. Create an `asyncio.Queue` and a `_DONE` sentinel
3. Define `on_stage(num, label)` to put `{"type":"stage",...}` into the queue
4. Run `orchestrator.generate_recommendation(..., on_stage=on_stage)` as a `create_task`
5. `generate()` coroutine yields each queue item as `data: {...}\n\n` until `_DONE`
6. Return `StreamingResponse(generate(), media_type="text/event-stream")`

### Frontend: `streamRecommendation()` in api.ts

- Builds auth headers the same way as all other service methods
- POSTs to `${API_BASE_URL_V3}/recommend/stream` using `fetch()`
- Reads `response.body` as a `ReadableStream<Uint8Array>` via `getReader()`
- Splits on `\n\n` (SSE message boundary), parses `data:` lines as JSON
- Calls `onStage(update)` on `{"type":"stage"}` events
- Resolves the promise on `{"type":"result"}`, throws on `{"type":"error"}`

### Frontend: Loading panel in RecommendationPanel.tsx

- `PIPELINE_STAGES` array maps stage numbers to color/icon/text config
- `STAGE_INDEX` maps raw stage numbers → array index for progress calculation
- `currentStage` state updates via `setCurrentStage` callback passed to `streamRecommendation`
- Progress bar uses Framer Motion `animate={{ width: progressPct + "%" }}`
- Stage icon/label uses `AnimatePresence mode="wait"` keyed on `currentStage.stage`
- Step row: `motion.div animate={{ scale: [1, 1.15, 1] }}` pulses the active step

## What Was Not Changed

- Backend workflow logic — `on_stage` callbacks already existed
- `getRecommendation()` — kept for backward compatibility
- Admin/DPO flow — no impact
