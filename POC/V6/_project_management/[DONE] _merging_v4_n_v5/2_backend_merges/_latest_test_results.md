# Latest Test Results — Stage 2: Backend Merges

| Check | Status | Notes |
|-------|--------|-------|
| All V4 clinical terms present in text_annotations.py | ✅ PASS | 8 new phrases added across 3 sections |
| All V4 discount types in sample_promotions.json | ✅ PASS | CORPORATE_PARTNER + NAVAVEJ_APP_LOYALTY added; total now 9 |
| `baml build` exits 0 | ✅ PASS | 14 files written to `baml_client/` |
| baml_client/ stubs for all 4 functions | ✅ PASS | AnalyzeClinicalRisks, MatchPolicy, WriteNarrative, AnnotateReasoningLines |
| Backend smoke: `GET /health` → 200 | ✅ PASS | `{"status":"healthy","version":"1.0.0"}` |
| Backend smoke: `reasoning_trace_annotated` present | ✅ PASS | 11 annotated lines for patient `id_d4f2b7e6` |
| Backend smoke: `ai_recommended_tier` = Premium | ✅ PASS | Unchanged from Stage 1 baseline |
| `highlight_terms` populated | ✅ PASS | 45 terms in trace for `id_d4f2b7e6` |
