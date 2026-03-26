# Stage 2 — Backend Merges

## Goal
Bring V4-only data into the V6 backend: clinical terminology terms and discount/promotion definitions. Verify BAML compilation with the new `AnnotateReasoningLines` function.

## Steps

### 2a — Clinical Terms Merge
1. Read `POC/v4/frontend/src/shared/clinical-dictionary.ts` — extract all identifier→label mappings
2. Compare against `backend/src/services/text_annotations.py` CLINICAL_PHRASES list
3. For each term not yet covered, add it to CLINICAL_PHRASES (maintain longest-first sort order)
4. Also check V4's BAD_KEYWORDS / GOOD_KEYWORDS lists for any missing sentiment terms

### 2b — Discount / Promotion Data Merge
1. Read `POC/v4/assets/synthesis/discounts/discount_programs.json`
2. Compare against `assets/synthesis/rulesets/sample_promotions.json`
3. For any V4 discount type not yet represented, create a new entry in `sample_promotions.json` using V5's schema (`discount_mechanic`, `applies_to`, `valid_from`/`valid_until`, etc.)

### 2c — BAML Compilation Check
1. Run `baml build` from project root
2. Confirm `baml_client/` regenerated cleanly (no errors on `AnnotateReasoningLines`, `MatchPolicy`, `WriteNarrative`)

## Acceptance Criteria
- [ ] All V4 clinical identifier terms present in `text_annotations.py` CLINICAL_PHRASES or keyword lists
- [ ] All V4 discount types represented in `sample_promotions.json`
- [ ] `baml build` exits 0
- [ ] `baml_client/` contains generated stubs for all 4 BAML functions
