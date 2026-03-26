# Actual Development

## Changes

- `backend/src/api/routes/contracts.py` — added `import asyncio`, `from fastapi.responses import StreamingResponse`; added `POST /recommend/stream` SSE endpoint (lines 696–752)
- `frontend/src/services/api.ts` — added `StageUpdate` interface; added `streamRecommendation(patientToken, onStage, forceRuleBased?)` using `fetch()` + `ReadableStream`
- `frontend/src/components/dashboard/RecommendationPanel.tsx` — added `PIPELINE_STAGES` config (4 stages with color/icon/hint), `STAGE_INDEX` map, `currentStage` state, switched fetch call to `streamRecommendation`, replaced static loading block with animated 4-step panel (progress bar, icon, label, step dots)

## Verification

`npx tsc --noEmit` — zero errors in application source files.
Pre-existing test file errors (`vi`/`describe` not found) are Vitest config issues unrelated to this change.

## Outcome

Physicians see a live 4-step loading panel during the 10–30 second recommendation wait:
- Step 1 (teal) — Fetching Patient Data
- Step 2 (amber) — Applying Clinical Rules
- Step 3 (violet) — AI Reasoning *(7–20 sec hint shown)*
- Step 6 (emerald) — Finalising

Progress bar fills left-to-right; active step pulses; completed steps show green ✅.
