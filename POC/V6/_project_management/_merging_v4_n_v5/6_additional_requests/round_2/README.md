# Round 2 — Additional Requests (Bug Fixes + Enhancements)

## Goal
Fix 2 bugs and add 3 UX enhancements identified after Round 1 UI cherry-picks.

## Steps

### R2a — Fix Transparency Metric tooltip clipping
**File:** `frontend/src/components/dashboard/RecommendationPanel.tsx`

The "Transparency Metric" hover tooltip (added in Round 1) is clipped by `overflow-hidden` on the Clinical Logic card. Remove the overflow constraint so the tooltip renders fully above the card.

### R2b — Client-side recommendation cache (5 min TTL)
**File:** `frontend/src/components/dashboard/RecommendationPanel.tsx`

Switching screens currently re-triggers AI inference via the streaming endpoint. Add a module-level client-side cache (5-minute TTL keyed by `patientToken:isRuleBasedForced`) so returning to a patient within 5 min loads instantly from cache.

Note: The backend already has 300s server-side cache on POST `/recommend`, but the frontend uses POST `/recommend/stream` which bypasses it.

### R2c — Biomarker chart "?" help tooltips
**File:** `frontend/src/components/trend-timeline/BiomarkerTrendGrid.tsx`

Add a `HelpCircle` icon next to each chart title (FBS, HbA1c, LDL, BMI, BP Systolic, eGFR) with a hover tooltip explaining what the metric measures and how to interpret results. Uses a client-side descriptions map — no backend change.

### R2d — Collapsible date groups in Clinical Event Timeline
**File:** `frontend/src/components/trend-timeline/ClinicalEventTimeline.tsx`

Make each date group in the clinical event timeline collapsible. Default: expanded (preserves current behavior). Click the date header to toggle. Shows `ChevronDown` when expanded, `ChevronRight` when collapsed.

### R2e — Fix BAML sentiment casing mismatch (risk lines grey instead of red)
**Files:** `backend/src/services/workflows/clinical.py`, `backend/src/services/text_annotations.py`, `baml_src/annotation_tests.baml`

Clinical reasoning lines from the BAML `AnnotateReasoningLines` agent all render as grey/neutral despite containing clear risk indicators. Root cause: BAML enum `LineSentiment { Risk @alias("risk") }` parses LLM output to capitalized variant `"Risk"`, but frontend compares against lowercase `'risk'`. The fallback keyword path returns lowercase (works), so bug only manifests when the BAML agent is active.

Fix: normalize `item.sentiment` to lowercase in `clinical.py:318`. Also expanded BAD_KEYWORDS in `text_annotations.py` with clinical compound phrases, and fixed BAML test assertions to use capitalized enum variants.

## Acceptance Criteria
- [x] Transparency Metric tooltip fully visible above the Clinical Logic card (not clipped)
- [x] Returning to a patient within 5 min loads recommendation instantly from client cache
- [x] Each biomarker chart has a "?" icon; hover shows metric description and interpretation ranges
- [x] Each date group in clinical timeline toggles collapsed/expanded on click
- [x] Risk sentiment lines render red (not grey) when BAML agent is active
- [x] BAML annotation tests pass (3/3) with capitalized enum variants
- [x] `npm run build` exits 0
- [x] Backend pytest passes
- [x] Frontend vitest passes
