# Discover — Stage 3: Frontend Highlighting

## Finding 1: V4 inline highlight functions do not exist in V6

V6 was copied from V5, which never had the V4-era functions. Searched `RecommendationPanel.tsx` — zero matches for:
- `renderBoldText` — not present
- `normalizeClinicalToken` — not present
- `splitConsultationSentences` — not present
- Local `badKeywords` / `goodKeywords` / `clinicalDict` arrays — not present

**Conclusion:** Step 3a (remove inline highlight logic) was already complete. No work needed.

## Finding 2: `renderHighlightedText` already wired (7 call sites)

`RecommendationPanel.tsx` already imports and uses `renderHighlightedText` from `recommendationTextFormatting.tsx` at 7 locations:
- Line 1013: Clinical reasoning lines (`line.text`, `line.sentiment`, `line.highlight_terms`)
- Line 1047: Policy reasoning lines
- Line 1191: Consultation summary headline
- Line 1202: Top findings
- Line 1218: Add-on labels (informational, no highlight_terms)
- Line 1233: Program justification
- Line 1244: Next actions

**Conclusion:** Step 3b (wire renderHighlightedText) was already complete. No work needed.

## Finding 3: `clinical-dictionary.ts` has 1 real consumer

Only `LabResultsGrid.tsx` imports from `clinical-dictionary.ts`:
- Line 6: `import { translateIdentifier } from "@/shared/clinical-dictionary"`
- Line 63: `{translateIdentifier(lab.category)}`

Other references in `frontend/coverage/` are stale V2-era coverage report artifacts (HTML/JSON), not source code.

## Finding 4: The dictionary lookup is unnecessary for lab categories

`translateIdentifier` looks up keys in `CLINICAL_DICTIONARY` (66 entries), then falls back to snake_case → Title Case. Lab categories (`cancer_screening`, `cardiac`, `gi_liver`, `nephrology`, `imaging`, `endocrine`, `ophthalmology`, `musculoskeletal`) are **not in the dictionary** — the function always hits the fallback for this use case.

**Conclusion:** Safe to replace with an inline fallback function. No loss of functionality.
