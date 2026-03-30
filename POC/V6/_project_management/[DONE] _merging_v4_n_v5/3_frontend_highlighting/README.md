# Stage 3 — Frontend Highlighting

## Goal
Replace V4's client-side regex highlight chain with V5's backend-driven annotation system. After this stage, all highlighting logic lives in `text_annotations.py`; the FE only renders what the API returns.

## Steps

### 3a — Remove inline highlight logic from RecommendationPanel.tsx
Delete the following functions (V4 relics, no longer needed):
- `renderBoldText()`
- `normalizeClinicalToken()`
- `splitConsultationSentences()`
- Any local `badKeywords` / `goodKeywords` / `clinicalDict` arrays

### 3b — Wire `renderHighlightedText()` from recommendationTextFormatting.tsx
Replace all call sites of the removed functions with `renderHighlightedText(line, highlights)` where `highlights` comes from `data.reasoning_trace_annotated[i].highlight_terms`.

### 3c — Delete clinical-dictionary.ts
Remove `frontend/src/shared/clinical-dictionary.ts` — its terms were merged into `text_annotations.py` in Stage 2. Update any imports.

### 3d — Verify TypeScript compilation
`npm run build` — zero errors related to the removed functions or deleted file.

## Acceptance Criteria
- [ ] `clinical-dictionary.ts` deleted; no dangling imports
- [ ] `RecommendationPanel.tsx` contains no regex-based highlight logic
- [ ] Highlighted text in UI matches `highlight_terms` from API response
- [ ] `npm run build` exits 0
