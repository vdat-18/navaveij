# Plan: Combine v4 + v5 → POC/V6

## Context

Two developers worked in parallel from the same base codebase, producing `POC/v4` and `POC/v5`. Both are functional POCs but each evolved distinct strengths. The goal is a **combined POC/V6** that cherry-picks the best of each, while deliberately offloading logic to the backend to reduce the scope of the upcoming frontend overhaul.

`POC/V6` starts empty. **V5 is the primary base** — it is the later, more advanced version in most areas. V4 contributes specific pieces that V5 dropped, never built, or handles with worse UX.

---

## Issues — Complete Difference Map

| Area | v4 has | v5 has | V6 decision |
|------|--------|--------|-------------|
| **Highlighting** | Frontend-only regex chain (`renderBoldText`, `normalizeClinicalToken`) in RecommendationPanel | Backend `text_annotations.py` service with curated CLINICAL_PHRASES, 4-state sentiment, overlap tracking | **V5** — proper BE/FE separation |
| **Clinical dictionary** | `clinical-dictionary.ts` with 50+ identifier→label mappings | Subset covered by `text_annotations.py` | **Merge V4 terms into V5 CLINICAL_PHRASES; delete `clinical-dictionary.ts`** |
| **BAML definitions** | 3 agents; `priority_add_ons` as plain strings | `AnnotateReasoningLines()` function added; `priority_add_ons` as structs with severity | **V5** — richer structured output |
| **API contracts** | Returns raw metric fields; no annotated trace | Returns `reasoning_trace_annotated`, `risk_summary`, structured `comm_script` with highlight arrays | **V5** |
| **Price & Promotion (BE)** | Flat `discounts.py` function; 2 discount types; no date handling | `PromotionEngine` class; 3 discount mechanics; date ranges; urgency messages; consultant prompts | **V5** |
| **Promotion UI** | None | `PromotionDrawer.tsx` — 4 categories, real-time savings, urgency countdown | **V5 + V4 line-item detail inside drawer** |
| **Price breakdown detail** | Full "Final Settlement" section (base + add-ons + discounts + VAT 7%) | Compact card only; details in drawer (but drawer lacks line-items) | **V5 pattern; V4 detail level added into drawer** |
| **Discount data** | `discount_programs.json` (SMART_LIFE, SMART_KID, etc.) | `sample_promotions.json` (Expo 2026, Smart Life, Smart Kid, Couple Bundle) | **V5 base; fold V4 types into `sample_promotions.json`** |
| **Monitoring fixture** | Absent | `monitoring.json` present | **V5** |
| **Risk-o-meter** | SVG gauge with animated rings + shimmer; no background zone arcs | SVG gauge + coloured background zone arcs (green/yellow/red); smoother animation | **V5** — more informative |
| **Plan tier seal** | `PackageSeal` inlined in RecommendationPanel; animated shimmer rings | `PackageSealBadge.tsx` extracted as reusable component | **V5** |
| **Add-on priority labels** | "High Priority" / "Moderate Risk" / "Routine" text badges | Colour dots only | **V5 base + V4 text labels restored** |
| **Add-on rationale box** | Bordered "CLINICAL RATIONALE" hover-reveal with Fingerprint icon | Plain italic text reveal | **V5 base + V4 bordered box restored** |
| **Safety Verified badge** | `ShieldCheck` "Safety Verified" badge in tier card | Removed | **Restore in V6** |
| **BiomarkerTrendGrid** | Absent | Full grid: N biomarkers, threshold lines, status banners, LOINC codes | **V5 (add TODO: move HDL abnormality_direction to BE)** |
| **Orchestrator / Workflow / Rules** | Identical to V5 | Identical to V4 | Either; use V5 |
| **ClinicalEventTimeline** | Identical to V5 | Identical to V4 | Either; use V5 |
| **ScreeningGapStatus** | Identical to V5 | Identical to V4 | Either; use V5 |
| **Audit logger (5D hash chain)** | Identical to V5 | Identical to V4 | Either; use V5 |
| **AccessMonitoringScreen** | Tab-based monitoring UI | Same structure | Either; use V5 |

---

## Solution

**Copy V5 entirely as the V6 base, then apply 6 targeted patches from V4.**

V5 is superior in: architecture, BE/FE separation, BAML richness, API output schema, promotion engine, biomarker visualisation.

V4 contributes: clinical dictionary terms (→ BE), discount type definitions (→ `sample_promotions.json`), 4 FE UI elements (priority text labels, rationale hover box, Safety Verified badge, line-item price breakdown).

---

## Action Plan

### Stage 1 — Project Scaffolding
Copy V5 to V6. Verify environment (Python deps, Node deps, BAML compilation).

**Key output:** `POC/V6/` runnable with `uv run fastapi dev` + `npm run dev`

### Stage 2 — Backend Merges
1. Audit `POC/v4/frontend/src/shared/clinical-dictionary.ts` → add missing terms to `backend/src/services/text_annotations.py` CLINICAL_PHRASES
2. Audit `POC/v4/assets/synthesis/discounts/discount_programs.json` → migrate missing discount types to `sample_promotions.json` schema
3. Run `baml build` — confirm `AnnotateReasoningLines` compiles

**Key output:** All clinical terms and discount types present in V6 BE

### Stage 3 — Frontend Highlighting
Remove inline highlight logic (`renderBoldText`, `normalizeClinicalToken`, `splitConsultationSentences`) from `RecommendationPanel.tsx`. Wire `renderHighlightedText()` from `recommendationTextFormatting.tsx`. Delete `clinical-dictionary.ts`.

**Key output:** Highlighted text driven by backend annotations; zero client-side regex

### Stage 4 — Frontend Cherry-picks (V4 UI elements)
1. Restore "High Priority" / "Moderate Risk" / "Routine" text badges on add-on items
2. Restore bordered "CLINICAL RATIONALE" hover-reveal box (Fingerprint icon)
3. Add `ShieldCheck` "Safety Verified" badge to `PackageSealBadge.tsx`
4. Add V4-style "Final Settlement" line-item section inside `PromotionDrawer.tsx` (base price, per-add-on lines, discount lines, VAT 7%, final figure)
5. Add `// TODO: move abnormality_direction to BE` comment in `BiomarkerTrendGrid.tsx` at HDL hardcode

**Key output:** V6 FE combines V5's architecture with V4's detail-level UI elements

### Stage 5 — Verification & Testing
1. `baml build` — passes
2. Backend smoke: recommendation for high-risk patient → `reasoning_trace_annotated` populated, `risk_summary` non-empty
3. FE visual: highlighted text uses backend annotations (not regex), PromotionDrawer shows line-items, add-ons show priority text, Safety Verified badge visible
4. Run `scripts/` integration test suite

**Key output:** V6 passes all existing tests + visual QA checklist

---

## Critical Files

| File | Action |
|------|--------|
| `backend/src/services/text_annotations.py` | Modify — add V4 clinical terms |
| `assets/synthesis/rulesets/sample_promotions.json` | Modify — add V4 discount types |
| `frontend/src/components/dashboard/RecommendationPanel.tsx` | Modify — remove inline highlight; add priority labels + rationale box |
| `frontend/src/components/dashboard/PackageSealBadge.tsx` | Modify — add Safety Verified badge |
| `frontend/src/components/dashboard/PromotionDrawer.tsx` | Modify — add Final Settlement section |
| `frontend/src/components/trend-timeline/BiomarkerTrendGrid.tsx` | Modify — add TODO comment |
| `frontend/src/shared/clinical-dictionary.ts` | Delete (replaced by BE) |
| `backend/src/services/discounts.py` | Delete (replaced by promotions.py) |
| Everything else | Copy as-is from V5 |
